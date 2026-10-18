import type { FinancialProfile } from '@/types/profile';

/**
 * The one year/age convention used by every label in the app.
 *
 *  - Ages are measured on 1 January: in `planStartYear` you are `about.age`.
 *  - The plan horizon runs from `planStartYear` to `planStartYear + horizonYears` inclusive,
 *    so a 20-year plan has 21 points: today, then 1 January of each following year.
 *  - A simulation row for calendar year Y holds that year's flows and its 31 December balances,
 *    which are the balances at point Y + 1.
 */
export function ageInYear(p: Pick<FinancialProfile, 'about' | 'planStartYear'>, year: number): number {
  return p.about.age + (year - p.planStartYear);
}

/** The calendar year in which you reach `age`. */
export function yearAtAge(p: Pick<FinancialProfile, 'about' | 'planStartYear'>, age: number): number {
  return p.planStartYear + (age - p.about.age);
}

/** Last point of the horizon (1 January). */
export function horizonEndYear(p: Pick<FinancialProfile, 'planStartYear'>, horizonYears: number): number {
  return p.planStartYear + horizonYears;
}

/** "2031 · age 31" */
export function yearAgeLabel(p: Pick<FinancialProfile, 'about' | 'planStartYear'>, year: number): string {
  return `${year} · age ${ageInYear(p, year)}`;
}
