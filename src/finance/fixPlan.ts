import type { Assumptions, FinancialProfile, Goal } from '@/types/profile';
import type { SimResult } from '@/types/sim';
import { emergencyPlan } from './emergency';
import { regularPlanCost } from './costs';
import { goalFundingMode } from './goalFunding';
import { healthScore } from './health';
import { usesCtc } from './income';
import { monteCarlo } from './montecarlo';
import { formatCompact } from './money';
import { simulate } from './simulate';
import { EMPLOYER_NPS } from './assumptions';
import { sectionLabel } from './sections';

/*
 * "Fix my plan": a deterministic plan improver. Each fix is a small, reversible patch to the profile or the
 * assumptions, proposed only when it applies. Its impact comes from rerunning the engine with that patch alone.
 * The combined pass applies fixes greedily, best impact per rupee first, and drops any that conflict or stop
 * helping. Nothing here names a fund, stock or insurer.
 */

export type FixId = 'clear-debt' | 'fill-reserve' | 'employer-nps' | 'auto-regime' | 'step-up' | 'goal-loan' | 'move-goal' | 'creep' | 'direct-plans';

/** One reversible change: the value at `path` becomes `value`; `prev` restores it. */
export interface PatchOp {
  target: 'profile' | 'assumptions';
  path: (string | number)[];
  value: unknown;
  prev: unknown;
}

export interface PlanMetrics {
  fiAge: number | null; // first age at which financial assets cover the FI target (searched to 65)
  fiSuccess: number; // share of simulated market paths that reach FI by the target age
  unpaidGoals: number;
  netWorthReal: number; // at the end of the horizon, today's rupees
  health: number;
}

export interface FixImpact {
  before: PlanMetrics;
  after: PlanMetrics;
}

export interface Fix {
  id: FixId;
  /** Unique key: a fix can apply to one goal among several. */
  key: string;
  title: string;
  why: string;
  patch: PatchOp[];
  /** Rupees this fix ties up or costs in its first year, for ranking by impact per rupee. */
  effort: number;
  impact: FixImpact;
}

export type FixCandidate = Omit<Fix, 'impact'>;

/** Paths per quick Monte Carlo. Seeded, so the same plan always gives the same answer. */
export const FIX_PATHS = 300;

/* ---------- Patches ---------- */

function setAt(obj: Record<string | number, unknown>, path: (string | number)[], value: unknown) {
  let o = obj as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    if (o[path[i]] == null) o[path[i]] = {};
    o = o[path[i]] as Record<string | number, unknown>;
  }
  const last = path[path.length - 1];
  if (value === undefined) delete o[last];
  else o[last] = value;
}

function getAt(obj: unknown, path: (string | number)[]): unknown {
  return path.reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string | number, unknown>)[k]), obj);
}

/** Applies patches to copies of the profile and assumptions. */
export function applyPatch(p: FinancialProfile, a: Assumptions, ops: PatchOp[]): { profile: FinancialProfile; assumptions: Assumptions } {
  const profile = structuredClone(p);
  const assumptions = structuredClone(a);
  for (const op of ops) setAt((op.target === 'profile' ? profile : assumptions) as unknown as Record<string, unknown>, op.path, structuredClone(op.value));
  return { profile, assumptions };
}

/** Undoes patches (in reverse order). */
export function revertPatch(p: FinancialProfile, a: Assumptions, ops: PatchOp[]): { profile: FinancialProfile; assumptions: Assumptions } {
  return applyPatch(p, a, [...ops].reverse().map((op) => ({ ...op, value: op.prev, prev: op.value })));
}

const op = (p: FinancialProfile, a: Assumptions, target: PatchOp['target'], path: (string | number)[], value: unknown): PatchOp => ({
  target,
  path,
  value,
  prev: structuredClone(getAt(target === 'profile' ? p : a, path)),
});

/* ---------- Evaluation ---------- */

/** Years to simulate so an FI age can be found even after the target: to 65, at least the horizon. */
const searchYears = (p: FinancialProfile, a: Assumptions) => Math.min(50, Math.max(a.horizonYears, 65 - p.about.age, p.about.fiAge - p.about.age));

const unpaidCount = (sim: SimResult) => sim.rows.flatMap((r) => r.goals).filter((g) => g.status === 'shortfall').length;

/** The five numbers the before/after strip shows. */
export function evaluatePlan(p: FinancialProfile, a: Assumptions, paths = FIX_PATHS): PlanMetrics {
  const base = simulate(p, a);
  const long = simulate(p, a, { years: searchYears(p, a) });
  const yearsToFi = Math.max(1, Math.min(50, p.about.fiAge - p.about.age));
  const mc = monteCarlo(p, a, { paths, overrides: { years: yearsToFi } });
  return {
    fiAge: long.fiAge,
    fiSuccess: mc.fiProbability,
    unpaidGoals: unpaidCount(base),
    netWorthReal: base.points[base.points.length - 1].netWorthReal,
    health: healthScore(p, a).score,
  };
}

/** One number for comparing plans: goals first, then FI odds, FI age, wealth and health. */
export function planScore(m: PlanMetrics, targetAge: number): number {
  const fiAge = m.fiAge ?? targetAge + 20;
  return -m.unpaidGoals * 1000 + m.fiSuccess * 100 - fiAge * 2 + m.netWorthReal / 1e6 + m.health / 10;
}

/* ---------- Candidates ---------- */

const totalTax = (sim: SimResult) => sim.rows.reduce((s, r) => s + r.incomeTax, 0);

function unpaidGoals(p: FinancialProfile, sim: SimResult): Goal[] {
  const ids = new Set(sim.rows.flatMap((r) => r.goals).filter((g) => g.status === 'shortfall').map((g) => g.goalId));
  return p.goals.filter((g) => ids.has(g.id));
}

/**
 * Every fix that applies to this plan, without impacts (cheap enough to run on every change).
 * Overview's next steps read these, so the checklist and the Fix my plan sheet never disagree.
 */
export function candidateFixes(p: FinancialProfile, a: Assumptions): FixCandidate[] {
  const out: FixCandidate[] = [];
  const sim = simulate(p, a);
  const money = formatCompact;

  // 1. Clear high-interest debt from savings above a two-month floor; the freed EMI goes to the SIP.
  const costly = p.liabilities.map((l, i) => ({ l, i })).filter(({ l }) => l.balance > 0 && l.rate > 0.15);
  if (costly.length) {
    const ef = emergencyPlan(p);
    const floor = 2 * ef.monthlyNeed;
    const owed = costly.reduce((s, { l }) => s + l.balance, 0);
    const freedEmi = costly.reduce((s, { l }) => s + l.emi, 0);
    const liquid = Math.max(0, p.position.cashSavings) + Math.max(0, p.position.emergencyFund);
    if (liquid - owed >= floor) {
      const fromCash = Math.min(Math.max(0, p.position.cashSavings), owed);
      const ops = costly.flatMap(({ i }) => [op(p, a, 'profile', ['liabilities', i, 'balance'], 0), op(p, a, 'profile', ['liabilities', i, 'emi'], 0)]);
      ops.push(op(p, a, 'profile', ['position', 'cashSavings'], p.position.cashSavings - fromCash));
      if (owed > fromCash) ops.push(op(p, a, 'profile', ['position', 'emergencyFund'], p.position.emergencyFund - (owed - fromCash)));
      ops.push(op(p, a, 'profile', ['cashflow', 'monthlyInvestments'], p.cashflow.monthlyInvestments + freedEmi));
      const top = costly.sort((x, y) => y.l.rate - x.l.rate)[0].l;
      out.push({
        id: 'clear-debt',
        key: 'clear-debt',
        title: costly.length === 1 ? `Clear the ${money(owed)} ${top.label.toLowerCase()}` : `Clear ${money(owed)} of high-interest debt`,
        why: `At ${Math.round(top.rate * 100)}% interest it costs more than investments are assumed to earn. Pay it from savings (you keep two months of essentials and EMIs) and add the ${money(freedEmi)} EMI to your SIP.`,
        patch: ops,
        effort: owed,
      });
    }
  }

  // 2. Fill the emergency reserve by pausing part of the SIP for a few months.
  const ef = emergencyPlan(p);
  const sip = Math.max(0, p.cashflow.monthlyInvestments);
  if (ef.gap > 0 && sip > 0 && !p.cashflow.sipPause) {
    let amount = Math.min(sip, Math.ceil(ef.gap / 6 / 500) * 500);
    let months = Math.ceil(ef.gap / amount);
    if (months > 24) {
      amount = sip;
      months = Math.ceil(ef.gap / amount);
    }
    out.push({
      id: 'fill-reserve',
      key: 'fill-reserve',
      title: `Fill your emergency reserve: pause ${money(amount)} of your SIP for ${months} month${months === 1 ? '' : 's'}`,
      why: `You hold ${ef.coverageMonths.toFixed(1)} of ${ef.targetMonths} months of essentials and EMIs. The paused amount goes to the reserve until the ${money(ef.gap)} gap is closed, then the SIP goes back to normal.`,
      patch: [op(p, a, 'profile', ['cashflow', 'sipPause'], { amount, months })],
      effort: ef.gap,
    });
  }

  // 3. Employer NPS, only if it lowers tax over the plan: 14% of basic when the plan is mostly in the new
  //    regime (the most it deducts), 10% when mostly in the old.
  const ctcRows = sim.rows.filter((r) => r.regime !== null);
  const mostlyNew = ctcRows.filter((r) => r.regime === 'new').length >= ctcRows.length / 2;
  const npsShare = mostlyNew ? EMPLOYER_NPS.value.newRegimeCap : EMPLOYER_NPS.value.oldRegimeCap;
  if (usesCtc(p) && (p.income.salary?.employerNpsShare ?? 0) < npsShare - 1e-9) {
    const share = npsShare;
    const withNps: FinancialProfile = { ...p, income: { ...p.income, salary: { ...(p.income.salary ?? {}), employerNpsShare: share } } };
    const nps = simulate(withNps, a);
    const saved = totalTax(sim) - totalTax(nps);
    if (saved > 1000) {
      const first = sim.rows.findIndex((r, i) => r.incomeTax - nps.rows[i].incomeTax > 100);
      const yearly = first >= 0 ? sim.rows[first].incomeTax - nps.rows[first].incomeTax : 0;
      const contribution = first >= 0 ? nps.rows[first].npsContributions : 0;
      out.push({
        id: 'employer-nps',
        key: 'employer-nps',
        title: `Ask HR to put ${Math.round(share * 100)}% of basic into NPS`,
        why: `Part of your CTC goes to NPS instead of salary, deductible under ${sectionLabel('80CCD(2)')}. It saves about ${money(yearly)} in tax in ${sim.rows[first]?.year ?? 'later years'}, ${money(saved)} over the plan. The money is locked until 60.`,
        patch: [op(p, a, 'profile', ['income', 'salary', 'employerNpsShare'], share)],
        effort: contribution,
      });
    }
  }

  // 4. Cheaper regime each year, only if a regime is forced.
  const forced = p.income.salary?.regime;
  if (usesCtc(p) && forced && forced !== 'auto') {
    const auto = simulate({ ...p, income: { ...p.income, salary: { ...(p.income.salary ?? {}), regime: 'auto' } } }, a);
    const saved = totalTax(sim) - totalTax(auto);
    if (saved > 1000)
      out.push({
        id: 'auto-regime',
        key: 'auto-regime',
        title: 'Choose the cheaper tax regime each year',
        why: `You picked the ${forced} regime for every year. Choosing the cheaper one each year saves about ${money(saved)} over the plan.`,
        patch: [op(p, a, 'profile', ['income', 'salary', 'regime'], 'auto')],
        effort: 0,
      });
  }

  // 5. SIP step-up to 10%.
  if (a.sipStepUp < 0.1 - 1e-9 && sip > 0)
    out.push({
      id: 'step-up',
      key: 'step-up',
      title: 'Raise your SIP by 10% each year',
      why: `Your SIP rises ${Math.round(a.sipStepUp * 100)}% a year. Matching it to typical raises keeps your savings rate from slipping as pay grows.`,
      patch: [op(p, a, 'assumptions', ['sipStepUp'], 0.1)],
      effort: sip * 12 * (0.1 - a.sipStepUp),
    });

  // 6. Savings, then a loan, for unpaid education and car goals.
  const unpaid = unpaidGoals(p, sim);
  const loanable = unpaid.filter((g) => (g.category === 'education' || g.category === 'car') && goalFundingMode(g) === 'savings');
  if (loanable.length)
    out.push({
      id: 'goal-loan',
      key: 'goal-loan',
      title: loanable.length === 1 ? `Let a loan cover the gap for ${loanable[0].name}` : 'Let loans cover the gaps for your education and car goals',
      why: `${loanable.map((g) => g.name).join(' and ')} can’t be paid from savings in time. Savings first, then a ${loanable.some((g) => g.category === 'education') ? 'education' : 'car'} loan for the rest; the EMIs are added to your plan.`,
      patch: loanable.map((g) => op(p, a, 'profile', ['goals', p.goals.indexOf(g), 'fundingMode'], 'mixed')),
      effort: 0,
    });

  // 7. Move a clashing goal by one or two years if that removes its shortfall without creating another.
  for (const g of unpaid) {
    const i = p.goals.indexOf(g);
    for (const shift of [1, 2]) {
      const moved = { ...p, goals: p.goals.map((x) => (x.id === g.id ? { ...x, targetYear: x.targetYear + shift } : x)) };
      if (unpaidCount(simulate(moved, a)) < unpaid.length) {
        out.push({
          id: 'move-goal',
          key: `move-goal:${g.id}`,
          title: `Move ${g.name} to ${g.targetYear + shift}`,
          why: `In ${g.targetYear} it clashes with other spending and can’t be paid. ${shift === 1 ? 'A year' : 'Two years'} later, savings cover it.`,
          patch: [op(p, a, 'profile', ['goals', i, 'targetYear'], g.targetYear + shift)],
          effort: 0,
        });
        break;
      }
    }
  }

  // 8. Hold lifestyle creep to 25% if the plan is still short.
  const fiByTarget = sim.fiAge !== null && sim.fiAge <= p.about.fiAge;
  const short = unpaid.length > 0 || !fiByTarget;
  if (a.lifestyleCreep > 0.25 + 1e-9 && short)
    out.push({
      id: 'creep',
      key: 'creep',
      title: 'Keep lifestyle creep to 25% of each raise',
      why: `Today ${Math.round(a.lifestyleCreep * 100)}% of every real raise turns into permanent spending. Holding it to 25% still lets your lifestyle grow, and leaves more of each raise to invest.`,
      patch: [op(p, a, 'assumptions', ['lifestyleCreep'], 0.25)],
      effort: 0,
    });

  // 9. Direct plans, only if the regular-plan toggle is on.
  if ((p.preferences.regularPlanShare ?? 0) > 0) {
    const cost = regularPlanCost(p, a);
    out.push({
      id: 'direct-plans',
      key: 'direct-plans',
      title: 'Switch regular-plan funds to direct plans',
      why: `Same schemes, lower costs: about ${money(cost.nominal)} more by ${p.planStartYear + a.horizonYears} (${money(cost.real)} in today’s rupees). Switching is a sale, so check exit loads and capital-gains tax first.`,
      patch: [op(p, a, 'profile', ['preferences', 'regularPlanShare'], 0)],
      effort: 0,
    });
  }
  return out;
}

/** Fixes that apply, each with the impact of applying it alone. */
export function suggestFixes(p: FinancialProfile, a: Assumptions, paths = FIX_PATHS): Fix[] {
  const before = evaluatePlan(p, a, paths);
  return candidateFixes(p, a).map((c) => {
    const next = applyPatch(p, a, c.patch);
    return { ...c, impact: { before, after: evaluatePlan(next.profile, next.assumptions, paths) } };
  });
}

/* ---------- Combining ---------- */

export interface Combined {
  applied: string[]; // fix keys kept, in the order applied
  dropped: { key: string; reason: 'conflict' | 'no-gain' }[];
  before: PlanMetrics;
  after: PlanMetrics;
  profile: FinancialProfile;
  assumptions: Assumptions;
  patch: PatchOp[];
}

/** True when the plan still falls short: a goal is unpaid, or FI isn't reached by the target age. */
function stillShort(p: FinancialProfile, a: Assumptions): boolean {
  const sim = simulate(p, a, { years: Math.max(1, Math.min(50, p.about.fiAge - p.about.age)) });
  return unpaidCount(simulate(p, a)) > 0 || sim.fiYear === null;
}

const GOAL_FIXES: ReadonlySet<FixId> = new Set<FixId>(['goal-loan', 'move-goal']);

/** Benefit of a fix alone, per rupee it ties up (zero-cost fixes rank first). */
export function impactPerRupee(f: Fix, targetAge: number): number {
  const gain = planScore(f.impact.after, targetAge) - planScore(f.impact.before, targetAge);
  return gain / (Math.max(0, f.effort) + 10_000);
}

const samePath = (x: PatchOp, y: PatchOp) => x.target === y.target && x.path.length === y.path.length && x.path.every((k, i) => k === y.path[i]);

/**
 * Applies fixes greedily in order of impact per rupee; cutting lifestyle creep goes last and only if the plan
 * is still short by then. A fix is dropped if it patches something an earlier fix already changed, or if it no
 * longer improves the plan. When a fix helps but reopens a goal gap, it is retried together with a goal fix not
 * yet used. Never returns a plan with more unpaid goals than the starting one.
 */
export function combineFixes(p: FinancialProfile, a: Assumptions, fixes: Fix[], paths = FIX_PATHS): Combined {
  const before = fixes[0]?.impact.before ?? evaluatePlan(p, a, paths);
  const rank = (f: Fix) => (f.id === 'creep' ? -Infinity : impactPerRupee(f, p.about.fiAge));
  const order = [...fixes].sort((x, y) => rank(y) - rank(x) || x.key.localeCompare(y.key));
  let cur = { profile: p, assumptions: a };
  let curM = before;
  const applied: string[] = [];
  const dropped: Combined['dropped'] = [];
  const patch: PatchOp[] = [];
  const conflicts = (f: Fix) => f.patch.some((o) => patch.some((q) => samePath(o, q)));
  const better = (m: PlanMetrics) => m.unpaidGoals <= curM.unpaidGoals && planScore(m, p.about.fiAge) > planScore(curM, p.about.fiAge) + 1e-9;
  const accept = (fs: Fix[], next: typeof cur, m: PlanMetrics) => {
    cur = next;
    curM = m;
    for (const f of fs) {
      applied.push(f.key);
      patch.push(...f.patch);
      const i = dropped.findIndex((d) => d.key === f.key);
      if (i >= 0) dropped.splice(i, 1);
    }
  };
  for (const f of order) {
    if (applied.includes(f.key)) continue;
    if (conflicts(f)) {
      dropped.push({ key: f.key, reason: 'conflict' });
      continue;
    }
    if (f.id === 'creep' && !stillShort(cur.profile, cur.assumptions)) {
      dropped.push({ key: f.key, reason: 'no-gain' });
      continue;
    }
    const next = applyPatch(cur.profile, cur.assumptions, f.patch);
    const m = evaluatePlan(next.profile, next.assumptions, paths);
    if (better(m)) {
      accept([f], next, m);
      continue;
    }
    // It helps but reopens a goal gap: try it with a goal fix that hasn't been used.
    let repaired = false;
    if (m.unpaidGoals > curM.unpaidGoals && !GOAL_FIXES.has(f.id)) {
      for (const g of fixes.filter((x) => GOAL_FIXES.has(x.id) && !applied.includes(x.key) && !conflicts(x))) {
        const both = applyPatch(next.profile, next.assumptions, g.patch);
        const m2 = evaluatePlan(both.profile, both.assumptions, paths);
        if (better(m2)) {
          accept([f, g], both, m2);
          repaired = true;
          break;
        }
      }
    }
    if (!repaired) dropped.push({ key: f.key, reason: 'no-gain' });
  }
  return { applied, dropped, before, after: curM, profile: cur.profile, assumptions: cur.assumptions, patch };
}

/** The plan with exactly these fixes applied (in the given order), for the sheet's live after-strip. */
export function applyFixes(p: FinancialProfile, a: Assumptions, fixes: Pick<Fix, 'patch'>[]) {
  return applyPatch(p, a, fixes.flatMap((f) => f.patch));
}
