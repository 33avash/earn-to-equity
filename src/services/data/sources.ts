import { fetchCached, type DataResult } from './http';
import type { AmfiScheme } from './amfiParse';
import { parseMarketsResponse, type MarketQuote } from './yahoo';

/*
 * Clients for the free public sources. See docs/data-sources.md for what was checked (cost, keys, CORS, terms).
 *  - Yahoo Finance via our Worker or dev server: live Nifty 50, Sensex, gold and USD/INR (no CORS on Yahoo).
 *  - MFapi.in: fund search and NAV history (data from AMFI; unofficial).
 *  - AMFI NAVAll.txt via our Worker or dev server: official NAV, category and plan (no CORS on AMFI's file).
 *  - Frankfurter, ECB provider: USD→INR reference rate (published daily by the ECB, not a live market rate).
 *  - World Bank Indicators: India's annual CPI inflation.
 */

export const SOURCES = {
  yahoo: { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/' },
  mfapi: { name: 'MFapi.in, sourced from AMFI', url: 'https://www.mfapi.in/' },
  amfi: { name: 'AMFI daily NAV file', url: 'https://www.amfiindia.com/net-asset-value' },
  ecb: { name: 'ECB reference rate via Frankfurter', url: 'https://frankfurter.dev/' },
  worldBank: { name: 'World Bank, World Development Indicators (FP.CPI.TOTL.ZG)', url: 'https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=IN' },
};

/** AMFI scheme codes used as proxies on the markets strip. Shown as data sources, never as recommendations. */
export const PROXIES = {
  nifty50: { code: 120716, label: 'Nifty 50 (index-fund NAV proxy)' },
  gold: { code: 119132, label: 'Gold (gold ETF fund-of-fund NAV proxy)' },
};

const HOUR = 3600_000;

/* ---------- MFapi ---------- */

export interface NavPoint {
  date: string; // ISO yyyy-mm-dd
  nav: number;
}

export interface FundHistory {
  code: number;
  name: string;
  fundHouse: string;
  category: string; // AMFI category, e.g. "Equity Scheme - Large Cap Fund"
  points: NavPoint[]; // oldest first
}

const dmyToIso = (s: string) => s.split('-').reverse().join('-');

interface MfapiHistory {
  meta: { scheme_code: number; scheme_name: string; fund_house: string; scheme_category: string };
  data: { date: string; nav: string }[];
}

export function parseMfapiHistory(raw: unknown): FundHistory {
  const r = raw as MfapiHistory;
  if (!r?.meta || !Array.isArray(r.data)) throw new Error('mfapi-shape');
  const points = r.data
    .map((p) => ({ date: dmyToIso(p.date), nav: Number(p.nav) }))
    .filter((p) => Number.isFinite(p.nav) && p.nav > 0 && /^\d{4}-\d{2}-\d{2}$/.test(p.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length) throw new Error('mfapi-empty');
  return { code: Number(r.meta.scheme_code), name: r.meta.scheme_name, fundHouse: r.meta.fund_house, category: r.meta.scheme_category, points };
}

const proxySnapshots: Record<number, () => Promise<{ data: FundHistory; takenAt: string }>> = {
  [PROXIES.nifty50.code]: () => import('./snapshots/nifty-proxy.json').then((m) => ({ data: parseMfapiHistory(m.default), takenAt: m.default.takenAt })),
  [PROXIES.gold.code]: () => import('./snapshots/gold-proxy.json').then((m) => ({ data: parseMfapiHistory(m.default), takenAt: m.default.takenAt })),
};

/**
 * NAV history for one scheme code, cached 12 hours. Only the code is sent. MFapi sometimes serves its cached full
 * history without a CORS header, so a failed request is retried as a date-range request (a separate response on
 * their side) before falling back to a snapshot.
 */
export async function fundHistory(code: number, fetchImpl?: typeof fetch, now = Date.now()): Promise<DataResult<FundHistory>> {
  const base = { key: `mfapi:${code}`, ttlMs: 12 * HOUR, parse: parseMfapiHistory, fetchImpl };
  try {
    return await fetchCached({ ...base, url: `https://api.mfapi.in/mf/${code}`, timeoutMs: 10_000 });
  } catch {
    const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    const range = `startDate=${iso(now - 6.2 * 365 * 864e5)}&endDate=${iso(now)}`;
    return fetchCached({ ...base, url: `https://api.mfapi.in/mf/${code}?${range}`, timeoutMs: 20_000, snapshot: proxySnapshots[code] });
  }
}

/** Today's NAV for one scheme code: a small, quick request, cached 1 hour (NAVs are published once a day). */
export function latestNav(code: number, fetchImpl?: typeof fetch): Promise<DataResult<FundHistory>> {
  return fetchCached({ key: `mfapi-latest:${code}`, url: `https://api.mfapi.in/mf/${code}/latest`, ttlMs: HOUR, timeoutMs: 8000, parse: parseMfapiHistory, fetchImpl });
}

/** History with the latest NAV added when it is newer than the history's last point. */
export function withLatest(points: NavPoint[], latest: NavPoint | undefined): NavPoint[] {
  if (!latest) return points;
  const last = points[points.length - 1];
  return !last || latest.date > last.date ? [...points, latest] : points;
}

export interface FundHit {
  code: number;
  name: string;
}

export function parseMfapiSearch(raw: unknown): FundHit[] {
  if (!Array.isArray(raw)) throw new Error('mfapi-shape');
  return raw.map((r: { schemeCode: number; schemeName: string }) => ({ code: Number(r.schemeCode), name: String(r.schemeName) })).filter((r) => r.code > 0 && r.name);
}

/**
 * Funds whose name matches what was typed, in the order MFapi returns them (never ranked by returns).
 * Only the typed text is sent.
 */
export async function searchFunds(q: string, fetchImpl?: typeof fetch): Promise<FundHit[]> {
  const text = q.trim();
  if (text.length < 3) return [];
  const r = await fetchCached({ key: `mfapi-search:${text.toLowerCase()}`, url: `https://api.mfapi.in/mf/search?q=${encodeURIComponent(text)}`, ttlMs: HOUR, timeoutMs: 8000, parse: parseMfapiSearch, fetchImpl });
  return r.data.slice(0, 30);
}

/* ---------- AMFI (through our own endpoint) ---------- */

const COACH_URL = import.meta.env?.VITE_COACH_API_URL as string | undefined;
export const AMFI_ENDPOINT = (import.meta.env?.VITE_AMFI_API_URL as string | undefined) || (COACH_URL ? `${COACH_URL.replace(/\/+$/, '')}/amfi` : '/api/amfi');

export function parseAmfiResponse(raw: unknown): AmfiScheme[] {
  const r = raw as { schemes?: AmfiScheme[] };
  if (!Array.isArray(r?.schemes)) throw new Error('amfi-shape');
  return r.schemes;
}

/** Official NAV, category and plan for these codes from AMFI's daily file. Unavailable on a static host without the Worker. */
export function amfiSchemes(codes: number[], fetchImpl?: typeof fetch): Promise<DataResult<AmfiScheme[]>> {
  const list = [...new Set(codes)].sort((a, b) => a - b);
  return fetchCached({ key: `amfi:${list.join(',')}`, url: `${AMFI_ENDPOINT}?codes=${list.join(',')}`, ttlMs: 12 * HOUR, timeoutMs: 15_000, parse: parseAmfiResponse, fetchImpl });
}

/* ---------- Yahoo Finance (through our own endpoint) ---------- */

export const MARKETS_ENDPOINT = (import.meta.env?.VITE_MARKETS_API_URL as string | undefined) || (COACH_URL ? `${COACH_URL.replace(/\/+$/, '')}/markets` : '/api/markets');

/** Live Nifty 50, Sensex, gold and USD/INR, cached 1 minute. Nothing is sent; the endpoint fetches a fixed list. */
export function marketQuotes(fetchImpl?: typeof fetch): Promise<DataResult<MarketQuote[]>> {
  return fetchCached({ key: 'markets', url: MARKETS_ENDPOINT, ttlMs: 60_000, timeoutMs: 10_000, parse: parseMarketsResponse, fetchImpl });
}

/* ---------- Frankfurter (ECB) ---------- */

export interface FxPoint {
  date: string;
  rate: number;
}

export function parseFx(raw: unknown): FxPoint[] {
  if (!Array.isArray(raw)) throw new Error('fx-shape');
  const pts = raw.map((r: { date: string; rate: number }) => ({ date: r.date, rate: Number(r.rate) })).filter((p) => p.rate > 0);
  if (!pts.length) throw new Error('fx-empty');
  return pts.sort((a, b) => a.date.localeCompare(b.date));
}

/** USD→INR ECB reference rates for the last ~400 days, cached 12 hours. */
export function usdInr(fetchImpl?: typeof fetch, now = Date.now()): Promise<DataResult<FxPoint[]>> {
  const from = new Date(now - 400 * 864e5).toISOString().slice(0, 10);
  return fetchCached({
    key: 'fx:usdinr',
    url: `https://api.frankfurter.dev/v2/providers/ecb/rates?base=USD&quotes=INR&from=${from}`,
    ttlMs: 12 * HOUR,
    timeoutMs: 8000,
    parse: parseFx,
    snapshot: () => import('./snapshots/usdinr.json').then((m) => ({ data: parseFx(m.default.data), takenAt: m.default.takenAt })),
    fetchImpl,
  });
}

/* ---------- World Bank ---------- */

export interface CpiYear {
  year: number;
  value: number; // annual % change
}

export function parseWorldBank(raw: unknown): CpiYear[] {
  const r = raw as [unknown, { date: string; value: number | null }[]];
  if (!Array.isArray(r) || !Array.isArray(r[1])) throw new Error('wb-shape');
  return r[1]
    .filter((x) => x.value !== null && Number.isFinite(x.value))
    .map((x) => ({ year: Number(x.date), value: Number(x.value) }))
    .sort((a, b) => a.year - b.year);
}

/** India's annual CPI inflation, every year the World Bank has, cached for a week. */
export function indiaCpi(fetchImpl?: typeof fetch): Promise<DataResult<CpiYear[]>> {
  return fetchCached({
    key: 'wb:cpi-ind',
    url: 'https://api.worldbank.org/v2/country/IND/indicator/FP.CPI.TOTL.ZG?format=json&per_page=100',
    ttlMs: 7 * 24 * HOUR,
    timeoutMs: 10_000,
    parse: parseWorldBank,
    snapshot: () => import('./snapshots/cpi-india.json').then((m) => ({ data: parseWorldBank(m.default.data), takenAt: m.default.takenAt })),
    fetchImpl,
  });
}
