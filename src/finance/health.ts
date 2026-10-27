import type { Assumptions, FinancialProfile } from '@/types/profile';
import { monthlyCashflow } from './cashflow';
import { emergencyPlan } from './emergency';
import { analyzeGoals } from './goals';
import { hasDependents } from './household';
import { currentSalary } from './income';
import { formatCompact } from './money';
import { healthCoverBenchmark } from './protection';
import { clamp } from './money';

export type HealthKey = 'emergency' | 'savings' | 'debt' | 'investing' | 'goals' | 'protection';

/** Documented methodology — rendered verbatim on the Financial Health page. */
export const HEALTH_METHOD: Record<HealthKey, { label: string; weight: number; rule: string }> = {
  emergency: { label: 'Emergency preparedness', weight: 20, rule: 'Liquid savings, plus any top-up already scheduled from a SIP pause, ÷ your emergency target (months of essentials + EMIs). 100 at or above target.' },
  savings: { label: 'Savings rate', weight: 20, rule: 'Income left after expenses and repayments, as a share of income. NPS contributions from your salary count as both income and savings. 0 at 0%, 100 at 30% or more.' },
  debt: { label: 'Debt burden', weight: 15, rule: 'EMI-to-income ratio. 100 at 10% or less, falling to 0 at 50%.' },
  investing: { label: 'Investment consistency', weight: 15, rule: 'Monthly investments, including NPS contributions from your salary, as a share of income. 0 at 0%, 100 at 20% or more.' },
  goals: { label: 'Goal readiness', weight: 15, rule: 'Average share of each goal’s required monthly contribution that current capacity covers. 50 if no goals are set.' },
  protection: { label: 'Financial protection', weight: 15, rule: 'Health cover at or above the benchmark for your city and household (₹10 L for one person in a metro, ₹7.5 L in a tier-2 city, ₹5 L elsewhere; ×1.5 for 2–3 people, ×2 for 4+) earns 50. Term cover of 10× annual income earns 50 (credited if no one depends on your income; regular support to parents counts as dependents).' },
};

export interface HealthResult {
  score: number;
  components: { key: HealthKey; label: string; weight: number; score: number; detail: string }[];
}

const lin = (x: number, zeroAt: number, fullAt: number) => clamp(((x - zeroAt) / (fullAt - zeroAt)) * 100, 0, 100);

export function healthScore(p: FinancialProfile, a: Assumptions): HealthResult {
  const cf = monthlyCashflow(p);
  const ef = emergencyPlan(p);
  const goals = analyzeGoals(p, a);

  const emergency = ef.recommendedReserve > 0 ? clamp(((ef.eligibleLiquid + ef.scheduled) / ef.recommendedReserve) * 100, 0, 100) : 100;
  // NPS paid out of CTC (employer's and your own) is money saved, not money lost: count it on both sides.
  const salary = currentSalary(p);
  const nps = salary ? (salary.employerNps + salary.ownNps) / 12 : 0;
  const income = cf.income + nps;
  const savingsRate = income > 0 ? (cf.investableSurplus + nps) / income : 0;
  const investRate = income > 0 ? (cf.plannedInvestments + nps) / income : 0;
  const savings = lin(savingsRate, 0, 0.3);
  const debt = cf.debtPayments === 0 ? 100 : lin(cf.debtToIncome, 0.5, 0.1);
  const investing = income > 0 ? lin(investRate, 0, 0.2) : 0;
  const scored = goals.goals.filter((g) => g.status !== 'funded' && Number.isFinite(g.requiredMonthly) && g.requiredMonthly > 0);
  const goalScore =
    p.goals.length === 0
      ? 50
      : scored.length === 0
        ? 100
        : (scored.reduce((s, g) => s + Math.min(1, g.allocatedMonthly / g.requiredMonthly), 0) / scored.length) * 100;
  const annualIncome = currentSalary(p)?.ctc ?? cf.income * 12;
  const healthTarget = healthCoverBenchmark(p);
  const health = Math.min(1, p.protection.healthCover / healthTarget) * 50;
  const dependents = hasDependents(p);
  const life = !dependents ? 50 : annualIncome > 0 ? Math.min(1, p.protection.lifeCover / (annualIncome * 10)) * 50 : 0;
  const protection = health + life;

  const scores: Record<HealthKey, { score: number; detail: string }> = {
    emergency: { score: emergency, detail: `${ef.coverageMonths === Infinity ? '—' : ef.coverageMonths.toFixed(1)} of ${ef.targetMonths} months covered` },
    savings: { score: savings, detail: `${(savingsRate * 100).toFixed(1)}% of income left after expenses and EMIs${nps > 0 ? ', counting NPS' : ''}` },
    debt: { score: debt, detail: `${(cf.debtToIncome * 100).toFixed(1)}% of income goes to repayments` },
    investing: { score: investing, detail: `${(investRate * 100).toFixed(1)}% of income invested monthly${nps > 0 ? ', counting NPS' : ''}` },
    goals: { score: goalScore, detail: p.goals.length === 0 ? 'No goals set yet' : `${goals.goals.filter((g) => g.status === 'on-track' || g.status === 'funded').length} of ${p.goals.length} goals on track` },
    protection: { score: protection, detail: `Health cover ${p.protection.healthCover >= healthTarget ? 'meets' : 'below'} the ${formatCompact(healthTarget)} benchmark; term cover ${!dependents ? 'not essential without dependents' : annualIncome > 0 ? `${(p.protection.lifeCover / annualIncome).toFixed(1)}× annual income` : 'n/a'}` },
  };

  const components = (Object.keys(HEALTH_METHOD) as HealthKey[]).map((key) => ({
    key,
    label: HEALTH_METHOD[key].label,
    weight: HEALTH_METHOD[key].weight,
    score: scores[key].score,
    detail: scores[key].detail,
  }));
  const score = components.reduce((s, c) => s + (c.score * c.weight) / 100, 0);
  return { score, components };
}
