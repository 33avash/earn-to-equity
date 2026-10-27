import { describe, expect, it } from 'vitest';
import { quickStartProfile, type QuickStartInput } from '@/state/quickstart';
import { planAccuracy } from '@/finance/accuracy';
import { currentSalary } from '@/finance/income';
import { simulate } from '@/finance/simulate';
import { validateProfile } from '@/finance/validate';
import { DEFAULT_ASSUMPTIONS, demoProfile } from '@/state/demo';

const base: QuickStartInput = { age: 24, pay: 1_000_000, takeHome: false, city: 'pune', spending: 35_000, rent: 15_000, goal: 'car', goalYear: 2030, goalCost: 800_000 };

describe('quick start', () => {
  it('builds a full profile from five answers with the Labour Codes defaults', () => {
    const p = quickStartProfile(base, 2026);
    expect(p.quickStart).toBe(true);
    expect(p.about).toMatchObject({ age: 24, city: 'pune', cityTier: 1 });
    expect(p.income).toMatchObject({ mode: 'ctc', ctc: 1_000_000 });
    expect(p.income.salary).toMatchObject({ basicShare: 0.5, gratuityInCtc: true, regime: 'auto', state: 'MH' });
    expect(p.cashflow.essential.map((l) => [l.id, l.amount])).toEqual([
      ['rent', 15_000],
      ['living', 20_000],
    ]);
    expect(p.goals).toHaveLength(1);
    expect(p.goals[0]).toMatchObject({ category: 'car', targetYear: 2030, cost: 800_000, fundingMode: 'savings' });
    expect(validateProfile(p, DEFAULT_ASSUMPTIONS).filter((i) => i.severity === 'error')).toEqual([]);
    expect(currentSalary(p)!.monthlyInHand).toBeGreaterThan(60_000);
    expect(simulate(p, DEFAULT_ASSUMPTIONS).rows).toHaveLength(20);
  });
  it('without a split, spending is one line and no HRA is assumed', () => {
    const p = quickStartProfile({ ...base, rent: 0 }, 2026);
    expect(p.cashflow.essential).toEqual([{ id: 'living', label: 'Rent and other spending', amount: 35_000 }]);
    expect(currentSalary(p)!.hraExemption).toBe(0);
  });
  it('early retirement sets the FI age instead of adding a goal', () => {
    const p = quickStartProfile({ ...base, goal: 'fi', goalYear: 2050 }, 2026);
    expect(p.goals).toEqual([]);
    expect(p.about.fiAge).toBe(48);
  });
  it('take-home mode skips the CTC maths', () => {
    const p = quickStartProfile({ ...base, takeHome: true, pay: 70_000 }, 2026);
    expect(p.income).toMatchObject({ mode: 'takeHome', monthlyTakeHome: 70_000 });
  });
});

describe('plan accuracy', () => {
  it('a quick-start plan is far from complete and lists what to add, weighted by effect on FI age', () => {
    const acc = planAccuracy(quickStartProfile(base, 2026), DEFAULT_ASSUMPTIONS);
    expect(acc.score).toBeLessThan(0.5);
    const missing = acc.items.filter((i) => !i.filled).map((i) => i.key);
    expect(missing).toEqual(expect.arrayContaining(['salary', 'savings', 'loans', 'insurance', 'epf', 'goals']));
    for (const i of acc.items) expect(i.weight).toBeGreaterThan(0);
    // Insurance doesn't move the projection, only plan health.
    const ins = acc.items.find((i) => i.key === 'insurance')!;
    expect(ins.fiYears).toBe(0);
    expect(ins.healthPoints).toBeGreaterThan(0);
  });
  it('the demo plan, entered in full, scores high', () => {
    const acc = planAccuracy(demoProfile(2026), DEFAULT_ASSUMPTIONS);
    expect(acc.score).toBeGreaterThanOrEqual(0.9);
  });
});
