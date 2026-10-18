import type { Plan } from '@/state/selectors';
import { simulate } from '@/finance/simulate';
import { fiAnalysis } from '@/finance/fi';
import { formatCompact as c, formatPct } from '@/finance/money';
import { emi } from '@/finance/rates';
import { ageInYear } from '@/finance/timeline';

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

/** Rupee amount written as "75 L", "75 lakh", "1.2 Cr" or "₹60,00,000". */
function amount(q: string): number | null {
  const m = q.match(/(\d+(?:\.\d+)?)\s*(l|lakh|lakhs|lac|cr|crore|crores)\b/i);
  if (m) return Number(m[1]) * (/^c/i.test(m[2]) ? 1e7 : 1e5);
  const r = q.match(/₹\s*([\d,]{6,})/);
  return r ? Number(r[1].replace(/,/g, '')) : null;
}

export interface HomeAffordability {
  year: number; // purchase on 1 January of this year
  priceToday: number;
  priceThen: number;
  downPayment: number;
  liquid: number; // investments + cash on 1 January of `year`
  reserve: number; // emergency reserve kept back
  available: number;
  loan: number;
  emi: number; // monthly
  existingEmi: number; // other loan repayments that year, monthly
  takeHome: number; // monthly take-home in `year`
  emiShare: number; // (emi + existingEmi) ÷ take-home
  assumedPrice: boolean;
}

/**
 * Home affordability read from the projection. Buying on 1 January of year T uses the balances at that
 * point (the 31 December row of T − 1) and the take-home and other EMIs of year T, when repayments start.
 */
export function homeAffordability(plan: Plan, q: string): HomeAffordability {
  const { profile: p, assumptions: a, sim } = plan;
  const inYear = num(q, /\b(20\d\d)\b/);
  const inYears = num(q, /(\d+)\s*(?:years?|yrs?)/i) ?? (/\bfive\b/i.test(q) ? 5 : /\bten\b/i.test(q) ? 10 : null);
  const years = Math.max(1, Math.min(sim.rows.length - 1, inYear ? inYear - p.planStartYear : inYears ?? 5));
  const year = p.planStartYear + years;
  const homeGoal = p.goals.find((g) => g.category === 'home');
  const homeEvent = p.lifeEvents.find((e) => e.kind === 'homePurchase' && e.home);
  const asked = amount(q);
  const priceToday = asked ?? homeEvent?.home?.propertyValue ?? (homeGoal ? homeGoal.cost / 0.2 : 6000000);
  const dpPct = homeEvent?.home?.downPaymentPct ?? 0.2;
  const rate = homeEvent?.home?.loanRate ?? 0.085;
  const tenureYears = homeEvent?.home?.tenureYears ?? 20;
  const before = sim.rows[years - 1]; // 31 December of year T − 1
  const during = sim.rows[years]; // year T
  const priceThen = priceToday * Math.pow(1 + a.propertyGrowth, years);
  const downPayment = priceThen * dpPct;
  const reserve = p.protection.emergencyTargetMonths * (plan.cashflow.essential + plan.cashflow.debtPayments) * Math.pow(1 + a.inflation, years);
  const liquid = before.portfolio + Math.max(0, before.cash);
  const available = liquid - reserve;
  const loan = priceThen - downPayment;
  const monthlyEmi = emi(loan, rate, Math.max(1, tenureYears) * 12);
  // A home already planned for this year has its EMI inside `during`; leave it out so it is not counted twice.
  const planned =
    homeEvent && homeEvent.year === year
      ? emi(homeEvent.home!.propertyValue * Math.pow(1 + a.propertyGrowth, years) * (1 - homeEvent.home!.downPaymentPct), homeEvent.home!.loanRate, homeEvent.home!.tenureYears * 12)
      : 0;
  const existingEmi = Math.max(0, during.debtPayments / 12 - planned);
  const takeHome = during.income / 12;
  return {
    year,
    priceToday,
    priceThen,
    downPayment,
    liquid,
    reserve,
    available,
    loan,
    emi: monthlyEmi,
    existingEmi,
    takeHome,
    emiShare: takeHome > 0 ? (monthlyEmi + existingEmi) / takeHome : Infinity,
    assumedPrice: asked === null && !homeEvent && !homeGoal,
  };
}

function home(plan: Plan, q: string): string {
  const h = homeAffordability(plan, q);
  const { profile: p, assumptions: a } = plan;
  const verdict =
    h.available >= h.downPayment && h.emiShare <= 0.4
      ? 'On these assumptions, it looks feasible.'
      : h.available < h.downPayment
        ? 'On these assumptions, the down payment is the constraint.'
        : 'On these assumptions, the EMI would take a large share of your income.';
  const missing = h.assumedPrice
    ? `\n\nMissing information: you haven’t added a home goal or a home-purchase life event, so I assumed a ₹60 lakh property in today’s prices with 20% down and an 8.5% loan over 20 years. Add one in Life Events for a precise answer.`
    : '';
  return `${verdict}

• A property worth ${c(h.priceToday)} today would cost about ${c(h.priceThen)} in ${h.year} (at ${formatPct(a.propertyGrowth)} property growth). A ${formatPct(h.downPayment / h.priceThen, 0)} down payment is ${c(h.downPayment)}.
• On 1 January ${h.year} your projection holds ${c(h.liquid)} in investments and cash. After keeping your emergency reserve (${c(h.reserve)}), ${c(Math.max(0, h.available))} would be available${h.available < h.downPayment ? `, which is ${c(h.downPayment - Math.max(0, h.available))} short` : ''}.
• The EMI on a ${c(h.loan)} loan would be about ${c(h.emi)} a month${h.existingEmi > 0 ? `, plus ${c(h.existingEmi)} of other EMIs` : ''}. That is ${formatPct(h.emiShare, 0)} of your projected ${h.year} take-home of ${c(h.takeHome * 12)} a year. Many lenders become cautious above 40–50%.

${assumptionsLine(plan)} You would be ${ageInYear(p, h.year)}. Registration, stamp duty and furnishing costs are not included unless you add them as a one-time cost.${missing}`;
}

function behind(plan: Plan): string {
  if (!plan.profile.goals.length) return 'You haven’t added any goals yet, so there is nothing to be behind on. Add goals in the Goals Planner, and I’ll explain how each one is funded.';
  const g = plan.goalViews.filter((v) => v.status === 'unfunded' || v.status === 'financed');
  if (!g.length) return `Your projection pays for every goal from savings when it falls due.\n\n${assumptionsLine(plan)}`;
  const lines = g.map((v) => {
    const o = v.outcome!;
    return v.status === 'unfunded'
      ? `• ${v.goal.name} (${o.year}): costs ${c(v.goal.cost)} today, ${c(o.cost)} by then at ${formatPct(v.goal.inflation)} cost inflation. The projection has ${c(o.cost - o.shortfall)} to spare, so it is ${c(o.shortfall)} short and the goal is not paid for.`
      : `• ${v.goal.name} (${o.year}): costs ${c(o.cost)} by then. Savings cover ${c(o.fromSavings)}; a ${c(o.loan)} loan covers the rest, and its EMIs are in your projection.`;
  });
  return `${g.length === 1 ? 'One goal needs' : `${g.length} goals need`} more than your savings can cover when ${g.length === 1 ? 'it falls' : 'they fall'} due. Together your goals would need ${c(plan.goals.totalRequired)} a month set aside, against an investable surplus of ${c(plan.goals.capacity)}.

${lines.join('\n')}

Ways to close the gap: delay the goal, reduce its cost, raise contributions (for example, by cutting lifestyle spending of ${c(plan.cashflow.lifestyle)}/month), or lower the priority of another goal. The “Explore options” panel in the Goals Planner tests each one.

${assumptionsLine(plan)}`;
}

function salary(plan: Plan, q: string): string {
  const pct = (num(q, /(\d+(?:\.\d+)?)\s*%/) ?? 5) / 100;
  const alt = simulate(plan.profile, plan.assumptions, { salaryGrowth: pct });
  const altFi = fiAnalysis(plan.profile, plan.assumptions, { salaryGrowth: pct });
  const b = plan.final;
  const bp = plan.headline;
  const x = alt.rows.at(-1)!;
  const xp = alt.points.at(-1)!;
  return `If your salary grows ${formatPct(pct)} a year instead of ${formatPct(plan.profile.income.salaryGrowth)}:

• Projected net worth in ${bp.year}: ${c(xp.netWorth)} instead of ${c(bp.netWorth)} (${xp.netWorth >= bp.netWorth ? '+' : ''}${c(xp.netWorth - bp.netWorth)}). In today’s rupees, that is ${c(xp.netWorthReal)} vs ${c(bp.netWorthReal)}.
• Take-home in ${b.year}: ${c(x.income)} vs ${c(b.income)}.
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

• If returns simply resume at ${formatPct(plan.portfolioReturn)} with no catch-up, net worth in ${plan.headline.year} would be ${c(noRec.points.at(-1)!.netWorth)} instead of ${c(plan.headline.netWorth)}.
• If markets recover the loss over 3 years, it would be ${c(rec.points.at(-1)!.netWorth)}.
• Goals paid from savings without a loan: ${shortM} vs ${shortB} without the fall.

The biggest risk is being forced to sell near the bottom. Your emergency fund currently covers ${plan.emergency.coverageMonths === Infinity ? 'all' : plan.emergency.coverageMonths.toFixed(1)} months, and money for goals due within 2–3 years is safer outside equities. The Risk Lab lets you test other sizes, years and recovery paths.

This is a stress test, not a prediction. Past recoveries don’t guarantee future ones.`;
}

function explain(plan: Plan): string {
  const contributions = plan.sim.rows.reduce((s, r) => s + r.contributions, 0);
  return `In simple terms: you start with a net worth of ${c(plan.sheet.netWorth)}. Each month you earn ${c(plan.cashflow.income)}, spend ${c(plan.cashflow.expenses)}, repay ${c(plan.cashflow.debtPayments)} of loans, and have ${c(plan.cashflow.investableSurplus)} left to save or invest.

Over ${plan.sim.rows.length} years, the projection invests about ${c(contributions)} in total. With an assumed ${formatPct(plan.portfolioReturn)} return, your net worth reaches ${c(plan.headline.netWorth)} by ${plan.headline.year}.

That number is in future rupees. After removing ${formatPct(plan.assumptions.inflation)} inflation, it is worth about ${c(plan.headline.netWorthReal)} in today’s money. That is the figure to compare with what things cost now.

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
    text: `I can explain figures from your plan. Here is a quick summary: net worth ${c(plan.sheet.netWorth)}, monthly surplus ${c(plan.cashflow.investableSurplus)} (${formatPct(plan.cashflow.savingsRate, 0)} of income), projected net worth ${c(plan.headline.netWorth)} by ${plan.headline.year} (${c(plan.headline.netWorthReal)} in today’s rupees).

Try asking about affording a home, why a goal is behind, slower salary growth (e.g. “what if my salary grows 5%?”), how much more to save, or a market fall in a given year.`,
  };
}

/** Compact, pre-formatted context sent to the optional Gemini endpoint. Contains no name. */
export function coachContext(plan: Plan) {
  return {
    currency: 'INR',
    profile: { age: plan.profile.about.age, ageConvention: 'age on 1 January of each year', fiTargetAge: plan.profile.about.fiAge, dependents: plan.profile.about.dependents, planStartYear: plan.profile.planStartYear },
    assumptions: { inflation: formatPct(plan.assumptions.inflation), salaryGrowth: formatPct(plan.profile.income.salaryGrowth), portfolioReturn: formatPct(plan.portfolioReturn), sipStepUp: formatPct(plan.assumptions.sipStepUp), withdrawalRate: formatPct(plan.assumptions.withdrawalRate) },
    today: { netWorth: c(plan.sheet.netWorth), assets: c(plan.sheet.totalAssets), liabilities: c(plan.sheet.liabilities), monthlyIncome: c(plan.cashflow.income), monthlyExpenses: c(plan.cashflow.expenses), monthlyDebtPayments: c(plan.cashflow.debtPayments), monthlySurplus: c(plan.cashflow.investableSurplus), savingsRate: formatPct(plan.cashflow.savingsRate), emergencyCoverMonths: plan.emergency.coverageMonths.toFixed(1), healthScore: Math.round(plan.health.score) },
    projection: plan.sim.points.filter((_, i) => i > 0 && i % 5 === 0).map((pt) => ({ onFirstJanuary: pt.year, age: pt.age, netWorth: c(pt.netWorth), netWorthTodaysRupees: c(pt.netWorthReal) })),
    goals: plan.goalViews.map((v) => ({ name: v.goal.name, targetYear: v.goal.targetYear, costToday: c(v.goal.cost), costThen: c(v.analysis.futureCost), paidFromSavings: v.outcome ? c(v.outcome.fromSavings) : 'n/a', loan: v.outcome ? c(v.outcome.loan) : 'n/a', unpaid: v.outcome ? c(v.outcome.shortfall) : 'n/a', status: v.status })),
    fi: { targetCorpus: c(plan.fi.targetCorpus), projectedAtTargetAge: c(plan.fi.projectedCorpus), gap: c(plan.fi.gap), estimatedFiAge: plan.fi.fiAge ?? 'beyond projection', extraMonthlyNeeded: plan.fi.extraMonthlyNeeded === null ? 'not reachable' : c(plan.fi.extraMonthlyNeeded) },
    lifeEvents: plan.profile.lifeEvents.map((e) => ({ label: e.label, year: e.year, kind: e.kind })),
    nextSteps: plan.insights.slice(0, 4).map((i) => i.title),
  };
}
