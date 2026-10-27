import { describe, expect, it } from 'vitest';
import { projectSip, requiredMonthly, sipFutureValue } from '@/finance/sip';
import { emi, inflate, monthlyRate, realReturn, toReal } from '@/finance/rates';
import { monthlyCashflow } from '@/finance/cashflow';
import { balanceSheet } from '@/finance/networth';
import { emergencyPlan } from '@/finance/emergency';
import { compareStrategies, simulatePayoff } from '@/finance/debt';
import { analyzeGoal, analyzeGoals } from '@/finance/goals';
import { PRESETS, isValidAllocation, weightedReturn, allocationDrift } from '@/finance/portfolio';
import { healthScore } from '@/finance/health';
import { checkNumber, checkRate, validateProfile } from '@/finance/validate';
import { formatCompact, formatINR } from '@/finance/money';
import { DEFAULT_ASSUMPTIONS, demoProfile } from '@/state/demo';

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

describe('rates', () => {
  it('monthly rate compounds back to the annual rate', () => {
    close(Math.pow(1 + monthlyRate(0.12), 12) - 1, 0.12);
  });
  it('real return uses the Fisher relation', () => {
    close(realReturn(0.1, 0.06), 1.1 / 1.06 - 1);
  });
  it('inflate and toReal are inverses', () => {
    close(toReal(inflate(100000, 0.06, 10), 0.06, 10), 100000);
  });
  it('EMI matches the standard formula and handles 0%', () => {
    close(emi(1_000_000, 0.09, 240), 8997.26, 1e-5);
    close(emi(120000, 0, 12), 10000);
  });
});

describe('SIP', () => {
  it('matches the closed form for an end-of-month SIP', () => {
    const r = projectSip({ monthly: 10000, years: 10, annualReturn: 0.12 });
    close(r.corpus, sipFutureValue(10000, 0.12, 120));
    close(r.totalContributions, 1_200_000);
  });
  it('start-of-month timing earns exactly one extra month of growth', () => {
    const end = sipFutureValue(5000, 0.1, 60, 'end');
    const start = projectSip({ monthly: 5000, years: 5, annualReturn: 0.1, timing: 'start' }).corpus;
    close(start, end * (1 + monthlyRate(0.1)));
  });
  it('zero return gives exactly the contributions', () => {
    const r = projectSip({ monthly: 7000, lumpSum: 50000, years: 7, annualReturn: 0, stepUp: 0.1 });
    close(r.corpus, r.totalContributions);
    expect(r.gains).toBeCloseTo(0, 6);
  });
  it('step-up raises the monthly amount once a year', () => {
    const r = projectSip({ monthly: 10000, years: 3, annualReturn: 0, stepUp: 0.1 });
    close(r.totalContributions, 12 * (10000 + 11000 + 12100));
    expect(r.years[2].monthly).toBeCloseTo(12100, 6);
  });
  it('step-up beats flat for the same starting amount', () => {
    const flat = projectSip({ monthly: 10000, years: 15, annualReturn: 0.11 }).corpus;
    const step = projectSip({ monthly: 10000, years: 15, annualReturn: 0.11, stepUp: 0.1 }).corpus;
    expect(step).toBeGreaterThan(flat);
  });
  it('inflation-adjusted corpus discounts by the horizon', () => {
    const r = projectSip({ monthly: 10000, years: 20, annualReturn: 0.1, inflation: 0.06 });
    close(r.corpusReal, r.corpus / Math.pow(1.06, 20));
  });
  it('rejects negative amounts', () => {
    expect(() => projectSip({ monthly: -1, years: 1, annualReturn: 0.1 })).toThrow();
  });
  it('requiredMonthly round-trips with sipFutureValue (incl. zero rate)', () => {
    const pmt = requiredMonthly(2_000_000, 100000, 0.1, 96);
    close(100000 * Math.pow(1.1, 8) + sipFutureValue(pmt, 0.1, 96), 2_000_000);
    close(requiredMonthly(120000, 0, 0, 12), 10000);
    expect(requiredMonthly(100, 200, 0.05, 12)).toBe(0);
  });
});

describe('position & cash flow', () => {
  const p = demoProfile(2026);
  it('net worth = assets − liabilities', () => {
    const b = balanceSheet(p);
    close(b.netWorth, b.totalAssets - b.liabilities);
    close(b.liabilities, 345000);
    close(b.cash, 180000);
  });
  it('savings & investment transfers are not expenses', () => {
    const cf = monthlyCashflow(p);
    close(cf.expenses, 41500 + 14000);
    close(cf.debtPayments, 10000);
    // CTC ₹11.4 L, basic 40% = ₹4,56,000: employer PF ₹54,720 and gratuity 15/26 × 1/12 × basic = ₹21,923.08 come
    // out of CTC, leaving fixed gross ₹10,63,356.92. Less your PF ₹54,720 and PT ₹2,500, no tax: ₹10,06,136.92 a year.
    const inHand = (1_140_000 - 54_720 - (456_000 * 15) / 26 / 12 - 54_720 - 2_500) / 12;
    close(cf.income, inHand, 1e-9);
    close(cf.investableSurplus, inHand - 55500 - 10000, 1e-9);
    close(cf.unallocated, inHand - 55500 - 10000 - 15000 - 4000, 1e-9);
  });
  it('emergency fund covers essentials + EMIs', () => {
    const e = emergencyPlan(p);
    close(e.monthlyNeed, 51500);
    close(e.recommendedReserve, 51500 * 6);
    close(e.coverageMonths, 180000 / 51500);
    close(e.gap, 51500 * 6 - 180000);
    close(e.monthsToTarget!, (51500 * 6 - 180000) / 4000);
  });
  it('emergency fund with no contribution never reaches target', () => {
    expect(emergencyPlan(p, { monthlyContribution: 0 }).monthsToTarget).toBeNull();
  });
});

describe('debt', () => {
  const loans = [
    { id: 'a', kind: 'creditCard' as const, label: 'Card', balance: 50000, rate: 0.36, emi: 2500 },
    { id: 'b', kind: 'personal' as const, label: 'Personal', balance: 30000, rate: 0.14, emi: 1500 },
    { id: 'c', kind: 'car' as const, label: 'Car', balance: 200000, rate: 0.09, emi: 4500 },
  ];
  it('avalanche never pays more interest than snowball', () => {
    const { avalanche, snowball } = compareStrategies(loans, 3000);
    expect(avalanche.totalInterest).toBeLessThanOrEqual(snowball.totalInterest + 1e-6);
    expect(avalanche.months).toBeGreaterThan(0);
    expect(snowball.order[0].id).toBe('b'); // smallest balance first
  });
  it('total paid = principal + interest', () => {
    const r = simulatePayoff(loans, 2000, 'avalanche');
    close(r.totalPaid, 280000 + r.totalInterest, 1e-6);
  });
  it('flags payments that do not cover interest', () => {
    const r = simulatePayoff([{ id: 'x', kind: 'creditCard', label: 'Card', balance: 100000, rate: 0.36, emi: 1000 }], 0, 'avalanche');
    expect(r.error).toBeTruthy();
    expect(r.months).toBe(Infinity);
  });
});

describe('goals', () => {
  const p = demoProfile(2026);
  const a = DEFAULT_ASSUMPTIONS;
  it('future cost uses goal inflation, and required monthly closes the gap', () => {
    const g = { ...p.goals[1], saved: 0 };
    const r = analyzeGoal(g, 0, p, a);
    close(r.futureCost, g.cost * Math.pow(1 + g.inflation, 3));
    close(sipFutureValue(r.requiredMonthly, r.expectedReturn, r.months), r.futureCost);
  });
  it('a goal is not on track just because it exists', () => {
    const r = analyzeGoal(p.goals[1], 0, p, a);
    expect(r.status).toBe('shortfall');
  });
  it('allocates capacity by priority and reports the shortfall', () => {
    const s = analyzeGoals(p, a, 5000);
    const mba = s.goals.find((g) => g.goal.id === 'mba')!;
    expect(mba.allocatedMonthly).toBeCloseTo(5000, 6);
    expect(s.totalShortfall).toBeGreaterThan(0);
    expect(s.goals.find((g) => g.goal.id === 'car')!.allocatedMonthly).toBe(0);
  });
  it('fully saved goal is funded', () => {
    const r = analyzeGoal({ ...p.goals[0], saved: 10_000_000 }, 0, p, a);
    expect(r.status).toBe('funded');
    expect(r.requiredMonthly).toBe(0);
  });
});

describe('portfolio', () => {
  it('presets sum to 100%', () => {
    for (const k of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) expect(isValidAllocation(PRESETS[k].weights)).toBe(true);
  });
  it('rejects allocations not summing to 100%', () => {
    expect(isValidAllocation({ ...PRESETS.growth.weights, gold: 0.2 })).toBe(false);
    expect(isValidAllocation({ ...PRESETS.growth.weights, gold: -0.05, cash: 0.12 })).toBe(false);
  });
  it('weighted return is the weighted average', () => {
    const w = { indianEquity: 0.5, intlEquity: 0, debt: 0.5, govtSchemes: 0, gold: 0, cash: 0, other: 0 };
    close(weightedReturn(w, DEFAULT_ASSUMPTIONS.returns), 0.5 * 0.11 + 0.5 * 0.07);
  });
  it('drift trades sum to zero', () => {
    const rows = allocationDrift(demoProfile(2026).position.holdings, PRESETS.balanced.weights, 10000);
    close(rows.reduce((s, r) => s + r.trade, 0), 0, 1e-9);
  });
});

describe('health & validation', () => {
  it('score is within 0–100 and weights sum to 100', () => {
    const h = healthScore(demoProfile(2026), DEFAULT_ASSUMPTIONS);
    expect(h.score).toBeGreaterThanOrEqual(0);
    expect(h.score).toBeLessThanOrEqual(100);
    expect(h.components.reduce((s, c) => s + c.weight, 0)).toBe(100);
  });
  it('validates impossible inputs', () => {
    expect(checkNumber(-5, { min: 0 })).toBeTruthy();
    expect(checkNumber(NaN, { required: true })).toBeTruthy();
    expect(checkRate(1.5, 'Return')).toBeTruthy();
    const p = demoProfile(2026);
    p.about.fiAge = 20;
    p.preferences.targetAllocation = { ...p.preferences.targetAllocation, gold: 0.5 };
    const issues = validateProfile(p, DEFAULT_ASSUMPTIONS);
    expect(issues.some((i) => i.field === 'about.fiAge')).toBe(true);
    expect(issues.some((i) => i.field === 'preferences.targetAllocation')).toBe(true);
  });
  it('demo profile validates cleanly', () => {
    expect(validateProfile(demoProfile(2026), DEFAULT_ASSUMPTIONS).filter((i) => i.severity === 'error')).toEqual([]);
  });
});

describe('formatting', () => {
  it('uses Indian grouping and compact units', () => {
    expect(formatINR(1234567)).toBe('₹12,34,567');
    expect(formatCompact(1250000)).toBe('₹12.5 L');
    expect(formatCompact(23400000)).toBe('₹2.34 Cr');
    expect(formatINR(-500)).toBe('−₹500');
  });
});
