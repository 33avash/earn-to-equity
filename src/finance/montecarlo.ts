import type { Assumptions, FinancialProfile } from '@/types/profile';
import type { SimOverrides } from '@/types/sim';
import { netReturns, portfolioVolatility, weightedReturn } from './portfolio';
import nifty from './data/nifty50-tri.json';
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

/**
 *  - 'student-t': fat-tailed returns (Student-t, ν = 5) scaled to the assumed mean and volatility.
 *  - 'historical': the Indian-equity share draws whole calendar years, with replacement, from Nifty 50 TRI
 *    returns 2005–2025; the rest of the portfolio uses the Student-t model on its own mean and volatility.
 */
export type ReturnModel = 'student-t' | 'historical';

export const NIFTY_TRI = { ...nifty, series: Object.values(nifty.returns) as number[] };

export const T_DEGREES_OF_FREEDOM = 5;

/** Student-t draw with ν degrees of freedom, scaled to unit variance. */
export function studentT(rand: () => number, nu = T_DEGREES_OF_FREEDOM): number {
  let chi2 = 0;
  for (let i = 0; i < nu; i++) chi2 += normal(rand) ** 2;
  const t = normal(rand) / Math.sqrt(chi2 / nu);
  return t * Math.sqrt((nu - 2) / nu);
}

export interface MonteCarloResult {
  model: ReturnModel;
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
 * Annual portfolio returns are drawn independently each year (see ReturnModel), after fund costs.
 * Each path runs through the same `simulate` engine.
 */
export function monteCarlo(p: FinancialProfile, a: Assumptions, opts: { paths?: number; seed?: number; overrides?: SimOverrides; model?: ReturnModel } = {}): MonteCarloResult {
  const model = opts.model ?? 'student-t';
  const paths = Math.max(1000, opts.paths ?? 1000);
  const rand = mulberry32(opts.seed ?? 20250101);
  const years = opts.overrides?.years ?? a.horizonYears;
  const alloc = p.preferences.targetAllocation;
  const net = netReturns(a);
  const shift = opts.overrides?.returnShift ?? 0;
  const mean = weightedReturn(alloc, net) + shift;
  const vol = portfolioVolatility(alloc, a.volatility);
  // Historical mode splits Indian equity from the rest.
  const total = Object.values(alloc).reduce((x, w) => x + w, 0) || 1;
  const wEq = alloc.indianEquity / total;
  const rest = { ...alloc, indianEquity: 0 };
  const restMean = wEq < 1 ? weightedReturn(rest, net) + shift : 0;
  const restVol = wEq < 1 ? portfolioVolatility(rest, a.volatility) : 0;
  const equityCost = a.expenseRatios?.indianEquity ?? 0;
  const draw = () => {
    if (model === 'historical') {
      const hist = NIFTY_TRI.series[Math.floor(rand() * NIFTY_TRI.series.length)] - equityCost;
      return wEq * hist + (1 - wEq) * (restMean + restVol * studentT(rand));
    }
    return mean + vol * studentT(rand);
  };

  const byYear: number[][] = Array.from({ length: years }, () => []);
  const goalHits = new Map<string, { name: string; year: number; hits: number }>();
  let fiHits = 0;
  for (let k = 0; k < paths; k++) {
    const yearReturns = Array.from({ length: years }, () => Math.max(-0.95, draw()));
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
    model,
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
