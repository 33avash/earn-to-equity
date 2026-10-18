import type { FinancialProfile } from '@/types/profile';
import { currentTakeHome } from './income';
import { sum } from './money';

export interface MonthlyCashflow {
  income: number; // take-home + other income
  essential: number;
  lifestyle: number;
  expenses: number; // essential + lifestyle
  debtPayments: number; // EMIs and minimum payments
  /** Income left after living expenses and debt repayments — available to save or invest. */
  investableSurplus: number;
  plannedInvestments: number;
  plannedSavings: number;
  /** Surplus not yet assigned to savings or investments (negative = over-committed). */
  unallocated: number;
  /** Share of income left after expenses and repayments. */
  savingsRate: number;
  /** Debt repayments as a share of income (EMI-to-income). */
  debtToIncome: number;
}

/**
 * Transfers to savings and investments are NOT expenses; they come out of the surplus.
 */
export function monthlyCashflow(p: FinancialProfile): MonthlyCashflow {
  const income = currentTakeHome(p) + Math.max(0, p.income.otherMonthlyIncome);
  const essential = sum(p.cashflow.essential.map((l) => Math.max(0, l.amount)));
  const lifestyle = sum(p.cashflow.lifestyle.map((l) => Math.max(0, l.amount)));
  const expenses = essential + lifestyle;
  const debtPayments = sum(p.liabilities.map((l) => Math.max(0, l.emi)));
  const investableSurplus = income - expenses - debtPayments;
  const plannedInvestments = Math.max(0, p.cashflow.monthlyInvestments);
  const plannedSavings = Math.max(0, p.cashflow.monthlySavings);
  return {
    income,
    essential,
    lifestyle,
    expenses,
    debtPayments,
    investableSurplus,
    plannedInvestments,
    plannedSavings,
    unallocated: investableSurplus - plannedInvestments - plannedSavings,
    savingsRate: income > 0 ? investableSurplus / income : 0,
    debtToIncome: income > 0 ? debtPayments / income : 0,
  };
}

/** 50/30/20 reference split (needs / wants / savings incl. debt repayment beyond minimums). */
export function fiftyThirtyTwenty(cf: MonthlyCashflow) {
  const target = { needs: cf.income * 0.5, wants: cf.income * 0.3, save: cf.income * 0.2 };
  const actual = {
    needs: cf.essential + cf.debtPayments,
    wants: cf.lifestyle,
    save: Math.max(0, cf.investableSurplus),
  };
  return { target, actual };
}
