import type { FinancialProfile } from '@/types/profile';
import { CITIES, isHraMetro } from './cities';
import { DEFAULT_SALARY, salaryBreakdown, type SalaryBreakdown, type SalaryInputs } from './tax';

/** True when take-home is derived from CTC rather than entered directly. */
export function usesCtc(p: FinancialProfile): boolean {
  return p.income.mode === 'ctc' && (p.income.ctc ?? 0) > 0;
}

/**
 * The rent line in essential spending, if there is one: id "rent", or a label that starts with "Rent" and isn't a
 * combined line such as "Rent and other spending" (which would overstate HRA).
 */
export function rentMonthly(p: FinancialProfile): number {
  const item = p.cashflow.essential.find((l) => l.id === 'rent' || (/^\s*rent\b/i.test(l.label) && !/\band\b|other/i.test(l.label)));
  return Math.max(0, item?.amount ?? 0);
}

/**
 * Salary inputs for a given CTC. Rent comes from the rent line in your budget and the HRA city rule from
 * your city; `extra` lets the projection pass this year's rent and home-loan figures.
 */
export function salaryInputs(p: FinancialProfile, ctc = p.income.ctc ?? 0, extra: Partial<SalaryInputs> = {}): SalaryInputs {
  const s = p.income.salary ?? {};
  return {
    ...DEFAULT_SALARY,
    ...s,
    state: s.state ?? (p.about.city ? CITIES[p.about.city].state : DEFAULT_SALARY.state),
    variablePay: { ...DEFAULT_SALARY.variablePay, ...(s.variablePay ?? {}) },
    hraExemption: s.hraExemption ?? 0,
    rentMonthly: rentMonthly(p),
    cityIsMetro: isHraMetro(p.about.city),
    ...extra,
    ctc,
  };
}

/** This year's salary breakdown, or null when the profile uses a take-home figure directly. */
export function currentSalary(p: FinancialProfile): SalaryBreakdown | null {
  return usesCtc(p) ? salaryBreakdown(salaryInputs(p)) : null;
}

/** Monthly take-home today (fixed pay only; variable pay arrives once a year): derived from CTC when available, otherwise as entered. */
export function currentTakeHome(p: FinancialProfile): number {
  const s = currentSalary(p);
  return s ? s.monthlyInHand : Math.max(0, p.income.monthlyTakeHome);
}
