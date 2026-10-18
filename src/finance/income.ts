import type { FinancialProfile } from '@/types/profile';
import { DEFAULT_SALARY, salaryBreakdown, type SalaryBreakdown, type SalaryInputs } from './tax';

/** True when take-home is derived from CTC rather than entered directly. */
export function usesCtc(p: FinancialProfile): boolean {
  return p.income.mode === 'ctc' && (p.income.ctc ?? 0) > 0;
}

export function salaryInputs(p: FinancialProfile, ctc = p.income.ctc ?? 0): SalaryInputs {
  return { ...DEFAULT_SALARY, ...(p.income.salary ?? {}), ctc };
}

/** This year's salary breakdown, or null when the profile uses a take-home figure directly. */
export function currentSalary(p: FinancialProfile): SalaryBreakdown | null {
  return usesCtc(p) ? salaryBreakdown(salaryInputs(p)) : null;
}

/** Monthly take-home today: derived from CTC when available, otherwise as entered. */
export function currentTakeHome(p: FinancialProfile): number {
  const s = currentSalary(p);
  return s ? s.monthlyTakeHome : Math.max(0, p.income.monthlyTakeHome);
}
