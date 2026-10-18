import type { Assumptions, FinancialProfile } from '@/types/profile';
import type { SimOverrides } from '@/types/sim';
import { portfolioVolatility, weightedReturn } from './portfolio';
import { simulate } from './simulate';

/** Deterministic PRNG (mulberry32) so results are reproducible for a given seed. */
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number) {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface MonteCarloResult {
  paths: number;
  meanReturn: number;
  volatility: number;
  percentiles: { year: number; p10: number; p50: number; p90: number }[]; // net worth on 1 January of `year`, nominal
  finalP10: number;
  finalP50: number;
  finalP90: number;
  goalProbabilities: { goalId: string; name: string; year: number; probability: number }[]; // paid from savings, without a loan
  fiProbability: number; // reaching FI within the horizon
}

const pct = (sorted: number[], q: number) => {
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

/**
 * Annual portfolio returns are drawn independently from a lognormal distribution whose
 * arithmetic mean and standard deviation match the assumed portfolio return and volatility.
 * Each path runs through the same `simulate` engine.
 */
export function monteCarlo(p: FinancialProfile, a: Assumptions, opts: { paths?: number; seed?: number; overrides?: SimOverrides } = {}): MonteCarloResult {
  const paths = Math.max(1000, opts.paths ?? 1000);
  const rand = mulberry32(opts.seed ?? 20250101);
  const years = opts.overrides?.years ?? a.horizonYears;
  const mean = weightedReturn(p.preferences.targetAllocation, a.returns) + (opts.overrides?.returnShift ?? 0);
  const vol = portfolioVolatility(p.preferences.targetAllocation, a.volatility);
  const m = 1 + mean;
  const sigmaLn = Math.sqrt(Math.log(1 + (vol * vol) / (m * m)));
  const muLn = Math.log(m) - (sigmaLn * sigmaLn) / 2;

  const byYear: number[][] = Array.from({ length: years }, () => []);
  const goalHits = new Map<string, { name: string; year: number; hits: number }>();
  let fiHits = 0;
  for (let k = 0; k < paths; k++) {
    const yearReturns = Array.from({ length: years }, () => Math.exp(muLn + sigmaLn * normal(rand)) - 1);
    const r = simulate(p, a, { ...opts.overrides, years, yearReturns });
    r.rows.forEach((row, i) => {
      byYear[i].push(row.netWorth);
      for (const g of row.goals) {
        const e = goalHits.get(g.goalId) ?? { name: g.name, year: g.year, hits: 0 };
        if (g.status === 'funded') e.hits++;
        goalHits.set(g.goalId, e);
      }
    });
    if (r.fiYear !== null) fiHits++;
  }
  const percentiles = byYear.map((vals, i) => {
    const s = [...vals].sort((x, y) => x - y);
    // Row i holds 31 December balances, i.e. the point on 1 January of the following year.
    return { year: p.planStartYear + i + 1, p10: pct(s, 0.1), p50: pct(s, 0.5), p90: pct(s, 0.9) };
  });
  const last = percentiles[percentiles.length - 1];
  return {
    paths,
    meanReturn: mean,
    volatility: vol,
    percentiles,
    finalP10: last.p10,
    finalP50: last.p50,
    finalP90: last.p90,
    goalProbabilities: [...goalHits.entries()].map(([goalId, v]) => ({ goalId, name: v.name, year: v.year, probability: v.hits / paths })),
    fiProbability: fiHits / paths,
  };
}
