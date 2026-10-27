import type { Assumptions, FinancialProfile } from '@/types/profile';
import { combineFixes, evaluatePlan, suggestFixes, FIX_PATHS, type Combined, type Fix, type PlanMetrics } from '@/finance/fixPlan';
import { outcomeRanges, type OutcomeRanges } from '@/finance/ranges';

/** Jobs too heavy for the main thread: each runs hundreds of projections. Shared by the worker and its fallback. */
export type PlanJob =
  | { kind: 'fixes'; profile: FinancialProfile; assumptions: Assumptions }
  | { kind: 'evaluate'; profile: FinancialProfile; assumptions: Assumptions }
  | { kind: 'ranges'; profile: FinancialProfile; assumptions: Assumptions };

export interface FixesResult {
  fixes: Fix[];
  combined: Omit<Combined, 'profile' | 'assumptions'>;
}

export type PlanJobResult<K extends PlanJob['kind']> = K extends 'fixes' ? FixesResult : K extends 'evaluate' ? PlanMetrics : OutcomeRanges;

export function runPlanJob(job: PlanJob): FixesResult | PlanMetrics | OutcomeRanges {
  switch (job.kind) {
    case 'fixes': {
      const fixes = suggestFixes(job.profile, job.assumptions, FIX_PATHS);
      const { profile: _p, assumptions: _a, ...combined } = combineFixes(job.profile, job.assumptions, fixes, FIX_PATHS);
      return { fixes, combined };
    }
    case 'evaluate':
      return evaluatePlan(job.profile, job.assumptions, FIX_PATHS);
    case 'ranges':
      return outcomeRanges(job.profile, job.assumptions);
  }
}
