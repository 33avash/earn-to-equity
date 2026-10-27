import { buildQuotes, parseYahooChart, yahooChartUrl, YAHOO_SYMBOLS, type MarketsResponse, type Series } from '../src/services/data/yahoo';

/**
 * Live Nifty 50, Sensex, gold and USD/INR from Yahoo Finance for the markets strip. Browsers can't read Yahoo
 * directly (no CORS), so the dev and preview servers mount this at /api/markets and the Worker at /markets.
 * Only a fixed list of symbols is ever fetched; the result is cached for a minute.
 */

const CACHE_MS = 60_000;
const TIMEOUT_MS = 8000;
const UA = 'Mozilla/5.0 (compatible; earn-to-equity/1.0; education)';

let cache: { at: number; body: MarketsResponse } | null = null;

async function chart(symbol: string): Promise<Series> {
  let last: unknown;
  // query2 is Yahoo's second host for the same data; it helps when one is rate-limiting.
  for (const host of ['query1', 'query2']) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(yahooChartUrl(symbol, host), { signal: ctl.signal, headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!r.ok) throw new Error(`yahoo-${r.status}`);
      return parseYahooChart(await r.json());
    } catch (e) {
      last = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw last;
}

export async function handleMarkets(method: string): Promise<{ status: number; body: unknown }> {
  if (method !== 'GET') return { status: 405, body: { error: 'method-not-allowed' } };
  if (cache && Date.now() - cache.at < CACHE_MS) return { status: 200, body: cache.body };
  const keys = Object.keys(YAHOO_SYMBOLS) as (keyof typeof YAHOO_SYMBOLS)[];
  const settled = await Promise.allSettled(keys.map((k) => chart(YAHOO_SYMBOLS[k])));
  const series = Object.fromEntries(keys.flatMap((k, i) => (settled[i].status === 'fulfilled' ? [[k, (settled[i] as PromiseFulfilledResult<Series>).value]] : [])));
  const quotes = buildQuotes(series);
  if (!quotes.length) {
    const reason = settled.find((s) => s.status === 'rejected') as PromiseRejectedResult | undefined;
    return { status: 502, body: { error: reason?.reason instanceof Error ? reason.reason.message : 'yahoo-failed' } };
  }
  const body: MarketsResponse = { source: 'Yahoo Finance', fetchedAt: new Date().toISOString(), quotes };
  cache = { at: Date.now(), body };
  return { status: 200, body };
}
