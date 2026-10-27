/** Plain-language definitions shown beside metrics throughout the app. */
export const DEFINITIONS = {
  netWorth: 'Everything you own (cash, investments, retirement accounts, other assets) minus everything you owe (loans and card balances).',
  totalAssets: 'Cash, emergency fund, investments, retirement savings (EPF/PPF/NPS) and other assets you listed, at today’s values.',
  liabilities: 'Outstanding principal on all loans and credit cards.',
  income: 'Monthly take-home pay plus any other regular income, after tax and payroll deductions.',
  expenses: 'Essential and lifestyle spending. Money moved into savings or investments is a transfer, not an expense.',
  surplus: 'Left after bills: take-home minus essentials, lifestyle and EMIs. This is what you can save or invest each month.',
  savingsRate: 'Investable surplus as a share of income.',
  emergencyCoverage: 'How many months of essential expenses and EMIs your liquid savings could cover if income stopped.',
  portfolio: 'Current value of your investments across all asset classes (excluding EPF/PPF/NPS, which are shown as retirement savings).',
  projected: 'Projected net worth at the end of the 20-year plan in future (nominal) rupees. An estimate based on your assumptions, not a promise.',
  real: 'The projected figure converted into today’s purchasing power by removing assumed inflation.',
  fiTarget: 'Illustrative corpus needed to cover annual living expenses with the withdrawal-rate assumption, and clear any remaining debt: expenses ÷ withdrawal rate + outstanding loans.',
  fiGap: 'Difference between the FI target and the financial assets projected for your chosen FI age.',
  dti: 'Monthly loan repayments as a share of monthly income (EMI-to-income ratio).',
  weightedReturn: 'Average of the assumed returns for each asset class, weighted by your target allocation.',
  volatility: 'Simplified estimate of how much the portfolio value might swing in a typical year (one standard deviation).',
  fundedPct: 'Existing dedicated savings, grown to the target date, as a share of the goal’s future cost.',
  futureCost: 'Today’s cost inflated to the target year at the goal’s inflation rate. This is the rupee amount you will actually need.',
} as const;

export type DefinitionKey = keyof typeof DEFINITIONS;

/** Plain-language terms, each with the screen where it matters. */
export const GLOSSARY: { term: string; def: string; to: string }[] = [
  { term: 'Net worth', def: DEFINITIONS.netWorth, to: '/app' },
  { term: 'Investable surplus', def: DEFINITIONS.surplus, to: '/app/budget' },
  { term: 'Savings rate', def: DEFINITIONS.savingsRate, to: '/app/budget' },
  { term: 'Emergency coverage', def: DEFINITIONS.emergencyCoverage, to: '/app/emergency-debt' },
  { term: 'EMI-to-income (DTI)', def: DEFINITIONS.dti, to: '/app/emergency-debt' },
  { term: 'Today’s rupees (real value)', def: DEFINITIONS.real, to: '/app/simulator' },
  { term: 'FI target', def: DEFINITIONS.fiTarget, to: '/app/fi' },
  { term: 'Weighted return', def: DEFINITIONS.weightedReturn, to: '/app/portfolio' },
  { term: 'Volatility', def: DEFINITIONS.volatility, to: '/app/risk-lab' },
  { term: 'Future cost of a goal', def: DEFINITIONS.futureCost, to: '/app/goals' },
  { term: 'LTCG', def: 'Long-term capital gains: profit on equity held over 12 months, taxed at 12.5% above ₹1.25 lakh a year.', to: '/app/learn/tax' },
  { term: 'Section 123 (old 80C)', def: 'Old-regime deduction of up to ₹1.5 lakh a year for EPF, PPF, ELSS, life cover, home-loan principal and similar. Called 80C before the Income-tax Act, 2025. Not available in the new regime.', to: '/app/learn/tax' },
  { term: 'Gratuity', def: '15 days’ basic pay for every year of service (about 4.81% of basic a year), usually part of CTC. Paid when you leave after 5 years, or 1 year on a fixed-term contract.', to: '/app/budget' },
  { term: 'Variable pay', def: 'The part of CTC paid as a yearly bonus, depending on performance. It is not in your monthly in-hand pay.', to: '/app/budget' },
  { term: 'Employer NPS', def: 'Part of CTC your employer can put in NPS. Deductible up to 14% of basic in the new regime (section 124, old 80CCD(2)); locked until 60.', to: '/app/learn/tax' },
  { term: 'EPF', def: 'Employees’ Provident Fund: 12% of basic pay from you and your employer, earning the rate EPFO declares each year.', to: '/app/learn/retirement' },
  { term: 'SIP step-up', def: 'Raising your monthly SIP by a fixed percentage each year, usually in line with pay rises.', to: '/app/sip' },
];
