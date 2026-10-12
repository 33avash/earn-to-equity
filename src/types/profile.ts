/**
 * Shared financial profile — the single source of truth every module reads.
 *
 * Units convention (applies everywhere):
 *  - Money: Indian rupees (INR) as unrounded numbers. Monthly unless the field name says otherwise.
 *  - Rates: decimals per year (0.07 = 7% p.a.). Allocation weights: decimals summing to 1.
 *  - Costs for goals and life events are entered in TODAY'S rupees and inflated by the engine.
 *  - Years: calendar years (e.g. 2031). The plan starts on 1 January of `planStartYear`.
 */

export const ASSET_CLASSES = [
  'indianEquity',
  'intlEquity',
  'debt',
  'govtSchemes',
  'gold',
  'cash',
  'other',
] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];
export type AssetMap = Record<AssetClass, number>;

export type Employment = 'salaried' | 'self-employed' | 'student' | 'between-jobs' | 'other';

export interface LineItem {
  id: string;
  label: string;
  amount: number; // monthly INR
}

export type LiabilityKind = 'personal' | 'education' | 'car' | 'creditCard' | 'home' | 'other';
export interface Liability {
  id: string;
  kind: LiabilityKind;
  label: string;
  balance: number; // outstanding principal, INR
  rate: number; // annual interest rate (APR), decimal
  emi: number; // monthly repayment / minimum payment, INR
}

export type GoalCategory =
  | 'education'
  | 'travel'
  | 'car'
  | 'wedding'
  | 'home'
  | 'business'
  | 'family'
  | 'retirement'
  | 'fi'
  | 'other';
export type Priority = 1 | 2 | 3; // 1 = high
export type FundingSource = 'investments' | 'savings';

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  cost: number; // present-day cost, INR
  targetYear: number; // calendar year
  saved: number; // existing dedicated savings (assumed to already sit inside cash/investments)
  priority: Priority;
  inflation: number; // goal-specific cost inflation
  source: FundingSource;
}

export type LifeEventKind =
  | 'promotion'
  | 'jobChange'
  | 'careerBreak'
  | 'education'
  | 'marriage'
  | 'homePurchase'
  | 'family'
  | 'majorPurchase'
  | 'emergency'
  | 'retirement';

export interface LifeEvent {
  id: string;
  kind: LifeEventKind;
  label: string;
  year: number; // calendar year the event happens (applied from January of that year)
  oneTimeCost: number; // today's INR, inflated to the event year
  incomeChangePct: number; // permanent change to salary from this year, decimal (+0.2 = +20%)
  monthlyExpenseChange: number; // today's INR, recurring from this year (negative = saving)
  breakMonths: number; // career break: months without salary
  home?: {
    propertyValue: number; // today's INR
    downPaymentPct: number; // decimal
    loanRate: number;
    tenureYears: number;
  };
}

export interface FinancialProfile {
  planStartYear: number;
  about: {
    name: string;
    age: number;
    employment: Employment;
    fiAge: number;
    dependents: number;
  };
  income: {
    monthlyTakeHome: number;
    salaryGrowth: number;
    otherMonthlyIncome: number;
    careerNotes: string;
  };
  cashflow: {
    essential: LineItem[];
    lifestyle: LineItem[];
    monthlyInvestments: number; // SIPs etc. — a transfer, not an expense
    monthlySavings: number; // transfer to bank savings / emergency fund — not an expense
  };
  position: {
    cashSavings: number; // bank balance outside the emergency fund
    emergencyFund: number; // ring-fenced liquid reserve
    holdings: AssetMap; // current investments by asset class, INR
    retirement: {
      balance: number; // EPF + PPF + NPS combined
      monthlyContribution: number; // e.g. EPF deducted before take-home
      returnRate: number;
    };
    otherAssets: number; // e.g. vehicle, property already owned (not invested)
  };
  liabilities: Liability[];
  protection: {
    emergencyTargetMonths: number; // 3–12
    healthCover: number; // sum insured, INR
    lifeCover: number; // term cover, INR
  };
  goals: Goal[];
  preferences: {
    risk: RiskProfile;
    horizonYears: number;
    targetAllocation: AssetMap; // decimals summing to 1
  };
  lifeEvents: LifeEvent[];
}

export type RiskProfile = 'conservative' | 'balanced' | 'growth' | 'aggressive';
export type ContributionTiming = 'start' | 'end';

/** Illustrative, editable assumptions — never user facts. */
export interface Assumptions {
  inflation: number;
  returns: AssetMap; // assumed annual return by asset class
  volatility: AssetMap; // assumed annual standard deviation (Risk Lab only)
  sipStepUp: number; // annual increase in monthly investments
  withdrawalRate: number; // for the FI target
  propertyGrowth: number;
  contributionTiming: ContributionTiming;
  sweepExcessCash: boolean; // invest cash above the emergency target each year-end
  horizonYears: number; // 20 by spec
}

export interface ScenarioDeltas {
  salaryGrowth: number; // added to profile salary growth
  returns: number; // added to every asset-class return
  inflation: number;
  sipStepUp: number;
}
export type ScenarioKey = 'conservative' | 'base' | 'high';
