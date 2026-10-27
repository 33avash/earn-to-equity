import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyPatch, candidateFixes, combineFixes, evaluatePlan, revertPatch, suggestFixes, type Fix } from '@/finance/fixPlan';
import { simulate } from '@/finance/simulate';
import { DEFAULT_ASSUMPTIONS, blankProfile, demoProfile } from '@/state/demo';
import { computePlan } from '@/state/plan';
import type { FinancialProfile } from '@/types/profile';

/*
 * The demo persona and "Fix my plan". The ranges below are the targets the demo was tuned to with real engine
 * runs; if an engine change moves Riya outside them, retune the demo rather than the test.
 */

/** Dotted paths of every leaf that differs between two values. */
function diff(x: unknown, y: unknown, at: string): string[] {
  if (x === y) return [];
  if (typeof x !== 'object' || typeof y !== 'object' || x === null || y === null) return [at];
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
  return [...keys].flatMap((k) => diff((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k], `${at}.${k}`));
}

const p = demoProfile(2026);
const a = DEFAULT_ASSUMPTIONS;
const fixes = suggestFixes(p, a);
const combined = combineFixes(p, a, fixes);

describe('demo persona (Riya, Pune, ₹11.5 L CTC)', () => {
  const sim = simulate(p, a);
  it('uses the Phase 1 salary structure', () => {
    expect(p.income.salary).toMatchObject({ basicShare: 0.5, gratuityInCtc: true, variablePay: { targetShare: 0.1, expectedPayout: 0.8 }, employerNpsShare: 0 });
    expect(p.about.city).toBe('pune');
    expect(p.cashflow.essential.find((l) => l.id === 'rent')!.amount).toBeGreaterThan(0);
  });
  it('never runs out of cash and never falls below −₹5 L of net worth', () => {
    expect(Math.min(...sim.rows.map((r) => r.cash))).toBeGreaterThanOrEqual(0);
    expect(sim.rows.every((r) => !r.flags.includes('borrowing'))).toBe(true);
    expect(Math.min(...sim.rows.map((r) => r.netWorth))).toBeGreaterThan(-500_000);
  });
  it('has one clearly fixable gap: the MBA and the car clash, leaving one unpaid goal; the reserve is short', () => {
    const unpaid = sim.rows.flatMap((r) => r.goals).filter((g) => g.status === 'shortfall');
    expect(unpaid.map((g) => g.goalId)).toEqual(['car']);
    expect(computePlan(p, a).emergency.gap).toBeGreaterThan(0);
    const card = p.liabilities.find((l) => l.kind === 'creditCard')!;
    expect(card.balance).toBeLessThan(30_000);
  });
  it('starts with plan health 55–65 and a 30–45% chance of FI by 55', () => {
    const m = fixes[0].impact.before;
    expect(m.health).toBeGreaterThanOrEqual(55);
    expect(m.health).toBeLessThanOrEqual(65);
    expect(m.fiSuccess).toBeGreaterThanOrEqual(0.3);
    expect(m.fiSuccess).toBeLessThanOrEqual(0.45);
    expect(m.unpaidGoals).toBe(1);
  });
  it('after Fix my plan: health 75–85, no unpaid goals, 65–80% chance of FI, FI at least 2 years sooner', () => {
    const b = combined.before;
    const x = combined.after;
    expect(x.health).toBeGreaterThanOrEqual(75);
    expect(x.health).toBeLessThanOrEqual(85);
    expect(x.unpaidGoals).toBe(0);
    expect(x.fiSuccess).toBeGreaterThanOrEqual(0.65);
    expect(x.fiSuccess).toBeLessThanOrEqual(0.8);
    expect(b.fiAge! - x.fiAge!).toBeGreaterThanOrEqual(2);
  });
  it('“Ask HR for NPS” is one of the fixes and is kept in the combined plan', () => {
    expect(fixes.some((f) => f.id === 'employer-nps')).toBe(true);
    expect(combined.applied).toContain('employer-nps');
  });
});

describe('suggestFixes', () => {
  it('is deterministic for the demo', () => {
    const again = suggestFixes(p, a);
    expect(again.map((f) => [f.key, f.title, f.impact.after])).toEqual(fixes.map((f) => [f.key, f.title, f.impact.after]));
    expect(fixes.map((f) => f.key)).toMatchInlineSnapshot(`
      [
        "clear-debt",
        "fill-reserve",
        "employer-nps",
        "goal-loan",
        "move-goal:car",
        "creep",
      ]
    `);
  });
  it('every patch is minimal: it changes only the paths it names, and reverting restores the plan exactly', () => {
    for (const f of fixes) {
      const next = applyPatch(p, a, f.patch);
      const back = revertPatch(next.profile, next.assumptions, f.patch);
      expect(back.profile).toEqual(p);
      expect(back.assumptions).toEqual(a);
      // Every value that differs sits under a path the patch names.
      const named = f.patch.map((o) => `${o.target}.${o.path.join('.')}`);
      for (const d of [...diff(p, next.profile, 'profile'), ...diff(a, next.assumptions, 'assumptions')]) expect(named.some((n) => d === n || d.startsWith(`${n}.`))).toBe(true);
      expect(f.patch.length).toBeGreaterThan(0);
      for (const op of f.patch) expect(op.value).not.toEqual(op.prev);
    }
  });
  it('never names a fund, stock or insurer', () => {
    const text = fixes.map((f) => `${f.title} ${f.why}`).join(' ');
    expect(text).not.toMatch(/\b(fund house|scheme name|Ltd|Limited|Bluechip|Nifty 50 Index Fund)\b/i);
  });
  it('proposes nothing for a plan with nothing to fix', () => {
    const q = blankProfile(2026);
    q.income.mode = 'takeHome';
    q.income.monthlyTakeHome = 80_000;
    q.cashflow.essential[0].amount = 20_000;
    q.position.emergencyFund = 500_000;
    expect(candidateFixes(q, a).filter((f) => f.id !== 'creep')).toEqual([]);
  });
});

describe('combineFixes', () => {
  it('is never worse than the baseline on unpaid goals', () => {
    const variants: FinancialProfile[] = [p];
    const tight = structuredClone(p);
    tight.goals[2].cost = 1_200_000; // a dearer car
    variants.push(tight);
    const forced = structuredClone(p);
    forced.income.salary = { ...forced.income.salary, regime: 'old' };
    variants.push(forced);
    for (const v of variants) {
      const fs = suggestFixes(v, a, 150);
      const c = combineFixes(v, a, fs, 150);
      expect(c.after.unpaidGoals).toBeLessThanOrEqual(c.before.unpaidGoals);
      expect(c.applied.length + c.dropped.length).toBeGreaterThanOrEqual(fs.length);
    }
  });
  it('a forced regime gets the “cheaper regime each year” fix', () => {
    const forced = structuredClone(p);
    forced.income.salary = { ...forced.income.salary, regime: 'old' };
    expect(candidateFixes(forced, a).map((f) => f.id)).toContain('auto-regime');
  });
  it('regular plans get the switch-to-direct fix', () => {
    const reg = structuredClone(p);
    reg.preferences.regularPlanShare = 1;
    const f = candidateFixes(reg, a).find((x) => x.id === 'direct-plans')!;
    expect(f.why).toMatch(/today’s rupees/);
  });
  it('the combined result matches applying the kept fixes in order', () => {
    const byKey = new Map(fixes.map((f) => [f.key, f] as [string, Fix]));
    const replay = applyPatch(p, a, combined.applied.flatMap((k) => byKey.get(k)!.patch));
    expect(evaluatePlan(replay.profile, replay.assumptions)).toEqual(combined.after);
  });
});

describe('next steps and Fix my plan agree', () => {
  it('Overview’s next steps include every proposed fix', () => {
    const plan = computePlan(p, a);
    const keys = plan.insights.map((i) => i.id);
    for (const f of candidateFixes(p, a)) expect(keys).toContain(f.key);
    // The insights the fixes replace aren’t listed twice.
    expect(keys).not.toContain('costly-debt');
    expect(keys).not.toContain('emergency');
  });
});

describe('landing page snapshot of Riya’s before and after', () => {
  it('src/content/demoFix.json matches the engine (UPDATE_DEMO_SNAPSHOT=1 rewrites it)', () => {
    const round = (m: typeof combined.before) => ({ fiAge: m.fiAge, fiSuccess: Math.round(m.fiSuccess * 100) / 100, unpaidGoals: m.unpaidGoals, netWorthReal: Math.round(m.netWorthReal / 1000) * 1000, health: Math.round(m.health) });
    const byKey = new Map(fixes.map((f) => [f.key, f]));
    const snap = {
      planStartYear: p.planStartYear,
      endYear: p.planStartYear + a.horizonYears,
      targetAge: p.about.fiAge,
      paths: 300,
      before: round(combined.before),
      after: round(combined.after),
      fixes: combined.applied.map((k) => ({ key: k, title: byKey.get(k)!.title, before: round(byKey.get(k)!.impact.before), after: round(byKey.get(k)!.impact.after) })),
    };
    const path = 'src/content/demoFix.json';
    if (process.env.UPDATE_DEMO_SNAPSHOT) writeFileSync(path, `${JSON.stringify(snap, null, 2)}\n`);
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(snap);
  });
});
