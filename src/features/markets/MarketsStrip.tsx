import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CPI_LATEST, REPO_RATE } from '@/finance/assumptions';
import { changeOver, lastChange } from '@/finance/funds';
import { formatPct } from '@/finance/money';
import { fundHistory, latestNav, marketQuotes, usdInr, withLatest, PROXIES, SOURCES, type FundHistory, type FxPoint } from '@/services/data/sources';
import { yahooQuotePage, type MarketKey, type MarketQuote } from '@/services/data/yahoo';
import { istStamp, type DataResult } from '@/services/data/http';

interface Tile {
  key: string;
  label: string;
  value: string | null; // null while loading
  change?: string; // small signed figure, e.g. "+0.4% day Â· +8.1% year"
  asOf: string;
  source: { name: string; url: string };
  to: string;
  linkLabel: string;
  failed?: boolean;
}

const signed = (x: number | null, digits = 1) => (x === null ? 'â€”' : `${x >= 0 ? '+' : 'âˆ’'}${Math.abs(x * 100).toFixed(digits)}%`);
const isoToDate = (iso: string) => istStamp(Date.parse(`${iso}T12:00:00+05:30`), false);

type Loaded<T> = { r: DataResult<T> | null; failed: boolean };
const pending = { r: null, failed: false };

/**
 * One proxy NAV: today's figure from the quick `latest` request, and the day and year changes from the history
 * (live, cached or the dated snapshot). The value shows as soon as either arrives.
 */
function useProxy(code: number) {
  const [hist, setHist] = useState<Loaded<FundHistory>>(pending);
  const [latest, setLatest] = useState<Loaded<FundHistory>>(pending);
  useEffect(() => {
    let live = true;
    fundHistory(code).then((r) => live && setHist({ r, failed: false }), () => live && setHist({ r: null, failed: true }));
    latestNav(code).then((r) => live && setLatest({ r, failed: false }), () => live && setLatest({ r: null, failed: true }));
    return () => {
      live = false;
    };
  }, [code]);
  return { hist, latest };
}

function navTile(key: string, label: string, { hist, latest }: ReturnType<typeof useProxy>): Tile {
  const today = latest.r?.data.points[latest.r.data.points.length - 1];
  const pts = withLatest(hist.r?.data.points ?? [], today);
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  // A day change only means something when the point before is a recent trading day, not an old saved copy.
  const day = prev && Date.parse(last.date) - Date.parse(prev.date) <= 5 * 864e5 ? lastChange(pts) : null;
  const year = changeOver(pts, 365);
  const fromSnapshot = !(today && last === today) && hist.r?.origin === 'snapshot';
  const failed = hist.failed && latest.failed;
  return {
    key,
    label,
    value: last ? `â‚¹${last.nav.toFixed(2)}` : null,
    change: last && (day !== null || year !== null) ? [day !== null && `${signed(day, 2)} day`, year !== null && `${signed(year)} year`].filter(Boolean).join(' Â· ') : undefined,
    asOf: last ? `NAV as of ${isoToDate(last.date)}${fromSnapshot ? ' (saved copy)' : ''}` : failed ? 'Unavailable right now' : 'Loading',
    source: { name: `${hist.r?.data.name ?? latest.r?.data.name ?? 'NAV'}, ${SOURCES.mfapi.name}`, url: SOURCES.mfapi.url },
    to: '/app/portfolio',
    linkLabel: 'Your portfolio',
    failed,
  };
}

/** The strip without Yahoo: fund-NAV proxies and the ECB rate, each falling back to a dated saved copy. */
function useFallbackTiles(): Tile[] {
  const nifty = useProxy(PROXIES.nifty50.code);
  const gold = useProxy(PROXIES.gold.code);
  const [fx, setFx] = useState<Loaded<FxPoint[]>>(pending);
  useEffect(() => {
    let live = true;
    usdInr().then((r) => live && setFx({ r, failed: false }), () => live && setFx({ r: null, failed: true }));
    return () => {
      live = false;
    };
  }, []);
  const fxPts = fx.r?.data ?? [];
  const fxLast = fxPts[fxPts.length - 1];
  const fxPrev = fxPts[fxPts.length - 2];
  return [
    navTile('nifty', PROXIES.nifty50.label, nifty),
    navTile('gold', PROXIES.gold.label, gold),
    {
      key: 'usdinr',
      label: 'USD/INR (ECB reference rate)',
      value: fxLast ? `â‚¹${fxLast.rate.toFixed(2)}` : null,
      change: fxLast && fxPrev ? `${signed(fxLast.rate / fxPrev.rate - 1, 2)} day` : undefined,
      asOf: fxLast ? `as of ${isoToDate(fxLast.date)}${fx.r?.origin === 'snapshot' ? ' (saved copy)' : ''}; not a live market rate` : fx.failed ? 'Unavailable right now' : 'Loading',
      source: SOURCES.ecb,
      to: '/app/settings#sources',
      linkLabel: 'Rupee assumption',
      failed: fx.failed,
    },
    ...RATE_TILES,
  ];
}

/** Dated entries from assumptions.ts, checked by hand against the RBI and MoSPI releases; not fetched. */
const RATE_TILES: Tile[] = [
  { key: 'repo', label: 'RBI repo rate', value: formatPct(REPO_RATE.value, 2), asOf: `since ${REPO_RATE.asOf}`, source: { name: 'RBI', url: REPO_RATE.source }, to: '/app/emergency-debt', linkLabel: 'Your loans & EMIs' },
  { key: 'cpi', label: 'CPI inflation, latest', value: formatPct(CPI_LATEST.value, 2), asOf: CPI_LATEST.asOf, source: { name: 'MoSPI', url: CPI_LATEST.source }, to: '/app/settings', linkLabel: 'Inflation assumption' },
];

const REFRESH_MS = 60_000;

/** Yahoo quotes through our endpoint, refreshed every minute while the page is visible. */
function useYahoo(): { quotes: MarketQuote[] | null; failed: boolean } {
  const [state, setState] = useState<{ quotes: MarketQuote[] | null; failed: boolean }>({ quotes: null, failed: false });
  useEffect(() => {
    let live = true;
    const load = () => {
      if (document.visibilityState === 'hidden') return;
      marketQuotes().then(
        (r) => live && setState({ quotes: r.data, failed: false }),
        // Keep the last good quotes on a failed refresh; fall back only if there were none.
        () => live && setState((s) => (s.quotes ? s : { quotes: null, failed: true })),
      );
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);
  return state;
}

const YAHOO_PLACEHOLDERS: { key: MarketKey; label: string }[] = [
  { key: 'nifty', label: 'Nifty 50' },
  { key: 'sensex', label: 'Sensex' },
  { key: 'gold', label: 'Gold, international (₹ per 10 g)' },
  { key: 'usdinr', label: 'USD/INR' },
];

function formatQuote(q: MarketQuote): string {
  if (q.unit === 'points') return q.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (q.unit === 'inr-10g') return `₹${Math.round(q.price).toLocaleString('en-IN')}`;
  return `₹${q.price.toFixed(2)}`;
}

function yahooTiles(quotes: MarketQuote[] | null): Tile[] {
  const link = (k: MarketKey) => (k === 'usdinr' ? { to: '/app/settings#sources', linkLabel: 'Rupee assumption' } : { to: '/app/portfolio', linkLabel: 'Your portfolio' });
  if (!quotes) return [...YAHOO_PLACEHOLDERS.map((p) => ({ ...p, value: null, asOf: 'Loading', source: SOURCES.yahoo, ...link(p.key) })), ...RATE_TILES];
  return [
    ...quotes.map((q) => ({
      key: q.key,
      label: q.label,
      value: formatQuote(q),
      change: q.dayChange !== null || q.yearChange !== null ? [q.dayChange !== null && `${signed(q.dayChange, 2)} day`, q.yearChange !== null && `${signed(q.yearChange)} year`].filter(Boolean).join(' · ') : undefined,
      asOf: `as of ${istStamp(q.time)}`,
      source: { name: SOURCES.yahoo.name, url: yahooQuotePage(q.symbol) },
      ...link(q.key),
    })),
    ...RATE_TILES,
  ];
}

function TileView({ t, hidden = false }: { t: Tile; hidden?: boolean }) {
  return (
    <li className="flex min-w-[13.5rem] shrink-0 flex-col gap-0.5 px-4 py-2" aria-hidden={hidden || undefined}>
      <span className="text-[11.5px] text-grey">{t.label}</span>
      <span className="flex items-baseline gap-2">
        <span className="num text-[14px] font-semibold text-evergreen">{t.value ?? (t.failed ? 'â€”' : 'â€¦')}</span>
        {t.change && <span className="num text-[11.5px] text-charcoal">{t.change}</span>}
      </span>
      <span className="text-[10.5px] leading-snug text-grey">
        {t.asOf} Â·{' '}
        <a className="underline-offset-2 hover:underline" href={t.source.url} target="_blank" rel="noreferrer noopener" tabIndex={hidden ? -1 : undefined}>
          {t.source.name.length > 42 ? `${t.source.name.slice(0, 40)}â€¦` : t.source.name}
        </a>{' '}
        Â·{' '}
        <Link to={t.to} className="text-forest underline-offset-2 hover:underline" tabIndex={hidden ? -1 : undefined}>
          {t.linkLabel}
        </Link>
      </span>
    </li>
  );
}

/**
 * Markets, calmly: live Nifty 50, Sensex, gold and USD/INR from Yahoo Finance, then the repo rate and CPI. When
 * our Yahoo endpoint can't be reached, fund-NAV proxies and the ECB rate stand in. Changes are small signed
 * numbers, never red and green. On narrow screens the strip scrolls slowly and stops on hover, focus or touch;
 * wide screens and reduced motion show a still row.
 */
export function MarketsStrip({ className = '' }: { className?: string }) {
  const yahoo = useYahoo();
  return yahoo.failed ? (
    <FallbackStrip className={className} />
  ) : (
    <Strip tiles={yahooTiles(yahoo.quotes)} className={className} note="Index, gold and rupee figures are from Yahoo Finance, refreshed every minute while this page is open. Gold is the international price converted to rupees, before Indian import duty and GST." />
  );
}

function FallbackStrip({ className }: { className: string }) {
  return <Strip tiles={useFallbackTiles()} className={className} note="Index and gold figures are NAVs of funds that track them, used only as data sources. Nothing here recommends a fund." />;
}

function Strip({ tiles, className, note }: { tiles: Tile[]; className: string; note: string }) {
  const [paused, setPaused] = useState(false);
  return (
    <section aria-label="Markets and rates" className={`ticker overflow-hidden ${className}`} data-paused={paused} onTouchStart={() => setPaused((p) => !p)}>
      <div className="ticker-track flex w-max md:w-full">
        <ul className="flex shrink-0 divide-x divide-line md:w-full md:justify-between">
          {tiles.map((t) => (
            <TileView key={t.key} t={t} />
          ))}
        </ul>
        <ul className="ticker-copy flex shrink-0 divide-x divide-line" aria-hidden>
          {tiles.map((t) => (
            <TileView key={t.key} t={t} hidden />
          ))}
        </ul>
      </div>
      <p className="sr-only">{note}</p>
    </section>
  );
}
