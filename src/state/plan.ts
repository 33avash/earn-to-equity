import type { Assumptions, FinancialProfile, Goal, LifeEvent, ScenarioDeltas, ScenarioKey } from '@/types/profile';
import type { GoalOutcome, SimOverrides, SimResult } from '@/types/sim';
import { monthlyCashflow } from '@/finance/cashflow';
import { balanceSheet } from '@/finance/networth';
import { emergencyPlan } from '@/finance/emergency';
import { analyzeGoals, type GoalAnalysis } from '@/finance/goals';
import { NON_WITHDRAWAL_GOALS, simulate } from '@/finance/simulate';
import { fiAnalysis } from '@/finance/fi';
import { healthScore } from '@/finance/health';
import { nextSteps } from '@/finance/insights';
import { currentWeights, portfolioVolatility, weightedReturn } from '@/finance/portfolio';
import { runScenario } from '@/finance/scenarios';
import { ageInYear } from '@/finance/timeline';

/*
 * Pure plan selectors. Every figure the interface shows is derived here (or in src/finance),
 * never inside a component, so two screens showing the same thing always agree.
 */

export type GoalPlanStatus = 'funded' | 'financed' | 'unfunded' | 'corpus' | 'beyond';

/** One goal as the whole-plan projection sees it, with the dedicated-savings view as detail. */
export interface GoalView {
  goal: Goal;
  analysis: GoalAnalysis; // dedicated-savings view (secondary)
  outcome: GoalOutcome | null; // whole-plan projection (primary)
  status: GoalPlanStatus;
  /**
   * Shares of the target-year cost: paid (or, for an unpaid goal, available) from savings, borrowed, and
   * the gap. Sum to 1 when an outcome exists.
   */
  split: { savings: number; loan: number; gap: number };
}

export interface UnfundedGoal {
  goalId: string;
  name: string;
  year: number;
  shortfall: number;
  /** Events the projection dropped because they depend on this goal. */
  droppedEvents: string[];
  /** Events kept although the goal is unpaid (the "keep these events anyway" box is ticked). */
  keptEvents: string[];
}

export interface Headline {
  year: number; // 1 January of the final year of the horizon
  age: number;
  netWorth: number;
  netWorthReal: number;
}

function goalView(g: Goal, analysis: GoalAnalysis, outcome: GoalOutcome | null): GoalView {
  const none = { savings: 0, loan: 0, gap: 0 };
  if (NON_WITHDRAWAL_GOALS.has(g.category)) return { goal: g, analysis, outcome, status: 'corpus', split: none };
  if (!outcome) return { goal: g, analysis, outcome, status: 'beyond', split: none };
  const c = outcome.cost || 1;
  const savings = outcome.status === 'shortfall' ? outcome.cost - outcome.shortfall : outcome.fromSavings;
  const split = { savings: savings / c, loan: outcome.loan / c, gap: outcome.shortfall / c };
  const status: GoalPlanStatus = outcome.status === 'shortfall' ? 'unfunded' : outcome.status === 'financed' ? 'financed' : 'funded';
  return { goal: g, analysis, outcome, status, split };
}

/** One-line status for a goal, e.g. "₹11.2 L loan in 2029". */
export function goalStatusLabel(v: GoalView, money: (n: number) => string): string {
  switch (v.status) {
    case 'corpus':
      return 'Tracked against your FI corpus';
    case 'beyond':
      return 'Beyond the projection';
    case 'unfunded':
      return `Short by ${money(v.outcome!.shortfall)} in ${v.outcome!.year}`;
    case 'financed':
      return `${money(v.outcome!.loan)} loan in ${v.outcome!.year}`;
    default:
      return `Paid from savings in ${v.outcome!.year}`;
  }
}

/** Everything the app derives from the profile, computed once per change and shared by all screens. */
export function computePlan(profile: FinancialProfile, assumptions: Assumptions) {
  const cashflow = monthlyCashflow(profile);
  const sheet = balanceSheet(profile);
  const emergency = emergencyPlan(profile);
  const goals = analyzeGoals(profile, assumptions);
  const sim = simulate(profile, assumptions);
  const fi = fiAnalysis(profile, assumptions);
  const health = healthScore(profile, assumptions);
  const insights = nextSteps(profile, cashflow, emergency, goals, fi, sim);
  const portfolioReturn = weightedReturn(profile.preferences.targetAllocation, assumptions.returns);
  const volatility = portfolioVolatility(profile.preferences.targetAllocation, assumptions.volatility);
  const final = sim.rows[sim.rows.length - 1];
  const end = sim.points[sim.points.length - 1];
  const headline: Headline = { year: end.year, age: end.age, netWorth: end.netWorth, netWorthReal: end.netWorthReal };

  const outcomes = new Map(sim.rows.flatMap((r) => r.goals).map((o) => [o.goalId, o]));
  const goalViews = goals.goals.map((a) => goalView(a.goal, a, outcomes.get(a.goal.id) ?? null));
  const unfundedGoals: UnfundedGoal[] = goalViews
    .filter((v) => v.status === 'unfunded')
    .map((v) => ({
      goalId: v.goal.id,
      name: v.goal.name,
      year: v.outcome!.year,
      shortfall: v.outcome!.shortfall,
      droppedEvents: sim.skippedEvents.filter((e) => e.goalId === v.goal.id).map((e) => e.label),
      keptEvents: v.goal.keepEventsIfUnfunded ? profile.lifeEvents.filter((e) => e.goalId === v.goal.id).map((e) => e.label) : [],
    }));

  return {
    profile,
    assumptions,
    cashflow,
    sheet,
    emergency,
    goals,
    goalViews,
    unfundedGoals,
    sim,
    final,
    headline,
    fi,
    health,
    insights,
    portfolioReturn,
    volatility,
    currentAllocation: currentWeights(profile.position.holdings),
  };
}
export type Plan = ReturnType<typeof computePlan>;

/** "+8%", "Resumes after break" or "n/a" for a year-on-year change. Never divides by zero. */
export function yearOnYear(prev: number | null, cur: number): { kind: 'pct'; value: number } | { kind: 'resumed' } | { kind: 'na' } {
  if (prev === null) return { kind: 'na' };
  if (prev <= 0) return cur > 0 ? { kind: 'resumed' } : { kind: 'na' };
  return { kind: 'pct', value: cur / prev - 1 };
}

/** The Wealth Simulator's year inspector. */
export function yearInspector(plan: Plan, year: number) {
  const row = plan.sim.rows.find((r) => r.year === year);
  if (!row) return null;
  const prev = plan.sim.rows.find((r) => r.year === year - 1) ?? null;
  return {
    row,
    prev,
    index: row.index,
    count: plan.sim.rows.length,
    label: `${row.year} · age ${row.age}`,
    incomeChange: yearOnYear(prev ? prev.income : null, row.income),
    goalsTracked: plan.profile.goals.filter((g) => g.targetYear === row.year && !row.goals.some((o) => o.goalId === g.id)),
  };
}

/** Base case plus the two adjustable scenarios. The base case is always the plan's own projection. */
export function scenarioSet(plan: Plan, deltas: Record<ScenarioKey, ScenarioDeltas>): Record<ScenarioKey, SimResult> {
  return {
    conservative: runScenario(plan.profile, plan.assumptions, deltas.conservative),
    base: plan.sim,
    high: runScenario(plan.profile, plan.assumptions, deltas.high),
  };
}

/* ---------- Landing page ---------- */

export interface HeroMilestone {
  index: number; // point index on the chart
  label: string;
  year: number;
  age: number;
}

/** Real-terms net-worth path for the landing hero: the same points the dashboard charts. */
export function heroSeries(plan: Plan) {
  const { sim, profile: p, fi } = plan;
  const points = sim.points.map((x) => x.netWorthReal);
  const last = sim.points.length - 1;
  const milestones: HeroMilestone[] = [{ index: 0, label: 'First SIP', year: p.planStartYear, age: ageInYear(p, p.planStartYear) }];
  const home = p.lifeEvents.find((e) => e.kind === 'homePurchase' && !sim.skippedEvents.some((s) => s.eventId === e.id));
  if (home && home.year - p.planStartYear <= last) milestones.push({ index: home.year - p.planStartYear, label: 'First home', year: home.year, age: ageInYear(p, home.year) });
  const fiIndex = fi.fiYear === null ? null : fi.fiYear - p.planStartYear;
  if (fiIndex !== null && fiIndex <= last) milestones.push({ index: fiIndex, label: 'Work becomes optional', year: fi.fiYear!, age: fi.fiAge! });
  return {
    points,
    years: sim.points.map((x) => x.year),
    end: plan.headline,
    milestones,
    /** FI after the end of the chart, shown as a caption instead of a marker. */
    fiBeyond: fi.fiYear !== null && fiIndex! > last ? { year: fi.fiYear, age: fi.fiAge! } : null,
  };
}
export type HeroSeries = ReturnType<typeof heroSeries>;

export type LandingScenarioKey = 'salary' | 'house' | 'stepup';

/** What-ifs on the full sample plan. Each one's baseline is the plan itself. */
export function landingScenarios(plan: Plan) {
  const p = plan.profile;
  const a = plan.assumptions;
  const homeEvent = p.lifeEvents.find((e) => e.kind === 'homePurchase' && e.home);
  const houseYear = p.planStartYear + 5;
  const earlyHome: FinancialProfile = homeEvent
    ? { ...p, lifeEvents: p.lifeEvents.map((e) => (e.id === homeEvent.id ? { ...e, year: houseYear } : e)) }
    : {
        ...p,
        lifeEvents: [
          ...p.lifeEvents,
          { id: 'landing-home', kind: 'homePurchase', label: 'Buy a flat', year: houseYear, oneTimeCost: 250000, incomeChangePct: 0, monthlyExpenseChange: -20000, breakMonths: 0, home: { propertyValue: 6000000, downPaymentPct: 0.2, loanRate: 0.085, tenureYears: 20 } } satisfies LifeEvent,
        ],
      };
  const home = (earlyHome.lifeEvents.find((e) => e.kind === 'homePurchase') as LifeEvent).home!;
  const slowGrowth = Math.max(0, p.income.salaryGrowth - 0.04);
  const fastStepUp = a.sipStepUp + 0.05;

  const defs: Record<LandingScenarioKey, { q: string; summary: string; label: string; run: () => SimResult }> = {
    salary: {
      q: 'What if my salary grows more slowly?',
      summary: `Salary growth of ${Math.round(slowGrowth * 100)}% a year instead of ${Math.round(p.income.salaryGrowth * 100)}%. Spending is unchanged, so less is left to invest each year.`,
      label: `${Math.round(slowGrowth * 100)}% salary growth`,
      run: () => simulate(p, a, { salaryGrowth: slowGrowth } satisfies SimOverrides),
    },
    house: {
      q: 'What if I buy the flat in five years?',
      summary: `The ${Math.round(home.propertyValue / 1e5)} lakh flat (today’s prices) bought in ${houseYear}${homeEvent ? ` instead of ${homeEvent.year}` : ''}, with ${Math.round(home.downPaymentPct * 100)}% down and a ${(home.loanRate * 100).toFixed(1)}% loan over ${home.tenureYears} years.`,
      label: `Flat in ${houseYear}`,
      run: () => simulate(earlyHome, a),
    },
    stepup: {
      q: 'What if I raise my SIP faster every year?',
      summary: `Monthly investments rise ${Math.round(fastStepUp * 100)}% each year instead of ${Math.round(a.sipStepUp * 100)}%.`,
      label: `${Math.round(fastStepUp * 100)}% annual step-up`,
      run: () => simulate(p, a, { sipStepUp: fastStepUp }),
    },
  };

  return (Object.keys(defs) as LandingScenarioKey[]).map((key) => {
    const d = defs[key];
    const alt = d.run();
    return {
      key,
      q: d.q,
      summary: d.summary,
      label: d.label,
      data: plan.sim.points.map((pt, i) => ({ year: pt.year, base: pt.netWorthReal, alt: alt.points[i].netWorthReal })),
      baseFinal: plan.headline.netWorthReal,
      altFinal: alt.points[alt.points.length - 1].netWorthReal,
    };
  });
}
