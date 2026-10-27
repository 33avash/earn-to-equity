import type { Plan } from '@/state/selectors';
import { usePlanJob } from '@/services/planWorker';

/** Seeded Monte Carlo ranges for this plan, computed in the worker and cached by plan. */
export function useRanges(plan: Plan) {
  return usePlanJob('ranges', plan.profile, plan.assumptions);
}
