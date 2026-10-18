import type { TornadoBar } from '@/finance/scenarios';
import { useMoney } from '@/state/selectors';
import { useChartTheme } from './theme';

/**
 * Tornado chart: one row per assumption, bars running left (conservative setting) and right
 * (high-growth setting) from the base case. Widest at the top.
 */
export function Tornado({ bars, lowLabel, highLabel }: { bars: TornadoBar[]; lowLabel: string; highLabel: string }) {
  const t = useChartTheme();
  const money = useMoney();
  const max = Math.max(1, ...bars.flatMap((b) => [Math.abs(b.low), Math.abs(b.high)]));
  const bar = (v: number) => ({ width: `${(Math.abs(v) / max) * 50}%`, [v < 0 ? 'right' : 'left']: '50%' });
  return (
    <figure>
      <div className="mb-2 grid grid-cols-[minmax(7rem,9rem)_1fr] text-[11px] text-grey">
        <span />
        <span className="flex justify-between">
          <span>← lower</span>
          <span>base case</span>
          <span>higher →</span>
        </span>
      </div>
      <ul className="flex flex-col gap-2" aria-label={`Change in final net worth, today’s rupees, when each assumption moves alone to the ${lowLabel.toLowerCase()} or ${highLabel.toLowerCase()} setting`}>
        {bars.map((b) => (
          <li key={b.driver} className="grid grid-cols-[minmax(7rem,9rem)_1fr] items-center gap-3">
            <span className="text-[13px] text-charcoal">{b.label}</span>
            <span className="relative block h-7 rounded-sm bg-line/40">
              <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-grey/50" />
              {[{ v: b.low, color: t.scenario.conservative, name: lowLabel }, { v: b.high, color: t.scenario.high, name: highLabel }].map((x) => (
                <span key={x.name} className="absolute inset-y-1 rounded-sm" style={{ ...bar(x.v), background: x.color }} title={`${x.name}: ${x.v >= 0 ? '+' : ''}${money(x.v)}`} />
              ))}
              <span className="sr-only">
                {lowLabel}: {money(b.low)}. {highLabel}: {money(b.high)}.
              </span>
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-grey">
        <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-[2px]" style={{ background: t.scenario.conservative }} />{lowLabel} setting</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-[2px]" style={{ background: t.scenario.high }} />{highLabel} setting</span>
      </figcaption>
    </figure>
  );
}
