import type { CityTier, StateCode } from '@/finance/assumptions';
import type { RegimeChoice } from '@/finance/tax';

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
  familySupport?: boolean; // money sent to parents or family (counts towards dependents for protection)
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
/**
 * How the whole-plan projection pays for a goal in its target year:
 *  - savings: liquid assets only; any shortfall leaves the goal unfunded
 *  - loan: the full cost is borrowed
 *  - mixed: liquid assets first, a loan for the rest
 */
export type FundingMode = 'savings' | 'loan' | 'mixed';

export interface LoanTerms {
  rate: number; // APR, decimal
  tenureYears: number;
  moratoriumMonths: number; // interest accrues and is added to the balance; EMIs start afterwards
}

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  cost: number; // present-day cost, INR
  targetYear: number; // calendar year
  saved: number; // existing dedicated savings (assumed to already sit inside cash/investments)
  priority: Priority;
  rank?: number; // order within the plan (set by dragging on the Goals page); breaks ties within a priority
  inflation: number; // goal-specific cost inflation
  source: FundingSource;
  fundingMode?: FundingMode; // defaults by category, see finance/goalFunding.ts
  loan?: LoanTerms; // defaults by category
  keepEventsIfUnfunded?: boolean; // keep life events linked to this goal even when it can't be paid for
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
  goalId?: string; // the goal this event depends on (e.g. an MBA break and the post-MBA raise)
  home?: HomeDetails;
}

export interface SalaryStructure {
  basicShare?: number; // default 0.4
  pfOnWageCeiling?: boolean; // PF on basic capped at ₹15,000 a month
  state?: StateCode; // for professional tax (default Maharashtra)
  regime?: RegimeChoice; // default: the cheaper regime each year
  other80C?: number; // old-regime 80C beyond employee PF (ELSS, PPF, insurance)
  sec80D?: number; // health-insurance premium deduction (old regime)
  hraExemption?: number; // annual HRA exemption (old regime)
}

export interface HomeDetails {
  propertyValue: number; // today's INR
  downPaymentPct: number; // decimal
  loanRate: number;
  tenureYears: number;
  state?: StateCode; // stamp duty and registration (default Maharashtra)
  stampDutyPct?: number; // overrides the state default (stamp duty + registration, decimal)
  underConstruction?: boolean; // adds 5% GST
  interiors?: number; // today's INR (default ₹5 L)
  sizeSqft?: number; // for maintenance
  maintenancePerSqft?: number; // INR per sq ft per month, today's prices
  propertyTaxAnnual?: number; // today's INR; default 0.1% of value
}

export interface FinancialProfile {
  planStartYear: number;
  about: {
    name: string;
    age: number;
    employment: Employment;
    fiAge: number;
    dependents: number;
    /** Answer to "Should we count your parents as dependents?" when family support is paid. Unset = yes. */
    parentsAsDependents?: boolean;
    cityTier?: CityTier; // 1 = metro (default)
  };
  income: {
    /**
     * 'ctc': take-home is derived from annual CTC every year (tax, EPF and professional tax recomputed).
     * 'takeHome' (or unset): the monthly take-home below is used directly and grows at salaryGrowth.
     */
    mode?: 'ctc' | 'takeHome';
    ctc?: number; // annual cost to company, INR
    salary?: SalaryStructure;
    monthlyTakeHome: number; // used when mode is 'takeHome'; otherwise a derived display value

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
      balance: number; // PPF + NPS (and EPF too, when position.epf is absent)
      monthlyContribution: number; // paid before take-home (e.g. EPF when position.epf is absent, or employer NPS)
      returnRate: number;
    };
    /** EPF account, separate from other retirement savings; locked until 58. When absent, EPF is inside `retirement`. */
    epf?: { balance: number };
    otherAssets: number; // e.g. vehicle, property already owned (not invested)
    elssLocked?: number; // ELSS units bought in the last 3 years, inside Indian equity; cannot be sold yet
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
  /** Share of each real (above-inflation) rise in take-home that goes to lifestyle spending. */
  lifestyleCreep: number;
  /** Annual fund costs by asset class, deducted from returns. */
  expenseRatios: AssetMap;
  epfRate: number;
  healthcareInflation: number; // for the post-FI healthcare line
  postFiHealthcare: number; // extra monthly healthcare cost after FI, today's INR
}

export interface ScenarioDeltas {
  salaryGrowth: number; // added to profile salary growth
  returns: number; // added to every asset-class return
  inflation: number;
  sipStepUp: number;
}
export type ScenarioKey = 'conservative' | 'base' | 'high';
