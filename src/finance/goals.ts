import type { Assumptions, FinancialProfile, Goal } from '@/types/profile';
import { monthlyCashflow } from './cashflow';
import { netReturns, weightedReturn } from './portfolio';
import { inflate, monthlyRate } from './rates';
import { requiredMonthly, sipFutureValue } from './sip';

export type GoalStatus = 'funded' | 'on-track' | 'at-risk' | 'shortfall' | 'overdue';

export interface GoalAnalysis {
  goal: Goal;
  months: number; // until the start of the target year
  expectedReturn: number;
  futureCost: number; // nominal rupees in the target year
  fvSaved: number; // existing savings grown to the target date
  remaining: number; // futureCost − fvSaved (≥ 0)
  requiredMonthly: number; // to close `remaining` by the target date
  allocatedMonthly: number; // what current capacity can give this goal (priority order)
  fundedPct: number; // fvSaved / futureCost, capped at 1
  shortfallMonthly: number;
  completionMonths: number | null; // with the allocated contribution; null = not reached within 50 years
  completionYear: number | null;
  status: GoalStatus;
}

export interface GoalsSummary {
  goals: GoalAnalysis[];
  capacity: number; // monthly investable surplus available for goals
  totalRequired: number;
  totalShortfall: number;
}

/** The order goals receive money: priority, then the order set by dragging, then date. */
export function fundingOrder(g1: Goal, g2: Goal): number {
  return g1.priority - g2.priority || (g1.rank ?? 0) - (g2.rank ?? 0) || g1.targetYear - g2.targetYear;
}

/**
 * Applies a new order from dragging: ranks follow the order, and priority labels follow position
 * (top third High, middle Medium, bottom Low) so the two never disagree.
 */
export function reorderGoals(goals: Goal[], orderedIds: string[]): Goal[] {
  const n = orderedIds.length;
  return goals.map((g) => {
    const i = orderedIds.indexOf(g.id);
    if (i < 0) return g;
    const priority = Math.min(3, Math.max(1, Math.ceil(((i + 1) / n) * 3))) as Goal['priority'];
    return { ...g, rank: i, priority };
  });
}

/** Expected return used to grow money set aside for a goal. */
export function goalReturn(goal: Goal, months: number, p: FinancialProfile, a: Assumptions): number {
  if (goal.source === 'savings') return a.returns.cash;
  // Money needed within 3 years is assumed to sit in debt instruments, not equities.
  if (months < 36) return netReturns(a, p.preferences.regularPlanShare).debt;
  return weightedReturn(p.preferences.targetAllocation, netReturns(a, p.preferences.regularPlanShare));
}

function completionMonths(goal: Goal, monthly: number, annualReturn: number): number | null {
  const i = monthlyRate(annualReturn);
  const ci = Math.pow(1 + goal.inflation, 1 / 12);
  let saved = goal.saved;
  let cost = goal.cost;
  if (saved >= cost) return 0;
  for (let k = 1; k <= 600; k++) {
    saved = saved * (1 + i) + monthly;
    cost = cost * ci;
    if (saved >= cost) return k;
  }
  return null;
}

export function analyzeGoal(goal: Goal, allocatedMonthly: number, p: FinancialProfile, a: Assumptions): GoalAnalysis {
  const years = goal.targetYear - p.planStartYear;
  const months = Math.max(0, years * 12);
  const r = goalReturn(goal, months, p, a);
  const futureCost = inflate(goal.cost, goal.inflation, Math.max(0, years));
  const fvSaved = goal.saved * Math.pow(1 + r, Math.max(0, years));
  const remaining = Math.max(0, futureCost - fvSaved);
  const req = requiredMonthly(futureCost, goal.saved, r, months);
  const allocated = Math.min(allocatedMonthly, Number.isFinite(req) ? req : allocatedMonthly);
  const projected = fvSaved + sipFutureValue(allocated, r, months);
  const cm = completionMonths(goal, allocated, r);

  let status: GoalStatus;
  if (remaining <= 0) status = 'funded';
  else if (months <= 0) status = 'overdue';
  else if (projected >= futureCost * 0.999) status = 'on-track';
  else if (projected >= futureCost * 0.75) status = 'at-risk';
  else status = 'shortfall';

  return {
    goal,
    months,
    expectedReturn: r,
    futureCost,
    fvSaved,
    remaining,
    requiredMonthly: req,
    allocatedMonthly: allocated,
    fundedPct: futureCost > 0 ? Math.min(1, fvSaved / futureCost) : 1,
    shortfallMonthly: Number.isFinite(req) ? Math.max(0, req - allocated) : Infinity,
    completionMonths: cm,
    completionYear: cm === null ? null : p.planStartYear + cm / 12,
    status,
  };
}

/**
 * Allocates the monthly investable surplus across goals by priority, then by target date.
 * A goal counts as on track only if its allocated contribution actually closes its gap.
 */
export function analyzeGoals(p: FinancialProfile, a: Assumptions, capacityOverride?: number): GoalsSummary {
  const capacity = Math.max(0, capacityOverride ?? monthlyCashflow(p).investableSurplus);
  const ordered = [...p.goals].sort(fundingOrder);
  let left = capacity;
  const byId = new Map<string, GoalAnalysis>();
  let totalRequired = 0;
  for (const g of ordered) {
    const probe = analyzeGoal(g, 0, p, a);
    const need = Number.isFinite(probe.requiredMonthly) ? probe.requiredMonthly : 0;
    totalRequired += need;
    const give = Math.min(left, need);
    left -= give;
    byId.set(g.id, analyzeGoal(g, give, p, a));
  }
  return {
    goals: p.goals.map((g) => byId.get(g.id)!),
    capacity,
    totalRequired,
    totalShortfall: Math.max(0, totalRequired - capacity),
  };
}
