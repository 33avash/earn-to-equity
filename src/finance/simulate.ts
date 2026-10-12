import type { Assumptions, FinancialProfile, LifeEvent } from '@/types/profile';
import type { GoalOutcome, SimOverrides, SimResult, YearRow } from '@/types/sim';
import { monthlyCashflow } from './cashflow';
import { balanceSheet, portfolioValue } from './networth';
import { weightedReturn } from './portfolio';
import { emi as emiFor, loanMonthlyRate, monthlyRate } from './rates';

/** Assumed cost of unplanned short-term borrowing when liquid assets run out. */
export const BORROWING_RATE = 0.14;

/** Goals in these categories are targets for the corpus, not withdrawals. */
export const NON_WITHDRAWAL_GOALS = new Set(['retirement', 'fi']);

interface Loan {
  label: string;
  bal: number;
  apr: number;
  emi: number;
}

/**
 * The single year-by-year projection engine used by every module.
 *
 * Timing conventions
 *  - The plan starts on 1 January of `planStartYear`. Year 1 = that calendar year.
 *  - Annual changes (salary growth, inflation, SIP step-up) apply at the start of each year from Year 2.
 *  - Life events and goals dated year T happen at the START of year T, i.e. after (T − startYear) years.
 *    Their present-day costs are inflated by that many years.
 *  - Within a month: loan interest accrues, then repayments, then the surplus is invested or saved.
 *    The investment is added before ('start') or after ('end') that month's growth.
 *  - Rows report year-end balances and full-year flows.
 *
 * Double-counting rules
 *  - Transfers to savings and investments are not expenses.
 *  - Only loan interest reduces net worth. Principal repayment moves money from cash to a lower liability.
 *  - Goal-dedicated savings are assumed to already be part of cash or investments.
 *  - A goal withdrawal leaves the portfolio once, in its target year. Retirement and FI goals are never withdrawn.
 *  - A purchase (e.g. a home) converts liquid assets into a property asset and may add a loan.
 *  - When there is a deficit, cash above the emergency reserve is used first, then investments, then the
 *    reserve. Anything still unfunded becomes short-term borrowing (negative cash, charged BORROWING_RATE).
 */
export function simulate(p: FinancialProfile, a: Assumptions, o: SimOverrides = {}): SimResult {
  const years = Math.max(1, Math.min(50, Math.round(o.years ?? a.horizonYears)));
  const startYear = p.planStartYear;
  const infl = o.inflation ?? a.inflation;
  const salaryGrowth = o.salaryGrowth ?? p.income.salaryGrowth;
  const stepUp = o.sipStepUp ?? a.sipStepUp;
  const baseReturn = weightedReturn(p.preferences.targetAllocation, a.returns) + (o.returnShift ?? 0);
  const cashMonthly = monthlyRate(Math.max(-0.99, a.returns.cash));
  const borrowMonthly = loanMonthlyRate(BORROWING_RATE);
  const cf = monthlyCashflow(p);
  const sheet = balanceSheet(p);

  // Monthly flows (nominal, current year)
  let salary = Math.max(0, p.income.monthlyTakeHome);
  let otherIncome = Math.max(0, p.income.otherMonthlyIncome);
  let essential = cf.essential;
  let lifestyle = Math.max(0, cf.lifestyle - Math.max(0, o.expenseCut ?? 0));
  let eventExpense = 0;
  let sip = Math.max(0, cf.plannedInvestments * (o.sipMultiplier ?? 1));
  // Extra investment funded from outside the current budget (e.g. a raise or bonus set aside).
  let extraInvest = Math.max(0, o.extraMonthlyInvestment ?? 0);
  let retContribution = Math.max(0, p.position.retirement.monthlyContribution);
  const retMonthly = monthlyRate(p.position.retirement.returnRate);

  // Balances
  let cash = sheet.cash;
  let portfolio = portfolioValue(p);
  let retirement = sheet.retirement;
  const otherAssets = sheet.otherAssets;
  let homes = 0;
  const loans: Loan[] = p.liabilities
    .filter((l) => l.balance > 0)
    .map((l) => ({ label: l.label, bal: l.balance, apr: l.rate, emi: Math.max(0, l.emi) }));

  const events: LifeEvent[] = [...(o.excludeEvents ? [] : p.lifeEvents), ...(o.extraEvents ?? [])].sort((x, y) => x.year - y.year);
  let retired = false;
  let breakMonths = 0;
  let recovery: { untilIndex: number; monthlyBoost: number } | null = null;

  const reserveFor = () => p.protection.emergencyTargetMonths * (essential + eventExpense + loans.reduce((s, l) => (l.bal > 0 ? s + l.emi : s), 0));

  /** Pays a lump sum from liquid assets in the documented order. */
  const payLump = (amount: number) => {
    let left = amount;
    const excess = Math.max(0, cash - reserveFor());
    const fromExcess = Math.min(excess, left);
    cash -= fromExcess;
    left -= fromExcess;
    const fromPortfolio = Math.min(Math.max(0, portfolio), left);
    portfolio -= fromPortfolio;
    left -= fromPortfolio;
    cash -= left; // reserve, then borrowing (cash may go negative)
  };

  const rows: YearRow[] = [];
  for (let y = 1; y <= years; y++) {
    const calYear = startYear + y - 1;
    const elapsed = y - 1;
    const flags = new Set<string>();
    const eventLabels: string[] = [];
    if (y > 1) {
      salary *= 1 + salaryGrowth;
      otherIncome *= 1 + infl;
      essential *= 1 + infl;
      lifestyle *= 1 + infl;
      eventExpense *= 1 + infl;
      sip *= 1 + stepUp;
      extraInvest *= 1 + stepUp;
      retContribution *= 1 + salaryGrowth;
      homes *= 1 + a.propertyGrowth;
    }
    if (o.retireAtYear !== undefined && calYear >= o.retireAtYear) retired = true;

    let oneTimeCosts = 0;
    for (const ev of events.filter((e) => e.year === calYear)) {
      eventLabels.push(ev.label);
      const priceIndex = Math.pow(1 + infl, elapsed);
      if (ev.incomeChangePct) salary *= Math.max(0, 1 + ev.incomeChangePct);
      if (ev.monthlyExpenseChange) eventExpense += ev.monthlyExpenseChange * priceIndex;
      if (ev.breakMonths > 0) breakMonths += Math.round(ev.breakMonths);
      if (ev.kind === 'retirement') retired = true;
      if (ev.oneTimeCost > 0) {
        const cost = ev.oneTimeCost * priceIndex;
        payLump(cost);
        oneTimeCosts += cost;
      }
      if (ev.kind === 'homePurchase' && ev.home && ev.home.propertyValue > 0) {
        const value = ev.home.propertyValue * Math.pow(1 + a.propertyGrowth, elapsed);
        const down = value * Math.min(1, Math.max(0, ev.home.downPaymentPct));
        const loan = value - down;
        payLump(down);
        oneTimeCosts += down;
        homes += value;
        if (loan > 0) {
          loans.push({ label: `${ev.label} loan`, bal: loan, apr: ev.home.loanRate, emi: emiFor(loan, ev.home.loanRate, Math.max(1, ev.home.tenureYears) * 12) });
        }
      }
    }

    // Goals due this year, in priority order. Discretionary: funded only when affordable.
    const goalOutcomes: GoalOutcome[] = [];
    let goalWithdrawals = 0;
    const due = p.goals
      .filter((g) => g.targetYear === calYear && !NON_WITHDRAWAL_GOALS.has(g.category))
      .sort((g1, g2) => g1.priority - g2.priority);
    for (const g of due) {
      const cost = g.cost * Math.pow(1 + g.inflation, elapsed);
      const available = Math.max(0, portfolio) + Math.max(0, cash - reserveFor());
      if (available >= cost) {
        payLump(cost);
        goalWithdrawals += cost;
        goalOutcomes.push({ goalId: g.id, name: g.name, year: calYear, cost, status: 'funded', shortfall: 0 });
      } else {
        goalOutcomes.push({ goalId: g.id, name: g.name, year: calYear, cost, status: 'shortfall', shortfall: cost - available });
        flags.add('goal-shortfall');
      }
    }

    if (o.shock && o.shock.year === calYear && o.shock.drop > 0) {
      const drop = Math.min(0.95, o.shock.drop);
      portfolio *= 1 - drop;
      flags.add('market-shock');
      if (o.shock.recoveryYears > 0) {
        const annualBoost = Math.pow(1 / (1 - drop), 1 / o.shock.recoveryYears);
        recovery = { untilIndex: y + o.shock.recoveryYears - 1, monthlyBoost: Math.pow(annualBoost, 1 / 12) };
      }
    }

    const yearReturn = o.yearReturns?.[y - 1] ?? baseReturn;
    let pm = monthlyRate(Math.max(-0.99, yearReturn));
    if (recovery && y <= recovery.untilIndex) pm = (1 + pm) * recovery.monthlyBoost - 1;

    let income = 0, expenses = 0, debtPayments = 0, interestPaid = 0, contributions = 0, savingsToCash = 0;
    for (let m = 0; m < 12; m++) {
      const onBreak = breakMonths > 0;
      if (onBreak) breakMonths--;
      const monthSalary = retired || onBreak ? 0 : salary;
      const monthIncome = monthSalary + otherIncome;
      const monthExpenses = essential + lifestyle + eventExpense;
      let monthDebt = 0;
      for (const l of loans) {
        if (l.bal <= 0) continue;
        const interest = l.bal * loanMonthlyRate(l.apr);
        const pay = Math.min(l.emi, l.bal + interest);
        l.bal = l.bal + interest - pay;
        if (l.bal < 0.01) l.bal = 0;
        interestPaid += interest;
        monthDebt += pay;
      }
      const surplus = monthIncome - monthExpenses - monthDebt;
      const planned = monthSalary > 0 ? sip : 0;
      const fromBudget = Math.min(planned, Math.max(0, surplus));
      const invest = fromBudget + (monthSalary > 0 ? extraInvest : 0);
      const toCash = surplus - fromBudget;
      if (toCash < 0) {
        flags.add('deficit');
        // Draw down: cash first (keeping it ≥ 0), then investments, then borrowing.
        let need = -toCash;
        const fromCash = Math.min(Math.max(0, cash), need);
        cash -= fromCash;
        need -= fromCash;
        const fromPortfolio = Math.min(Math.max(0, portfolio), need);
        portfolio -= fromPortfolio;
        need -= fromPortfolio;
        cash -= need;
      } else {
        cash += toCash;
        savingsToCash += toCash;
      }
      if (a.contributionTiming === 'start') portfolio = (portfolio + invest) * (1 + pm);
      else portfolio = portfolio * (1 + pm) + invest;
      cash = cash >= 0 ? cash * (1 + cashMonthly) : cash * (1 + borrowMonthly);
      const retIn = monthSalary > 0 ? retContribution : 0;
      retirement = retirement * (1 + retMonthly) + retIn;

      income += monthIncome;
      expenses += monthExpenses;
      debtPayments += monthDebt;
      contributions += invest;
    }

    if (a.sweepExcessCash) {
      const excess = cash - reserveFor();
      if (excess > 0) {
        cash -= excess;
        portfolio += excess;
        contributions += excess;
      }
    }
    if (cash < 0) flags.add('borrowing');

    const loanTotal = loans.reduce((s, l) => s + Math.max(0, l.bal), 0);
    const liabilities = loanTotal + Math.max(0, -cash);
    const property = otherAssets + homes;
    const totalAssets = Math.max(0, portfolio) + retirement + Math.max(0, cash) + property;
    const netWorth = totalAssets - liabilities;
    const financialAssets = Math.max(0, portfolio) + retirement + Math.max(0, cash);
    const fiTarget = a.withdrawalRate > 0 ? expenses / a.withdrawalRate : Infinity;

    rows.push({
      index: y,
      year: calYear,
      age: p.about.age + y,
      income,
      expenses,
      debtPayments,
      interestPaid,
      investableSurplus: income - expenses - debtPayments,
      contributions,
      savingsToCash,
      oneTimeCosts,
      goalWithdrawals,
      portfolio: Math.max(0, portfolio),
      retirement,
      cash,
      property,
      totalAssets,
      liabilities,
      netWorth,
      netWorthReal: netWorth / Math.pow(1 + infl, y),
      financialAssets,
      fiTarget,
      fiReached: financialAssets >= fiTarget,
      flags: [...flags],
      events: eventLabels,
      goals: goalOutcomes,
    });
  }

  const fiRow = rows.find((r) => r.fiReached);
  return { rows, startNetWorth: sheet.netWorth, fiYear: fiRow ? fiRow.year : null, portfolioReturn: baseReturn };
}

export const finalRow = (r: SimResult) => r.rows[r.rows.length - 1];
