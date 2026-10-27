import type { Assumptions, FinancialProfile } from '@/types/profile';
import { monteCarlo } from './montecarlo';

/** Paths for the quick ranges on Overview and the simulator band. */
export const RANGE_PATHS = 300;

export interface OutcomeRanges {
  paths: number;
  /** Net worth in today's rupees at the end of the horizon: 10th, 50th and 90th percentile. */
  netWorthReal: { p10: number; p50: number; p90: number };
  /** Yearly band in future rupees, for the chart (1 January of each year). */
  band: { year: number; p10: number; p50: number; p90: number }[];
  /** Chance of reaching FI by the target age. */
  fiByTarget: number;
  targetAge: number;
}

/**
 * Outcome ranges from a seeded Monte Carlo: the same plan always gives the same range. The band runs over the
 * plan horizon; the FI chance over the years to the FI target age.
 */
export function outcomeRanges(p: FinancialProfile, a: Assumptions, paths = RANGE_PATHS): OutcomeRanges {
  const horizon = monteCarlo(p, a, { paths });
  const yearsToFi = Math.max(1, Math.min(50, p.about.fiAge - p.about.age));
  const fi = yearsToFi === a.horizonYears ? horizon : monteCarlo(p, a, { paths, overrides: { years: yearsToFi } });
  const deflator = Math.pow(1 + a.inflation, a.horizonYears);
  return {
    paths: horizon.paths,
    netWorthReal: { p10: horizon.finalP10 / deflator, p50: horizon.finalP50 / deflator, p90: horizon.finalP90 / deflator },
    band: horizon.percentiles,
    fiByTarget: fi.fiProbability,
    targetAge: p.about.fiAge,
  };
}

/** The yearly band keyed by point year, in future rupees or (for "real") today's rupees. */
export function bandByYear(r: OutcomeRanges, real: boolean, startYear: number, inflation: number): Map<number, { p10: number; p90: number }> {
  return new Map(
    r.band.map((b) => {
      const k = real ? Math.pow(1 + inflation, b.year - startYear) : 1;
      return [b.year, { p10: b.p10 / k, p90: b.p90 / k }];
    }),
  );
}

/** One line under every range. */
export const RANGE_NOTE = 'Range of outcomes across 300 simulated market paths. Not a forecast.';
