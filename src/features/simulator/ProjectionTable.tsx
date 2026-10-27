import { useRef, useState, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ProjectionPoint, YearRow } from '@/types/sim';
import { Badge, Segmented } from '@/components/ui';

const ROW_H = 44;

type Preset = 'cash' | 'wealth' | 'tax';
const PRESETS: { value: Preset; label: string }[] = [
  { value: 'cash', label: 'Cash flow' },
  { value: 'wealth', label: 'Wealth' },
  { value: 'tax', label: 'Tax' },
];

interface Column {
  key: string;
  label: string;
  presets: Preset[];
  cell: (r: YearRow, money: (v: number) => string) => ReactNode;
  tone?: (r: YearRow) => string;
}

const dash = (v: number, money: (n: number) => string) => (v > 0 ? money(v) : '—');

const COLUMNS: Column[] = [
  { key: 'income', label: 'Take-home', presets: ['cash', 'tax'], cell: (r, m) => m(r.income) },
  { key: 'tax', label: 'Income tax', presets: ['cash', 'tax'], cell: (r, m) => dash(r.incomeTax, m), tone: () => 'text-grey' },
  { key: 'regime', label: 'Regime', presets: ['tax'], cell: (r) => (r.regime ? `${r.regime[0].toUpperCase()}${r.regime.slice(1)}` : '—') },
  { key: 'other', label: 'Other regime', presets: ['tax'], cell: (r, m) => (r.tax ? m(r.regime === 'new' ? r.tax.old : r.tax.new) : '—'), tone: () => 'text-grey' },
  { key: 'variable', label: 'Variable pay', presets: ['tax'], cell: (r, m) => dash(r.tax?.variablePaid ?? 0, m) },
  { key: 'interest', label: 'Home-loan interest', presets: ['tax'], cell: (r, m) => dash(r.tax?.homeLoanInterest ?? 0, m) },
  { key: 'hra', label: 'HRA (old regime)', presets: ['tax'], cell: (r, m) => dash(r.tax?.hraExemption ?? 0, m) },
  { key: 'expenses', label: 'Expenses', presets: ['cash'], cell: (r, m) => m(r.expenses) },
  { key: 'emi', label: 'EMIs', presets: ['cash'], cell: (r, m) => m(r.debtPayments) },
  { key: 'invested', label: 'Invested', presets: ['cash'], cell: (r, m) => m(r.contributions) },
  { key: 'cash', label: 'Cash', presets: ['cash', 'wealth'], cell: (r, m) => m(r.cash), tone: (r) => (r.cash < 0 ? 'text-danger' : '') },
  { key: 'portfolio', label: 'Portfolio', presets: ['wealth'], cell: (r, m) => m(r.portfolio) },
  { key: 'epf', label: 'EPF', presets: ['wealth'], cell: (r, m) => m(r.epf) },
  { key: 'nps', label: 'NPS', presets: ['wealth'], cell: (r, m) => dash(r.nps, m) },
  { key: 'liabilities', label: 'Liabilities', presets: ['wealth'], cell: (r, m) => m(r.liabilities) },
  { key: 'real', label: 'Today’s ₹', presets: ['wealth'], cell: (r, m) => m(r.netWorthReal) },
];

function Notes({ r }: { r: YearRow }) {
  return (
    <span className="flex gap-2">
      {r.events.length > 0 && <Badge>{r.events.length} event{r.events.length > 1 ? 's' : ''}</Badge>}
      {r.flags.includes('goal-shortfall') && <Badge tone="bad">Goal unpaid</Badge>}
      {r.flags.includes('borrowing') && <Badge tone="warn">Borrowing</Badge>}
    </span>
  );
}

/**
 * Year-by-year table. Column presets (cash flow, wealth, tax) keep it narrow enough to read without scrolling
 * sideways; Year · age stays pinned on the left and Net worth on the right. Rows are virtualised. On phones it
 * becomes one card per year.
 */
export function ProjectionTable({
  rows,
  close,
  money,
  selected,
  onSelect,
  baselineDiff,
}: {
  rows: YearRow[];
  close: ProjectionPoint;
  money: (v: number) => string;
  selected: number | null;
  onSelect: (year: number) => void;
  baselineDiff?: Map<number, number | null>;
}) {
  const [preset, setPreset] = useState<Preset>('cash');
  const scroller = useRef<HTMLDivElement>(null);
  const count = rows.length + 1;
  const virt = useVirtualizer({ count, getScrollElement: () => scroller.current, estimateSize: () => ROW_H, overscan: 6, initialRect: { width: 1000, height: 480 } });
  const items = virt.getVirtualItems();
  const padTop = items.length ? items[0].start : 0;
  const padBottom = items.length ? virt.getTotalSize() - items[items.length - 1].end : 0;
  const cols = COLUMNS.filter((c) => c.presets.includes(preset));
  const span = cols.length + 3 + (baselineDiff ? 1 : 0);
  const left = 'sticky left-0 z-[1] bg-surface shadow-[inset_-1px_0_0_rgb(var(--border))]';
  const right = 'sticky right-0 z-[1] bg-surface shadow-[inset_1px_0_0_rgb(var(--border))]';

  return (
    <div className="flex flex-col gap-3">
      <Segmented label="Columns" size="sm" value={preset} onChange={setPreset} options={PRESETS} />

      {/* Phones: one card per year. */}
      <ol className="flex flex-col gap-2 sm:hidden" aria-label="Year-by-year projection">
        {rows.map((r) => (
          <li key={r.year}>
            <button type="button" onClick={() => onSelect(r.year)} aria-pressed={selected === r.year} className={`w-full rounded-2xl p-4 text-left ring-1 ring-inset ${selected === r.year ? 'bg-mint ring-forest/40' : 'bg-surface ring-line'}`}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-evergreen">
                  {r.year} <span className="num text-xs font-normal text-grey">age {r.age}</span>
                </span>
                <span className="num font-semibold text-evergreen">{money(r.netWorth)}</span>
              </span>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]">
                {cols.slice(0, 6).map((c) => (
                  <div key={c.key} className="flex justify-between gap-2">
                    <dt className="text-grey">{c.label}</dt>
                    <dd className={`num ${c.tone?.(r) ?? ''}`}>{c.cell(r, money)}</dd>
                  </div>
                ))}
              </dl>
              <span className="mt-2 block">
                <Notes r={r} />
              </span>
            </button>
          </li>
        ))}
        <li className="rounded-2xl bg-muted/50 p-4 text-[13px]">
          1 January {close.year} · age {close.age}: <strong className="num text-evergreen">{money(close.netWorth)}</strong> ({money(close.netWorthReal)} in today’s ₹)
        </li>
      </ol>

      <div ref={scroller} className="hidden max-h-[520px] overflow-auto rounded-2xl bg-surface shadow-[inset_0_0_0_1px_rgb(var(--border))] sm:block" tabIndex={0} aria-label="Year-by-year projection table">
        <table className="table-fin w-full [&_td]:whitespace-nowrap [&_td:first-child]:pl-4 [&_th:first-child]:pl-4">
          <thead className="sticky top-0 z-[2] bg-surface shadow-[inset_0_-1px_0_rgb(var(--border))]">
            <tr>
              <th scope="col" className={`${left} z-[3]`}>
                Year · age
              </th>
              {cols.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
              {baselineDiff && <th scope="col">vs baseline</th>}
              <th scope="col">Notes</th>
              <th scope="col" className={`${right} z-[3]`}>
                Net worth
              </th>
            </tr>
          </thead>
          <tbody>
            {padTop > 0 && (
              <tr aria-hidden style={{ height: padTop }}>
                <td colSpan={span} />
              </tr>
            )}
            {items.map((it) => {
              if (it.index === rows.length) {
                return (
                  <tr key="close" style={{ height: ROW_H }} className="border-t-2 border-line">
                    <th scope="row" className={`${left} text-left font-semibold text-evergreen`}>
                      1 Jan {close.year} · {close.age}
                    </th>
                    <td colSpan={cols.length + (baselineDiff ? 1 : 0) + 1} className="font-sans text-xs text-grey">
                      Closing position, same as 31 December {close.year - 1}. {money(close.netWorthReal)} in today’s ₹.
                    </td>
                    <td className={`${right} font-semibold text-evergreen`}>{money(close.netWorth)}</td>
                  </tr>
                );
              }
              const r = rows[it.index];
              const isSel = selected === r.year;
              const diff = baselineDiff?.get(r.year + 1);
              return (
                <tr key={r.year} style={{ height: ROW_H }} onClick={() => onSelect(r.year)} aria-selected={isSel} className={`group cursor-pointer ${isSel ? '[&>*]:bg-mint' : 'hover:[&>*]:bg-muted/60'}`}>
                  <th scope="row" className={`${left} text-left font-normal`}>
                    <button type="button" className="hit font-semibold text-evergreen" onClick={() => onSelect(r.year)}>
                      {r.year}
                    </button>
                    <span className="num ml-2 text-xs text-grey">{r.age}</span>
                  </th>
                  {cols.map((c) => (
                    <td key={c.key} className={c.tone?.(r) ?? ''}>
                      {c.cell(r, money)}
                    </td>
                  ))}
                  {baselineDiff && <td className={diff != null && diff < 0 ? 'text-danger' : 'text-forest'}>{diff != null ? signed(diff, money) : '—'}</td>}
                  <td className="font-sans">
                    <Notes r={r} />
                  </td>
                  <td className={`${right} font-semibold text-evergreen`}>{money(r.netWorth)}</td>
                </tr>
              );
            })}
            {padBottom > 0 && (
              <tr aria-hidden style={{ height: padBottom }}>
                <td colSpan={span} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const signed = (v: number, money: (n: number) => string) => `${v >= 0 ? '+' : '−'}${money(Math.abs(v))}`;
