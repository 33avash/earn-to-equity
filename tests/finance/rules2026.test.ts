import { describe, expect, it } from 'vitest';
import { DEFAULT_SALARY, hraExemption, incomeTax, salaryBreakdown } from '@/finance/tax';
import { simulate } from '@/finance/simulate';
import { monteCarlo, blockBootstrap, mulberry32, NIFTY_TRI } from '@/finance/montecarlo';
import { correlationProblem, netReturns, portfolioVolatility, PRESETS, DEFAULT_VOLATILITY } from '@/finance/portfolio';
import { regularPlanCost } from '@/finance/costs';
import { sectionLabel, SECTIONS } from '@/finance/sections';
import { isHraMetro } from '@/finance/cities';
import { CORRELATIONS, EPF_RULES, GRATUITY, HOME_LOAN_RATE } from '@/finance/assumptions';
import { DEFAULT_ASSUMPTIONS, blankProfile, demoProfile } from '@/state/demo';
import type { FinancialProfile } from '@/types/profile';

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.max(tol, Math.abs(b) * tol));
const GRATUITY_RATE = 15 / 26 / 12;

describe('EPF ceiling ₹25,000 (from 17 Sep 2026)', () => {
  it('PF on the capped wage is 12% of ₹25,000 = ₹3,000 a month; EPS 8.33% of ₹25,000', () => {
    expect(EPF_RULES.value.wageCeiling).toBe(25000);
    const b = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 2_400_000, pfOnWageCeiling: true });
    close(b.employeePf / 12, 3_000);
    close(b.eps / 12, 2_082.5);
  });
});

describe('Labour Codes CTC structure (₹12 L CTC, basic 50%)', () => {
  const b = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 1_200_000 });
  it('gratuity is 15/26 × 1/12 of basic ≈ 4.81% of ₹6 L ≈ ₹28,846', () => {
    close(b.basic, 600_000);
    close(GRATUITY.value.rate, GRATUITY_RATE);
    close(b.gratuity, 600_000 * GRATUITY_RATE);
    expect(Math.abs(b.gratuity - 0.0481 * 600_000)).toBeLessThan(20);
  });
  it('monthly in-hand drops by the extra PF on both sides plus gratuity, against basic 40% with no gratuity', () => {
    const old = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 1_200_000, basicShare: 0.4, gratuityInCtc: false });
    // Old: (₹12 L − 2 × ₹57,600 PF − ₹2,500 PT) / 12 = ₹90,191.67, no tax.
    close(old.monthlyInHand, (1_200_000 - 2 * 57_600 - 2_500) / 12);
    // New: (₹12 L − 2 × ₹72,000 PF − ₹28,846.15 gratuity − ₹2,500 PT) / 12 = ₹85,387.82, no tax.
    close(b.monthlyInHand, (1_200_000 - 2 * 72_000 - 600_000 * GRATUITY_RATE - 2_500) / 12);
    // The drop, ₹4,803.85 a month, is ₹14,400 more PF from each side plus the gratuity provision.
    close(old.monthlyInHand - b.monthlyInHand, (2 * 14_400 + 600_000 * GRATUITY_RATE) / 12);
    expect(b.tax).toBe(0);
  });
  it('with no variable pay, gratuity in CTC changes take-home by exactly the gratuity', () => {
    const out = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 1_200_000, gratuityInCtc: false });
    close(out.annualCash - b.annualCash, b.gratuity);
    close(out.gratuity, b.gratuity); // still earned either way
  });
  it('variable pay is part of CTC, paid once a year at target × payout and kept out of the monthly figure', () => {
    const v = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 1_200_000, variablePay: { targetShare: 0.1, expectedPayout: 0.8 } });
    close(v.variableTarget, 120_000);
    close(v.variablePaid, 96_000);
    close(v.fixedGross, b.fixedGross - 120_000);
    close(v.monthlyInHand * 12 + v.variableNet, v.annualCash);
    close(v.annualCash, v.gross - v.employeePf - v.professionalTax - v.tax);
  });
});

describe('employer NPS (Sec 124, old 80CCD(2))', () => {
  it('14% of basic lowers new-regime tax by 30% × 1.04 of the contribution at the top slab', () => {
    const base = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 3_000_000, regime: 'new' });
    const nps = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 3_000_000, regime: 'new', employerNpsShare: 0.14 });
    close(nps.employerNps, 210_000);
    close(base.taxNew - nps.taxNew, 210_000 * 0.3 * 1.04);
    close(nps.fixedGross, base.fixedGross - 210_000);
  });
  it('employer PF + NPS above ₹7.5 L a year is taxed as salary', () => {
    const b = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 10_000_000, employerNpsShare: 0.14, regime: 'new' });
    // Basic ₹50 L: employer PF ₹6 L + NPS ₹7 L = ₹13 L, ₹5.5 L over the cap.
    close(b.perquisiteExcess, 550_000);
    close(b.taxable, b.fixedGross + b.employerNps + 550_000 - 75_000 - 700_000);
  });
  it('the old regime allows only 10% of basic', () => {
    const b = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 3_000_000, regime: 'old', employerNpsShare: 0.14 });
    const none = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 3_000_000, regime: 'old' });
    // The ₹2.1 L comes out of the same CTC, so salary is unchanged; the old regime deducts only 10% of basic, ₹1.5 L.
    close(none.taxable - b.taxable, 150_000);
  });
});

describe('HRA exemption, calculated (hand-worked)', () => {
  it('metro, rent binds: least of ₹2.4 L, ₹3 L − ₹60,000 and ₹3 L is ₹2.4 L', () => close(hraExemption(240_000, 300_000, 600_000, true), 240_000));
  it('non-metro: least of ₹1.6 L, ₹1.8 L − ₹40,000 and 40% × ₹4 L is ₹1.4 L', () => close(hraExemption(160_000, 180_000, 400_000, false), 140_000));
  it('metro, the 50% cap binds: least of ₹2 L, ₹4.8 L − ₹30,000 and ₹1.5 L is ₹1.5 L', () => close(hraExemption(200_000, 480_000, 300_000, true), 150_000));
  it('rent below 10% of basic gives nothing', () => expect(hraExemption(200_000, 50_000, 600_000, true)).toBe(0));
  it('Pune, Bengaluru, Hyderabad and Ahmedabad use the 50% rule; Gurugram does not', () => {
    for (const c of ['pune', 'bengaluru', 'hyderabad', 'ahmedabad', 'mumbai'] as const) expect(isHraMetro(c)).toBe(true);
    expect(isHraMetro('gurugram')).toBe(false);
    expect(isHraMetro(undefined)).toBe(false);
  });
  it('a typed-in HRA figure overrides the calculation', () => {
    const b = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 1_800_000, rentMonthly: 30_000, hraExemption: 12_345 });
    expect(b.hraExemption).toBe(12_345);
  });
});

describe('old-regime deductions', () => {
  it('parents’ health cover: ₹25,000, or ₹50,000 when a parent is a senior citizen', () => {
    const a = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 2_000_000, regime: 'old', sec80DParents: 60_000 });
    const s = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 2_000_000, regime: 'old', sec80DParents: 60_000, parentsSenior: true });
    close(a.taxable - s.taxable, 25_000);
  });
  it('own NPS: up to ₹50,000 more, and it comes out of take-home', () => {
    const none = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 2_000_000, regime: 'old' });
    const b = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 2_000_000, regime: 'old', ownNpsYearly: 80_000 });
    close(none.taxable - b.taxable, 50_000);
    expect(b.monthlyInHand).toBeLessThan(none.monthlyInHand);
  });
  it('home-loan interest is capped at ₹2 L; principal counts towards ₹1.5 L', () => {
    const b = salaryBreakdown({ ...DEFAULT_SALARY, ctc: 2_000_000, regime: 'old', homeLoanInterest: 350_000, homeLoanPrincipal: 200_000 });
    expect(b.homeLoanInterestDeduction).toBe(200_000);
    expect(b.sec123Deduction).toBe(150_000);
  });
});

describe('regime per year with a home loan', () => {
  /** ₹18 L CTC, renting in Mumbai at ₹30,000 a month, with every old-regime deduction used. */
  function renter(buy: boolean): FinancialProfile {
    const p = blankProfile(2026);
    p.about.age = 28;
    p.about.city = 'mumbai';
    p.income = { ...p.income, mode: 'ctc', ctc: 1_800_000, salaryGrowth: 0.06, salary: { other80C: 150_000, sec80D: 25_000, ownNpsYearly: 50_000, sec80DParents: 50_000, parentsSenior: true } };
    p.cashflow.essential = [
      { id: 'rent', label: 'Rent', amount: 30_000 },
      { id: 'g', label: 'Groceries', amount: 20_000 },
    ];
    p.position.cashSavings = 3_000_000;
    if (buy)
      // A flat in the home town: family lives there and you keep renting where you work.
      p.lifeEvents = [
        { id: 'h', kind: 'homePurchase', label: 'Flat', year: 2030, oneTimeCost: 0, incomeChangePct: 0, monthlyExpenseChange: 0, breakMonths: 0, home: { propertyValue: 15_000_000, downPaymentPct: 0.2, loanRate: HOME_LOAN_RATE.value, tenureYears: 20, state: 'MH', moveIn: false } },
      ];
    return p;
  }
  it('flips from new to old in the year the loan starts, and not without it', () => {
    const withLoan = simulate(renter(true), DEFAULT_ASSUMPTIONS, { years: 10 });
    expect(withLoan.rows.find((r) => r.regime === 'old')?.year).toBe(2030);
    expect(withLoan.rows.filter((r) => r.year < 2030).every((r) => r.regime === 'new')).toBe(true);
    expect(withLoan.rows.find((r) => r.year === 2030)!.tax!.homeLoanInterest).toBe(200_000);
    const noLoan = simulate(renter(false), DEFAULT_ASSUMPTIONS, { years: 10 });
    expect(noLoan.rows.every((r) => r.regime === 'new')).toBe(true);
  });
  it('moving into the flat ends HRA, so the new regime stays cheaper', () => {
    const p = renter(true);
    p.lifeEvents[0].home!.moveIn = true;
    expect(simulate(p, DEFAULT_ASSUMPTIONS, { years: 10 }).rows.every((r) => r.regime === 'new')).toBe(true);
  });
});

describe('projection flows', () => {
  it('variable pay arrives in the year, gratuity accrues outside net worth, NPS builds a locked balance', () => {
    const p = demoProfile(2026);
    p.income.salary = { ...p.income.salary, variablePay: { targetShare: 0.1, expectedPayout: 0.8 }, employerNpsShare: 0.1 };
    const r = simulate(p, DEFAULT_ASSUMPTIONS, { years: 2 });
    close(r.rows[0].tax!.variablePaid, p.income.ctc! * 0.08);
    expect(r.rows[1].gratuity).toBeGreaterThan(r.rows[0].gratuity);
    expect(r.rows[0].nps).toBeGreaterThan(0);
    close(r.rows[0].netWorth, r.rows[0].totalAssets - r.rows[0].liabilities);
  });
});

describe('Monte Carlo realism', () => {
  it('block bootstrap takes runs of three consecutive years and wraps at the end', () => {
    const series = [1, 2, 3, 4, 5];
    const draws = blockBootstrap(mulberry32(7), series, 30);
    for (let i = 0; i < 30; i += 3) {
      const a = series.indexOf(draws[i]);
      expect(draws[i + 1]).toBe(series[(a + 1) % 5]);
      expect(draws[i + 2]).toBe(series[(a + 2) % 5]);
    }
    expect(blockBootstrap(mulberry32(7), series, 30)).toEqual(draws);
  });
  it('the historical model stays seeded and deterministic', () => {
    const p = demoProfile(2026);
    const a = monteCarlo(p, DEFAULT_ASSUMPTIONS, { paths: 120, model: 'historical' });
    const b = monteCarlo(p, DEFAULT_ASSUMPTIONS, { paths: 120, model: 'historical' });
    expect(a.finalP50).toBe(b.finalP50);
    expect(NIFTY_TRI.series.length).toBe(21);
  });
  it('the default correlation matrix is valid; a contradictory one is rejected', () => {
    expect(correlationProblem(CORRELATIONS.value)).toBeNull();
    const bad = CORRELATIONS.value.map((r) => [...r]);
    // Indian equity tied closely to both international equity and debt, while those two move opposite: impossible.
    bad[0][1] = bad[1][0] = 0.9;
    bad[0][2] = bad[2][0] = 0.9;
    bad[1][2] = bad[2][1] = -0.9;
    expect(correlationProblem(bad)).toMatch(/positive semi-definite/);
    expect(correlationProblem([[1]])).toMatch(/7 × 7/);
  });
  it('volatility uses the matrix: zero correlation gives the square root of summed variances', () => {
    const w = { ...PRESETS.growth.weights };
    const identity = CORRELATIONS.value.map((r, i) => r.map((_, j) => (i === j ? 1 : 0)));
    const expected = Math.sqrt(Object.entries(w).reduce((s, [k, x]) => s + (x * DEFAULT_VOLATILITY[k as keyof typeof w]) ** 2, 0));
    close(portfolioVolatility(w, DEFAULT_VOLATILITY, identity), expected);
    expect(portfolioVolatility(w, DEFAULT_VOLATILITY)).toBeGreaterThan(expected);
  });
});

describe('regular plans and the rupee', () => {
  it('regular plans add 0.75 points on equity and 0.4 on debt to fund costs', () => {
    const direct = netReturns(DEFAULT_ASSUMPTIONS);
    const regular = netReturns(DEFAULT_ASSUMPTIONS, 1);
    close(direct.indianEquity - regular.indianEquity, 0.0075);
    close(direct.debt - regular.debt, 0.004);
    expect(regular.govtSchemes).toBe(direct.govtSchemes);
  });
  it('the 20-year cost of regular plans is positive and grows with the share held', () => {
    const p = demoProfile(2026);
    const half = regularPlanCost(p, DEFAULT_ASSUMPTIONS, 0.5);
    const all = regularPlanCost(p, DEFAULT_ASSUMPTIONS, 1);
    expect(half.nominal).toBeGreaterThan(0);
    expect(all.nominal).toBeGreaterThan(half.nominal);
    expect(all.real).toBeLessThan(all.nominal);
  });
  it('rupee depreciation adds to international equity only', () => {
    const fx = netReturns({ ...DEFAULT_ASSUMPTIONS, inrDepreciation: 0.02 });
    const base = netReturns(DEFAULT_ASSUMPTIONS);
    close(fx.intlEquity - base.intlEquity, (1 + DEFAULT_ASSUMPTIONS.returns.intlEquity) * 0.02);
    expect(fx.indianEquity).toBe(base.indianEquity);
  });
});

describe('section numbers under the Income-tax Act, 2025', () => {
  it('labels show the new number with the old one, or only the old one when unconfirmed', () => {
    expect(sectionLabel('80C')).toBe('Sec 123 (old 80C)');
    expect(sectionLabel('87A')).toBe('Sec 156 (old 87A)');
    expect(sectionLabel('115BAC')).toBe('Sec 202 (old 115BAC)');
    expect(sectionLabel('10(13A)')).toBe('Sec 10(13A)');
    for (const m of Object.values(SECTIONS)) expect(m.source).toMatch(/^https:\/\//);
  });
  it('the renumbering leaves the maths alone: ₹12 L taxable pays nothing in the new regime', () => expect(incomeTax(1_200_000, 'new')).toBe(0));
});
