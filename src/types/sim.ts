/** funded: paid from savings · financed: partly or wholly by a loan · shortfall: left unpaid */
export type GoalYearStatus = 'funded' | 'financed' | 'shortfall';

export interface GoalOutcome {
  goalId: string;
  name: string;
  year: number;
  cost: number; // nominal cost in that year
  status: GoalYearStatus;
  fromSavings: number; // paid from cash and investments
  loan: number; // borrowed
  shortfall: number; // left unpaid (savings-only goals)
}

export interface YearRow {
  index: number; // 1..N
  year: number; // calendar year; flows cover the whole year, balances are at 31 December
  age: number; // age at the start of `year` (see finance/timeline.ts)
  income: number; // annual take-home (plus other income), nominal
  incomeTax: number; // income tax on salary this year (CTC mode), already deducted from income
  regime: 'new' | 'old' | null; // tax regime used (CTC mode)
  expenses: number; // annual living expenses incl. event-driven recurring costs
  lifestyleMonthly: number; // lifestyle spending per month at year-end, after creep
  debtPayments: number; // annual EMIs actually paid
  interestPaid: number; // interest charged: loan interest (incl. moratorium interest added to the balance) and short-term borrowing
  investableSurplus: number; // income − expenses − debt payments
  contributions: number; // into the portfolio (planned SIP + swept cash)
  savingsToCash: number;
  oneTimeCosts: number; // life-event costs paid this year (incl. stamp duty, GST, interiors), excl. down payments
  downPayments: number; // converted into property, not a cost
  goalWithdrawals: number; // full cost of goals paid this year, including any loan-financed part
  goalLoans: number; // part of goalWithdrawals financed by new loans
  capitalGainsTax: number; // tax on investments sold this year
  portfolio: number;
  portfolioBasis: number; // cost of the investments still held
  retirement: number; // all retirement accounts, incl. EPF
  epf: number; // EPF part of retirement; locked until 58
  epfContributions: number;
  epfInterest: number;
  cash: number; // may be negative = unfunded short-term borrowing
  property: number; // other assets incl. purchased homes
  totalAssets: number;
  liabilities: number; // loans + negative cash
  netWorth: number;
  netWorthReal: number; // in today's rupees
  financialAssets: number; // portfolio + retirement + positive cash
  financialAssetsAfterTax: number; // financial assets less tax due if all investments were sold (used for FI)
  fiHealthcare: number; // post-FI healthcare cost per year, inflated separately
  fiTarget: number;
  fiReached: boolean;
  flags: string[]; // e.g. 'deficit', 'borrowing'
  events: string[]; // labels of life events applied this year
  goals: GoalOutcome[];
}

export interface SimOverrides {
  salaryGrowth?: number; // replaces the profile value
  inflation?: number;
  /** Inflation for specific calendar years, overriding `inflation` in those years (e.g. a 3-year spike). */
  inflationByYear?: Record<number, number>;
  returnShift?: number; // added to the weighted portfolio return
  sipStepUp?: number;
  extraMonthlyInvestment?: number; // invested on top of the plan, funded outside the current budget
  expenseCut?: number; // monthly reduction in lifestyle spending (today's rupees)
  sipMultiplier?: number;
  years?: number;
  yearReturns?: number[]; // explicit portfolio return per year (Monte Carlo)
  shock?: { year: number; drop: number; recoveryYears: number }; // calendar year
  extraEvents?: import('./profile').LifeEvent[];
  excludeEvents?: boolean;
  retireAtYear?: number; // calendar year salary stops
  lifestyleCreep?: number; // replaces the assumption
}

/**
 * A balance snapshot on 1 January of `year`. Point 0 is today; point k is the end of row k.
 * A horizon of N years gives N + 1 points.
 */
export interface ProjectionPoint {
  year: number;
  age: number;
  netWorth: number;
  netWorthReal: number;
  financialAssets: number;
  fiTarget: number | null; // null for today
  events: string[]; // events during the year that ended at this point
  row: YearRow | null; // the year that ended at this point (null for today)
}

export interface SkippedEvent {
  eventId: string;
  label: string;
  goalId: string;
}

export interface SimResult {
  rows: YearRow[];
  points: ProjectionPoint[];
  startNetWorth: number;
  fiYear: number | null; // first 1 January on which financial assets cover the FI target
  fiAge: number | null;
  portfolioReturn: number;
  skippedEvents: SkippedEvent[]; // events left out because the goal they depend on is unfunded
}
