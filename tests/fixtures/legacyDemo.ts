import type { FinancialProfile } from '@/types/profile';
import { PRESETS } from '@/finance/portfolio';
import { HOME_LOAN_RATE, SMALL_SAVINGS } from '@/finance/assumptions';

/**
 * The demo persona before the October 2026 rework: a full-time MBA with a 21-month career break, a ₹11.4 L CTC
 * on a 40% basic, ₹5 L health cover. Kept as a fixture because the engine tests below were hand-checked against
 * it: career breaks, events linked to an unpaid goal, mixed funding that keeps back living costs, lender limits.
 * The live demo is demoProfile() in src/state/demo.ts.
 */
export function legacyDemoProfile(startYear = 2026): FinancialProfile {
  const Y = startYear;
  return {
    planStartYear: Y,
    about: { name: 'Riya', age: 26, employment: 'salaried', fiAge: 50, dependents: 0, cityTier: 1 },
    income: {
      mode: 'ctc',
      ctc: 1140000,
      salary: { basicShare: 0.4, pfOnWageCeiling: false, state: 'MH', regime: 'auto' },
      monthlyTakeHome: 85000, // derived from CTC; kept for display before the first calculation
      salaryGrowth: 0.08,
      otherMonthlyIncome: 0,
      careerNotes: 'Considering an MBA in a few years.',
    },
    cashflow: {
      essential: [
        { id: 'rent', label: 'Rent', amount: 20000 },
        { id: 'groceries', label: 'Groceries & household', amount: 8000 },
        { id: 'utilities', label: 'Utilities & phone', amount: 3000 },
        { id: 'transport', label: 'Transport', amount: 4000 },
        { id: 'insurance', label: 'Insurance premiums', amount: 1500 },
        { id: 'family', label: 'Support to parents', amount: 5000, familySupport: true },
      ],
      lifestyle: [
        { id: 'dining', label: 'Dining & entertainment', amount: 6000 },
        { id: 'shopping', label: 'Shopping', amount: 4000 },
        { id: 'subs', label: 'Subscriptions', amount: 1000 },
        { id: 'travel', label: 'Weekend travel', amount: 3000 },
      ],
      monthlyInvestments: 15000,
      monthlySavings: 4000,
    },
    position: {
      cashSavings: 60000,
      emergencyFund: 120000,
      holdings: { indianEquity: 240000, intlEquity: 40000, debt: 60000, govtSchemes: 50000, gold: 30000, cash: 20000, other: 0 },
      retirement: { balance: 0, monthlyContribution: 0, returnRate: SMALL_SAVINGS.ppf.value },
      epf: { balance: 280000 },
      otherAssets: 50000,
    },
    liabilities: [
      { id: 'edu', kind: 'education', label: 'Education loan', balance: 320000, rate: 0.095, emi: 7000 },
      { id: 'cc', kind: 'creditCard', label: 'Credit card', balance: 25000, rate: 0.36, emi: 3000 },
    ],
    protection: { emergencyTargetMonths: 6, healthCover: 500000, lifeCover: 0 },
    goals: [
      { id: 'travel', name: 'Trip to Japan', category: 'travel', cost: 250000, targetYear: Y + 1, saved: 50000, priority: 3, inflation: 0.06, source: 'savings' },
      { id: 'mba', name: 'MBA', category: 'education', cost: 1800000, targetYear: Y + 3, saved: 100000, priority: 1, inflation: 0.08, source: 'investments', fundingMode: 'mixed' },
      { id: 'car', name: 'First car', category: 'car', cost: 800000, targetYear: Y + 6, saved: 0, priority: 3, inflation: 0.05, source: 'investments' },
    ],
    preferences: { risk: 'growth', horizonYears: 20, targetAllocation: { ...PRESETS.growth.weights } },
    lifeEvents: [
      { id: 'promo', kind: 'promotion', label: 'Post-MBA role', year: Y + 5, oneTimeCost: 0, incomeChangePct: 0.5, monthlyExpenseChange: 0, breakMonths: 0, goalId: 'mba' },
      { id: 'mbabreak', kind: 'careerBreak', label: 'Full-time MBA', year: Y + 3, oneTimeCost: 0, incomeChangePct: 0, monthlyExpenseChange: 0, breakMonths: 21, goalId: 'mba' },
      { id: 'wed', kind: 'marriage', label: 'Wedding', year: Y + 7, oneTimeCost: 600000, incomeChangePct: 0, monthlyExpenseChange: 8000, breakMonths: 0 },
      {
        id: 'home', kind: 'homePurchase', label: 'Buy a flat', year: Y + 13, oneTimeCost: 0, incomeChangePct: 0, monthlyExpenseChange: -20000, breakMonths: 0,
        home: { propertyValue: 6000000, downPaymentPct: 0.2, loanRate: HOME_LOAN_RATE.value, tenureYears: 20, state: 'MH', interiors: 500000, sizeSqft: 900, maintenancePerSqft: 4 },
      },
    ],
  };
}

