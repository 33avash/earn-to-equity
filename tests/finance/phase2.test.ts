import { describe, expect, it } from 'vitest';
import { ALL_DATED, NEW_REGIME } from '@/finance/assumptions';
import { DEFAULT_SALARY, incomeTax, salaryBreakdown } from '@/finance/tax';
import { homePurchaseCosts, simulate } from '@/finance/simulate';
import { fiAnalysis } from '@/finance/fi';
import { NIFTY_TRI, mulberry32, monteCarlo, studentT } from '@/finance/montecarlo';
import { emptyAssetMap, netReturns, weightedReturn } from '@/finance/portfolio';
import { healthCoverBenchmark, termCoverBenchmark } from '@/finance/protection';
import { maxEligibleLoan } from '@/finance/rates';
import { projectSip } from '@/finance/sip';
import { DEFAULT_SCENARIO_DELTAS, tornado } from '@/finance/scenarios';
import { DEFAULT_ASSUMPTIONS, blankProfile, demoProfile } from '@/state/demo';
import type { Assumptions, FinancialProfile } from '@/types/profile';

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

const zero: Assumptions = { ...DEFAULT_ASSUMPTIONS, inflation: 0, returns: emptyAssetMap(), sipStepUp: 0, sweepExcessCash: false, lifestyleCreep: 0, expenseRatios: emptyAssetMap(), epfRate: 0, postFiHealthcare: 0 };

function bare(): FinancialProfile {
  const p = blankProfile(2026);
  p.income.mode = 'takeHome';
  p.income.salaryGrowth = 0;
  p.cashflow.essential = [];
  p.cashflow.lifestyle = [];
  p.position.retirement.returnRate = 0;
  return p;
}

describe('assumptions file', () => {
  it('every dated value has an as-of date and an https source', () => {
    for (const d of ALL_DATED) {
      expect(d.asOf.length).toBeGreaterThan(0);
      expect(d.source).toMatch(/^https:\/\//);
      expect(d.sourceLabel.length).toBeGreaterThan(0);
    }
  });
});

describe('income tax, tax year 2026-27 (hand-checked)', () => {
  it('new regime: rebate to ₹12 L, marginal relief just above it', () => {
    expect(incomeTax(1_200_000, 'new')).toBe(0);
    // Slab tax on ₹12.1 L is ₹61,500, but relief caps it at the ₹10,000 above ₹12 L; plus 4% cess.
    close(incomeTax(1_210_000, 'new'), 10_400, 1e-9);
    // ₹16 L: 20,000 + 40,000 + 60,000 = ₹1,20,000 + cess.
    close(incomeTax(1_600_000, 'new'), 124_800, 1e-9);
  });
  it('salary of ₹12.75 L pays no tax in the new regime', () => {
    expect(incomeTax(1_275_000 - NEW_REGIME.value.standardDeduction, 'new')).toBe(0);
  });
  it('old regime: ₹10 L taxable pays ₹1,12,500 + cess; ₹5 L pays nothing', () => {
    close(incomeTax(1_000_000, 'old'), 117_000, 1e-9);
    expect(incomeTax(500_000, 'old')).toBe(0);
  });
  it('surcharge with marginal relief at ₹51 L', () => {
    // Slab tax ₹11,10,000; 10% surcharge would add ₹1,11,000, but relief limits the total to
    // tax at ₹50 L (₹10,80,000) + the ₹1 L above it = ₹11,80,000; plus cess = ₹12,27,200.
    close(incomeTax(5_100_000, 'new'), 1_227_200, 1e-9);
  });
});

describe('CTC → take-home (hand-checked)', () => {
  it('₹11.4 L CTC: ₹85,671.67 a month, no tax', () => {
    const b = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 1_140_000 });
    close(b.employeePf, 54_720, 1e-12);
    close(b.gross, 1_085_280, 1e-12);
    expect(b.tax).toBe(0);
    close(b.takeHome, 1_028_060, 1e-12);
    // EPF account: 2 × ₹54,720 − EPS 8.33% of ₹1,80,000 (₹14,994) = ₹94,446.
    close(b.epfCredit, 94_446, 1e-12);
  });
  it('₹20 L CTC: new regime tax ₹1,72,432, take-home ₹16,33,068', () => {
    const b = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 2_000_000 });
    expect(b.regime).toBe('new');
    close(b.tax, 172_432, 1e-12);
    close(b.takeHome, 1_633_068, 1e-12);
  });
  it('picks the old regime when deductions make it cheaper', () => {
    const b = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 2_000_000, other80C: 150_000, sec80D: 25_000, hraExemption: 500_000 });
    close(b.taxOld, 172_068, 1e-12);
    expect(b.regime).toBe('old');
  });
  it('PF on the ₹15,000 wage ceiling', () => {
    const b = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 2_000_000, pfOnWageCeiling: true });
    close(b.employeePf, 21_600, 1e-12);
  });
  it('take-home grows more slowly than CTC as income crosses slabs', () => {
    const p = demoProfile(2026);
    p.lifeEvents = [];
    p.goals = [];
    const r = simulate(p, DEFAULT_ASSUMPTIONS);
    const ctcGrowth = Math.pow(1.08, 15);
    const takeHomeGrowth = r.rows[15].income / r.rows[0].income;
    expect(takeHomeGrowth).toBeLessThan(ctcGrowth);
    expect(r.rows[15].incomeTax).toBeGreaterThan(0);
    expect(r.rows[0].incomeTax).toBe(0);
  });
});

describe('EPF account', () => {
  it('interest on the monthly running balance, credited at year-end (hand-checked demo 2026)', () => {
    const r = simulate(demoProfile(2026), DEFAULT_ASSUMPTIONS);
    // ₹2,80,000 + ₹94,446 of credits + ₹27,320.56 interest (8.25%/12 on each month's closing balance).
    close(r.rows[0].epf, 401_766.555625, 1e-9);
    close(r.rows[0].epfInterest, 27_320.555625, 1e-9);
  });
  it('a flat balance earns exactly the annual rate', () => {
    const p = bare();
    p.position.epf = { balance: 100_000 };
    const r = simulate(p, { ...zero, epfRate: 0.0825 }, { years: 1 });
    close(r.rows[0].epf, 108_250, 1e-12);
  });
});

describe('lifestyle creep', () => {
  it('40% of a real raise becomes lifestyle spending', () => {
    const p = bare();
    p.income.monthlyTakeHome = 100_000;
    p.income.salaryGrowth = 0.1;
    p.cashflow.lifestyle = [{ id: 'l', label: 'Fun', amount: 20_000 }];
    const r = simulate(p, { ...zero, lifestyleCreep: 0.4 }, { years: 2 });
    close(r.rows[0].lifestyleMonthly, 20_000);
    close(r.rows[1].lifestyleMonthly, 24_000); // 40% of the ₹10,000 raise
  });
  it('creep keeps the year-20 savings rate realistic: under 40%, at least 10 points below no creep', () => {
    const p = demoProfile(2026);
    const rate = (a: Assumptions) => {
      const last = simulate(p, a).rows.at(-1)!;
      return (last.income - last.expenses - last.debtPayments) / last.income;
    };
    const without = rate({ ...DEFAULT_ASSUMPTIONS, lifestyleCreep: 0 });
    const withCreep = rate(DEFAULT_ASSUMPTIONS);
    expect(withCreep).toBeLessThan(0.4);
    expect(without - withCreep).toBeGreaterThan(0.1);
  });
});

describe('investment costs and taxes', () => {
  it('returns are net of expense ratios', () => {
    const net = netReturns(DEFAULT_ASSUMPTIONS);
    close(net.indianEquity, DEFAULT_ASSUMPTIONS.returns.indianEquity - 0.002);
    const p = demoProfile(2026);
    expect(simulate(p, DEFAULT_ASSUMPTIONS).portfolioReturn).toBeCloseTo(weightedReturn(p.preferences.targetAllocation, net), 12);
  });
  it('selling equity to pay a goal costs 12.5% LTCG above ₹1.25 L, paid by selling a little more (hand-checked)', () => {
    const p = bare();
    p.position.holdings.indianEquity = 1_000_000;
    p.preferences.targetAllocation = { ...emptyAssetMap(), indianEquity: 1 };
    p.goals = [{ id: 'g', name: 'Car', category: 'car', cost: 900_000, targetYear: 2027, saved: 0, priority: 1, inflation: 0, source: 'investments', fundingMode: 'savings' }];
    const r = simulate(p, zero, { years: 2, yearReturns: [0.5, 0] });
    // ₹10 L grows to ₹15 L; a third of any sale is gain. Selling G to net ₹9 L:
    // G − 12.5% × 1.04 × (G/3 − ₹1.25 L) = ₹9 L → G = ₹9,23,780.49, tax ₹23,780.49.
    close(r.rows[1].capitalGainsTax, 23_780.487804878, 1e-9);
    close(r.rows[1].portfolio, 1_500_000 - 923_780.487804878, 1e-9);
    expect(r.rows[1].goals[0].status).toBe('funded');
  });
  it('the SIP calculator reports the corpus after LTCG', () => {
    const s = projectSip({ monthly: 10_000, years: 10, annualReturn: 0.1 });
    close(s.tax, Math.max(0, s.gains - 125_000) * 0.125 * 1.04);
    close(s.afterTaxCorpus, s.corpus - s.tax);
  });
  it('FI counts investments after the tax due on selling them', () => {
    const fi = fiAnalysis(demoProfile(2026), DEFAULT_ASSUMPTIONS);
    expect(fi.projectedCorpus).toBeLessThanOrEqual(fi.projectedCorpusPreTax);
  });
});

describe('buying a home', () => {
  it('Maharashtra: 7% stamp duty + 1% registration capped at ₹30,000, 5% GST if under construction', () => {
    const c = homePurchaseCosts({ propertyValue: 0, downPaymentPct: 0.2, loanRate: 0.08, tenureYears: 20, state: 'MH', underConstruction: true, interiors: 500_000 }, 10_000_000, 1);
    close(c.stampDuty, 730_000);
    close(c.gst, 500_000);
    close(c.downPayment, 2_000_000);
    close(c.upfront, 2_000_000 + 730_000 + 500_000 + 500_000);
    close(c.loan, 8_000_000);
  });
  it('maintenance and property tax become monthly costs', () => {
    const c = homePurchaseCosts({ propertyValue: 0, downPaymentPct: 0.2, loanRate: 0.08, tenureYears: 20, sizeSqft: 900, maintenancePerSqft: 4 }, 6_000_000, 1);
    close(c.maintenanceMonthly, 3_600);
    close(c.propertyTaxMonthly, 6_000_000 * 0.001 / 12);
  });
  it('lender limit: ₹1 L take-home with ₹10,000 of EMIs supports about ₹47.8 L at 8% over 20 years', () => {
    close(maxEligibleLoan(100_000, 10_000, 0.08, 240), 4_782_171.668, 1e-9);
  });
  it('flags years when EMIs exceed half of take-home', () => {
    const r = simulate(demoProfile(2026), DEFAULT_ASSUMPTIONS);
    expect(r.rows.some((row) => row.flags.includes('emi-over-limit'))).toBe(true);
  });
});

describe('protection benchmarks', () => {
  it('health cover scales with city tier and household', () => {
    const p = demoProfile(2026);
    expect(healthCoverBenchmark(p)).toBe(1_000_000);
    p.about.dependents = 2;
    expect(healthCoverBenchmark(p)).toBe(1_500_000);
    p.about.dependents = 3;
    p.about.cityTier = 3;
    expect(healthCoverBenchmark(p)).toBe(1_000_000);
  });
  it('term cover is 10–15× income when someone depends on you', () => {
    const p = demoProfile(2026);
    expect(termCoverBenchmark(p, 1_000_000)).toEqual({ min: 10_000_000, max: 15_000_000 });
    p.about.parentsAsDependents = false;
    expect(termCoverBenchmark(p, 1_000_000)).toBeNull();
  });
});

describe('FI healthcare line', () => {
  it('post-FI healthcare grows at its own rate and is part of the target', () => {
    const r = simulate(demoProfile(2026), DEFAULT_ASSUMPTIONS);
    const row = r.rows[9];
    close(row.fiHealthcare, 3000 * 12 * Math.pow(1.1, 10));
    close(row.fiTarget, (row.expenses + row.fiHealthcare) / 0.035 + row.liabilities);
  });
});

describe('Monte Carlo', () => {
  it('Student-t draws have unit variance and fat tails', () => {
    const rand = mulberry32(11);
    const xs = Array.from({ length: 40_000 }, () => studentT(rand));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const v = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
    const k = xs.reduce((s, x) => s + (x - mean) ** 4, 0) / xs.length / (v * v);
    expect(Math.abs(v - 1)).toBeLessThan(0.1);
    expect(k).toBeGreaterThan(4); // a normal distribution has kurtosis 3
  });
  it('the historical model bootstraps 21 years of Nifty 50 TRI and stays ordered', () => {
    expect(NIFTY_TRI.series).toHaveLength(21);
    expect(Math.min(...NIFTY_TRI.series)).toBeCloseTo(-0.513, 10);
    const m = monteCarlo(demoProfile(2026), DEFAULT_ASSUMPTIONS, { seed: 3, model: 'historical' });
    expect(m.model).toBe('historical');
    expect(m.finalP10).toBeLessThanOrEqual(m.finalP50);
    expect(m.finalP50).toBeLessThanOrEqual(m.finalP90);
    expect(m.percentiles[0].year).toBe(2027);
  });
});

describe('scenario tornado', () => {
  it('is sorted widest first and the base case has no width', () => {
    const bars = tornado(demoProfile(2026), DEFAULT_ASSUMPTIONS, DEFAULT_SCENARIO_DELTAS.conservative, DEFAULT_SCENARIO_DELTAS.high);
    expect(bars).toHaveLength(4);
    for (let i = 1; i < bars.length; i++) expect(bars[i - 1].range).toBeGreaterThanOrEqual(bars[i].range);
    expect(bars[0].low).toBeLessThan(0);
    expect(bars[0].high).toBeGreaterThan(0);
  });
});

describe('golden file: demo profile, 2026–2046', () => {
  /*
   * Hand-verified rows:
   *  - 2026: take-home ₹10,28,060 (CTC ₹11.4 L − employer PF ₹54,720 − employee PF ₹54,720 − PT ₹2,500, no tax);
   *          EPF ₹4,01,766.56 (₹2,80,000 + ₹94,446 credits + ₹27,320.56 interest).
   *  - 2027: Japan trip ₹2,50,000 × 1.06 = ₹2,65,000, paid from savings.
   *  - 2029: MBA ₹18,00,000 × 1.08³ = ₹22,67,481.60, all on an education loan (savings are kept for the 21-month break);
   *          no salary that year.
   */
  it('matches the snapshot', () => {
    const r = simulate(demoProfile(2026), DEFAULT_ASSUMPTIONS);
    close(r.rows[0].income, 1_028_060, 1e-12);
    close(r.rows[1].goals[0].cost, 265_000, 1e-12);
    expect(r.rows[1].goals[0].status).toBe('funded');
    close(r.rows[3].goals[0].loan, 2_267_481.6, 1e-12);
    expect(r.rows[3].income).toBe(0);
    const table = r.points.map((pt) => ({
      year: pt.year,
      age: pt.age,
      netWorth: Math.round(pt.netWorth),
      netWorthReal: Math.round(pt.netWorthReal),
      ...(pt.row && {
        takeHome: Math.round(pt.row.income),
        incomeTax: Math.round(pt.row.incomeTax),
        expenses: Math.round(pt.row.expenses),
        debtPayments: Math.round(pt.row.debtPayments),
        portfolio: Math.round(pt.row.portfolio),
        epf: Math.round(pt.row.epf),
        cash: Math.round(pt.row.cash),
        liabilities: Math.round(pt.row.liabilities),
        flags: pt.row.flags.join(','),
      }),
    }));
    expect(table).toHaveLength(21);
    expect(table).toMatchSnapshot();
  });
});
