import { goalStatusLabel, type Plan } from '@/state/plan';
import { formatINR, formatPct } from '@/finance/money';

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Plain-text financial summary built from engine outputs. */
export function summaryText(plan: Plan): string {
  const { profile: p, cashflow: cf, sheet, headline, fi } = plan;
  const lines = [
    `EARN TO EQUITY — FINANCIAL SUMMARY`,
    `Generated ${new Date().toLocaleDateString('en-IN')} · Illustrative projection, not financial advice`,
    ``,
    `TODAY`,
    `Net worth: ${formatINR(sheet.netWorth)} (assets ${formatINR(sheet.totalAssets)}, liabilities ${formatINR(sheet.liabilities)})`,
    `Monthly income: ${formatINR(cf.income)} · expenses ${formatINR(cf.expenses)} · debt payments ${formatINR(cf.debtPayments)}`,
    `Investable surplus: ${formatINR(cf.investableSurplus)} (${formatPct(cf.savingsRate)} savings rate)`,
    `Emergency cover: ${plan.emergency.coverageMonths.toFixed(1)} of ${plan.emergency.targetMonths} months`,
    `Financial health score: ${Math.round(plan.health.score)}/100 (educational, not a credit score)`,
    ``,
    `ASSUMPTIONS`,
    `Inflation ${formatPct(plan.assumptions.inflation)} · salary growth ${formatPct(p.income.salaryGrowth)} · portfolio return ${formatPct(plan.portfolioReturn)} · SIP step-up ${formatPct(plan.assumptions.sipStepUp)} · withdrawal rate ${formatPct(plan.assumptions.withdrawalRate)}`,
    ``,
    `PROJECTION (1 January, age on that date)`,
    ...plan.sim.points.filter((_, i) => i > 0 && i % 5 === 0).map((pt) => `${pt.year} (age ${pt.age}): net worth ${formatINR(pt.netWorth)} · today's rupees ${formatINR(pt.netWorthReal)}`),
    `Final, ${headline.year}: ${formatINR(headline.netWorth)} (${formatINR(headline.netWorthReal)} in today's rupees)`,
    ``,
    `FINANCIAL INDEPENDENCE`,
    `Target at age ${fi.targetAge}: ${formatINR(fi.targetCorpus)} · projected ${formatINR(fi.projectedCorpus)} · gap ${formatINR(fi.gap)} · estimated FI age ${fi.fiAge ?? 'beyond projection'}`,
    ``,
    `GOALS`,
    ...(plan.goalViews.length ? plan.goalViews.map((v) => `${v.goal.name} (${v.goal.targetYear}): ${formatINR(v.goal.cost)} today → ${formatINR(v.outcome?.cost ?? v.analysis.futureCost)} · ${goalStatusLabel(v, formatINR)}`) : ['None']),
    ``,
    `NEXT STEPS`,
    ...plan.insights.slice(0, 5).map((i, k) => `${k + 1}. ${i.title}`),
  ];
  return lines.join('\n');
}

export const exportSummary = (plan: Plan) => download('earn-to-equity-summary.txt', summaryText(plan), 'text/plain;charset=utf-8');
export const exportData = (data: unknown) => download('earn-to-equity-data.json', JSON.stringify(data, null, 2), 'application/json');
