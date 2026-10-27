import type { Assumptions, FinancialProfile } from '@/types/profile';
import { DEFAULT_EXPENSE_RATIOS, DEFAULT_RETURNS, DEFAULT_VOLATILITY, PRESETS, emptyAssetMap } from '@/finance/portfolio';
import { EPF_RATE, HEALTHCARE_INFLATION, HOME_LOAN_RATE, PLANNING_INFLATION, SMALL_SAVINGS, WITHDRAWAL_RATE } from '@/finance/assumptions';

export const uid = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  inflation: PLANNING_INFLATION.value,
  returns: { ...DEFAULT_RETURNS },
  volatility: { ...DEFAULT_VOLATILITY },
  sipStepUp: 0.1,
  withdrawalRate: WITHDRAWAL_RATE.value,
  propertyGrowth: 0.05,
  contributionTiming: 'end',
  sweepExcessCash: true,
  horizonYears: 20,
  lifestyleCreep: 0.4,
  expenseRatios: { ...DEFAULT_EXPENSE_RATIOS },
  epfRate: EPF_RATE.value,
  healthcareInflation: HEALTHCARE_INFLATION.value,
  postFiHealthcare: 3000,
};

/**
 * Demo profile: a fictional 26-year-old software analyst in Pune on a Labour-Codes-style CTC.
 * Every figure here is illustrative and labelled as demo data in the interface.
 *
 * The plan is tuned (with real engine runs, see tests/finance/demo.test.ts) to have fixable gaps: a part-time
 * MBA and a first car fall a year apart and savings can't pay for both, the emergency reserve is short, a small
 * credit-card balance runs at 36% and there is no employer NPS. "Fix my plan"
 * closes each of these.
 */
export function demoProfile(startYear = new Date().getFullYear()): FinancialProfile {
  const Y = startYear;
  return {
    planStartYear: Y,
    about: { name: 'Riya', age: 26, employment: 'salaried', fiAge: 55, dependents: 0, cityTier: 1, city: 'pune', parentsAsDependents: true },
    income: {
      mode: 'ctc',
      ctc: 1150000,
      salary: { basicShare: 0.5, pfOnWageCeiling: false, state: 'MH', regime: 'auto', gratuityInCtc: true, variablePay: { targetShare: 0.1, expectedPayout: 0.8 }, employerNpsShare: 0, hraShareOfBasic: 0.4 },
      monthlyTakeHome: 75000, // derived from CTC; kept for display before the first calculation
      salaryGrowth: 0.08,
      otherMonthlyIncome: 0,
      careerNotes: 'Planning a part-time MBA alongside work.',
    },
    cashflow: {
      essential: [
        { id: 'rent', label: 'Rent', amount: 17000 },
        { id: 'groceries', label: 'Groceries & household', amount: 7000 },
        { id: 'utilities', label: 'Utilities & phone', amount: 2500 },
        { id: 'transport', label: 'Transport', amount: 3000 },
        { id: 'insurance', label: 'Insurance premiums', amount: 1500 },
        { id: 'family', label: 'Support to parents', amount: 5000, familySupport: true },
      ],
      lifestyle: [
        { id: 'dining', label: 'Dining & entertainment', amount: 5000 },
        { id: 'shopping', label: 'Shopping', amount: 1500 },
        { id: 'subs', label: 'Subscriptions', amount: 800 },
        { id: 'travel', label: 'Weekend travel', amount: 1500 },
      ],
      monthlyInvestments: 15000,
      monthlySavings: 3000,
    },
    position: {
      cashSavings: 50000,
      emergencyFund: 75000,
      holdings: { indianEquity: 240000, intlEquity: 40000, debt: 115000, govtSchemes: 50000, gold: 30000, cash: 20000, other: 0 },
      retirement: { balance: 0, monthlyContribution: 0, returnRate: SMALL_SAVINGS.ppf.value },
      epf: { balance: 280000 },
      otherAssets: 50000,
    },
    liabilities: [
      { id: 'edu', kind: 'education', label: 'Education loan', balance: 280000, rate: 0.095, emi: 7000 },
      { id: 'cc', kind: 'creditCard', label: 'Credit card', balance: 22000, rate: 0.36, emi: 4000 },
    ],
    protection: { emergencyTargetMonths: 6, healthCover: 1000000, lifeCover: 0 }, // no term cover yet, though parents depend on her
    goals: [
      { id: 'travel', name: 'Trip to Japan', category: 'travel', cost: 200000, targetYear: Y + 1, saved: 50000, priority: 3, inflation: 0.06, source: 'savings' },
      { id: 'mba', name: 'Part-time MBA', category: 'education', cost: 1050000, targetYear: Y + 3, saved: 100000, priority: 1, inflation: 0.08, source: 'investments', fundingMode: 'mixed' },
      { id: 'car', name: 'First car', category: 'car', cost: 800000, targetYear: Y + 4, saved: 0, priority: 2, inflation: 0.05, source: 'investments', fundingMode: 'savings' },
    ],
    preferences: { risk: 'growth', horizonYears: 20, targetAllocation: { ...PRESETS.growth.weights } },
    lifeEvents: [
      { id: 'promo', kind: 'promotion', label: 'Role after the MBA', year: Y + 5, oneTimeCost: 0, incomeChangePct: 0.4, monthlyExpenseChange: 0, breakMonths: 0, goalId: 'mba' },
      { id: 'wed', kind: 'marriage', label: 'Wedding', year: Y + 7, oneTimeCost: 600000, incomeChangePct: 0, monthlyExpenseChange: 8000, breakMonths: 0 },
      {
        id: 'home', kind: 'homePurchase', label: 'Buy a flat', year: Y + 13, oneTimeCost: 0, incomeChangePct: 0, monthlyExpenseChange: -17000, breakMonths: 0,
        home: { propertyValue: 6000000, downPaymentPct: 0.2, loanRate: HOME_LOAN_RATE.value, tenureYears: 20, state: 'MH', interiors: 500000, sizeSqft: 900, maintenancePerSqft: 4 },
      },
    ],
  };
}

/** A blank profile with neutral defaults used when someone starts their own plan. */
export function blankProfile(startYear = new Date().getFullYear()): FinancialProfile {
  return {
    planStartYear: startYear,
    about: { name: '', age: 25, employment: 'salaried', fiAge: 50, dependents: 0, cityTier: 1 },
    income: { mode: 'ctc', ctc: 0, salary: { basicShare: 0.5, state: 'MH', regime: 'auto', gratuityInCtc: true },  monthlyTakeHome: 0, salaryGrowth: 0.07, otherMonthlyIncome: 0, careerNotes: '' },
    cashflow: {
      essential: [
        { id: uid(), label: 'Rent / housing', amount: 0 },
        { id: uid(), label: 'Groceries & household', amount: 0 },
        { id: uid(), label: 'Utilities & phone', amount: 0 },
        { id: uid(), label: 'Transport', amount: 0 },
        { id: uid(), label: 'Money sent to family', amount: 0, familySupport: true },
      ],
      lifestyle: [
        { id: uid(), label: 'Dining & entertainment', amount: 0 },
        { id: uid(), label: 'Shopping', amount: 0 },
      ],
      monthlyInvestments: 0,
      monthlySavings: 0,
    },
    position: {
      cashSavings: 0,
      emergencyFund: 0,
      holdings: emptyAssetMap(),
      retirement: { balance: 0, monthlyContribution: 0, returnRate: SMALL_SAVINGS.ppf.value },
      epf: { balance: 0 },
      otherAssets: 0,
    },
    liabilities: [],
    protection: { emergencyTargetMonths: 6, healthCover: 0, lifeCover: 0 },
    goals: [],
    preferences: { risk: 'balanced', horizonYears: 20, targetAllocation: { ...PRESETS.balanced.weights } },
    lifeEvents: [],
  };
}
