import type { Plan } from '@/state/selectors';
import { simulate } from '@/finance/simulate';
import { fiAnalysis } from '@/finance/fi';
import { formatCompact as c, formatPct } from '@/finance/money';
import { emi } from '@/finance/rates';

/**
 * Rule-based educational coach. Every figure comes from the financial engine.
 * The coach only selects, explains and compares. It never invents numbers.
 */
export interface CoachAnswer {
  text: string;
}

const assumptionsLine = (plan: Plan) =>
  `Assumptions: ${formatPct(plan.assumptions.inflation)} inflation, ${formatPct(plan.profile.income.salaryGrowth)} salary growth, ${formatPct(plan.portfolioReturn)} assumed portfolio return, ${formatPct(plan.assumptions.sipStepUp, 0)} annual SIP step-up.`;

function num(q: string, re: RegExp): number | null {
  const m = q.match(re);
  return m ? Number(m[1]) : null;
}

function home(plan: Plan, q: string): string {
  const { profile: p, assumptions: a } = plan;
  const years = num(q, /(\d+)\s*(?:years?|yrs?)/i) ?? 5;
  const homeGoal = p.goals.find((g) => g.category === 'home');
  const homeEvent = p.lifeEvents.find((e) => e.kind === 'homePurchase' && e.home);
  const price = homeEvent?.home?.propertyValue ?? (homeGoal ? homeGoal.cost / 0.2 : 6000000);
  const dpPct = homeEvent?.home?.downPaymentPct ?? 0.2;
  const rate = homeEvent?.home?.loanRate ?? 0.085;
  const missing = !homeEvent && !homeGoal ? `\n\nMissing information: you haven’t added a home goal or a home-purchase life event, so I assumed a ₹60 lakh property in today’s prices with 20% down and an 8.5% loan over 20 years. Add one in Life Events for a precise answer.` : '';
  const idx = Math.min(years, plan.sim.rows.length) - 1;
  const before = idx > 0 ? plan.sim.rows[idx - 1] : null;
  const priceThen = price * Math.pow(1 + a.propertyGrowth, years);
  const down = priceThen * dpPct;
  const reserve = p.protection.emergencyTargetMonths * (plan.cashflow.essential + plan.cashflow.debtPayments) * Math.pow(1 + a.inflation, years);
  const liquid = before ? before.portfolio + Math.max(0, before.cash) : plan.sheet.investments + plan.sheet.cash;
  const available = liquid - reserve;
  const monthlyEmi = emi(priceThen - down, rate, 240);
  const incomeThen = (before?.income ?? plan.cashflow.income * 12) / 12;
  const ratio = incomeThen > 0 ? (monthlyEmi + plan.cashflow.debtPayments) / incomeThen : 1;
  const verdict =
    available >= down && ratio <= 0.4
      ? 'On these assumptions, it looks feasible.'
      : available < down
        ? 'On these assumptions, the down payment is the constraint.'
        : 'On these assumptions, the EMI would take a large share of your income.';
  return `${verdict}

• A property worth ${c(price)} today would cost about ${c(priceThen)} in ${p.planStartYear + years} (at ${formatPct(a.propertyGrowth)} property growth). A ${formatPct(dpPct, 0)} down payment is ${c(down)}.
• Your projection shows about ${c(liquid)} in investments and cash by then. After keeping your emergency reserve (${c(reserve)}), ${c(Math.max(0, available))} would be available${available < down ? `, which is ${c(down - available)} short` : ''}.
• The EMI on the loan would be roughly ${c(monthlyEmi)} a month. With your existing repayments, that is ${formatPct(ratio, 0)} of your projected take-home pay. Many lenders become cautious above 40–50%.

${assumptionsLine(plan)} Registration, stamp duty and furnishing costs are not included unless you add them as a one-time cost.${missing}`;
}

function behind(plan: Plan): string {
  const g = plan.goals.goals.filter((x) => x.status === 'shortfall' || x.status === 'at-risk' || x.status === 'overdue');
  if (!plan.profile.goals.length) return 'You haven’t added any goals yet, so there is nothing to be behind on. Add goals in the Goals Planner, and I’ll explain how each one is funded.';
  if (!g.length) return `All ${plan.profile.goals.length} goals are funded or on track with your current surplus of ${c(plan.goals.capacity)} a month.\n\n${assumptionsLine(plan)}`;
  const lines = g.map((x) =>
    Number.isFinite(x.requiredMonthly)
      ? `• ${x.goal.name} (${x.goal.targetYear}): costs ${c(x.goal.cost)} today, which becomes ${c(x.futureCost)} at ${formatPct(x.goal.inflation)} cost inflation. It needs ${c(x.requiredMonthly)}/month, but after higher-priority goals, your surplus covers ${c(x.allocatedMonthly)}.`
      : `• ${x.goal.name}: its target year has arrived and dedicated savings don’t cover it.`,
  );
  return `${g.length === 1 ? 'One goal is' : `${g.length} goals are`} behind because together your goals need ${c(plan.goals.totalRequired)} a month, while your investable surplus is ${c(plan.goals.capacity)}.

${lines.join('\n')}

Ways to close the gap: delay the goal, reduce its cost, raise contributions (for example, by cutting lifestyle spending of ${c(plan.cashflow.lifestyle)}/month), or lower the priority of another goal. The “Explore options” panel in the Goals Planner tests each one.

${assumptionsLine(plan)}`;
}

function salary(plan: Plan, q: string): string {
  const pct = (num(q, /(\d+(?:\.\d+)?)\s*%/) ?? 5) / 100;
  const alt = simulate(plan.profile, plan.assumptions, { salaryGrowth: pct });
  const altFi = fiAnalysis(plan.profile, plan.assumptions, { salaryGrowth: pct });
  const b = plan.final;
  const x = alt.rows.at(-1)!;
  return `If your salary grows ${formatPct(pct)} a year instead of ${formatPct(plan.profile.income.salaryGrowth)}:

• Projected net worth after ${plan.sim.rows.length} years: ${c(x.netWorth)} instead of ${c(b.netWorth)} (${x.netWorth >= b.netWorth ? '+' : ''}${c(x.netWorth - b.netWorth)}). In today’s rupees, that is ${c(x.netWorthReal)} vs ${c(b.netWorthReal)}.
• Annual income in the final year: ${c(x.income)} vs ${c(b.income)}.
• Estimated financial independence age: ${altFi.fiAge ?? 'beyond the projection'} (currently ${plan.fi.fiAge ?? 'beyond the projection'}).

Spending is assumed to rise with inflation either way, so slower salary growth leaves less to invest each year, and that compounds. Raising your SIP whenever you get an increment protects against this.

Other assumptions unchanged: ${formatPct(plan.assumptions.inflation)} inflation, ${formatPct(plan.portfolioReturn)} portfolio return.`;
}

function saveMore(plan: Plan): string {
  const fi = plan.fi;
  const parts: string[] = [];
  if (fi.gap > 0) {
    parts.push(
      fi.extraMonthlyNeeded === null
        ? `• To reach financial independence by ${fi.targetAge}, the gap of ${c(fi.gap)} could not be closed with extra investment alone within the model limits. Consider a later target age or lower spending.`
        : `• To reach your FI target of ${c(fi.targetCorpus)} by age ${fi.targetAge}, invest about ${c(fi.extraMonthlyNeeded)} more a month, increasing ${formatPct(plan.assumptions.sipStepUp, 0)} a year. The projection currently reaches ${Math.round(fi.progress * 100)}%.`,
    );
  } else parts.push(`• You’re projected to reach your FI target of ${c(fi.targetCorpus)} by age ${fi.targetAge} with no extra saving.`);
  if (plan.goals.totalShortfall > 0) parts.push(`• Your goals need ${c(plan.goals.totalShortfall)} a month more than your current surplus of ${c(plan.goals.capacity)}.`);
  if (plan.cashflow.unallocated > 0) parts.push(`• ${c(plan.cashflow.unallocated)} a month is currently unallocated. Directing it to your SIP is the easiest first step.`);
  return `${parts.join('\n')}\n\n${assumptionsLine(plan)} The FI target uses a ${formatPct(plan.assumptions.withdrawalRate)} withdrawal rate.`;
}

function crash(plan: Plan, q: string): string {
  const yearN = num(q, /year\s*(\d+)/i) ?? 4;
  const drop = (num(q, /(\d+)\s*%/) ?? 30) / 100;
  const year = plan.profile.planStartYear + Math.max(1, Math.min(plan.sim.rows.length, yearN)) - 1;
  const noRec = simulate(plan.profile, plan.assumptions, { shock: { year, drop, recoveryYears: 0 } });
  const rec = simulate(plan.profile, plan.assumptions, { shock: { year, drop, recoveryYears: 3 } });
  const before = yearN > 1 ? plan.sim.rows[yearN - 2]?.portfolio ?? plan.sheet.investments : plan.sheet.investments;
  const shortB = plan.sim.rows.flatMap((r) => r.goals).filter((g) => g.status === 'funded').length;
  const shortM = noRec.rows.flatMap((r) => r.goals).filter((g) => g.status === 'funded').length;
  return `A ${formatPct(drop, 0)} fall at the start of Year ${yearN} (${year}) would cut your portfolio by about ${c(before * drop)}, from roughly ${c(before)}.

• If returns simply resume at ${formatPct(plan.portfolioReturn)} with no catch-up, final net worth would be ${c(noRec.rows.at(-1)!.netWorth)} instead of ${c(plan.final.netWorth)}.
• If markets recover the loss over 3 years, final net worth would be ${c(rec.rows.at(-1)!.netWorth)}.
• Goals funded in the projection: ${shortM} vs ${shortB} without the fall.

The biggest risk is being forced to sell near the bottom. Your emergency fund currently covers ${plan.emergency.coverageMonths === Infinity ? 'all' : plan.emergency.coverageMonths.toFixed(1)} months, and money for goals due within 2–3 years is safer outside equities. The Risk Lab lets you test other sizes, years and recovery paths.

This is a stress test, not a prediction. Past recoveries don’t guarantee future ones.`;
}

function explain(plan: Plan): string {
  const f = plan.final;
  const contributions = plan.sim.rows.reduce((s, r) => s + r.contributions, 0);
  return `In simple terms: you start with a net worth of ${c(plan.sheet.netWorth)}. Each month you earn ${c(plan.cashflow.income)}, spend ${c(plan.cashflow.expenses)}, repay ${c(plan.cashflow.debtPayments)} of loans, and have ${c(plan.cashflow.investableSurplus)} left to save or invest.

Over ${plan.sim.rows.length} years, the projection invests about ${c(contributions)} in total. With an assumed ${formatPct(plan.portfolioReturn)} return, your net worth reaches ${c(f.netWorth)} by ${f.year + 1}.

That number is in future rupees. After removing ${formatPct(plan.assumptions.inflation)} inflation, it is worth about ${c(f.netWorthReal)} in today’s money. That is the figure to compare with what things cost now.

${plan.profile.lifeEvents.length ? `It already includes your ${plan.profile.lifeEvents.length} life event${plan.profile.lifeEvents.length > 1 ? 's' : ''} (${plan.profile.lifeEvents.map((e) => e.label).join(', ')}).` : 'No life events are included yet.'} Real returns vary every year, so treat this as one reasonable path, not a promise.`;
}

export function answerWithRules(question: string, plan: Plan): CoachAnswer {
  const q = question.toLowerCase();
  if (/\b(home|house|flat|apartment|property)\b/.test(q)) return { text: home(plan, q) };
  if (/behind|why.*(goal|short)|not on track|shortfall/.test(q)) return { text: behind(plan) };
  if (/salary|income|raise|increment/.test(q) && /\d/.test(q)) return { text: salary(plan, q) };
  if (/market|crash|fall|drop|decline/.test(q)) return { text: crash(plan, q) };
  if (/save|saving|invest more|how much more|target/.test(q)) return { text: saveMore(plan) };
  if (/explain|simple|projected|projection|wealth|net worth/.test(q)) return { text: explain(plan) };
  return {
    text: `I can explain figures from your plan. Here is a quick summary: net worth ${c(plan.sheet.netWorth)}, monthly surplus ${c(plan.cashflow.investableSurplus)} (${formatPct(plan.cashflow.savingsRate, 0)} of income), projected net worth ${c(plan.final.netWorth)} by ${plan.final.year + 1} (${c(plan.final.netWorthReal)} in today’s rupees).

Try asking about affording a home, why a goal is behind, slower salary growth (e.g. “what if my salary grows 5%?”), how much more to save, or a market fall in a given year.`,
  };
}

/** Compact, pre-formatted context sent to the optional Gemini endpoint. Contains no name. */
export function coachContext(plan: Plan) {
  return {
    currency: 'INR',
    profile: { age: plan.profile.about.age, fiTargetAge: plan.profile.about.fiAge, dependents: plan.profile.about.dependents, planStartYear: plan.profile.planStartYear },
    assumptions: { inflation: formatPct(plan.assumptions.inflation), salaryGrowth: formatPct(plan.profile.income.salaryGrowth), portfolioReturn: formatPct(plan.portfolioReturn), sipStepUp: formatPct(plan.assumptions.sipStepUp), withdrawalRate: formatPct(plan.assumptions.withdrawalRate) },
    today: { netWorth: c(plan.sheet.netWorth), assets: c(plan.sheet.totalAssets), liabilities: c(plan.sheet.liabilities), monthlyIncome: c(plan.cashflow.income), monthlyExpenses: c(plan.cashflow.expenses), monthlyDebtPayments: c(plan.cashflow.debtPayments), monthlySurplus: c(plan.cashflow.investableSurplus), savingsRate: formatPct(plan.cashflow.savingsRate), emergencyCoverMonths: plan.emergency.coverageMonths.toFixed(1), healthScore: Math.round(plan.health.score) },
    projection: plan.sim.rows.filter((_, i) => i % 5 === 4).map((r) => ({ yearEnd: r.year, age: r.age, netWorth: c(r.netWorth), netWorthTodaysRupees: c(r.netWorthReal), events: r.events })),
    goals: plan.goals.goals.map((g) => ({ name: g.goal.name, targetYear: g.goal.targetYear, costToday: c(g.goal.cost), futureCost: c(g.futureCost), requiredMonthly: Number.isFinite(g.requiredMonthly) ? c(g.requiredMonthly) : 'n/a', allocatedMonthly: c(g.allocatedMonthly), status: g.status })),
    fi: { targetCorpus: c(plan.fi.targetCorpus), projectedAtTargetAge: c(plan.fi.projectedCorpus), gap: c(plan.fi.gap), estimatedFiAge: plan.fi.fiAge ?? 'beyond projection', extraMonthlyNeeded: plan.fi.extraMonthlyNeeded === null ? 'not reachable' : c(plan.fi.extraMonthlyNeeded) },
    lifeEvents: plan.profile.lifeEvents.map((e) => ({ label: e.label, year: e.year, kind: e.kind })),
    nextSteps: plan.insights.slice(0, 4).map((i) => i.title),
  };
}
