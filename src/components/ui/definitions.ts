/** Plain-language definitions shown beside metrics throughout the app. */
export const DEFINITIONS = {
  netWorth: 'Everything you own (cash, investments, retirement accounts, other assets) minus everything you owe (loans and card balances).',
  totalAssets: 'Cash, emergency fund, investments, retirement savings (EPF/PPF/NPS) and other assets you listed, at today’s values.',
  liabilities: 'Outstanding principal on all loans and credit cards.',
  income: 'Monthly take-home pay plus any other regular income, after tax and payroll deductions.',
  expenses: 'Essential and lifestyle spending. Money moved into savings or investments is a transfer, not an expense.',
  surplus: 'Income left after living expenses and loan repayments. This is what you can save or invest each month.',
  savingsRate: 'Investable surplus as a share of income.',
  emergencyCoverage: 'How many months of essential expenses and EMIs your liquid savings could cover if income stopped.',
  portfolio: 'Current value of your investments across all asset classes (excluding EPF/PPF/NPS, which are shown as retirement savings).',
  projected: 'Projected net worth at the end of the 20-year plan in future (nominal) rupees. An estimate based on your assumptions, not a promise.',
  real: 'The projected figure converted into today’s purchasing power by removing assumed inflation.',
  fiTarget: 'Illustrative corpus needed to cover annual living expenses with the withdrawal-rate assumption: expenses ÷ withdrawal rate.',
  fiGap: 'Difference between the FI target and the financial assets projected for your chosen FI age.',
  dti: 'Monthly loan repayments as a share of monthly income (EMI-to-income ratio).',
  weightedReturn: 'Average of the assumed returns for each asset class, weighted by your target allocation.',
  volatility: 'Simplified estimate of how much the portfolio value might swing in a typical year (one standard deviation).',
  fundedPct: 'Existing dedicated savings, grown to the target date, as a share of the goal’s future cost.',
  futureCost: 'Today’s cost inflated to the target year at the goal’s inflation rate. This is the rupee amount you will actually need.',
} as const;

export type DefinitionKey = keyof typeof DEFINITIONS;
