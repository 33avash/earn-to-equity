import { buildQuotes, parseMarketsResponse, parseYahooChart, YAHOO_SYMBOLS } from '@/services/data/yahoo';
import { handleMarkets } from '../../server/markets';

// Times are IST (gmtoffset 19800): sessions on 23 Oct 2025, 24 Oct 2026, 26 Oct 2026 and today, 27 Oct 2026.
const ist = (iso: string) => Date.parse(`${iso}+05:30`) / 1000;
const chart = (closes: (number | null)[], price: number) => ({
  chart: {
    result: [
      {
        meta: { regularMarketPrice: price, regularMarketTime: ist('2026-10-27T15:30:00'), gmtoffset: 19800 },
        timestamp: [ist('2025-10-23T09:15:00'), ist('2026-10-24T09:15:00'), ist('2026-10-26T09:15:00'), ist('2026-10-27T09:15:00')],
        indicators: { quote: [{ close: closes }] },
      },
    ],
  },
});

describe('Yahoo chart', () => {
  it('takes the previous session’s close and the close a year back, skipping gaps', () => {
    const s = parseYahooChart(chart([20000, 22500, null, 22750], 22750));
    expect(s.price).toBe(22750);
    expect(s.prevClose).toBe(22500); // 26 Oct has no close, so the session before it
    expect(s.yearAgo).toBe(20000);
    expect(s.time).toBe(ist('2026-10-27T15:30:00') * 1000);
  });

  it('rejects a response without a price', () => {
    expect(() => parseYahooChart({ chart: { result: [], error: { code: 'Not Found' } } })).toThrow('yahoo-shape');
  });

  it('builds the four quotes, with gold in rupees per 10 g at the same moment’s rate', () => {
    const fx = parseYahooChart(chart([88, 94, 95, 95], 95));
    const gold = parseYahooChart(chart([3500, 4000, 4000, 4040], 4040));
    const idx = parseYahooChart(chart([20000, 22500, 22500, 22750], 22750));
    const q = buildQuotes({ nifty: idx, sensex: idx, goldUsd: gold, usdinr: fx });
    expect(q.map((x) => x.key)).toEqual(['nifty', 'sensex', 'gold', 'usdinr']);
    const g = q.find((x) => x.key === 'gold')!;
    expect(g.price).toBeCloseTo((4040 * 95 * 10) / 31.1034768, 6);
    expect(g.dayChange).toBeCloseTo((4040 * 95) / (4000 * 95) - 1, 9);
    expect(g.yearChange).toBeCloseTo((4040 * 95) / (3500 * 88) - 1, 9);
    expect(q[0].dayChange).toBeCloseTo(22750 / 22500 - 1, 9);
  });

  it('leaves out gold when the rupee rate is missing, and only fetches a fixed list', () => {
    const idx = parseYahooChart(chart([20000, 22500, 22500, 22750], 22750));
    expect(buildQuotes({ nifty: idx, goldUsd: idx }).map((x) => x.key)).toEqual(['nifty']);
    expect(Object.values(YAHOO_SYMBOLS)).toEqual(['^NSEI', '^BSESN', 'GC=F', 'INR=X']);
  });

  it('client parsing drops bad quotes and rejects an empty answer', () => {
    expect(parseMarketsResponse({ quotes: [{ key: 'nifty', price: 1 }, { key: 'sensex', price: null }] })).toHaveLength(1);
    expect(() => parseMarketsResponse({ quotes: [] })).toThrow('markets-shape');
  });

  it('the endpoint only answers GET', async () => {
    expect((await handleMarkets('POST')).status).toBe(405);
  });
});
