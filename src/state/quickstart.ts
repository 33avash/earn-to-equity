import type { FinancialProfile, Goal, GoalCategory } from '@/types/profile';
import { CITIES, type CityKey } from '@/finance/cities';
import { defaultFundingMode } from '@/finance/goalFunding';
import { EDUCATION_INFLATION } from '@/finance/assumptions';
import { blankProfile } from './demo';

/** The goals the quick start offers. Early retirement sets the FI age instead of adding a goal. */
export type QuickGoal = 'home' | 'car' | 'education' | 'wedding' | 'fi';

export const QUICK_GOALS: Record<QuickGoal, { label: string; category: GoalCategory | null; cost: number; years: number; inflation: number }> = {
  home: { label: 'Home down payment', category: 'home', cost: 2_000_000, years: 8, inflation: 0.06 },
  car: { label: 'Car', category: 'car', cost: 800_000, years: 4, inflation: 0.05 },
  education: { label: 'Higher studies', category: 'education', cost: 1_500_000, years: 3, inflation: EDUCATION_INFLATION.value },
  wedding: { label: 'Wedding', category: 'wedding', cost: 1_000_000, years: 5, inflation: 0.06 },
  fi: { label: 'Early retirement', category: null, cost: 0, years: 24, inflation: 0 },
};

export interface QuickStartInput {
  age: number;
  /** Annual CTC, or monthly take-home when `takeHome` is true. */
  pay: number;
  takeHome: boolean;
  city: CityKey;
  /** Monthly spending: rent plus everything else. */
  spending: number;
  /** Optional split: the rent part of `spending`. Rent sets the HRA exemption. */
  rent?: number;
  goal: QuickGoal;
  goalYear: number;
  goalCost: number; // today's rupees; ignored for early retirement
}

/**
 * A full profile from five answers. Everything not asked starts from the planner's defaults: Labour Codes
 * salary structure, the cheaper regime each year, a 6-month emergency target, a balanced example mix and
 * nothing invested yet, so the plan shows what a first-salary earner starts from.
 */
export function quickStartProfile(q: QuickStartInput, startYear = new Date().getFullYear()): FinancialProfile {
  const p = blankProfile(startYear);
  const city = CITIES[q.city];
  p.about.age = q.age;
  p.about.city = q.city;
  p.about.cityTier = city.tier;
  p.about.fiAge = q.goal === 'fi' ? Math.max(q.age + 5, Math.min(70, q.age + (q.goalYear - startYear))) : Math.max(q.age + 5, 55);
  p.income.mode = q.takeHome ? 'takeHome' : 'ctc';
  if (q.takeHome) p.income.monthlyTakeHome = Math.max(0, q.pay);
  else p.income.ctc = Math.max(0, q.pay);
  p.income.salary = { ...p.income.salary, state: city.state, basicShare: 0.5, gratuityInCtc: true, regime: 'auto' };
  const rent = Math.min(Math.max(0, q.rent ?? 0), Math.max(0, q.spending));
  p.cashflow.essential = [
    ...(rent > 0 ? [{ id: 'rent', label: 'Rent', amount: rent }] : []),
    { id: 'living', label: rent > 0 ? 'Other spending' : 'Rent and other spending', amount: Math.max(0, q.spending) - rent },
  ];
  p.cashflow.lifestyle = [];
  const g = QUICK_GOALS[q.goal];
  if (g.category) {
    const goal: Goal = {
      id: 'goal-1',
      name: g.label,
      category: g.category,
      cost: Math.max(0, q.goalCost),
      targetYear: Math.max(startYear + 1, q.goalYear),
      saved: 0,
      priority: 1,
      inflation: g.inflation,
      source: 'investments',
      fundingMode: defaultFundingMode(g.category),
    };
    p.goals = [goal];
  }
  p.quickStart = true;
  return p;
}
