/**
 * Rate conventions used across the engine:
 *  - Investment returns are EFFECTIVE annual rates. Monthly equivalent = (1 + r)^(1/12) − 1,
 *    so 12 months of monthly compounding reproduce exactly the stated annual return.
 *  - Loan rates are NOMINAL APRs (Indian EMI convention). Monthly rate = APR / 12.
 */

export function monthlyRate(annual: number): number {
  if (annual <= -1) throw new RangeError('Annual return must be greater than −100%');
  return Math.pow(1 + annual, 1 / 12) - 1;
}

export function loanMonthlyRate(apr: number): number {
  return apr / 12;
}

/** Fisher relation: real return = (1 + nominal) / (1 + inflation) − 1. */
export function realReturn(nominal: number, inflation: number): number {
  return (1 + nominal) / (1 + inflation) - 1;
}

/** Converts a future nominal amount into today's purchasing power. */
export function toReal(nominal: number, inflation: number, years: number): number {
  return nominal / Math.pow(1 + inflation, years);
}

/** Inflates a present-day cost to a future nominal cost. */
export function inflate(presentCost: number, inflation: number, years: number): number {
  return presentCost * Math.pow(1 + inflation, years);
}

/** Standard reducing-balance EMI. Handles a zero rate explicitly. */
export function emi(principal: number, apr: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const i = loanMonthlyRate(apr);
  if (i === 0) return principal / months;
  const f = Math.pow(1 + i, months);
  return (principal * i * f) / (f - 1);
}
