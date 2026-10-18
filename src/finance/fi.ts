import type { Assumptions, FinancialProfile } from '@/types/profile';
import type { SimOverrides, SimResult } from '@/types/sim';
import { currentTakeHome } from './income';
import { simulate } from './simulate';

export interface FiAnalysis {
  targetAge: number;
  targetYear: number; // the year you turn the target age (balances as of 1 January)
  yearsToTarget: number;
  targetCorpus: number; // nominal, in the target year
  targetCorpusReal: number; // today's rupees
  projectedCorpus: number; // financial assets in the target year, after tax on selling investments
  projectedCorpusPreTax: number;
  epfLocked: number; // EPF inside the corpus, which can't be withdrawn before 58
  healthcare: number; // post-FI healthcare line in the target year (annual)
  gap: number;
  progress: number; // projected / target, capped at 1
  fiYear: number | null; // first 1 January on which financial assets cover the target
  fiAge: number | null; // age in that year (same convention as every other label)
  extraMonthlyNeeded: number | null; // additional monthly investment (step-up applied) to close the gap; null = not reachable
  sim: SimResult;
}

/** Simulation length needed to reach the FI age, at least the plan horizon, capped at 50 years. */
export function fiYears(p: FinancialProfile, a: Assumptions): number {
  return Math.min(50, Math.max(a.horizonYears, p.about.fiAge - p.about.age));
}

/**
 * FI target = (living expenses + post-FI healthcare) in the target year ÷ safe-withdrawal-rate assumption,
 * plus any debt still outstanding (it must be cleared, since EMIs are not living expenses).
 * Financial assets = investments (after the tax due if sold) + retirement accounts incl. EPF + cash.
 * The home is excluded. EPF counts but is flagged: it can't be withdrawn before 58.
 */
export function fiAnalysis(p: FinancialProfile, a: Assumptions, overrides: SimOverrides = {}): FiAnalysis {
  const yearsToTarget = Math.max(1, Math.min(50, p.about.fiAge - p.about.age));
  const years = Math.max(fiYears(p, a), yearsToTarget);
  const sim = simulate(p, a, { ...overrides, years });
  const row = sim.rows[yearsToTarget - 1];
  const infl = overrides.inflation ?? a.inflation;
  const targetCorpus = row.fiTarget;
  const projectedCorpus = row.financialAssetsAfterTax;
  const gap = Math.max(0, targetCorpus - projectedCorpus);

  let extraMonthlyNeeded: number | null = 0;
  if (gap > 0) {
    const at = (extra: number) => {
      const r = simulate(p, a, { ...overrides, years: yearsToTarget, extraMonthlyInvestment: (overrides.extraMonthlyInvestment ?? 0) + extra }).rows[yearsToTarget - 1];
      return r.financialAssetsAfterTax - r.fiTarget;
    };
    let hi = Math.max(10000, currentTakeHome(p));
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

  return {
    targetAge: p.about.fiAge,
    targetYear: row.year + 1,
    yearsToTarget,
    targetCorpus,
    targetCorpusReal: targetCorpus / Math.pow(1 + infl, yearsToTarget),
    projectedCorpus,
    projectedCorpusPreTax: row.financialAssets,
    epfLocked: p.about.fiAge < 58 ? row.epf : 0,
    healthcare: row.fiHealthcare,
    gap,
    progress: targetCorpus > 0 ? Math.min(1, projectedCorpus / targetCorpus) : 1,
    fiYear: sim.fiYear,
    fiAge: sim.fiAge,
    extraMonthlyNeeded,
    sim,
  };
}
