import type { AssetClass, AssetMap } from '@/types/profile';
import { ASSET_CLASSES } from '@/types/profile';
import { REGULAR_PLAN_DRAG } from './assumptions';
import { planType } from '@/services/data/amfiParse';

/*
 * Facts about mutual funds a person already holds: returns from NAV history, direct or regular plan, and which
 * asset class each one belongs to. Nothing here ranks funds or suggests one; it describes what is held.
 */

export { planType };

export interface HeldFund {
  code: number; // AMFI scheme code
  name: string;
  category: string; // AMFI category
  plan: 'Direct' | 'Regular' | null;
  amount: number; // current value, ₹
}

/**
 * Compound annual growth from NAV history over `years`, measured from the last point back to the nearest point on
 * or before that date. Null when the history is shorter than the period.
 */
export function cagr(points: { date: string; nav: number }[], years: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const target = Date.parse(last.date) - years * 365.25 * 864e5;
  let first: { date: string; nav: number } | null = null;
  for (const p of points) {
    if (Date.parse(p.date) <= target) first = p;
    else break;
  }
  if (!first || first.nav <= 0) return null;
  const span = (Date.parse(last.date) - Date.parse(first.date)) / (365.25 * 864e5);
  // Allow a few days' slack for weekends and holidays, nothing more.
  if (span < years - 0.03) return null;
  return Math.pow(last.nav / first.nav, 1 / span) - 1;
}

/** Change over the last `days` calendar days (the nearest point on or before), as a fraction. */
export function changeOver(points: { date: string; nav: number }[], days: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const target = Date.parse(last.date) - days * 864e5;
  let ref: { date: string; nav: number } | null = null;
  for (const p of points) {
    if (Date.parse(p.date) <= target) ref = p;
    else break;
  }
  return ref && ref.nav > 0 ? last.nav / ref.nav - 1 : null;
}

/** Change from the previous data point (the last trading day), as a fraction. */
export function lastChange(points: { date: string; nav: number }[]): number | null {
  if (points.length < 2) return null;
  const [a, b] = points.slice(-2);
  return a.nav > 0 ? b.nav / a.nav - 1 : null;
}

const has = (s: string, re: RegExp) => re.test(s);

/**
 * Which of the planner's asset classes a fund belongs to, from its AMFI category and, for index funds, ETFs and
 * fund-of-funds, its name. Hybrid funds go to their dominant side.
 */
export function assetClassFor(category: string, name: string): AssetClass {
  const c = category.toLowerCase();
  const n = name.toLowerCase();
  const overseas = has(n, /\b(us|u\.s\.|nasdaq|s&p 500|global|international|world|overseas|emerging|china|japan|europe|taiwan|hang seng)\b/);
  if (has(n, /\bgold\b/) || has(c, /gold/)) return 'gold';
  if (has(n, /\bsilver\b/)) return 'other';
  if (has(c, /fof overseas|international/) || overseas) return 'intlEquity';
  if (has(c, /liquid|overnight|money market/)) return 'cash';
  if (has(c, /^debt|debt scheme|gilt|bond|income/)) return 'debt';
  if (has(c, /arbitrage|conservative hybrid/)) return 'debt';
  if (has(c, /aggressive hybrid|elss|equity scheme/)) return 'indianEquity';
  if (has(c, /balanced advantage|dynamic asset|multi asset|equity savings/)) return 'other';
  if (has(c, /index|etf|fof/)) {
    if (has(n, /\b(gilt|g-sec|gsec|sdl|bond|crisil|psu|debt|treasury|t-bill|liquid)\b/)) return 'debt';
    if (has(n, /\b(nifty|sensex|bse|midcap|smallcap|largecap|next 50|equity)\b/)) return 'indianEquity';
    return 'other';
  }
  return 'other';
}

/** Share of the money in these funds that is in regular plans. */
export function regularShareOf(funds: HeldFund[]): number {
  const total = funds.reduce((s, f) => s + Math.max(0, f.amount), 0);
  if (total <= 0) return 0;
  return funds.filter((f) => f.plan === 'Regular').reduce((s, f) => s + Math.max(0, f.amount), 0) / total;
}

/**
 * Holdings by asset class with the held funds filled in: each class that has a fund becomes the sum of those
 * funds; classes with no fund keep what was entered.
 */
export function holdingsWithFunds(holdings: AssetMap, funds: HeldFund[]): AssetMap {
  if (!funds.length) return holdings;
  const out = { ...holdings };
  const sums = new Map<AssetClass, number>();
  for (const f of funds) {
    const k = assetClassFor(f.category, f.name);
    sums.set(k, (sums.get(k) ?? 0) + Math.max(0, f.amount));
  }
  for (const k of ASSET_CLASSES) if (sums.has(k)) out[k] = sums.get(k)!;
  return out;
}

/**
 * Approximate cost of holding a regular plan instead of the direct plan of the same scheme for `years`, if the
 * amount stays invested at `annualReturn`: the difference compounding makes to the extra yearly cost.
 */
export function regularCost(amount: number, annualReturn: number, years: number, drag = REGULAR_PLAN_DRAG.value.equity): number {
  if (amount <= 0 || years <= 0) return 0;
  return amount * (Math.pow(1 + annualReturn, years) - Math.pow(1 + annualReturn - drag, years));
}

/** The regular-plan drag that applies to a fund's asset class (equity or debt rate; none for gold, cash and govt). */
export function dragFor(assetClass: AssetClass, drag = REGULAR_PLAN_DRAG.value): number {
  return assetClass === 'debt' ? drag.debt : assetClass === 'indianEquity' || assetClass === 'intlEquity' || assetClass === 'other' ? drag.equity : 0;
}
