import type { FinancialProfile } from '@/types/profile';
import { HEALTH_COVER_BENCHMARK, TERM_COVER_MULTIPLE } from './assumptions';
import { hasDependents } from './household';

/** People on one family-floater health policy: you plus the dependents you entered. Parents usually need their own policy. */
export function householdSize(p: FinancialProfile): number {
  return 1 + Math.max(0, Math.round(p.about.dependents || 0));
}

/** Health cover worth holding for your city tier and household size. */
export function healthCoverBenchmark(p: FinancialProfile): number {
  const base = HEALTH_COVER_BENCHMARK.value[p.about.cityTier ?? 1];
  const n = householdSize(p);
  return base * (n >= 4 ? 2 : n >= 2 ? 1.5 : 1);
}

/** Term cover range when someone depends on your income; null when nobody does. */
export function termCoverBenchmark(p: FinancialProfile, annualIncome: number): { min: number; max: number } | null {
  if (!hasDependents(p)) return null;
  return { min: annualIncome * TERM_COVER_MULTIPLE.value.min, max: annualIncome * TERM_COVER_MULTIPLE.value.max };
}
