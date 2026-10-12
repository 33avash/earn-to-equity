import type { Assumptions, FinancialProfile } from '@/types/profile';
import { monthlyCashflow } from './cashflow';
import { emergencyPlan } from './emergency';
import { analyzeGoals } from './goals';
import { clamp } from './money';

export type HealthKey = 'emergency' | 'savings' | 'debt' | 'investing' | 'goals' | 'protection';

/** Documented methodology — rendered verbatim on the Financial Health page. */
export const HEALTH_METHOD: Record<HealthKey, { label: string; weight: number; rule: string }> = {
  emergency: { label: 'Emergency preparedness', weight: 20, rule: 'Liquid savings ÷ your emergency target (months of essentials + EMIs). 100 at or above target.' },
  savings: { label: 'Savings rate', weight: 20, rule: 'Income left after expenses and repayments, as a share of income. 0 at 0%, 100 at 30% or more.' },
  debt: { label: 'Debt burden', weight: 15, rule: 'EMI-to-income ratio. 100 at 10% or less, falling to 0 at 50%.' },
  investing: { label: 'Investment consistency', weight: 15, rule: 'Monthly investments as a share of income. 0 at 0%, 100 at 20% or more.' },
  goals: { label: 'Goal readiness', weight: 15, rule: 'Average share of each goal’s required monthly contribution that current capacity covers. 50 if no goals are set.' },
  protection: { label: 'Financial protection', weight: 15, rule: 'Health cover of ₹5 lakh or more earns 50. Term cover of 10× annual income earns 50 (credited if you have no dependents).' },
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

  const emergency = ef.recommendedReserve > 0 ? clamp((ef.eligibleLiquid / ef.recommendedReserve) * 100, 0, 100) : 100;
  const savings = lin(cf.savingsRate, 0, 0.3);
  const debt = cf.debtPayments === 0 ? 100 : lin(cf.debtToIncome, 0.5, 0.1);
  const investing = cf.income > 0 ? lin(cf.plannedInvestments / cf.income, 0, 0.2) : 0;
  const scored = goals.goals.filter((g) => g.status !== 'funded' && Number.isFinite(g.requiredMonthly) && g.requiredMonthly > 0);
  const goalScore =
    p.goals.length === 0
      ? 50
      : scored.length === 0
        ? 100
        : (scored.reduce((s, g) => s + Math.min(1, g.allocatedMonthly / g.requiredMonthly), 0) / scored.length) * 100;
  const annualIncome = cf.income * 12;
  const health = p.protection.healthCover >= 500000 ? 50 : (p.protection.healthCover / 500000) * 50;
  const life = p.about.dependents === 0 ? 50 : annualIncome > 0 ? Math.min(1, p.protection.lifeCover / (annualIncome * 10)) * 50 : 0;
  const protection = health + life;

  const scores: Record<HealthKey, { score: number; detail: string }> = {
    emergency: { score: emergency, detail: `${ef.coverageMonths === Infinity ? '—' : ef.coverageMonths.toFixed(1)} of ${ef.targetMonths} months covered` },
    savings: { score: savings, detail: `${(cf.savingsRate * 100).toFixed(1)}% of income left after expenses and EMIs` },
    debt: { score: debt, detail: `${(cf.debtToIncome * 100).toFixed(1)}% of income goes to repayments` },
    investing: { score: investing, detail: `${cf.income > 0 ? ((cf.plannedInvestments / cf.income) * 100).toFixed(1) : 0}% of income invested monthly` },
    goals: { score: goalScore, detail: p.goals.length === 0 ? 'No goals set yet' : `${goals.goals.filter((g) => g.status === 'on-track' || g.status === 'funded').length} of ${p.goals.length} goals on track` },
    protection: { score: protection, detail: `Health cover ${p.protection.healthCover >= 500000 ? 'meets' : 'below'} ₹5 L benchmark; term cover ${p.about.dependents === 0 ? 'not essential without dependents' : annualIncome > 0 ? `${(p.protection.lifeCover / annualIncome).toFixed(1)}× annual income` : 'n/a'}` },
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
