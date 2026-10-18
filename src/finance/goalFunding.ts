import type { FundingMode, Goal, GoalCategory, LoanTerms } from '@/types/profile';

/** Goals in these categories default to "savings first, loan for the rest". */
const MIXED_BY_DEFAULT = new Set<GoalCategory>(['education', 'home']);

/**
 * Default loan terms when a goal is financed. Indicative Indian retail rates;
 * every value is editable per goal.
 *  - Education: 10.5% APR, 7 years, 12-month moratorium (course period).
 *  - Car: 9.5% APR, 5 years.
 */
export const DEFAULT_LOAN_TERMS: Record<GoalCategory, LoanTerms> = {
  education: { rate: 0.105, tenureYears: 7, moratoriumMonths: 12 },
  car: { rate: 0.095, tenureYears: 5, moratoriumMonths: 0 },
  home: { rate: 0.085, tenureYears: 20, moratoriumMonths: 0 },
  wedding: { rate: 0.13, tenureYears: 5, moratoriumMonths: 0 },
  travel: { rate: 0.13, tenureYears: 3, moratoriumMonths: 0 },
  business: { rate: 0.13, tenureYears: 5, moratoriumMonths: 0 },
  family: { rate: 0.13, tenureYears: 5, moratoriumMonths: 0 },
  retirement: { rate: 0.13, tenureYears: 5, moratoriumMonths: 0 },
  fi: { rate: 0.13, tenureYears: 5, moratoriumMonths: 0 },
  other: { rate: 0.13, tenureYears: 5, moratoriumMonths: 0 },
};

export const FUNDING_MODE_LABELS: Record<FundingMode, string> = {
  savings: 'Savings only',
  mixed: 'Savings, then a loan',
  loan: 'Loan',
};

export function defaultFundingMode(category: GoalCategory): FundingMode {
  return MIXED_BY_DEFAULT.has(category) ? 'mixed' : 'savings';
}

export function goalFundingMode(g: Goal): FundingMode {
  return g.fundingMode ?? defaultFundingMode(g.category);
}

export function goalLoanTerms(g: Goal): LoanTerms {
  return { ...DEFAULT_LOAN_TERMS[g.category], ...(g.loan ?? {}) };
}
