import type { Assumptions, FinancialProfile } from '@/types/profile';
import type { SimOverrides, SimResult } from '@/types/sim';
import { simulate } from './simulate';

export interface FiAnalysis {
  targetAge: number;
  targetYear: number;
  yearsToTarget: number;
  targetCorpus: number; // nominal, in the target year
  targetCorpusReal: number; // today's rupees
  projectedCorpus: number; // financial assets in the target year
  gap: number;
  progress: number; // projected / target, capped at 1
  fiYear: number | null; // first year financial assets cover the target
  fiAge: number | null;
  extraMonthlyNeeded: number | null; // additional monthly investment (step-up applied) to close the gap; null = not reachable
  sim: SimResult;
}

/** Simulation length needed to reach the FI age, at least the plan horizon, capped at 50 years. */
export function fiYears(p: FinancialProfile, a: Assumptions): number {
  return Math.min(50, Math.max(a.horizonYears, p.about.fiAge - p.about.age));
}

/**
 * FI target = annual living expenses in the target year ÷ safe-withdrawal-rate assumption.
 * Financial assets = investments + retirement accounts + cash (the home is excluded).
 */
export function fiAnalysis(p: FinancialProfile, a: Assumptions, overrides: SimOverrides = {}): FiAnalysis {
  const yearsToTarget = Math.max(1, Math.min(50, p.about.fiAge - p.about.age));
  const years = Math.max(fiYears(p, a), yearsToTarget);
  const sim = simulate(p, a, { ...overrides, years });
  const row = sim.rows[yearsToTarget - 1];
  const infl = overrides.inflation ?? a.inflation;
  const targetCorpus = row.fiTarget;
  const projectedCorpus = row.financialAssets;
  const gap = Math.max(0, targetCorpus - projectedCorpus);

  let extraMonthlyNeeded: number | null = 0;
  if (gap > 0) {
    const at = (extra: number) => {
      const r = simulate(p, a, { ...overrides, years: yearsToTarget, extraMonthlyInvestment: (overrides.extraMonthlyInvestment ?? 0) + extra }).rows[yearsToTarget - 1];
      return r.financialAssets - r.fiTarget;
    };
    let hi = Math.max(10000, p.income.monthlyTakeHome);
    let tries = 0;
    while (at(hi) < 0 && tries < 12) {
      hi *= 2;
      tries++;
    }
    if (at(hi) < 0) extraMonthlyNeeded = null;
    else {
      let lo = 0;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (at(mid) >= 0) hi = mid;
        else lo = mid;
      }
      extraMonthlyNeeded = hi;
    }
  }

  const fiRow = sim.rows.find((r) => r.fiReached);
  return {
    targetAge: p.about.fiAge,
    targetYear: row.year,
    yearsToTarget,
    targetCorpus,
    targetCorpusReal: targetCorpus / Math.pow(1 + infl, yearsToTarget),
    projectedCorpus,
    gap,
    progress: targetCorpus > 0 ? Math.min(1, projectedCorpus / targetCorpus) : 1,
    fiYear: fiRow ? fiRow.year : null,
    fiAge: fiRow ? fiRow.age : null,
    extraMonthlyNeeded,
    sim,
  };
}
