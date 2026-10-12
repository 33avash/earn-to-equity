import type { Liability } from '@/types/profile';
import { loanMonthlyRate } from './rates';

export type DebtStrategy = 'avalanche' | 'snowball';

export interface PayoffResult {
  strategy: DebtStrategy;
  months: number;
  totalInterest: number;
  totalPaid: number;
  order: { id: string; label: string; month: number }[];
  balances: { month: number; total: number }[]; // sampled monthly
  error?: string;
}

const MAX_MONTHS = 600;

/**
 * Month-by-month repayment. Every loan receives its minimum (EMI); the extra budget —
 * plus minimums freed by loans already cleared — goes to the target loan:
 *  - avalanche: highest interest rate first
 *  - snowball: smallest outstanding balance first
 * Interest accrues monthly at APR/12 before payments.
 */
export function simulatePayoff(loans: Liability[], extraMonthly: number, strategy: DebtStrategy): PayoffResult {
  const active = loans
    .filter((l) => l.balance > 0)
    .map((l) => ({ ...l, bal: l.balance, minPay: Math.max(0, l.emi) }));
  const result: PayoffResult = { strategy, months: 0, totalInterest: 0, totalPaid: 0, order: [], balances: [] };
  if (active.length === 0) return result;

  const budget = active.reduce((a, l) => a + l.minPay, 0) + Math.max(0, extraMonthly);
  const firstInterest = active.reduce((a, l) => a + l.bal * loanMonthlyRate(l.rate), 0);
  if (budget <= firstInterest) {
    return {
      ...result,
      months: Infinity,
      error: 'Your monthly repayments do not cover the interest that accrues each month, so the debt keeps growing. Increase the minimum payments or the extra amount.',
    };
  }

  result.balances.push({ month: 0, total: active.reduce((a, l) => a + l.bal, 0) });
  let month = 0;
  while (active.some((l) => l.bal > 0.005) && month < MAX_MONTHS) {
    month++;
    for (const l of active) {
      if (l.bal <= 0) continue;
      const interest = l.bal * loanMonthlyRate(l.rate);
      l.bal += interest;
      result.totalInterest += interest;
    }
    let available = budget;
    // Minimum payments
    for (const l of active) {
      if (l.bal <= 0) continue;
      const pay = Math.min(l.minPay, l.bal, available);
      l.bal -= pay;
      available -= pay;
      result.totalPaid += pay;
    }
    // Extra (including freed minimums) to targets in strategy order
    const targets = active
      .filter((l) => l.bal > 0.005)
      .sort((a, b) => (strategy === 'avalanche' ? b.rate - a.rate || a.bal - b.bal : a.bal - b.bal || b.rate - a.rate));
    for (const l of targets) {
      if (available <= 0) break;
      const pay = Math.min(l.bal, available);
      l.bal -= pay;
      available -= pay;
      result.totalPaid += pay;
    }
    for (const l of active) {
      if (l.bal <= 0.005 && !result.order.some((o) => o.id === l.id)) {
        l.bal = 0;
        result.order.push({ id: l.id, label: l.label, month });
      }
    }
    result.balances.push({ month, total: active.reduce((a, l) => a + Math.max(0, l.bal), 0) });
  }
  result.months = month >= MAX_MONTHS && active.some((l) => l.bal > 0.005) ? Infinity : month;
  return result;
}

export function compareStrategies(loans: Liability[], extraMonthly: number) {
  return {
    avalanche: simulatePayoff(loans, extraMonthly, 'avalanche'),
    snowball: simulatePayoff(loans, extraMonthly, 'snowball'),
  };
}
