import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { SOURCE_GROUPS, type Dated } from '@/finance/assumptions';
import { SECTIONS } from '@/finance/sections';
import { formatPct } from '@/finance/money';

/** One line for a dated value: its display text, or the number. */
export function datedValue(d: Dated<unknown>): string {
  const v = d.value;
  if (d.display) return d.display;
  if (typeof v === 'number') return v < 1 ? formatPct(v, 2) : v.toLocaleString('en-IN');
  if (typeof v === 'string') return v;
  return 'See source';
}

/**
 * Every dated rule and rate, grouped, each in a collapsible group with a search box. Each row shows the value,
 * the date it was checked, a link to the page it was checked against and an "approximate" badge where sources
 * disagree or the official page couldn't be opened.
 */
export function SourcesList({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const groups = useMemo(
    () =>
      SOURCE_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((d) => !query || [d.label, d.display ?? '', d.sourceLabel, d.note ?? '', String(typeof d.value === 'number' ? d.value : '')].join(' ').toLowerCase().includes(query)),
      })).filter((g) => g.items.length),
    [query],
  );
  return (
    <div className="flex flex-col gap-4">
      <label className="relative block max-w-md">
        <span className="sr-only">Search sources</span>
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grey" aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rules and rates, e.g. EPF or HRA" className="input w-full pl-9" />
      </label>
      {groups.length === 0 && <p className="text-sm text-grey">Nothing matches “{q}”.</p>}
      {groups.map((g) => (
        <details key={g.group} open={defaultOpen || !!query} className="rounded-2xl ring-1 ring-inset ring-line">
          <summary className="tap flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-[14px] font-semibold text-evergreen">
            {g.group}
            <span className="num text-[12px] font-normal text-grey">{g.items.length}</span>
          </summary>
          <ul className="divide-y divide-line/70 border-t border-line">
            {g.items.map((d) => (
              <li key={d.label} className="grid gap-1.5 px-4 py-3.5 text-[13px] sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)] sm:gap-4">
                <div>
                  <p className="font-medium text-evergreen">
                    {d.label}
                    {d.approximate && <span className="ml-2 rounded-full bg-champagne/15 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-champagne">Approximate</span>}
                  </p>
                  {d.note && <p className="mt-1 text-xs leading-relaxed text-grey">{d.note}</p>}
                </div>
                <p className="text-charcoal">{datedValue(d)}</p>
                <div>
                  <p className="text-grey">{d.asOf}</p>
                  <a className="link break-words" href={d.source} target="_blank" rel="noreferrer noopener">
                    {d.sourceLabel}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ))}
      <details className="rounded-2xl ring-1 ring-inset ring-line">
        <summary className="tap flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-[14px] font-semibold text-evergreen">Section numbers, Income-tax Act, 2025</summary>
        <ul className="divide-y divide-line/70 border-t border-line">
          {Object.values(SECTIONS).map((m) => (
            <li key={m.old} className="grid gap-1 px-4 py-3 text-[13px] sm:grid-cols-[10rem_1fr]">
              <p className="font-medium text-evergreen">{m.current ? `Sec ${m.current} (old ${m.old})` : `Old ${m.old}, new number not confirmed`}</p>
              <p className="text-grey">
                {m.what}.{m.note ? ` ${m.note}` : ''}{' '}
                <a className="link" href={m.source} target="_blank" rel="noreferrer noopener">
                  Source
                </a>
              </p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
