import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { simulate } from '@/finance/simulate';
import { fiAnalysis } from '@/finance/fi';
import { ageInYear, yearAgeLabel } from '@/finance/timeline';
import { emptyAssetMap, rebalancePlan } from '@/finance/portfolio';
import { compareStrategies, strategyNote } from '@/finance/debt';
import { healthScore } from '@/finance/health';
import { hasDependents } from '@/finance/household';
import { ageError, fiAgeError, validateProfile } from '@/finance/validate';
import { DEFAULT_SCENARIO_DELTAS } from '@/finance/scenarios';
import { DEFAULT_ASSUMPTIONS, blankProfile } from '@/state/demo';
// Engine mechanics are hand-checked against the previous demo persona (see tests/fixtures/legacyDemo.ts).
import { legacyDemoProfile as demoProfile } from '../fixtures/legacyDemo';
import { computePlan, goalStatusLabel, heroSeries, landingScenarios, scenarioSet, yearInspector, yearOnYear } from '@/state/plan';
import { homeAffordability, answerWithRules } from '@/services/coach/ruleCoach';
import { routeMeta } from '@/routeMeta';
import { salaryBreakdown } from '@/finance/tax';
import { salaryInputs } from '@/finance/income';
import type { Assumptions, FinancialProfile } from '@/types/profile';

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

const zero: Assumptions = { ...DEFAULT_ASSUMPTIONS, inflation: 0, returns: emptyAssetMap(), sipStepUp: 0, sweepExcessCash: false, lifestyleCreep: 0, expenseRatios: emptyAssetMap(), epfRate: 0, postFiHealthcare: 0 };

/** ₹50k take-home, ₹25k spending, nothing invested, ₹1L cash, no reserve target in play. */
function simple(): FinancialProfile {
  const p = blankProfile(2026);
  p.income.monthlyTakeHome = 50000;
  p.income.salaryGrowth = 0;
  p.cashflow.essential = [{ id: 'e', label: 'Rent', amount: 20000 }];
  p.cashflow.lifestyle = [{ id: 'l', label: 'Fun', amount: 5000 }];
  p.position.cashSavings = 100000;
  p.position.retirement.returnRate = 0;
  p.protection.emergencyTargetMonths = 3;
  return p;
}

const demo = () => computePlan(demoProfile(2026), DEFAULT_ASSUMPTIONS);

describe('P1.1 one horizon, one age convention', () => {
  it('ages are measured on 1 January: the plan-start year is your current age', () => {
    const p = demoProfile(2026);
    expect(ageInYear(p, 2026)).toBe(26);
    expect(ageInYear(p, 2029)).toBe(29);
    expect(yearAgeLabel(p, 2029)).toBe('2029 · age 29');
  });

  it('a 20-year horizon has 21 points, 2026 to 2046, and every row uses the same ages', () => {
    const p = demoProfile(2026);
    const r = simulate(p, DEFAULT_ASSUMPTIONS);
    expect(r.rows).toHaveLength(20);
    expect(r.points).toHaveLength(21);
    expect(r.points[0]).toMatchObject({ year: 2026, age: 26 });
    expect(r.points.at(-1)).toMatchObject({ year: 2046, age: 46 });
    for (const row of r.rows) expect(row.age).toBe(ageInYear(p, row.year));
    // Row 2026 is labelled age 26 (it was 27 before the fix).
    expect(r.rows[0]).toMatchObject({ year: 2026, age: 26 });
  });

  it('the MBA event, its simulator row and its label agree on the age', () => {
    const p = demoProfile(2026);
    const mba = p.lifeEvents.find((e) => e.id === 'mbabreak')!;
    const row = simulate(p, DEFAULT_ASSUMPTIONS).rows.find((r) => r.year === mba.year)!;
    expect(yearAgeLabel(p, mba.year)).toBe(`2029 · age ${row.age}`);
  });

  it('FI year and age use the same convention on every surface', () => {
    const plan = demo();
    const fi = plan.fi;
    expect(fi.targetYear).toBe(2050); // the year Riya turns 50
    if (fi.fiYear !== null) {
      expect(fi.fiAge).toBe(ageInYear(plan.profile, fi.fiYear));
      const hero = heroSeries(plan);
      const onChart = hero.milestones.find((m) => m.label === 'Work becomes optional');
      const shown = onChart ?? hero.fiBeyond;
      expect(shown).toMatchObject({ year: fi.fiYear, age: fi.fiAge });
    }
  });

  it('the year inspector labels a year with the age on 1 January', () => {
    const insp = yearInspector(demo(), 2030)!;
    expect(insp.label).toBe('2030 · age 30');
  });
});

describe('P1.2 + P1.12 one headline figure everywhere', () => {
  it('every "base case, today’s ₹, final year" surface returns the identical value', () => {
    const plan = demo();
    const v = plan.headline.netWorthReal;
    const hero = heroSeries(plan);
    expect(hero.end.netWorthReal).toBe(v); // landing hero card
    expect(hero.points.at(-1)).toBe(v); // landing hero chart
    for (const s of landingScenarios(plan)) {
      expect(s.baseFinal).toBe(v); // "vs ₹X base case" on the landing scenarios
      expect(s.data.at(-1)!.base).toBe(v);
    }
    expect(plan.sim.points.slice(0, 21).at(-1)!.netWorthReal).toBe(v); // Overview trajectory, 20Y
    expect(scenarioSet(plan, DEFAULT_SCENARIO_DELTAS).base.points.at(-1)!.netWorthReal).toBe(v); // Simulator + Risk Lab baseline
    expect(plan.headline.year).toBe(2046);
  });

  it('the landing hero chart plots the dashboard projection, not illustrative points', () => {
    const plan = demo();
    expect(heroSeries(plan).points).toEqual(plan.sim.points.map((p) => p.netWorthReal));
  });
});

describe('P1.3 unaffordable goals are paid by a loan or flagged, never silently dropped', () => {
  it('a mixed goal uses spare savings first and borrows the rest', () => {
    const p = simple(); // ₹1L cash; reserve 3 × ₹20k = ₹60k, so ₹40k is spare
    p.goals = [{ id: 'g', name: 'Course', category: 'education', cost: 500000, targetYear: 2026, saved: 0, priority: 1, inflation: 0, source: 'savings', fundingMode: 'mixed', loan: { rate: 0, tenureYears: 10, moratoriumMonths: 0 } }];
    const g = simulate(p, zero, { years: 1 }).rows[0].goals[0];
    expect(g.status).toBe('financed');
    close(g.fromSavings, 40000);
    close(g.loan, 460000);
  });

  it('education loans accrue interest through the moratorium, then amortise (hand-checked)', () => {
    const p = simple();
    p.goals = [{ id: 'g', name: 'MBA', category: 'education', cost: 1_000_000, targetYear: 2026, saved: 0, priority: 1, inflation: 0, source: 'savings', fundingMode: 'loan', loan: { rate: 0.12, tenureYears: 1, moratoriumMonths: 12 } }];
    const r = simulate(p, zero, { years: 2 });
    // 1% a month for 12 months: 10,00,000 × 1.01^12 = 11,26,825.03, nothing repaid in 2026.
    close(r.rows[0].liabilities, 1_126_825.03, 1e-8);
    close(r.rows[0].interestPaid, 126_825.03, 1e-7);
    expect(r.rows[0].debtPayments).toBe(0);
    // Then 12 EMIs of 1,00,117.04 clear it in 2027.
    close(r.rows[1].debtPayments, 12 * 100_117.04, 1e-7);
    // The loan is gone; anything left is the overdraft from EMIs larger than the surplus.
    close(r.rows[1].liabilities, Math.max(0, -r.rows[1].cash), 1e-9);
  });

  it('goal loans default to 10.5% / 7 years / 12-month moratorium for education and 9.5% / 5 years for cars', () => {
    const p = simple();
    p.goals = [
      { id: 'e', name: 'Degree', category: 'education', cost: 100000, targetYear: 2026, saved: 0, priority: 1, inflation: 0, source: 'savings', fundingMode: 'loan' },
      { id: 'c', name: 'Car', category: 'car', cost: 100000, targetYear: 2026, saved: 0, priority: 2, inflation: 0, source: 'savings', fundingMode: 'loan' },
    ];
    const row = simulate(p, zero, { years: 1 }).rows[0];
    // Education: 12 months of 10.5%/12 added to the balance. Car: 12 EMIs of a 5-year 9.5% loan.
    const edu = 100000 * Math.pow(1 + 0.105 / 12, 12);
    const i = 0.095 / 12;
    const carEmi = (100000 * i) / (1 - Math.pow(1 + i, -60));
    expect(row.debtPayments).toBeCloseTo(12 * carEmi, 4);
    expect(row.liabilities).toBeGreaterThan(edu); // plus the car balance still owed
  });

  it('defaults: education and home goals are mixed, others savings-only', () => {
    const plan = demo();
    const mba = plan.goalViews.find((v) => v.goal.id === 'mba')!;
    expect(mba.status).toBe('financed');
    expect(mba.outcome!.loan).toBeGreaterThan(0);
    close(mba.outcome!.fromSavings + mba.outcome!.loan, mba.outcome!.cost);
  });

  it('a savings-only goal that can’t be paid drops the events that depend on it, and Overview flags it', () => {
    const p = demoProfile(2026);
    p.goals.find((g) => g.id === 'mba')!.fundingMode = 'savings';
    const plan = computePlan(p, DEFAULT_ASSUMPTIONS);
    expect(plan.sim.skippedEvents.map((e) => e.label).sort()).toEqual(['Full-time MBA', 'Post-MBA role']);
    expect(plan.sim.rows.flatMap((r) => r.events)).not.toContain('Post-MBA role');
    const banner = plan.unfundedGoals.find((u) => u.goalId === 'mba')!;
    expect(banner.droppedEvents).toEqual(expect.arrayContaining(['Full-time MBA', 'Post-MBA role']));
    // Without the break, the 2029 salary is earned.
    expect(plan.sim.rows.find((r) => r.year === 2029)!.income).toBeGreaterThan(0);
  });

  it('“Keep these events anyway” keeps them and says so', () => {
    const p = demoProfile(2026);
    const mba = p.goals.find((g) => g.id === 'mba')!;
    mba.fundingMode = 'savings';
    mba.keepEventsIfUnfunded = true;
    const plan = computePlan(p, DEFAULT_ASSUMPTIONS);
    expect(plan.sim.skippedEvents).toHaveLength(0);
    expect(plan.unfundedGoals.find((u) => u.goalId === 'mba')!.keptEvents).toContain('Post-MBA role');
  });

  it('a mixed goal keeps back living costs for a linked career break, so the loan pays the fees', () => {
    const plan = demo();
    const o = plan.goalViews.find((v) => v.goal.id === 'mba')!.outcome!;
    // 21 months of essentials, lifestyle and EMIs exceed Riya’s spare savings, so the loan covers the fees.
    expect(o.loan).toBeCloseTo(o.cost, 6);
  });
});

describe('P1.4 one status per goal card', () => {
  it('status and label come from the whole-plan projection', () => {
    const plan = demo();
    const japan = plan.goalViews.find((v) => v.goal.id === 'travel')!;
    expect(japan.status).toBe('funded');
    expect(goalStatusLabel(japan, String)).toBe('Paid from savings in 2027');
    for (const v of plan.goalViews) {
      if (!v.outcome) continue;
      const expected = v.outcome.status === 'shortfall' ? 'unfunded' : v.outcome.status;
      expect(v.status).toBe(expected);
      close(v.split.savings + v.split.loan + v.split.gap, 1);
    }
  });
});

describe('P1.5 coach home maths come from simulate()', () => {
  it('reads balances on 1 January of the target year and that year’s take-home (hand-checked EMI)', () => {
    const plan = demo();
    const h = homeAffordability(plan, 'Can I afford a home in five years?');
    expect(h.year).toBe(2031);
    const before = plan.sim.rows.find((r) => r.year === 2030)!;
    const during = plan.sim.rows.find((r) => r.year === 2031)!;
    close(h.liquid, before.portfolio + Math.max(0, before.cash));
    close(h.takeHome, during.income / 12);
    // ₹60 L × 1.05^5 = ₹76,57,689.38; 80% loan = ₹61,26,151.50; 8.0% over 20 years → ₹51,241.59 a month.
    close(h.priceThen, 7_657_689.38, 1e-9);
    close(h.emi, 51_241.59, 1e-7);
    close(h.emiShare, (h.emi + h.existingEmi) / h.takeHome);
    // 2031 take-home comes from the 2031 CTC: ₹11.4 L × 1.08^5 × 1.5 after the post-MBA raise.
    const ctc2031 = 1_140_000 * Math.pow(1.08, 5) * 1.5;
    close(during.income, salaryBreakdown(salaryInputs(plan.profile, ctc2031)).takeHome, 1e-9);
    expect(h.emiShare).toBeLessThan(1); // was reported as 248% before the fix
  });

  it('parses a price and a calendar year', () => {
    const h = homeAffordability(demo(), 'Can I afford a ₹75 L flat in 2031?');
    expect(h.year).toBe(2031);
    expect(h.priceToday).toBe(7_500_000);
  });

  it('the answer quotes the same figures', () => {
    const plan = demo();
    const h = homeAffordability(plan, 'home in 5 years');
    const text = answerWithRules('Can I afford a home in 5 years?', plan).text;
    expect(text).toContain('On 1 January 2031');
    expect(text).toContain(`${Math.round(h.emiShare * 100)}% of your projected 2031 take-home`);
  });
});

describe('P1.6 year-on-year change never divides by zero', () => {
  it('handles a zero base', () => {
    expect(yearOnYear(0, 50000)).toEqual({ kind: 'resumed' });
    expect(yearOnYear(0, 0)).toEqual({ kind: 'na' });
    expect(yearOnYear(null, 10)).toEqual({ kind: 'na' });
    expect(yearOnYear(100, 108)).toEqual({ kind: 'pct', value: expect.closeTo(0.08, 10) });
  });
  it('the demo’s first year back from the MBA says “resumes after break”', () => {
    const plan = demo();
    expect(plan.sim.rows.find((r) => r.year === 2029)!.income).toBe(0);
    expect(yearInspector(plan, 2030)!.incomeChange).toEqual({ kind: 'resumed' });
  });
});

describe('P1.7 onboarding validation', () => {
  it('age must be 18–70', () => {
    expect(ageError(17)).not.toBeNull();
    expect(ageError(200)).not.toBeNull();
    expect(ageError(Number.NaN)).not.toBeNull();
    expect(ageError(18)).toBeNull();
    expect(ageError(70)).toBeNull();
  });
  it('FI age must be at least age + 5 and at most 75', () => {
    expect(fiAgeError(16, 17)).not.toBeNull();
    expect(fiAgeError(29, 25)).not.toBeNull();
    expect(fiAgeError(30, 25)).toBeNull();
    expect(fiAgeError(75, 25)).toBeNull();
    expect(fiAgeError(76, 25)).not.toBeNull();
  });
  it('the whole-profile check rejects age 17 with FI at 16', () => {
    const p = demoProfile(2026);
    p.about.age = 17;
    p.about.fiAge = 16;
    expect(validateProfile(p, DEFAULT_ASSUMPTIONS).filter((i) => i.severity === 'error').map((i) => i.field)).toContain('about.age');
  });
});

describe('P1.8 support to parents counts as dependents', () => {
  it('the demo sends money home, so term cover is scored', () => {
    const p = demoProfile(2026);
    expect(p.about.dependents).toBe(0);
    expect(hasDependents(p)).toBe(true);
    const prot = healthScore(p, DEFAULT_ASSUMPTIONS).components.find((c) => c.key === 'protection')!;
    expect(prot.detail).not.toContain('not essential');
    expect(prot.score).toBe(25); // ₹5 L of the ₹10 L metro health benchmark earns 25; no term cover earns 0
  });
  it('answering “no” to the parents question turns it off', () => {
    const p = demoProfile(2026);
    p.about.parentsAsDependents = false;
    expect(hasDependents(p)).toBe(false);
    expect(healthScore(p, DEFAULT_ASSUMPTIONS).components.find((c) => c.key === 'protection')!.score).toBe(75); // term credited in full
  });
});

describe('P1.9 rebalancing never sells locked assets', () => {
  it('PPF/EPF/NPS above target are held, not reduced, and new SIP money closes the gap', () => {
    const p = demoProfile(2026);
    const plan = rebalancePlan(p.position.holdings, p.preferences.targetAllocation, 15000);
    const govt = plan.rows.find((r) => r.asset === 'govtSchemes')!;
    // ₹50,000 held vs 5% of ₹4,40,000 = ₹22,000: ₹28,000 over target, but locked.
    close(govt.trade, -28000);
    expect(govt.action).toBe('locked');
    expect(govt.newMoneyMonthly).toBe(0);
    expect(plan.rows.every((r) => r.action !== 'pause' || !r.locked)).toBe(true);
    close(plan.rows.reduce((s, r) => s + r.newMoneyMonthly, 0), 15000);
    expect(plan.monthsToTarget).toBeGreaterThan(0);
  });
  it('ELSS units still in lock-in are reported', () => {
    const p = demoProfile(2026);
    const row = rebalancePlan(p.position.holdings, p.preferences.targetAllocation, 15000, 40000).rows.find((r) => r.asset === 'indianEquity')!;
    expect(row.lockedValue).toBe(40000);
  });
});

describe('P1.10 avalanche vs snowball explanation', () => {
  it('explains why both orders match for the demo', () => {
    const loans = demoProfile(2026).liabilities;
    const note = strategyNote(loans, compareStrategies(loans, 2000));
    expect(note).toBe('Your credit card is both the smallest balance and the highest rate, so both methods pay it first.');
  });
  it('says nothing when the orders differ', () => {
    const loans = [
      { id: 'a', kind: 'personal' as const, label: 'Small', balance: 10000, rate: 0.1, emi: 1000 },
      { id: 'b', kind: 'creditCard' as const, label: 'Card', balance: 50000, rate: 0.36, emi: 3000 },
    ];
    expect(strategyNote(loans, compareStrategies(loans, 1000))).toBeNull();
  });
});

describe('P1.11 + P1.13 copy and routes', () => {
  it('“without a job” is gone', () => {
    expect(readFileSync('src/pages/app/Overview.tsx', 'utf8')).not.toContain('without a job');
  });
  it('every route has its own title and description', () => {
    const paths = ['/', '/how-it-works', '/features', '/tools', '/learn', '/legal', '/about', '/start', '/app', '/app/health', '/app/budget', '/app/emergency-debt', '/app/goals', '/app/portfolio', '/app/sip', '/app/simulator', '/app/life-events', '/app/risk-lab', '/app/fi', '/app/coach', '/app/learn', '/app/settings'];
    const titles = paths.map((p) => routeMeta(p).title);
    const descriptions = paths.map((p) => routeMeta(p).description);
    expect(new Set(titles).size).toBe(paths.length);
    expect(new Set(descriptions).size).toBe(paths.length);
  });
  it('the public nav no longer links to /sign-in', () => {
    expect(readFileSync('src/components/layout/PublicLayout.tsx', 'utf8')).not.toContain('/sign-in');
  });
});

describe('FI uses the shared simulation', () => {
  it('fiAnalysis and simulate report the same FI date', () => {
    const p = demoProfile(2026);
    const fi = fiAnalysis(p, DEFAULT_ASSUMPTIONS);
    expect(fi.fiYear).toBe(fi.sim.fiYear);
    expect(fi.fiAge).toBe(fi.sim.fiAge);
  });
});
