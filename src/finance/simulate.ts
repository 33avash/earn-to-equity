import type { Assumptions, FinancialProfile, LifeEvent } from '@/types/profile';
import type { GoalOutcome, ProjectionPoint, SimOverrides, SimResult, SkippedEvent, YearRow } from '@/types/sim';
import { CAPITAL_GAINS, CESS, HOME_DEFAULTS, UNDER_CONSTRUCTION_GST, propertyCharges } from './assumptions';
import { monthlyCashflow } from './cashflow';
import { goalFundingMode, goalLoanTerms } from './goalFunding';
import { salaryInputs, usesCtc } from './income';
import { balanceSheet, portfolioValue } from './networth';
import { netReturns, weightedReturn } from './portfolio';
import { emi as emiFor, loanMonthlyRate, monthlyRate } from './rates';
import { marginalRate, salaryBreakdown, taxableIncome } from './tax';
import { ageInYear } from './timeline';

/** Assumed cost of unplanned short-term borrowing when liquid assets run out. */
export const BORROWING_RATE = 0.14;

/** Goals in these categories are targets for the corpus, not withdrawals. */
export const NON_WITHDRAWAL_GOALS = new Set(['retirement', 'fi']);

/** Marginal slab rate assumed for debt-fund gains when there is no salary that year (e.g. after FI). */
const DEFAULT_SLAB_RATE = 0.2 * (1 + CESS.value);

interface Loan {
  label: string;
  bal: number;
  apr: number;
  emi: number;
  moratorium: number; // months left in which interest is added to the balance and nothing is paid
  tenureMonths: number; // repayment period once the moratorium ends
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
 * Salary
 *  - With a CTC, take-home is recomputed every year from CTC: EPF, professional tax and income tax under
 *    the cheaper regime (src/finance/tax.ts). Salary growth and raises apply to CTC, so take-home grows
 *    more slowly as income crosses slabs. In a year with a career break, tax is on the months worked.
 *  - Without a CTC, the entered take-home grows at the salary-growth rate.
 *  - Lifestyle creep: a share (`lifestyleCreep`) of each above-inflation rise in take-home is added to
 *    lifestyle spending, permanently.
 *
 * Accounts
 *  - EPF (when the profile has one) receives the employee and employer contributions, less the pension
 *    (EPS) share. Interest accrues monthly on the running balance and is credited at year-end, as EPFO does.
 *  - Investment returns are net of expense ratios.
 *  - Selling investments realises gains in proportion to the portfolio's cost basis. Equity gains above
 *    ₹1.25 lakh a year are taxed at 12.5%; gold, international and other funds at 12.5%; debt funds and
 *    cash at the slab rate; government schemes (PPF) not at all. Tax is paid by selling a little more.
 *    Holdings are assumed to be long-term and invested in the target mix.
 *
 * Double-counting rules
 *  - Transfers to savings and investments are not expenses.
 *  - Only interest, taxes and costs reduce net worth. Principal repayment moves money from cash to a lower liability.
 *  - Goal-dedicated savings are assumed to already be part of cash or investments.
 *  - A goal is paid once, in its target year, according to its funding mode: from liquid assets
 *    ('savings'), by a new loan ('loan'), or liquid assets first and a loan for the rest ('mixed').
 *    A savings-only goal that cannot be afforded is left unpaid and reported as a shortfall.
 *    Retirement and FI goals are never withdrawn.
 *    A 'mixed' goal keeps back enough savings to cover living costs and EMIs through any career
 *    break linked to it, so the loan pays the fees and savings pay the rent.
 *  - Life events linked to a goal (`goalId`) are dropped when that goal is left unpaid, unless the
 *    goal has `keepEventsIfUnfunded`. The projection is then rerun without them.
 *  - A home purchase converts liquid assets into a property asset (the down payment) and adds a loan.
 *    Stamp duty, registration, GST on under-construction homes and interiors are costs. Maintenance
 *    and property tax become recurring expenses.
 *  - When there is a deficit, cash above the emergency reserve is used first, then investments, then the
 *    reserve. Anything still unfunded becomes short-term borrowing (negative cash, charged BORROWING_RATE).
 *    While it is outstanding, surpluses repay it instead of funding SIPs, and investments clear it at year-end.
 *
 * FI
 *  - FI target = (living expenses + post-FI healthcare) ÷ withdrawal rate + debt still owed. Healthcare
 *    grows at its own inflation rate. Financial assets count after the tax due if investments were sold.
 */
export function simulate(p: FinancialProfile, a: Assumptions, o: SimOverrides = {}): SimResult {
  const first = run(p, a, o, new Set());
  const unpaid = new Set(
    first.rows
      .flatMap((r) => r.goals)
      .filter((g) => g.status === 'shortfall' && !p.goals.find((x) => x.id === g.goalId)?.keepEventsIfUnfunded)
      .map((g) => g.goalId),
  );
  const dependent = [...(o.excludeEvents ? [] : p.lifeEvents), ...(o.extraEvents ?? [])].filter((e) => e.goalId && unpaid.has(e.goalId));
  if (!dependent.length) return first;
  const skippedEvents: SkippedEvent[] = dependent.map((e) => ({ eventId: e.id, label: e.label, goalId: e.goalId! }));
  return { ...run(p, a, o, new Set(dependent.map((e) => e.id))), skippedEvents };
}

/** One-off and recurring costs of buying a home, in the purchase year's rupees. */
export function homePurchaseCosts(home: NonNullable<LifeEvent['home']>, value: number, priceIndex: number) {
  const charges = propertyCharges(home.state ?? 'MH');
  const stampDuty = home.stampDutyPct !== undefined ? value * home.stampDutyPct : value * charges.stampDuty + Math.min(value * charges.registration, charges.registrationCap);
  const gst = home.underConstruction ? value * UNDER_CONSTRUCTION_GST.value : 0;
  const interiors = (home.interiors ?? HOME_DEFAULTS.interiors) * priceIndex;
  const downPayment = value * Math.min(1, Math.max(0, home.downPaymentPct));
  const maintenanceMonthly = (home.sizeSqft ?? 0) * (home.maintenancePerSqft ?? HOME_DEFAULTS.maintenancePerSqft) * priceIndex;
  const propertyTaxMonthly = (home.propertyTaxAnnual !== undefined ? home.propertyTaxAnnual * priceIndex : value * HOME_DEFAULTS.propertyTaxShare) / 12;
  return { downPayment, stampDuty, gst, interiors, upfront: downPayment + stampDuty + gst + interiors, loan: value - downPayment, maintenanceMonthly, propertyTaxMonthly };
}

function run(p: FinancialProfile, a: Assumptions, o: SimOverrides, skip: Set<string>): SimResult {
  const years = Math.max(1, Math.min(50, Math.round(o.years ?? a.horizonYears)));
  const startYear = p.planStartYear;
  const infl = o.inflation ?? a.inflation;
  const salaryGrowth = o.salaryGrowth ?? p.income.salaryGrowth;
  const stepUp = o.sipStepUp ?? a.sipStepUp;
  const creep = Math.max(0, o.lifestyleCreep ?? a.lifestyleCreep ?? 0);
  const alloc = p.preferences.targetAllocation;
  const baseReturn = weightedReturn(alloc, netReturns(a)) + (o.returnShift ?? 0);
  const cashMonthly = monthlyRate(Math.max(-0.99, a.returns.cash));
  const borrowMonthly = loanMonthlyRate(BORROWING_RATE);
  const cf = monthlyCashflow(p);
  const sheet = balanceSheet(p);
  const ctcMode = usesCtc(p);
  const hasEpf = p.position.epf !== undefined;

  // Tax shares of a rupee of realised gain, by how each asset class is taxed (portfolio held at target mix).
  const wSum = Object.values(alloc).reduce((s, w) => s + w, 0) || 1;
  const wEquity = alloc.indianEquity / wSum;
  const wOther = (alloc.intlEquity + alloc.gold + alloc.other) / wSum;
  const wSlab = (alloc.debt + alloc.cash) / wSum;
  const cg = CAPITAL_GAINS.value;

  // Monthly flows (nominal, current year)
  let ctc = Math.max(0, p.income.ctc ?? 0); // annual, CTC mode only
  let salary = Math.max(0, p.income.monthlyTakeHome); // take-home mode only
  let otherIncome = Math.max(0, p.income.otherMonthlyIncome);
  let essential = cf.essential;
  let lifestyle = Math.max(0, cf.lifestyle - Math.max(0, o.expenseCut ?? 0));
  let eventExpense = 0;
  let sip = Math.max(0, cf.plannedInvestments * (o.sipMultiplier ?? 1));
  // Extra investment funded from outside the current budget (e.g. a raise or bonus set aside).
  let extraInvest = Math.max(0, o.extraMonthlyInvestment ?? 0);
  let retContribution = Math.max(0, p.position.retirement.monthlyContribution);
  const retMonthly = monthlyRate(p.position.retirement.returnRate);
  const fullYearTakeHome = () => (ctcMode ? salaryBreakdown(salaryInputs(p, ctc)).monthlyTakeHome : salary);
  let prevTakeHome = fullYearTakeHome();
  let priceLevel = 1; // cumulative inflation applied to costs, as of the start of the current year
  let realLevel = 1; // cumulative inflation to the end of the current year, for today's-rupee figures

  // Balances
  let cash = sheet.cash;
  let portfolio = portfolioValue(p);
  let basis = portfolio; // cost basis; existing holdings are assumed to be at cost
  let retirement = Math.max(0, p.position.retirement.balance);
  let epf = Math.max(0, p.position.epf?.balance ?? 0);
  const otherAssets = sheet.otherAssets;
  let homes = 0;
  const loans: Loan[] = p.liabilities
    .filter((l) => l.balance > 0)
    .map((l) => ({ label: l.label, bal: l.balance, apr: l.rate, emi: Math.max(0, l.emi), moratorium: 0, tenureMonths: 0 }));

  const events: LifeEvent[] = [...(o.excludeEvents ? [] : p.lifeEvents), ...(o.extraEvents ?? [])]
    .filter((e) => !skip.has(e.id))
    .sort((x, y) => x.year - y.year);
  let retired = false;
  let breakMonths = 0;
  let recovery: { untilIndex: number; monthlyBoost: number } | null = null;

  // Per-year tax state for selling investments.
  let exemptionLeft = cg.equityLtcgExemption;
  let slabRate = DEFAULT_SLAB_RATE;
  let capitalGainsTax = 0;

  /** Tax due on a realised gain, using up this year's equity exemption only if `consume`. */
  const gainsTax = (gain: number, consume: boolean, exemption = exemptionLeft) => {
    if (gain <= 0) return 0;
    const equityGain = gain * wEquity;
    const exempt = Math.min(exemption, equityGain);
    if (consume) exemptionLeft -= exempt;
    return ((equityGain - exempt) * cg.equityLtcg + gain * wOther * cg.otherLtcg) * (1 + CESS.value) + gain * wSlab * slabRate;
  };
  const gainShare = () => (portfolio > 0 ? Math.max(0, 1 - basis / portfolio) : 0);

  /** Sells investments to raise `net` after tax. Returns the net amount actually raised. */
  const sellNet = (net: number) => {
    if (net <= 0 || portfolio <= 0) return 0;
    const share = gainShare();
    const ex = exemptionLeft;
    let gross = net;
    for (let k = 0; k < 8; k++) gross = Math.min(portfolio, net + gainsTax(gross * share, false, ex));
    const tax = gainsTax(gross * share, true);
    basis -= portfolio > 0 ? gross * (basis / portfolio) : 0;
    portfolio -= gross;
    capitalGainsTax += tax;
    return gross - tax;
  };

  const reserveFor = () => p.protection.emergencyTargetMonths * (essential + eventExpense + loans.reduce((s, l) => (l.bal > 0 ? s + l.emi : s), 0));

  /** Pays a lump sum from liquid assets in the documented order. */
  const payLump = (amount: number) => {
    let left = amount;
    const excess = Math.max(0, cash - reserveFor());
    const fromExcess = Math.min(excess, left);
    cash -= fromExcess;
    left -= fromExcess;
    left -= sellNet(left);
    cash -= left; // reserve, then borrowing (cash may go negative)
  };
  /** Liquid assets available after tax, above the reserve. */
  const liquidAfterTax = () => Math.max(0, portfolio - gainsTax(Math.max(0, portfolio) * gainShare(), false)) + Math.max(0, cash - reserveFor());

  const rows: YearRow[] = [];
  for (let y = 1; y <= years; y++) {
    const calYear = startYear + y - 1;
    const elapsed = y - 1;
    const flags = new Set<string>();
    const eventLabels: string[] = [];
    exemptionLeft = cg.equityLtcgExemption;
    capitalGainsTax = 0;
    const inflY = o.inflationByYear?.[calYear] ?? infl;
    if (y > 1) {
      priceLevel *= 1 + inflY;
      ctc *= 1 + salaryGrowth;
      salary *= 1 + salaryGrowth;
      otherIncome *= 1 + inflY;
      essential *= 1 + inflY;
      lifestyle *= 1 + inflY;
      eventExpense *= 1 + inflY;
      sip *= 1 + stepUp;
      extraInvest *= 1 + stepUp;
      retContribution *= 1 + salaryGrowth;
      homes *= 1 + a.propertyGrowth;
    }
    if (o.retireAtYear !== undefined && calYear >= o.retireAtYear) retired = true;

    let oneTimeCosts = 0;
    let downPayments = 0;
    for (const ev of events.filter((e) => e.year === calYear)) {
      eventLabels.push(ev.label);
      const priceIndex = priceLevel;
      if (ev.incomeChangePct) {
        const k = Math.max(0, 1 + ev.incomeChangePct);
        ctc *= k;
        salary *= k;
        // Retirement contributions (e.g. EPF) are a share of salary, so they move with it.
        retContribution *= k;
      }
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
        const c = homePurchaseCosts(ev.home, value, priceIndex);
        payLump(c.upfront);
        downPayments += c.downPayment;
        oneTimeCosts += c.upfront - c.downPayment;
        homes += value;
        eventExpense += c.maintenanceMonthly + c.propertyTaxMonthly;
        if (c.loan > 0) {
          const tenureMonths = Math.max(1, ev.home.tenureYears) * 12;
          loans.push({ label: `${ev.label} loan`, bal: c.loan, apr: ev.home.loanRate, emi: emiFor(c.loan, ev.home.loanRate, tenureMonths), moratorium: 0, tenureMonths });
        }
      }
    }

    // Salary for the year: months worked, then take-home and EPF credit for those months.
    const worked = retired ? 0 : Math.max(0, 12 - Math.min(12, breakMonths));
    let monthTakeHome = salary;
    let monthEpf = 0;
    let yearTax = 0;
    let regime: YearRow['regime'] = null;
    if (ctcMode && worked > 0) {
      const b = salaryBreakdown(salaryInputs(p, (ctc * worked) / 12));
      monthTakeHome = b.takeHome / worked;
      monthEpf = hasEpf ? b.epfCredit / worked : 0;
      yearTax = b.tax;
      regime = b.regime;
      slabRate = marginalRate(taxableIncome(b), b.regime);
    } else if (worked === 0) slabRate = DEFAULT_SLAB_RATE;

    // Lifestyle creep: part of any real rise in full-year take-home becomes permanent spending.
    const takeHomeNow = fullYearTakeHome();
    const realRaise = takeHomeNow - prevTakeHome * (y > 1 ? 1 + inflY : 1);
    if (realRaise > 0 && creep > 0) lifestyle += creep * realRaise;
    prevTakeHome = takeHomeNow;

    // Goals due this year, in priority order, paid according to each goal's funding mode.
    const goalOutcomes: GoalOutcome[] = [];
    let goalWithdrawals = 0;
    let goalLoans = 0;
    const due = p.goals
      .filter((g) => g.targetYear === calYear && !NON_WITHDRAWAL_GOALS.has(g.category))
      .sort((g1, g2) => g1.priority - g2.priority || (g1.rank ?? 0) - (g2.rank ?? 0));
    for (const g of due) {
      const cost = g.cost * Math.pow(1 + g.inflation, elapsed);
      const mode = goalFundingMode(g);
      const breakMonthsLinked = events.filter((e) => e.goalId === g.id && e.year >= calYear).reduce((s, e) => s + Math.max(0, e.breakMonths), 0);
      const monthlyOutgoings = essential + lifestyle + eventExpense + loans.reduce((s, l) => (l.bal > 0 ? s + l.emi : s), 0);
      const keepBack = mode === 'mixed' ? breakMonthsLinked * monthlyOutgoings : 0;
      const available = Math.max(0, liquidAfterTax() - keepBack);
      const base = { goalId: g.id, name: g.name, year: calYear, cost };
      if (mode === 'savings' && available < cost) {
        goalOutcomes.push({ ...base, status: 'shortfall', fromSavings: 0, loan: 0, shortfall: cost - available });
        flags.add('goal-shortfall');
        continue;
      }
      const fromSavings = mode === 'loan' ? 0 : Math.min(cost, available);
      const borrowed = cost - fromSavings;
      payLump(fromSavings);
      if (borrowed > 0) {
        const terms = goalLoanTerms(g);
        const tenureMonths = Math.max(1, Math.round(terms.tenureYears * 12));
        const moratorium = Math.max(0, Math.round(terms.moratoriumMonths));
        loans.push({ label: `${g.name} loan`, bal: borrowed, apr: terms.rate, emi: moratorium > 0 ? 0 : emiFor(borrowed, terms.rate, tenureMonths), moratorium, tenureMonths });
        flags.add('goal-loan');
      }
      goalWithdrawals += cost;
      goalLoans += borrowed;
      goalOutcomes.push({ ...base, status: borrowed > 0 ? 'financed' : 'funded', fromSavings, loan: borrowed, shortfall: 0 });
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

    let income = 0, expenses = 0, debtPayments = 0, interestPaid = 0, contributions = 0, savingsToCash = 0, epfInterest = 0, epfContributions = 0;
    for (let m = 0; m < 12; m++) {
      const onBreak = breakMonths > 0;
      if (onBreak) breakMonths--;
      const working = !retired && !onBreak;
      const monthSalary = working ? monthTakeHome : 0;
      const monthIncome = monthSalary + otherIncome;
      const monthExpenses = essential + lifestyle + eventExpense;
      let monthDebt = 0;
      for (const l of loans) {
        if (l.bal <= 0) continue;
        const interest = l.bal * loanMonthlyRate(l.apr);
        if (l.moratorium > 0) {
          // Interest is added to the balance; repayments start when the moratorium ends.
          l.bal += interest;
          interestPaid += interest;
          if (--l.moratorium === 0) l.emi = emiFor(l.bal, l.apr, l.tenureMonths);
          continue;
        }
        const pay = Math.min(l.emi, l.bal + interest);
        l.bal = l.bal + interest - pay;
        if (l.bal < 0.01) l.bal = 0;
        interestPaid += interest;
        monthDebt += pay;
      }
      const surplus = monthIncome - monthExpenses - monthDebt;
      // While short-term borrowing is outstanding, the surplus repays it before any SIP is made.
      const borrowing = cash < 0;
      const planned = monthSalary > 0 && !borrowing ? sip : 0;
      const fromBudget = Math.min(planned, Math.max(0, surplus));
      const invest = fromBudget + (monthSalary > 0 && !borrowing ? extraInvest : 0);
      const toCash = surplus - fromBudget;
      if (toCash < 0) {
        flags.add('deficit');
        // Same documented order as lump sums: excess cash, then investments, then the reserve, then borrowing.
        payLump(-toCash);
      } else {
        cash += toCash;
        savingsToCash += toCash;
      }
      if (a.contributionTiming === 'start') portfolio = (portfolio + invest) * (1 + pm);
      else portfolio = portfolio * (1 + pm) + invest;
      basis += invest;
      if (cash >= 0) cash *= 1 + cashMonthly;
      else {
        // Short-term borrowing: interest is charged on the overdrawn amount.
        const charge = -cash * borrowMonthly;
        cash -= charge;
        interestPaid += charge;
      }
      const retIn = working ? retContribution : 0;
      retirement = retirement * (1 + retMonthly) + retIn;
      if (hasEpf) {
        // EPFO: interest on the monthly running balance, credited once a year.
        const credit = working ? monthEpf : 0;
        epf += credit;
        epfContributions += credit;
        epfInterest += epf * (a.epfRate / 12);
      }

      income += monthIncome;
      expenses += monthExpenses;
      debtPayments += monthDebt;
      contributions += invest;
    }
    epf += epfInterest;

    // Clear any short-term borrowing from investments at year-end rather than carry 14% debt.
    if (cash < 0 && portfolio > 0) cash += sellNet(-cash);

    if (a.sweepExcessCash) {
      const excess = cash - reserveFor();
      if (excess > 0) {
        cash -= excess;
        portfolio += excess;
        basis += excess;
        contributions += excess;
      }
    }
    if (cash < 0) flags.add('borrowing');
    if (income > 0 && debtPayments > income * HOME_DEFAULTS.foir) flags.add('emi-over-limit');

    realLevel *= 1 + inflY;
    const loanTotal = loans.reduce((s, l) => s + Math.max(0, l.bal), 0);
    const liabilities = loanTotal + Math.max(0, -cash);
    const property = otherAssets + homes;
    const retirementTotal = retirement + epf;
    const totalAssets = Math.max(0, portfolio) + retirementTotal + Math.max(0, cash) + property;
    const netWorth = totalAssets - liabilities;
    const financialAssets = Math.max(0, portfolio) + retirementTotal + Math.max(0, cash);
    // Tax if every investment were sold at year-end with a fresh year's exemption.
    const liquidationTax = gainsTax(Math.max(0, portfolio) * gainShare(), false, cg.equityLtcgExemption);
    const financialAssetsAfterTax = financialAssets - liquidationTax;
    const fiHealthcare = Math.max(0, a.postFiHealthcare ?? 0) * 12 * Math.pow(1 + (a.healthcareInflation ?? infl), y);
    // Independence means covering living costs and healthcare from the corpus with no debt left to service.
    const fiTarget = a.withdrawalRate > 0 ? (expenses + fiHealthcare) / a.withdrawalRate + liabilities : Infinity;

    rows.push({
      index: y,
      year: calYear,
      age: ageInYear(p, calYear),
      income,
      incomeTax: yearTax,
      regime,
      expenses,
      lifestyleMonthly: lifestyle,
      debtPayments,
      interestPaid,
      investableSurplus: income - expenses - debtPayments,
      contributions,
      savingsToCash,
      oneTimeCosts,
      downPayments,
      goalWithdrawals,
      goalLoans,
      capitalGainsTax,
      portfolio: Math.max(0, portfolio),
      portfolioBasis: Math.max(0, basis),
      retirement: retirementTotal,
      epf,
      epfContributions,
      epfInterest,
      cash,
      property,
      totalAssets,
      liabilities,
      netWorth,
      netWorthReal: netWorth / realLevel,
      financialAssets,
      financialAssetsAfterTax,
      fiHealthcare,
      fiTarget,
      fiReached: financialAssetsAfterTax >= fiTarget,
      flags: [...flags],
      events: eventLabels,
      goals: goalOutcomes,
    });
  }

  const points: ProjectionPoint[] = [
    { year: startYear, age: ageInYear(p, startYear), netWorth: sheet.netWorth, netWorthReal: sheet.netWorth, financialAssets: sheet.cash + sheet.investments + sheet.retirement, fiTarget: null, events: [], row: null },
    ...rows.map((r) => ({ year: r.year + 1, age: ageInYear(p, r.year + 1), netWorth: r.netWorth, netWorthReal: r.netWorthReal, financialAssets: r.financialAssets, fiTarget: r.fiTarget, events: r.events, row: r })),
  ];
  const fiRow = rows.find((r) => r.fiReached);
  const fiYear = fiRow ? fiRow.year + 1 : null;
  return { rows, points, startNetWorth: sheet.netWorth, fiYear, fiAge: fiYear === null ? null : ageInYear(p, fiYear), portfolioReturn: baseReturn, skippedEvents: [] };
}

export const finalRow = (r: SimResult) => r.rows[r.rows.length - 1];
