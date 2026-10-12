import type { FinancialProfile } from '@/types/profile';
import type { MonthlyCashflow } from './cashflow';
import type { EmergencyPlan } from './emergency';
import type { FiAnalysis } from './fi';
import type { GoalsSummary } from './goals';
import { formatCompact, formatMonths, formatPct } from './money';
import { allocationDrift, maxDrift } from './portfolio';

export interface Insight {
  id: string;
  priority: number; // lower = more urgent
  title: string;
  detail: string;
  link: string; // app route
}

/** Rule-based next steps derived only from calculated figures. */
export function nextSteps(
  p: FinancialProfile,
  cf: MonthlyCashflow,
  ef: EmergencyPlan,
  goals: GoalsSummary,
  fi: FiAnalysis,
): Insight[] {
  const out: Insight[] = [];
  if (cf.investableSurplus < 0) {
    out.push({
      id: 'deficit',
      priority: 0,
      title: 'Your monthly spending exceeds your income',
      detail: `Expenses and repayments are ${formatCompact(-cf.investableSurplus)} a month more than you earn. Review lifestyle spending in the Budget Planner first.`,
      link: '/app/budget',
    });
  }
  const costly = p.liabilities.filter((l) => l.balance > 0 && l.rate >= 0.15).sort((a, b) => b.rate - a.rate);
  if (costly.length) {
    out.push({
      id: 'costly-debt',
      priority: 1,
      title: `Clear high-interest debt: ${costly[0].label}`,
      detail: `${formatCompact(costly[0].balance)} at ${formatPct(costly[0].rate)} costs more than most investments are assumed to earn. Repaying it is effectively a guaranteed return.`,
      link: '/app/emergency-debt',
    });
  }
  if (ef.gap > 0) {
    out.push({
      id: 'emergency',
      priority: 2,
      title: 'Build your emergency reserve',
      detail: `You have ${ef.coverageMonths.toFixed(1)} of ${ef.targetMonths} months covered. The gap is ${formatCompact(ef.gap)}${ef.monthsToTarget !== null ? `, about ${formatMonths(ef.monthsToTarget)} at your current savings rate` : '. You are not currently setting money aside for it'}.`,
      link: '/app/emergency-debt',
    });
  }
  if (p.protection.healthCover < 500000) {
    out.push({
      id: 'health-cover',
      priority: 3,
      title: 'Review your health cover',
      detail: 'A single hospital stay can undo years of saving. Many planners suggest an individual cover of at least ₹5 lakh. Check what your employer policy actually covers.',
      link: '/app/settings',
    });
  }
  if (p.about.dependents > 0 && p.protection.lifeCover < cf.income * 12 * 10) {
    out.push({
      id: 'life-cover',
      priority: 3,
      title: 'Consider term life cover for your dependents',
      detail: `Your current cover is ${formatCompact(p.protection.lifeCover)}. A common rule of thumb is 10× annual income (${formatCompact(cf.income * 120)}).`,
      link: '/app/settings',
    });
  }
  const behind = goals.goals.filter((g) => g.status === 'shortfall' || g.status === 'at-risk' || g.status === 'overdue');
  if (behind.length) {
    const g = behind.sort((a, b) => a.goal.priority - b.goal.priority)[0];
    out.push({
      id: 'goal-gap',
      priority: 4,
      title: `${g.goal.name} is not fully funded`,
      detail: Number.isFinite(g.requiredMonthly)
        ? `It needs about ${formatCompact(g.requiredMonthly)}/month, and your current capacity covers ${formatCompact(g.allocatedMonthly)}. Explore delaying it, reducing the cost, or adding to contributions.`
        : 'Its target year has arrived and it is not covered by dedicated savings. Choose a new date or a smaller amount.',
      link: '/app/goals',
    });
  }
  if (goals.totalShortfall > 0 && behind.length > 1) {
    out.push({
      id: 'goals-total',
      priority: 5,
      title: 'Your goals need more than you can currently set aside',
      detail: `Together your goals need ${formatCompact(goals.totalRequired)}/month against a surplus of ${formatCompact(goals.capacity)}/month.`,
      link: '/app/goals',
    });
  }
  const drift = maxDrift(allocationDrift(p.position.holdings, p.preferences.targetAllocation, cf.plannedInvestments));
  if (drift > 0.05) {
    out.push({
      id: 'drift',
      priority: 6,
      title: 'Your portfolio has drifted from its target mix',
      detail: `One asset class is ${formatPct(drift, 0)} away from target. The Portfolio Builder shows what to direct new contributions towards.`,
      link: '/app/portfolio',
    });
  }
  if (cf.unallocated > 2000) {
    out.push({
      id: 'unallocated',
      priority: 7,
      title: 'Give your spare cash a job',
      detail: `${formatCompact(cf.unallocated)} a month is left after your planned savings and investments. Directing it to a goal or your SIP would speed up your plan.`,
      link: '/app/budget',
    });
  }
  if (fi.gap > 0 && fi.extraMonthlyNeeded !== null) {
    out.push({
      id: 'fi',
      priority: 8,
      title: `Financial independence by ${fi.targetAge} needs a boost`,
      detail: `The projection reaches ${Math.round(fi.progress * 100)}% of the target corpus at ${fi.targetAge}. Investing about ${formatCompact(fi.extraMonthlyNeeded)} more a month (rising each year with your step-up) would close the gap.`,
      link: '/app/fi',
    });
  }
  if (p.goals.some((g) => g.category === 'home') && p.lifeEvents.some((e) => e.kind === 'homePurchase')) {
    out.push({
      id: 'double-home',
      priority: 2,
      title: 'Check for a double-counted home purchase',
      detail: 'You have both a home goal and a home-purchase life event. The life event already pays the down payment, so the projection may count it twice.',
      link: '/app/life-events',
    });
  }
  return out.sort((a, b) => a.priority - b.priority);
}
