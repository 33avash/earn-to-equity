import { useMemo } from 'react';
import type { Assumptions, FinancialProfile } from '@/types/profile';
import { monthlyCashflow } from '@/finance/cashflow';
import { balanceSheet } from '@/finance/networth';
import { emergencyPlan } from '@/finance/emergency';
import { analyzeGoals } from '@/finance/goals';
import { simulate } from '@/finance/simulate';
import { fiAnalysis } from '@/finance/fi';
import { healthScore } from '@/finance/health';
import { nextSteps } from '@/finance/insights';
import { currentWeights, portfolioVolatility, weightedReturn } from '@/finance/portfolio';
import { formatMoney } from '@/finance/money';
import { useStore } from './store';

/** Everything the app derives from the profile — computed once per change, shared by all screens. */
export function computePlan(profile: FinancialProfile, assumptions: Assumptions) {
  const cashflow = monthlyCashflow(profile);
  const sheet = balanceSheet(profile);
  const emergency = emergencyPlan(profile);
  const goals = analyzeGoals(profile, assumptions);
  const sim = simulate(profile, assumptions);
  const fi = fiAnalysis(profile, assumptions);
  const health = healthScore(profile, assumptions);
  const insights = nextSteps(profile, cashflow, emergency, goals, fi);
  const portfolioReturn = weightedReturn(profile.preferences.targetAllocation, assumptions.returns);
  const volatility = portfolioVolatility(profile.preferences.targetAllocation, assumptions.volatility);
  const final = sim.rows[sim.rows.length - 1];
  return {
    profile,
    assumptions,
    cashflow,
    sheet,
    emergency,
    goals,
    sim,
    final,
    fi,
    health,
    insights,
    portfolioReturn,
    volatility,
    currentAllocation: currentWeights(profile.position.holdings),
  };
}
export type Plan = ReturnType<typeof computePlan>;

export function usePlan(): Plan {
  const profile = useStore((s) => s.profile);
  const assumptions = useStore((s) => s.assumptions);
  return useMemo(() => computePlan(profile, assumptions), [profile, assumptions]);
}

/** Currency formatter honouring the compact-notation display preference. */
export function useMoney() {
  const compact = useStore((s) => s.settings.compact);
  return useMemo(() => (v: number) => formatMoney(v, compact), [compact]);
}
