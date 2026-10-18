import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ProjectionPoint, YearRow } from '@/types/sim';
import { Badge } from '@/components/ui';

const ROW_H = 44;

/**
 * Year-by-year table: sticky header and first column, virtualised rows (only the visible rows render),
 * an optional "vs baseline" column, and the closing position as the last line.
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
  const scroller = useRef<HTMLDivElement>(null);
  const count = rows.length + 1;
  const virt = useVirtualizer({ count, getScrollElement: () => scroller.current, estimateSize: () => ROW_H, overscan: 6, initialRect: { width: 1000, height: 480 } });
  const items = virt.getVirtualItems();
  const padTop = items.length ? items[0].start : 0;
  const padBottom = items.length ? virt.getTotalSize() - items[items.length - 1].end : 0;
  const heads = ['Take-home', 'Income tax', 'Expenses', 'EMIs', 'Invested', 'Portfolio', 'EPF', 'Cash', 'Liabilities', 'Net worth', 'Today’s ₹', ...(baselineDiff ? ['vs baseline'] : []), 'Notes'];
  const stickyCell = 'sticky left-0 z-[1] bg-surface';
  return (
    <div ref={scroller} className="max-h-[480px] overflow-auto rounded-lg border border-line bg-surface" tabIndex={0} aria-label="Year-by-year projection table">
      <table className="table-fin w-full min-w-[1120px] [&_td]:whitespace-nowrap [&_td:first-child]:pl-4 [&_th:first-child]:pl-4">
        <thead className="sticky top-0 z-[2] bg-surface shadow-[inset_0_-1px_0_rgb(var(--border))]">
          <tr>
            <th scope="col" className={`${stickyCell} z-[3]`}>
              Year · age
            </th>
            {heads.map((h) => (
              <th key={h || 'flags'} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {padTop > 0 && (
            <tr aria-hidden style={{ height: padTop }}>
              <td colSpan={heads.length + 1} />
            </tr>
          )}
          {items.map((it) => {
            if (it.index === rows.length) {
              return (
                <tr key="close" style={{ height: ROW_H }} className="border-t-2 border-line">
                  <th scope="row" className={`${stickyCell} text-left font-semibold text-evergreen`}>
                    1 Jan {close.year} · {close.age}
                  </th>
                  <td colSpan={9} className="font-sans text-xs text-grey">
                    Closing position, same as 31 December {close.year - 1}
                  </td>
                  <td className="font-semibold text-evergreen">{money(close.netWorth)}</td>
                  <td>{money(close.netWorthReal)}</td>
                  {baselineDiff && <td>{baselineDiff.get(close.year) != null ? signed(baselineDiff.get(close.year)!, money) : '—'}</td>}
                  <td />
                </tr>
              );
            }
            const r = rows[it.index];
            const isSel = selected === r.year;
            const diff = baselineDiff?.get(r.year + 1);
            return (
              <tr key={r.year} style={{ height: ROW_H }} onClick={() => onSelect(r.year)} aria-selected={isSel} className={`group cursor-pointer ${isSel ? '[&>*]:bg-mint' : 'hover:[&>*]:bg-muted/60'}`}>
                <th scope="row" className={`${stickyCell} text-left font-normal`}>
                  <button type="button" className="hit font-semibold text-evergreen" onClick={() => onSelect(r.year)}>
                    {r.year}
                  </button>
                  <span className="num ml-2 text-xs text-grey">{r.age}</span>
                </th>
                <td>{money(r.income)}</td>
                <td className="text-grey">{r.incomeTax > 0 ? money(r.incomeTax) : '—'}</td>
                <td>{money(r.expenses)}</td>
                <td>{money(r.debtPayments)}</td>
                <td>{money(r.contributions)}</td>
                <td>{money(r.portfolio)}</td>
                <td>{money(r.epf)}</td>
                <td className={r.cash < 0 ? 'text-danger' : ''}>{money(r.cash)}</td>
                <td>{money(r.liabilities)}</td>
                <td className="font-semibold text-evergreen">{money(r.netWorth)}</td>
                <td>{money(r.netWorthReal)}</td>
                {baselineDiff && <td className={diff != null && diff < 0 ? 'text-danger' : 'text-forest'}>{diff != null ? signed(diff, money) : '—'}</td>}
                <td className="font-sans">
                  <span className="flex gap-2">
                    {r.events.length > 0 && <Badge>{r.events.length} event{r.events.length > 1 ? 's' : ''}</Badge>}
                    {r.flags.includes('goal-shortfall') && <Badge tone="bad">Goal unpaid</Badge>}
                    {r.flags.includes('borrowing') && <Badge tone="warn">Borrowing</Badge>}
                  </span>
                </td>
              </tr>
            );
          })}
          {padBottom > 0 && (
            <tr aria-hidden style={{ height: padBottom }}>
              <td colSpan={heads.length + 1} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const signed = (v: number, money: (n: number) => string) => `${v >= 0 ? '+' : '−'}${money(Math.abs(v))}`;
