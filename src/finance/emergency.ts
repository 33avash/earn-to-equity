import type { FinancialProfile } from '@/types/profile';
import { monthlyCashflow } from './cashflow';
import { clamp } from './money';

export interface EmergencyPlan {
  targetMonths: number;
  monthlyNeed: number; // essential expenses + debt repayments
  recommendedReserve: number;
  eligibleLiquid: number;
  coverageMonths: number;
  gap: number;
  monthlyContribution: number;
  monthsToTarget: number | null; // null = no contribution, never reached
  /** Top-up already scheduled by a SIP pause, up to the gap. */
  scheduled: number;
}

/**
 * The reserve covers essential living costs and loan repayments — the bills that
 * continue if income stops. Lifestyle spending is assumed to be cut in an emergency.
 */
export function emergencyPlan(p: FinancialProfile, opts?: { targetMonths?: number; monthlyContribution?: number; includeCashSavings?: boolean }): EmergencyPlan {
  const cf = monthlyCashflow(p);
  const targetMonths = clamp(opts?.targetMonths ?? p.protection.emergencyTargetMonths, 3, 12);
  const monthlyNeed = cf.essential + cf.debtPayments;
  const recommendedReserve = monthlyNeed * targetMonths;
  const includeCash = opts?.includeCashSavings ?? true;
  const eligibleLiquid = Math.max(0, p.position.emergencyFund) + (includeCash ? Math.max(0, p.position.cashSavings) : 0);
  const coverageMonths = monthlyNeed > 0 ? eligibleLiquid / monthlyNeed : eligibleLiquid > 0 ? Infinity : 0;
  const gap = Math.max(0, recommendedReserve - eligibleLiquid);
  const pause = p.cashflow.sipPause;
  const monthlyContribution = Math.max(0, opts?.monthlyContribution ?? p.cashflow.monthlySavings + (pause && pause.months > 0 ? Math.min(pause.amount, p.cashflow.monthlyInvestments) : 0));
  const monthsToTarget = gap === 0 ? 0 : monthlyContribution > 0 ? gap / monthlyContribution : null;
  const scheduled = pause ? Math.min(gap, Math.max(0, Math.min(pause.amount, p.cashflow.monthlyInvestments)) * Math.max(0, pause.months)) : 0;
  return { targetMonths, monthlyNeed, recommendedReserve, eligibleLiquid, coverageMonths, gap, monthlyContribution, monthsToTarget, scheduled };
}
