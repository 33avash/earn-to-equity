import { useEffect, useState } from 'react';
import { formatPct } from '@/finance/money';
import { indiaCpi, SOURCES, type CpiYear } from '@/services/data/sources';

/** Average yearly CPI inflation over the last `n` years the World Bank has, as a fraction. */
export function cpiAverage(years: CpiYear[], n: number): { avg: number; from: number; to: number } | null {
  const last = years.slice(-n);
  if (last.length < n) return null;
  return { avg: last.reduce((s, y) => s + y.value, 0) / n / 100, from: last[0].year, to: last[last.length - 1].year };
}

/** India's CPI over the last 10 and 20 years, beside the inflation assumption, so the default can be judged. */
export function CpiHistoryNote() {
  const [years, setYears] = useState<CpiYear[] | null>(null);
  useEffect(() => {
    let live = true;
    indiaCpi().then(
      (r) => live && setYears(r.data),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  const ten = years && cpiAverage(years, 10);
  const twenty = years && cpiAverage(years, 20);
  if (!ten) return null;
  return (
    <p className="text-[12px] leading-relaxed text-grey">
      India’s CPI averaged {formatPct(ten.avg, 1)} a year over {ten.from}–{ten.to}
      {twenty && <> and {formatPct(twenty.avg, 1)} over {twenty.from}–{twenty.to}</>}.{' '}
      <a href={SOURCES.worldBank.url} target="_blank" rel="noreferrer noopener" className="link">
        World Bank
      </a>
    </p>
  );
}
