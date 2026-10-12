import { describe, expect, it } from 'vitest';
import { simulate } from '@/finance/simulate';
import { runScenario, DEFAULT_SCENARIO_DELTAS, attributeScenario } from '@/finance/scenarios';
import { fiAnalysis } from '@/finance/fi';
import { monteCarlo } from '@/finance/montecarlo';
import { emptyAssetMap } from '@/finance/portfolio';
import { DEFAULT_ASSUMPTIONS, blankProfile, demoProfile } from '@/state/demo';
import type { Assumptions, FinancialProfile } from '@/types/profile';

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

const zeroAssumptions: Assumptions = {
  ...DEFAULT_ASSUMPTIONS,
  inflation: 0,
  returns: emptyAssetMap(),
  sipStepUp: 0,
  sweepExcessCash: false,
};

function simpleProfile(): FinancialProfile {
  const p = blankProfile(2026);
  p.income.monthlyTakeHome = 50000;
  p.income.salaryGrowth = 0;
  p.cashflow.essential = [{ id: 'e', label: 'Rent', amount: 20000 }];
  p.cashflow.lifestyle = [{ id: 'l', label: 'Fun', amount: 5000 }];
  p.cashflow.monthlyInvestments = 15000;
  p.position.cashSavings = 100000;
  p.position.holdings.indianEquity = 200000;
  p.position.retirement.returnRate = 0;
  return p;
}

describe('simulate — invariants', () => {
  it('net worth = assets − liabilities every year', () => {
    const r = simulate(demoProfile(2026), DEFAULT_ASSUMPTIONS);
    expect(r.rows).toHaveLength(20);
    for (const row of r.rows) close(row.netWorth, row.totalAssets - row.liabilities, 1e-9);
  });

  it('zero return & zero inflation: wealth grows by exactly the saved cash flow', () => {
    const p = simpleProfile();
    const r = simulate(p, zeroAssumptions);
    const last = r.rows[19];
    // 25,000 left each month (15,000 invested + 10,000 to cash), no growth anywhere.
    close(last.portfolio, 200000 + 15000 * 240);
    close(last.cash, 100000 + 10000 * 240);
    close(last.netWorth, r.startNetWorth + 25000 * 240);
  });

  it('contributions are conserved: no money created or lost (with loans, events and goals)', () => {
    const p = demoProfile(2026);
    p.position.retirement.returnRate = 0;
    const a = { ...zeroAssumptions, propertyGrowth: 0 };
    const r = simulate(p, a);
    let expected = r.startNetWorth;
    for (const row of r.rows) {
      expected += row.income - row.expenses - row.interestPaid - row.oneTimeCosts - row.goalWithdrawals;
      // retirement contributions come from pre-take-home pay; home purchase converts assets (neutral);
      // the purchase "cost" here includes down payment, which is offset by the property asset.
    }
    const retIn = r.rows.reduce((s, row, i) => s + (i === 0 ? row.retirement - p.position.retirement.balance : row.retirement - r.rows[i - 1].retirement), 0);
    const downPayments = r.rows.reduce((s, row) => s + row.oneTimeCosts, 0) - 300000 - 800000; // event-only one-time costs at 0% inflation
    const borrowingCost = 0; // demo stays solvent; asserted below
    expect(r.rows.every((row) => !row.flags.includes('borrowing'))).toBe(true);
    close(r.rows[19].netWorth, expected + retIn + downPayments - borrowingCost, 1e-6);
  });

  it('a home purchase does not change net worth on the day it happens', () => {
    const p = simpleProfile();
    p.position.cashSavings = 5_000_000;
    p.lifeEvents = [{ id: 'h', kind: 'homePurchase', label: 'Home', year: 2026, oneTimeCost: 0, incomeChangePct: 0, monthlyExpenseChange: 0, breakMonths: 0, home: { propertyValue: 4_000_000, downPaymentPct: 0.25, loanRate: 0, tenureYears: 10 } }];
    const withHome = simulate(p, zeroAssumptions).rows[0];
    p.lifeEvents = [];
    const without = simulate(p, zeroAssumptions).rows[0];
    // At 0% loan rate, EMIs only move cash to principal, so net worth is unchanged.
    close(withHome.netWorth, without.netWorth, 1e-9);
    expect(withHome.property).toBe(4_000_000);
    close(withHome.liabilities, 3_000_000 - (3_000_000 / 120) * 12, 1e-9);
  });

  it('goals are withdrawn once, only when affordable', () => {
    const p = simpleProfile();
    p.goals = [
      { id: 'g1', name: 'Bike', category: 'car', cost: 100000, targetYear: 2027, saved: 0, priority: 1, inflation: 0, source: 'investments' },
      { id: 'g2', name: 'Mansion', category: 'home', cost: 1e9, targetYear: 2028, saved: 0, priority: 1, inflation: 0, source: 'investments' },
      { id: 'g3', name: 'Retire', category: 'retirement', cost: 1e7, targetYear: 2030, saved: 0, priority: 1, inflation: 0, source: 'investments' },
    ];
    const r = simulate(p, zeroAssumptions);
    const total = r.rows.reduce((s, row) => s + row.goalWithdrawals, 0);
    expect(total).toBe(100000);
    expect(r.rows[1].goals[0].status).toBe('funded');
    expect(r.rows[2].goals[0].status).toBe('shortfall');
    expect(r.rows.flatMap((row) => row.goals).some((g) => g.goalId === 'g3')).toBe(false);
  });

  it('deficits draw down assets and then become borrowing', () => {
    const p = simpleProfile();
    p.cashflow.lifestyle = [{ id: 'l', label: 'Fun', amount: 60000 }];
    const r = simulate(p, zeroAssumptions);
    expect(r.rows[0].flags).toContain('deficit');
    expect(r.rows.at(-1)!.flags).toContain('borrowing');
    expect(r.rows.at(-1)!.liabilities).toBeGreaterThan(0);
  });

  it('a market shock reduces the portfolio in the shock year', () => {
    const p = demoProfile(2026);
    const base = simulate(p, DEFAULT_ASSUMPTIONS);
    const shocked = simulate(p, DEFAULT_ASSUMPTIONS, { shock: { year: 2029, drop: 0.3, recoveryYears: 0 } });
    expect(shocked.rows[3].portfolio).toBeLessThan(base.rows[3].portfolio);
    expect(shocked.rows[2].portfolio).toBeCloseTo(base.rows[2].portfolio, 6);
    const recovered = simulate(p, DEFAULT_ASSUMPTIONS, { shock: { year: 2029, drop: 0.3, recoveryYears: 3 } });
    expect(recovered.rows[19].netWorth).toBeGreaterThan(shocked.rows[19].netWorth);
  });

  it('real net worth discounts by inflation', () => {
    const r = simulate(demoProfile(2026), DEFAULT_ASSUMPTIONS);
    close(r.rows[9].netWorthReal, r.rows[9].netWorth / Math.pow(1.06, 10));
  });
});

describe('scenarios', () => {
  it('conservative ≤ base ≤ high growth', () => {
    const p = demoProfile(2026);
    const a = DEFAULT_ASSUMPTIONS;
    const c = runScenario(p, a, DEFAULT_SCENARIO_DELTAS.conservative).rows[19].netWorth;
    const b = runScenario(p, a, DEFAULT_SCENARIO_DELTAS.base).rows[19].netWorth;
    const h = runScenario(p, a, DEFAULT_SCENARIO_DELTAS.high).rows[19].netWorth;
    expect(c).toBeLessThan(b);
    expect(b).toBeLessThan(h);
    close(b, simulate(p, a).rows[19].netWorth);
  });
  it('attribution parts plus interaction equal the total', () => {
    const at = attributeScenario(demoProfile(2026), DEFAULT_ASSUMPTIONS, DEFAULT_SCENARIO_DELTAS.high);
    close(at.parts.reduce((s, x) => s + x.impact, 0) + at.interaction, at.total);
  });
});

describe('financial independence', () => {
  it('target = expenses ÷ withdrawal rate, and the extra investment closes the gap', () => {
    const p = demoProfile(2026);
    const fi = fiAnalysis(p, DEFAULT_ASSUMPTIONS);
    const row = fi.sim.rows[fi.yearsToTarget - 1];
    close(fi.targetCorpus, row.expenses / DEFAULT_ASSUMPTIONS.withdrawalRate);
    if (fi.gap > 0 && fi.extraMonthlyNeeded !== null) {
      const check = simulate(p, DEFAULT_ASSUMPTIONS, { years: fi.yearsToTarget, extraMonthlyInvestment: fi.extraMonthlyNeeded }).rows[fi.yearsToTarget - 1];
      expect(check.financialAssets).toBeGreaterThanOrEqual(check.fiTarget * 0.9999);
    }
  });
});

describe('Monte Carlo', () => {
  it('runs ≥1000 paths, is deterministic per seed, and percentiles are ordered', () => {
    const p = demoProfile(2026);
    const m1 = monteCarlo(p, DEFAULT_ASSUMPTIONS, { seed: 7 });
    const m2 = monteCarlo(p, DEFAULT_ASSUMPTIONS, { seed: 7 });
    expect(m1.paths).toBeGreaterThanOrEqual(1000);
    expect(m1.finalP50).toBe(m2.finalP50);
    expect(m1.finalP10).toBeLessThanOrEqual(m1.finalP50);
    expect(m1.finalP50).toBeLessThanOrEqual(m1.finalP90);
    for (const g of m1.goalProbabilities) {
      expect(g.probability).toBeGreaterThanOrEqual(0);
      expect(g.probability).toBeLessThanOrEqual(1);
    }
  });
});
