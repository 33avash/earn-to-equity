import type { ContributionTiming } from '@/types/profile';
import { monthlyRate, toReal } from './rates';

export interface SipInput {
  monthly: number;
  lumpSum?: number; // invested at month 0
  years: number;
  annualReturn: number; // effective annual
  stepUp?: number; // annual increase in the monthly amount (applied every 12 months)
  timing?: ContributionTiming; // 'end' (default) or 'start' of each month
  inflation?: number; // for the real-terms figure only
}

export interface SipYear {
  year: number;
  monthly: number; // monthly amount during this year
  contributions: number; // cumulative, incl. lump sum
  value: number; // year-end value
  gains: number; // value − contributions
  valueReal: number;
}

export interface SipResult {
  totalContributions: number;
  corpus: number;
  gains: number;
  corpusReal: number;
  years: SipYear[];
}

/**
 * Month-by-month SIP projection. Convention:
 *  - 'end' timing: contribution added after the month's growth (ordinary annuity).
 *  - 'start' timing: contribution added before the month's growth (annuity due).
 *  - Step-up applies at the start of each new year (months 13, 25, …).
 *  - A zero return produces exactly the sum of contributions.
 */
export function projectSip(input: SipInput): SipResult {
  const { monthly, lumpSum = 0, years, annualReturn, stepUp = 0, timing = 'end', inflation = 0 } = input;
  if (monthly < 0 || lumpSum < 0) throw new RangeError('Amounts cannot be negative');
  const n = Math.max(0, Math.round(years));
  const i = monthlyRate(annualReturn);
  let value = lumpSum;
  let contributed = lumpSum;
  let current = monthly;
  const out: SipYear[] = [];
  for (let y = 1; y <= n; y++) {
    if (y > 1) current = current * (1 + stepUp);
    for (let m = 0; m < 12; m++) {
      if (timing === 'start') {
        value = (value + current) * (1 + i);
      } else {
        value = value * (1 + i) + current;
      }
      contributed += current;
    }
    out.push({
      year: y,
      monthly: current,
      contributions: contributed,
      value,
      gains: value - contributed,
      valueReal: toReal(value, inflation, y),
    });
  }
  return {
    totalContributions: contributed,
    corpus: value,
    gains: value - contributed,
    corpusReal: toReal(value, inflation, n),
    years: out,
  };
}

/** Closed-form future value of a level monthly SIP (used for testing and quick estimates). */
export function sipFutureValue(monthly: number, annualReturn: number, months: number, timing: ContributionTiming = 'end'): number {
  const i = monthlyRate(annualReturn);
  if (i === 0) return monthly * months;
  const fv = (monthly * (Math.pow(1 + i, months) - 1)) / i;
  return timing === 'start' ? fv * (1 + i) : fv;
}

/** Monthly contribution needed to reach `target` from `present` in `months`. */
export function requiredMonthly(
  target: number,
  present: number,
  annualReturn: number,
  months: number,
  timing: ContributionTiming = 'end',
): number {
  if (months <= 0) return Math.max(0, target - present) > 0 ? Infinity : 0;
  const i = monthlyRate(annualReturn);
  const growth = Math.pow(1 + i, months);
  const remaining = target - present * growth;
  if (remaining <= 0) return 0;
  if (i === 0) return remaining / months;
  const factor = ((growth - 1) / i) * (timing === 'start' ? 1 + i : 1);
  return remaining / factor;
}
