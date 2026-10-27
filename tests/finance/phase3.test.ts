import { describe, expect, it } from 'vitest';
import { simulate } from '@/finance/simulate';
import { reorderGoals } from '@/finance/goals';
import { DEFAULT_ASSUMPTIONS } from '@/state/demo';
// Engine mechanics are hand-checked against the previous demo persona (see tests/fixtures/legacyDemo.ts).
import { legacyDemoProfile as demoProfile } from '../fixtures/legacyDemo';
import { baselineComparison, computePlan, kpis, monthWaterfall } from '@/state/plan';

const close = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

describe('inflation spike (per-year inflation)', () => {
  it('matches the flat-inflation run when no year is overridden', () => {
    const p = demoProfile(2026);
    const a = simulate(p, DEFAULT_ASSUMPTIONS);
    const b = simulate(p, DEFAULT_ASSUMPTIONS, { inflationByYear: {} });
    expect(b.points.map((x) => x.netWorth)).toEqual(a.points.map((x) => x.netWorth));
  });
  it('8% for three years raises costs from the second year and leaves them higher', () => {
    const p = demoProfile(2026);
    const a = { ...DEFAULT_ASSUMPTIONS, lifestyleCreep: 0 }; // without creep every cost inflates at the year's rate
    const base = simulate(p, a);
    const spike = simulate(p, a, { inflationByYear: { 2027: 0.08, 2028: 0.08, 2029: 0.08 } });
    expect(spike.rows[0].expenses).toBeCloseTo(base.rows[0].expenses, 6);
    // Spending in 2027 grows 8% instead of 6%.
    close(spike.rows[1].expenses / spike.rows[0].expenses, 1.08, 1e-12);
    close(base.rows[1].expenses / base.rows[0].expenses, 1.06, 1e-12);
    expect(spike.points.at(-1)!.netWorthReal).toBeLessThan(base.points.at(-1)!.netWorthReal);
  });
});

describe('goal reordering', () => {
  it('ranks follow the dragged order and priority labels follow position', () => {
    const goals = demoProfile(2026).goals; // travel, mba, car
    const next = reorderGoals(goals, ['car', 'travel', 'mba']);
    const by = Object.fromEntries(next.map((g) => [g.id, g]));
    expect([by.car.rank, by.travel.rank, by.mba.rank]).toEqual([0, 1, 2]);
    expect([by.car.priority, by.travel.priority, by.mba.priority]).toEqual([1, 2, 3]);
  });
});

describe('baseline comparison', () => {
  it('is zero against itself and tracks a change', () => {
    const p = demoProfile(2026);
    const plan = computePlan(p, DEFAULT_ASSUMPTIONS);
    expect(baselineComparison(plan, { profile: p, assumptions: DEFAULT_ASSUMPTIONS }).finalDiff).toBe(0);
    const richer = structuredClone(p);
    richer.income.ctc = 1_500_000;
    const cmp = baselineComparison(computePlan(richer, DEFAULT_ASSUMPTIONS), { profile: p, assumptions: DEFAULT_ASSUMPTIONS });
    expect(cmp.finalDiff!).toBeGreaterThan(0);
    expect(cmp.points).toHaveLength(21);
  });
});

describe('overview selectors', () => {
  it('the waterfall runs from take-home down to the unassigned amount', () => {
    const plan = computePlan(demoProfile(2026), DEFAULT_ASSUMPTIONS);
    const bars = monthWaterfall(plan);
    close(bars[0].value, plan.cashflow.income);
    // Transfers can't exceed what is left, so an over-committed month ends at zero, not below.
    close(bars.at(-1)!.value, plan.cashflow.investableSurplus >= 0 ? Math.max(0, plan.cashflow.unallocated) : plan.cashflow.investableSurplus);
  });
  it('KPIs read the same numbers as the rest of the plan', () => {
    const plan = computePlan(demoProfile(2026), DEFAULT_ASSUMPTIONS);
    const k = Object.fromEntries(kpis(plan).map((x) => [x.key, x]));
    expect(k.netWorth.value).toBe(plan.sheet.netWorth);
    expect(k.savingsRate.value).toBe(plan.cashflow.savingsRate);
    expect(k.fiAge.value).toBe(plan.fi.fiAge);
    expect(k.netWorth.spark).toHaveLength(11);
  });
});
