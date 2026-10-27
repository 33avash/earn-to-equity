/**
 * Yahoo Finance's chart data (the unofficial v8 chart endpoint) turned into the few figures the markets strip
 * shows. Yahoo sends no CORS headers, so the dev server and the Worker fetch it (server/markets.ts) and the
 * browser reads our endpoint. Shared by both and by the tests.
 */

export type MarketKey = 'nifty' | 'sensex' | 'gold' | 'usdinr';

export interface MarketQuote {
  key: MarketKey;
  label: string;
  symbol: string; // Yahoo symbol, for the source link
  price: number;
  unit: 'points' | 'inr' | 'inr-10g';
  dayChange: number | null; // fraction, against the previous session's close
  yearChange: number | null; // fraction, against the close a year earlier
  time: number; // ms since epoch of the last trade or quote
}

export interface MarketsResponse {
  source: string;
  fetchedAt: string;
  quotes: MarketQuote[];
}

/** The only symbols the endpoint fetches, so it can't be used as an open proxy. */
export const YAHOO_SYMBOLS: Record<Exclude<MarketKey, 'gold'> | 'goldUsd', string> = {
  nifty: '^NSEI',
  sensex: '^BSESN',
  goldUsd: 'GC=F', // COMEX gold, US$ per troy ounce
  usdinr: 'INR=X',
};

export const yahooChartUrl = (symbol: string, host = 'query1') => `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
export const yahooQuotePage = (symbol: string) => `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;

export interface Series {
  price: number;
  time: number; // ms
  prevClose: number | null;
  yearAgo: number | null;
}

interface YahooChart {
  chart?: {
    result?: {
      meta: { regularMarketPrice?: number; regularMarketTime?: number; gmtoffset?: number };
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[];
    error?: unknown;
  };
}

/** Last price, the previous session's close and the close a year back, from one chart response. */
export function parseYahooChart(raw: unknown): Series {
  const r = (raw as YahooChart)?.chart?.result?.[0];
  const price = r?.meta.regularMarketPrice;
  const at = r?.meta.regularMarketTime;
  if (!r || typeof price !== 'number' || !(price > 0) || typeof at !== 'number') throw new Error('yahoo-shape');
  const offset = (r.meta.gmtoffset ?? 0) * 1000;
  const ts = r.timestamp ?? [];
  const closes = r.indicators?.quote?.[0]?.close ?? [];
  const pts = ts.map((t, i) => ({ t: t * 1000, c: closes[i] })).filter((p): p is { t: number; c: number } => typeof p.c === 'number' && p.c > 0);
  // Sessions are compared by their date in the exchange's own time zone.
  const day = (ms: number) => new Date(ms + offset).toISOString().slice(0, 10);
  const today = day(at * 1000);
  const before = pts.filter((p) => day(p.t) < today);
  const yearBack = at * 1000 - 365 * 864e5;
  const old = pts.filter((p) => p.t <= yearBack);
  return { price, time: at * 1000, prevClose: before.at(-1)?.c ?? null, yearAgo: old.at(-1)?.c ?? null };
}

const change = (now: number, then: number | null) => (then && then > 0 ? now / then - 1 : null);
const TROY_OUNCE_G = 31.1034768;

/** The strip's four quotes from the parsed series. Gold is converted to ₹ per 10 g at the same moment's rupee rate. */
export function buildQuotes(s: Partial<Record<keyof typeof YAHOO_SYMBOLS, Series>>): MarketQuote[] {
  const out: MarketQuote[] = [];
  const q = (key: MarketKey, label: string, symbol: string, x: Series, unit: MarketQuote['unit']) =>
    out.push({ key, label, symbol, price: x.price, unit, dayChange: change(x.price, x.prevClose), yearChange: change(x.price, x.yearAgo), time: x.time });
  if (s.nifty) q('nifty', 'Nifty 50', YAHOO_SYMBOLS.nifty, s.nifty, 'points');
  if (s.sensex) q('sensex', 'Sensex', YAHOO_SYMBOLS.sensex, s.sensex, 'points');
  if (s.goldUsd && s.usdinr) {
    const g = s.goldUsd;
    const fx = s.usdinr;
    const inr = (usd: number | null, rate: number | null) => (usd && rate ? (usd * rate * 10) / TROY_OUNCE_G : null);
    q('gold', 'Gold, international (₹ per 10 g, before duty and GST)', YAHOO_SYMBOLS.goldUsd, { price: inr(g.price, fx.price)!, time: Math.max(g.time, fx.time), prevClose: inr(g.prevClose, fx.prevClose), yearAgo: inr(g.yearAgo, fx.yearAgo) }, 'inr-10g');
  }
  if (s.usdinr) q('usdinr', 'USD/INR', YAHOO_SYMBOLS.usdinr, s.usdinr, 'inr');
  return out;
}

export function parseMarketsResponse(raw: unknown): MarketQuote[] {
  const r = raw as Partial<MarketsResponse>;
  if (!Array.isArray(r?.quotes) || !r.quotes.length) throw new Error('markets-shape');
  return r.quotes.filter((q) => typeof q?.price === 'number' && Number.isFinite(q.price) && q.price > 0);
}
