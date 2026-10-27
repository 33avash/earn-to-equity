import { parseNavAll, planType } from '@/services/data/amfiParse';
import { clearDataCache, fetchCached } from '@/services/data/http';
import { parseMfapiHistory, parseWorldBank } from '@/services/data/sources';
import { cpiAverage } from '@/features/markets/CpiHistory';
import cpi from '@/services/data/snapshots/cpi-india.json';
import { assetClassFor, cagr, changeOver, dragFor, holdingsWithFunds, lastChange, regularCost, regularShareOf, type HeldFund } from '@/finance/funds';
import { applyFunds } from '@/features/funds/FundCheck';
import { demoGaps } from '@/features/demo/DemoBrief';
import { computePlan } from '@/state/selectors';
import { DEFAULT_ASSUMPTIONS, demoProfile } from '@/state/demo';
import { handleAmfi } from '../../server/amfi';
import nifty from '@/services/data/snapshots/nifty-proxy.json';

const navAll = `Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date

Open Ended Schemes(Equity Scheme - Large Cap Fund)

Some Mutual Fund
100001;INF000A;-;Some Bluechip Fund - Direct Plan - Growth;Direct;Growth Option;85.1234;26-Oct-2026
100002;INF000B;-;Some Bluechip Fund - Regular Plan - Growth;Regular;Growth Option;79.50;26-Oct-2026
100003;INF000C;-;Some Bluechip Fund - Growth;;;N.A.;26-Oct-2026

Open Ended Schemes(Debt Scheme - Gilt Fund)
Old Layout Fund House
200001;INF000D;-;Old Gilt Fund - Retail Plan - Growth;42.5;24-Oct-2026
`;

describe('AMFI NAV file', () => {
  it('reads both layouts, keeps the category heading and skips rows without a NAV', () => {
    const m = parseNavAll(navAll);
    expect([...m.keys()]).toEqual([100001, 100002, 200001]);
    expect(m.get(100001)).toMatchObject({ category: 'Equity Scheme - Large Cap Fund', plan: 'Direct', option: 'Growth Option', nav: 85.1234, date: '26-Oct-2026' });
    expect(m.get(100002)?.plan).toBe('Regular');
    expect(m.get(200001)).toMatchObject({ category: 'Debt Scheme - Gilt Fund', plan: 'Regular', option: null, nav: 42.5 });
  });

  it('tells direct from regular by the plan column, then the name', () => {
    expect(planType('X Fund - Growth', 'Direct')).toBe('Direct');
    expect(planType('X Fund - Direct Plan - IDCW')).toBe('Direct');
    expect(planType('X Fund - Regular Plan')).toBe('Regular');
    expect(planType('X Fund - Growth')).toBeNull();
  });

  it('the endpoint checks its input before fetching anything', async () => {
    expect((await handleAmfi('POST', '/api/amfi?codes=1')).status).toBe(405);
    expect((await handleAmfi('GET', '/api/amfi')).status).toBe(400);
    expect((await handleAmfi('GET', '/api/amfi?codes=abc,-4')).status).toBe(400);
  });
});

describe('NAV history maths', () => {
  const pts = [
    { date: '2021-10-25', nav: 100 },
    { date: '2023-10-26', nav: 121 },
    { date: '2025-10-24', nav: 140 },
    { date: '2026-10-23', nav: 150 },
    { date: '2026-10-26', nav: 151.5 },
  ];

  it('compound yearly growth over a period, null when the history is too short', () => {
    expect(cagr(pts, 5)!).toBeCloseTo(Math.pow(1.515, 1 / 5) - 1, 3);
    expect(cagr(pts, 1)!).toBeCloseTo(151.5 / 140 - 1, 2);
    expect(cagr(pts, 6)).toBeNull();
    expect(cagr(pts.slice(-1), 1)).toBeNull();
  });

  it('day and period changes', () => {
    expect(lastChange(pts)).toBeCloseTo(0.01, 6);
    expect(changeOver(pts, 365)).toBeCloseTo(151.5 / 140 - 1, 6);
  });

  it('reads the committed Nifty snapshot oldest first with a usable year of history', () => {
    const h = parseMfapiHistory(nifty);
    expect(h.code).toBe(120716);
    expect(h.points[0].date < h.points[h.points.length - 1].date).toBe(true);
    expect(cagr(h.points, 1)).not.toBeNull();
  });
});

describe('held funds', () => {
  it('maps AMFI categories and names to the planner’s asset classes', () => {
    expect(assetClassFor('Equity Scheme - Large Cap Fund', 'X Bluechip')).toBe('indianEquity');
    expect(assetClassFor('Equity Scheme - ELSS', 'X Tax Saver')).toBe('indianEquity');
    expect(assetClassFor('Other Scheme - Index Funds', 'UTI Nifty 50 Index Fund')).toBe('indianEquity');
    expect(assetClassFor('Other Scheme - FoF Overseas', 'X US Equity FoF')).toBe('intlEquity');
    expect(assetClassFor('Other Scheme - FoF Domestic', 'X Gold ETF FoF')).toBe('gold');
    expect(assetClassFor('Debt Scheme - Liquid Fund', 'X Liquid')).toBe('cash');
    expect(assetClassFor('Debt Scheme - Gilt Fund', 'X Gilt')).toBe('debt');
    expect(assetClassFor('Hybrid Scheme - Arbitrage Fund', 'X Arbitrage')).toBe('debt');
    expect(assetClassFor('Hybrid Scheme - Balanced Advantage', 'X BAF')).toBe('other');
  });

  const funds: HeldFund[] = [
    { code: 1, name: 'A Nifty 50 Index - Direct', category: 'Other Scheme - Index Funds', plan: 'Direct', amount: 100000 },
    { code: 2, name: 'B Flexi Cap - Regular', category: 'Equity Scheme - Flexi Cap Fund', plan: 'Regular', amount: 300000 },
    { code: 3, name: 'C Gilt - Direct', category: 'Debt Scheme - Gilt Fund', plan: 'Direct', amount: 50000 },
  ];

  it('regular-plan share is by value', () => {
    expect(regularShareOf(funds)).toBeCloseTo(300000 / 450000, 6);
    expect(regularShareOf([])).toBe(0);
  });

  it('classes with a fund take the fund total; the rest keep what was entered', () => {
    const h = holdingsWithFunds({ indianEquity: 1, intlEquity: 40000, debt: 2, govtSchemes: 50000, gold: 30000, cash: 20000, other: 0 }, funds);
    expect(h).toMatchObject({ indianEquity: 400000, debt: 50000, intlEquity: 40000, gold: 30000 });
  });

  it('regular-plan cost compounds and only applies to equity, debt and other', () => {
    expect(regularCost(100000, 0.12, 20, 0.01)).toBeCloseTo(100000 * (1.12 ** 20 - 1.11 ** 20), 0);
    expect(regularCost(0, 0.12, 20)).toBe(0);
    expect(dragFor('gold')).toBe(0);
    expect(dragFor('debt', { equity: 0.01, debt: 0.005 })).toBe(0.005);
  });

  it('applyFunds fills holdings and the regular share, ignoring funds with no value yet', () => {
    const p = demoProfile(2026);
    applyFunds(p, [{ ...funds[1], amount: 0 }]);
    expect(p.position.funds).toHaveLength(1);
    expect(p.position.holdings.indianEquity).toBe(240000);
    expect(p.preferences.regularPlanShare).toBeUndefined();
    applyFunds(p, funds);
    expect(p.position.holdings.indianEquity).toBe(400000);
    expect(p.preferences.regularPlanShare).toBeCloseTo(2 / 3, 6);
  });
});

describe('cached fetching', () => {
  beforeEach(() => clearDataCache());
  const ok = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;
  const down = vi.fn(async () => new Response('', { status: 503 })) as unknown as typeof fetch;

  it('serves a fresh cache without the network, and a stale one when the source is down', async () => {
    let t = 1000;
    const now = () => t;
    const live = await fetchCached({ key: 'k', url: 'u', ttlMs: 100, parse: (x) => x as number, fetchImpl: ok(7), now });
    expect(live).toMatchObject({ data: 7, origin: 'live' });
    const f = ok(8);
    expect(await fetchCached({ key: 'k', url: 'u', ttlMs: 100, parse: (x) => x as number, fetchImpl: f, now })).toMatchObject({ data: 7, origin: 'cache' });
    expect(f).not.toHaveBeenCalled();
    t = 5000;
    expect(await fetchCached({ key: 'k', url: 'u', ttlMs: 100, parse: (x) => x as number, fetchImpl: down, now })).toMatchObject({ data: 7, origin: 'cache' });
  });

  it('falls back to the dated snapshot, and throws only when there is nothing at all', async () => {
    const snap = await fetchCached({ key: 's', url: 'u', ttlMs: 100, parse: (x) => x as number, fetchImpl: down, snapshot: async () => ({ data: 3, takenAt: '2026-10-27T12:00:00Z' }) });
    expect(snap).toMatchObject({ data: 3, origin: 'snapshot', fetchedAt: Date.parse('2026-10-27T12:00:00Z') });
    await expect(fetchCached({ key: 'n', url: 'u', ttlMs: 100, parse: (x) => x, fetchImpl: down })).rejects.toThrow('http-503');
  });
});

describe('CPI history', () => {
  it('averages the last n years from the committed World Bank snapshot', () => {
    const years = parseWorldBank(cpi.data);
    const ten = cpiAverage(years, 10)!;
    expect(ten.to - ten.from).toBe(9);
    expect(ten.avg).toBeGreaterThan(0.02);
    expect(ten.avg).toBeLessThan(0.1);
    expect(cpiAverage(years.slice(0, 3), 10)).toBeNull();
  });
});

describe('demo brief', () => {
  const money = (n: number) => `₹${Math.round(n)}`;

  it('names each gap the demo is built with', () => {
    const gaps = demoGaps(computePlan(demoProfile(2026), DEFAULT_ASSUMPTIONS), money).join('\n');
    expect(gaps).toMatch(/can’t pay for the First car in 2030/);
    expect(gaps).toMatch(/emergency reserve covers/);
    expect(gaps).toMatch(/₹22,000 on her credit card at 36%/);
    expect(gaps).toMatch(/nothing into NPS/);
    expect(gaps).toMatch(/no term life cover/);
  });

  it('drops a gap once it is closed', () => {
    const p = demoProfile(2026);
    p.liabilities = p.liabilities.filter((l) => l.kind !== 'creditCard');
    p.protection.lifeCover = 15000000;
    const gaps = demoGaps(computePlan(p, DEFAULT_ASSUMPTIONS), money).join('\n');
    expect(gaps).not.toMatch(/credit card|term life cover/);
  });
});
