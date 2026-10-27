import type { Assumptions, FinancialProfile } from '@/types/profile';
import { healthScore } from './health';
import { currentSalary, currentTakeHome, usesCtc } from './income';
import { simulate } from './simulate';

/*
 * Plan accuracy: how much of what moves the projection is the person's own data rather than a default.
 * Each optional detail is weighted by how far a plausible value would move FI age, from a quick
 * sensitivity run: the plan is rerun with a typical value for that detail and the change is measured.
 */

export type AccuracyKey = 'salary' | 'savings' | 'loans' | 'insurance' | 'epf' | 'goals';

export interface AccuracyItem {
  key: AccuracyKey;
  label: string;
  filled: boolean;
  /** Years FI age moves when the detail takes a typical value (0 if it doesn't move the projection). */
  fiYears: number;
  /** For details that don't move FI age: plan-health points instead. */
  healthPoints: number;
  link: string;
  weight: number;
}

export interface Accuracy {
  score: number; // 0–1
  items: AccuracyItem[];
}

const MAX_AGE = 65;
const fiAgeOf = (p: FinancialProfile, a: Assumptions) => simulate(p, a, { years: Math.min(50, Math.max(a.horizonYears, MAX_AGE - p.about.age)) }).fiAge ?? MAX_AGE + 1;

/** Which details the person has given, judged from the profile (quick-start defaults count as not given). */
function filled(p: FinancialProfile): Record<AccuracyKey, boolean> {
  const qs = !!p.quickStart;
  const s = p.income.salary ?? {};
  const holdings = Object.values(p.position.holdings).reduce((x, y) => x + Math.max(0, y), 0);
  return {
    salary: !usesCtc(p) || (!qs && s.basicShare !== undefined) || s.variablePay !== undefined || s.employerNpsShare !== undefined,
    savings: p.position.cashSavings + p.position.emergencyFund + holdings > 0,
    loans: p.liabilities.length > 0 || !qs,
    insurance: p.protection.healthCover > 0,
    epf: (p.position.epf?.balance ?? 0) > 0 || p.position.retirement.balance > 0,
    goals: p.goals.length >= 2,
  };
}

/** Rerun the plan with a typical value for each detail and measure how far FI age moves. */
export function planAccuracy(p: FinancialProfile, a: Assumptions): Accuracy {
  const base = fiAgeOf(p, a);
  const takeHome = currentTakeHome(p);
  const ctc = currentSalary(p)?.ctc ?? takeHome * 12 * 1.3;
  const variants: Record<AccuracyKey, (q: FinancialProfile) => void> = {
    // A typical IT offer: 10% variable at 80% payout, basic 40%.
    salary: (q) => void (q.income.salary = { ...(q.income.salary ?? {}), variablePay: { targetShare: 0.1, expectedPayout: 0.8 }, basicShare: 0.4 }),
    // Three months of take-home already saved.
    savings: (q) => void (q.position.cashSavings += takeHome * 3),
    // An education loan of a year's CTC over 7 years.
    loans: (q) => void q.liabilities.push({ id: 'acc-loan', kind: 'education', label: 'Education loan', balance: ctc, rate: 0.1, emi: (ctc * 0.0166) }),
    insurance: () => {},
    // A year's PF from both sides already in EPF.
    epf: (q) => void (q.position.epf = { balance: (currentSalary(q)?.epfCredit ?? takeHome * 2) }),
    // One more goal: two years of CTC in ten years.
    goals: (q) => void q.goals.push({ id: 'acc-goal', name: 'Another goal', category: 'other', cost: ctc * 2, targetYear: q.planStartYear + 10, saved: 0, priority: 2, inflation: a.inflation, source: 'investments', fundingMode: 'savings' }),
  };
  const labels: Record<AccuracyKey, { label: string; link: string }> = {
    salary: { label: 'Salary structure: basic, variable pay, NPS', link: '/app/offers' },
    savings: { label: 'Savings and investments you already have', link: '/start/detailed?step=3' },
    loans: { label: 'Loans and credit-card balances', link: '/start/detailed?step=3' },
    insurance: { label: 'Health and term insurance', link: '/start/detailed?step=4' },
    epf: { label: 'EPF balance', link: '/start/detailed?step=3' },
    goals: { label: 'More goals', link: '/app/goals?new=1' },
  };
  const has = filled(p);
  const health = healthScore(p, a).score;
  const items = (Object.keys(variants) as AccuracyKey[]).map((key) => {
    const q = structuredClone(p);
    variants[key](q);
    let fiYears = Math.abs(fiAgeOf(q, a) - base);
    let healthPoints = 0;
    if (key === 'insurance') {
      q.protection.healthCover = 1_000_000;
      healthPoints = Math.abs(healthScore(q, a).score - health);
      fiYears = 0;
    }
    // At least a small weight, so a detail that happens not to move this plan still counts a little.
    const weight = Math.max(0.5, fiYears) + healthPoints / 10;
    return { key, ...labels[key], filled: has[key], fiYears, healthPoints, weight };
  });
  const total = items.reduce((s, i) => s + i.weight, 0);
  const score = total > 0 ? items.filter((i) => i.filled).reduce((s, i) => s + i.weight, 0) / total : 1;
  return { score, items };
}
