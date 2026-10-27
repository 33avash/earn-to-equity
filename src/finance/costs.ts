import type { Assumptions, FinancialProfile } from '@/types/profile';
import { simulate } from './simulate';

export interface RegularPlanCost {
  years: number;
  /** Lower net worth at the end of the plan because of regular-plan costs, in future rupees. */
  nominal: number;
  /** The same amount in today's rupees. */
  real: number;
}

/**
 * What regular plans cost over the plan: the projection rerun with every fund in direct plans, minus the
 * projection as it stands. `share` overrides the profile's regular-plan share (for "what if all regular").
 */
export function regularPlanCost(p: FinancialProfile, a: Assumptions, share = p.preferences.regularPlanShare ?? 0): RegularPlanCost {
  const withShare = (k: number): FinancialProfile => ({ ...p, preferences: { ...p.preferences, regularPlanShare: k } });
  const direct = simulate(withShare(0), a).points.at(-1)!;
  const regular = simulate(withShare(share), a).points.at(-1)!;
  return { years: a.horizonYears, nominal: Math.max(0, direct.netWorth - regular.netWorth), real: Math.max(0, direct.netWorthReal - regular.netWorthReal) };
}
