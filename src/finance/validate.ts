import type { Assumptions, FinancialProfile } from '@/types/profile';
import { isValidAllocation, weightSum, weightedReturn } from './portfolio';

export type Severity = 'error' | 'warning';
export interface Issue {
  field: string;
  message: string;
  severity: Severity;
}

/** Field-level check for a numeric input. Returns an error message or null. */
export function checkNumber(value: number, opts: { min?: number; max?: number; required?: boolean; label?: string } = {}): string | null {
  const label = opts.label ?? 'This value';
  if (value === null || value === undefined || Number.isNaN(value)) return opts.required ? `${label} is required.` : null;
  if (!Number.isFinite(value)) return `${label} must be a number.`;
  if (opts.min !== undefined && value < opts.min) return `${label} must be at least ${opts.min}.`;
  if (opts.max !== undefined && value > opts.max) return `${label} must be at most ${opts.max}.`;
  return null;
}

/** Percent entered as a decimal rate must sit within [min, max] (defaults 0%–100%). */
export function checkRate(rate: number, label: string, min = 0, max = 1): string | null {
  if (!Number.isFinite(rate)) return `${label} must be a number.`;
  if (rate < min || rate > max) return `${label} must be between ${Math.round(min * 100)}% and ${Math.round(max * 100)}%.`;
  return null;
}

/** Whole-profile validation used on the onboarding review step and in Settings. */
export function validateProfile(p: FinancialProfile, a: Assumptions): Issue[] {
  const issues: Issue[] = [];
  const add = (field: string, message: string, severity: Severity = 'error') => issues.push({ field, message, severity });

  if (p.about.age < 16 || p.about.age > 80) add('about.age', 'Age should be between 16 and 80.');
  if (p.about.fiAge <= p.about.age) add('about.fiAge', 'Your financial independence age must be later than your current age.');
  if (p.about.fiAge - p.about.age > 50) add('about.fiAge', 'Projections are limited to 50 years.', 'warning');
  if (p.income.monthlyTakeHome < 0) add('income.monthlyTakeHome', 'Take-home salary cannot be negative.');
  if (p.income.monthlyTakeHome === 0 && p.income.otherMonthlyIncome === 0) add('income.monthlyTakeHome', 'Add at least one source of income so the plan has something to project.', 'warning');
  const r = checkRate(p.income.salaryGrowth, 'Salary growth', -0.2, 0.5);
  if (r) add('income.salaryGrowth', r);
  for (const l of [...p.cashflow.essential, ...p.cashflow.lifestyle]) if (l.amount < 0) add('cashflow', `“${l.label}” cannot be negative.`);
  for (const l of p.liabilities) {
    if (l.balance < 0 || l.emi < 0) add('liabilities', `“${l.label}” has a negative amount.`);
    if (l.rate < 0 || l.rate > 0.6) add('liabilities', `“${l.label}” interest rate looks wrong (0–60%).`);
    if (l.balance > 0 && l.emi <= (l.balance * l.rate) / 12) add('liabilities', `“${l.label}” repayment does not cover its monthly interest, so the balance will grow.`, 'warning');
  }
  for (const g of p.goals) {
    if (g.cost <= 0) add('goals', `“${g.name}” needs an estimated cost.`);
    if (g.targetYear < p.planStartYear) add('goals', `“${g.name}” has a target year in the past.`);
    if (g.saved < 0) add('goals', `“${g.name}” savings cannot be negative.`);
  }
  if (!isValidAllocation(p.preferences.targetAllocation))
    add('preferences.targetAllocation', `Target allocation adds up to ${(weightSum(p.preferences.targetAllocation) * 100).toFixed(1)}%. It must total 100%.`);
  if (a.withdrawalRate <= 0 || a.withdrawalRate > 0.1) add('assumptions.withdrawalRate', 'Withdrawal rate should be between 0.1% and 10%.');
  if (a.inflation < 0 || a.inflation > 0.2) add('assumptions.inflation', 'Inflation should be between 0% and 20%.');
  if (weightedReturn(p.preferences.targetAllocation, a.returns) <= a.inflation)
    add('assumptions.returns', 'Your assumed portfolio return is at or below inflation, so investments lose purchasing power in this projection.', 'warning');
  return issues;
}
