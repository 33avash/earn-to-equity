export type GoalYearStatus = 'funded' | 'shortfall';

export interface GoalOutcome {
  goalId: string;
  name: string;
  year: number;
  cost: number; // nominal cost in that year
  status: GoalYearStatus;
  shortfall: number;
}

export interface YearRow {
  index: number; // 1..N
  year: number; // calendar year
  age: number;
  income: number; // annual, nominal
  expenses: number; // annual living expenses incl. event-driven recurring costs
  debtPayments: number; // annual EMIs actually paid
  interestPaid: number;
  investableSurplus: number; // income − expenses − debt payments
  contributions: number; // into the portfolio (planned SIP + swept cash)
  savingsToCash: number;
  oneTimeCosts: number; // life-event costs paid this year
  goalWithdrawals: number;
  portfolio: number;
  retirement: number;
  cash: number; // may be negative = unfunded short-term borrowing
  property: number; // other assets incl. purchased homes
  totalAssets: number;
  liabilities: number; // loans + negative cash
  netWorth: number;
  netWorthReal: number; // in today's rupees
  financialAssets: number; // portfolio + retirement + positive cash (used for FI)
  fiTarget: number;
  fiReached: boolean;
  flags: string[]; // e.g. 'deficit', 'borrowing'
  events: string[]; // labels of life events applied this year
  goals: GoalOutcome[];
}

export interface SimOverrides {
  salaryGrowth?: number; // replaces the profile value
  inflation?: number;
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
}

export interface SimResult {
  rows: YearRow[];
  startNetWorth: number;
  fiYear: number | null;
  portfolioReturn: number;
}
