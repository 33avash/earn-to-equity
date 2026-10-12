import type { AssetMap } from '@/types/profile';
import { ASSET_CLASSES } from '@/types/profile';
import { ASSET_LABELS } from '@/finance/portfolio';
import { formatPct } from '@/finance/money';
import { useMoney } from '@/state/selectors';
import { useChartTheme } from './theme';

/** 100% stacked horizontal bar with 2px gaps; pairs with AllocationLegend for labels. */
export function AllocationBar({ weights, label, height = 14 }: { weights: AssetMap; label: string; height?: number }) {
  const t = useChartTheme();
  const total = ASSET_CLASSES.reduce((s, c) => s + Math.max(0, weights[c]), 0);
  return (
    <div role="img" aria-label={`${label}: ${ASSET_CLASSES.filter((c) => weights[c] > 0).map((c) => `${ASSET_LABELS[c]} ${formatPct(weights[c] / (total || 1), 0)}`).join(', ')}`} className="flex w-full gap-[2px] overflow-hidden rounded-sm" style={{ height }}>
      {total === 0 ? (
        <div className="h-full w-full bg-line" />
      ) : (
        ASSET_CLASSES.filter((c) => weights[c] > 0).map((c) => (
          <div key={c} title={`${ASSET_LABELS[c]} ${formatPct(weights[c] / total)}`} style={{ width: `${(weights[c] / total) * 100}%`, background: t.asset[c] }} className="h-full transition-[width] duration-500 ease-out first:rounded-l-sm last:rounded-r-sm" />
        ))
      )}
    </div>
  );
}

export function AllocationLegend({ weights, values, compare }: { weights: AssetMap; values?: AssetMap; compare?: AssetMap }) {
  const t = useChartTheme();
  const money = useMoney();
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
      {ASSET_CLASSES.filter((c) => weights[c] > 0 || (compare && compare[c] > 0) || (values && values[c] > 0)).map((c) => (
        <li key={c} className="flex items-center justify-between gap-3 border-b border-line/60 py-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: t.asset[c] }} />
            <span className="truncate text-charcoal">{ASSET_LABELS[c]}</span>
          </span>
          <span className="num shrink-0 text-grey">
            {values && <span className="mr-2">{money(values[c])}</span>}
            <span className="font-semibold text-evergreen">{formatPct(weights[c], 0)}</span>
            {compare && <span className="ml-1">/ {formatPct(compare[c], 0)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Where each rupee of monthly income goes — a single stacked bar with labelled parts. */
export function CashflowBar({ parts, total }: { parts: { key: string; label: string; value: number; color: string }[]; total: number }) {
  const money = useMoney();
  const shown = parts.filter((p) => p.value > 0);
  return (
    <div>
      <div role="img" aria-label={`Monthly income of ${money(total)}: ${shown.map((p) => `${p.label} ${money(p.value)}`).join(', ')}`} className="flex h-3.5 w-full gap-[2px] overflow-hidden rounded-sm bg-line">
        {shown.map((p) => (
          <div key={p.key} style={{ width: `${(p.value / Math.max(total, shown.reduce((s, x) => s + x.value, 0))) * 100}%`, background: p.color }} className="h-full transition-[width] duration-500 ease-out" />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3">
        {parts.map((p) => (
          <li key={p.key} className="flex flex-col">
            <span className="flex items-center gap-1.5 text-grey">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: p.color }} />
              {p.label}
            </span>
            <span className={`num font-semibold ${p.value < 0 ? 'text-danger' : 'text-evergreen'}`}>{money(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
