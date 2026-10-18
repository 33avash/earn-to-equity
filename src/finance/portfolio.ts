import type { AssetClass, AssetMap, RiskProfile } from '@/types/profile';
import { ASSET_CLASSES } from '@/types/profile';

export const ASSET_LABELS: Record<AssetClass, string> = {
  indianEquity: 'Indian equities',
  intlEquity: 'International equities',
  debt: 'Debt & fixed income',
  govtSchemes: 'Government-backed savings',
  gold: 'Gold',
  cash: 'Cash & liquid funds',
  other: 'Other investments',
};

export const ASSET_SHORT: Record<AssetClass, string> = {
  indianEquity: 'Indian eq.',
  intlEquity: 'Intl eq.',
  debt: 'Debt',
  govtSchemes: 'Govt schemes',
  gold: 'Gold',
  cash: 'Cash',
  other: 'Other',
};

/** Illustrative long-run assumptions — editable in Settings and the Portfolio Builder. */
export const DEFAULT_RETURNS: AssetMap = {
  indianEquity: 0.11,
  intlEquity: 0.09,
  debt: 0.07,
  govtSchemes: 0.071,
  gold: 0.075,
  cash: 0.035,
  other: 0.08,
};

export const DEFAULT_VOLATILITY: AssetMap = {
  indianEquity: 0.18,
  intlEquity: 0.16,
  debt: 0.04,
  govtSchemes: 0.01,
  gold: 0.15,
  cash: 0.005,
  other: 0.1,
};

/** Educational example allocations — not personalised recommendations. */
export const PRESETS: Record<RiskProfile, { label: string; description: string; weights: AssetMap }> = {
  conservative: {
    label: 'Conservative',
    description: 'Prioritises stability. Most of the portfolio sits in debt and government-backed instruments.',
    weights: { indianEquity: 0.2, intlEquity: 0.05, debt: 0.45, govtSchemes: 0.15, gold: 0.1, cash: 0.05, other: 0 },
  },
  balanced: {
    label: 'Balanced',
    description: 'Splits growth and stability roughly evenly. Moderate swings in value.',
    weights: { indianEquity: 0.4, intlEquity: 0.1, debt: 0.3, govtSchemes: 0.1, gold: 0.07, cash: 0.03, other: 0 },
  },
  growth: {
    label: 'Growth',
    description: 'Equity-led for long horizons. Expect meaningful drawdowns along the way.',
    weights: { indianEquity: 0.55, intlEquity: 0.15, debt: 0.18, govtSchemes: 0.05, gold: 0.05, cash: 0.02, other: 0 },
  },
  aggressive: {
    label: 'Aggressive',
    description: 'Almost entirely equities. Suits only very long horizons and high tolerance for losses.',
    weights: { indianEquity: 0.65, intlEquity: 0.2, debt: 0.08, govtSchemes: 0.02, gold: 0.05, cash: 0, other: 0 },
  },
};

export const emptyAssetMap = (): AssetMap =>
  Object.fromEntries(ASSET_CLASSES.map((c) => [c, 0])) as AssetMap;

export function weightSum(w: AssetMap): number {
  return ASSET_CLASSES.reduce((a, c) => a + (w[c] ?? 0), 0);
}

/** True when weights sum to 100% (to 0.1 percentage point) and none is negative. */
export function isValidAllocation(w: AssetMap): boolean {
  return ASSET_CLASSES.every((c) => (w[c] ?? 0) >= 0) && Math.abs(weightSum(w) - 1) < 0.001;
}

export function weightedReturn(w: AssetMap, returns: AssetMap): number {
  const total = weightSum(w);
  if (total <= 0) return 0;
  return ASSET_CLASSES.reduce((a, c) => a + (w[c] / total) * returns[c], 0);
}

/**
 * Simplified portfolio volatility: constant 0.3 correlation between every pair of asset classes.
 * Good enough to rank allocations; not a forecast of risk.
 */
export function portfolioVolatility(w: AssetMap, vol: AssetMap, correlation = 0.3): number {
  const total = weightSum(w) || 1;
  let variance = 0;
  for (const a of ASSET_CLASSES) {
    for (const b of ASSET_CLASSES) {
      const rho = a === b ? 1 : correlation;
      variance += (w[a] / total) * (w[b] / total) * vol[a] * vol[b] * rho;
    }
  }
  return Math.sqrt(variance);
}

export function currentWeights(holdings: AssetMap): AssetMap {
  const total = ASSET_CLASSES.reduce((a, c) => a + Math.max(0, holdings[c]), 0);
  const out = emptyAssetMap();
  if (total <= 0) return out;
  for (const c of ASSET_CLASSES) out[c] = Math.max(0, holdings[c]) / total;
  return out;
}

export interface DriftRow {
  asset: AssetClass;
  current: number; // weight
  target: number;
  drift: number; // current − target, in weight units
  currentValue: number;
  targetValue: number;
  trade: number; // + buy / − sell to rebalance
  monthlyContribution: number;
}

export function allocationDrift(holdings: AssetMap, target: AssetMap, monthlyInvestment: number): DriftRow[] {
  const total = ASSET_CLASSES.reduce((a, c) => a + Math.max(0, holdings[c]), 0);
  const cw = currentWeights(holdings);
  return ASSET_CLASSES.map((asset) => ({
    asset,
    current: cw[asset],
    target: target[asset],
    drift: cw[asset] - target[asset],
    currentValue: Math.max(0, holdings[asset]),
    targetValue: total * target[asset],
    trade: total * target[asset] - Math.max(0, holdings[asset]),
    monthlyContribution: monthlyInvestment * target[asset],
  }));
}

/** Largest absolute drift across asset classes (weight units). */
export function maxDrift(rows: DriftRow[]): number {
  return rows.reduce((a, r) => Math.max(a, Math.abs(r.drift)), 0);
}

export function riskBand(vol: number): { label: string; note: string } {
  if (vol < 0.06) return { label: 'Low', note: 'Year-to-year swings are usually small.' };
  if (vol < 0.1) return { label: 'Moderate', note: 'Expect occasional negative years.' };
  if (vol < 0.14) return { label: 'Elevated', note: 'Declines of 15–25% in a bad year are plausible.' };
  return { label: 'High', note: 'Declines of 30% or more in a bad year are plausible.' };
}

/**
 * Asset classes that can't be sold on demand. Government-backed savings here means PPF, EPF,
 * NPS Tier 1 and similar schemes, which are locked in for years.
 */
export const LOCKED_CLASSES: ReadonlySet<AssetClass> = new Set<AssetClass>(['govtSchemes']);

export type RebalanceAction = 'add' | 'locked' | 'pause' | 'none';

export interface RebalanceRow extends DriftRow {
  locked: boolean;
  /** Part of the class that can't be sold: the whole class if locked, or ELSS units still in their 3-year lock-in. */
  lockedValue: number;
  action: RebalanceAction;
  /** Share of each month's new investment to direct here until the mix is back on target. */
  newMoneyMonthly: number;
}

export interface RebalancePlan {
  rows: RebalanceRow[];
  /** Months of new investment needed to restore the target mix without selling; null if never (no SIP). */
  monthsToTarget: number | null;
}

/**
 * Rebalancing with new money only. Nothing is ever sold: under-weight classes receive the monthly
 * investment in proportion to how far below target they are; over-weight classes receive nothing
 * until the rest catch up. Locked classes and ELSS units under 3 years are flagged so the interface
 * never suggests selling them.
 */
export function rebalancePlan(holdings: AssetMap, target: AssetMap, monthlyInvestment: number, elssLocked = 0): RebalancePlan {
  const drift = allocationDrift(holdings, target, monthlyInvestment);
  const total = drift.reduce((s, r) => s + r.currentValue, 0);
  const m = Math.max(0, monthlyInvestment);
  const neededAfter = (months: number) => drift.map((r) => Math.max(0, r.target * (total + months * m) - r.currentValue));
  let monthsToTarget: number | null = null;
  if (drift.every((r) => r.currentValue >= r.target * total - 0.5)) monthsToTarget = 0;
  else if (m > 0) {
    for (let n = 1; n <= 600; n++) {
      if (neededAfter(n).reduce((s, x) => s + x, 0) <= n * m + 0.5) {
        monthsToTarget = n;
        break;
      }
    }
  }
  const horizon = monthsToTarget && monthsToTarget > 0 ? monthsToTarget : 1;
  // New money goes only to classes below target today; over-weight classes wait.
  const needed = neededAfter(horizon).map((x, i) => (drift[i].trade > 0.5 ? x : 0));
  const neededTotal = needed.reduce((s, x) => s + x, 0);
  const rows = drift.map((r, i): RebalanceRow => {
    const locked = LOCKED_CLASSES.has(r.asset);
    const lockedValue = locked ? r.currentValue : r.asset === 'indianEquity' ? Math.min(r.currentValue, Math.max(0, elssLocked)) : 0;
    const under = r.trade > 0.5;
    const newMoneyMonthly = monthsToTarget === 0 ? m * r.target : neededTotal > 0 ? (m * needed[i]) / neededTotal : 0;
    const action: RebalanceAction = under ? 'add' : r.trade < -0.5 ? (locked ? 'locked' : 'pause') : 'none';
    return { ...r, locked, lockedValue, action, newMoneyMonthly };
  });
  return { rows, monthsToTarget };
}
