import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProjectionPoint } from '@/types/sim';
import { formatAxis } from '@/finance/money';
import { useMoney } from '@/state/selectors';
import { axisProps, useChartTheme } from './theme';

export type WealthMode = 'nominal' | 'real' | 'both';

interface Props {
  points: ProjectionPoint[]; // today, then 1 January of each following year
  mode?: WealthMode;
  height?: number;
  selectedYear?: number | null; // a calendar year of the projection (its flows end at point year + 1)
  onSelectYear?: (year: number) => void;
  showEvents?: boolean;
  showFiTarget?: boolean;
  ariaLabel?: string;
  topPad?: number; // extra space above the plot, e.g. for an overlaid read-out
  /** P10–P90 range from simulated market paths, by point year, in the same rupees as the main line. */
  band?: Map<number, { p10: number; p90: number }>;
}

/**
 * The dominant wealth-trajectory chart. Net worth in future rupees (area) and in today's
 * rupees (dashed line), one point per 1 January. Life events are marked at the start of the year
 * they happen; clicking a point selects the year that ended there.
 */
export function WealthChart({ points, mode = 'both', height = 320, selectedYear, onSelectYear, showEvents = true, showFiTarget = false, ariaLabel, topPad = 16, band }: Props) {
  const t = useChartTheme();
  const money = useMoney();
  const data = points.map((pt, i) => {
    const b = band?.get(pt.year);
    const start = mode === 'real' ? pt.netWorthReal : pt.netWorth;
    return { year: pt.year, age: pt.age, today: i === 0, netWorth: pt.netWorth, real: pt.netWorthReal, fiTarget: pt.fiTarget, events: pt.events, row: pt.row, band: b ? [b.p10, b.p90] : band && i === 0 ? [start, start] : undefined, p10: b?.p10, p90: b?.p90 };
  });
  const rows = points.flatMap((pt) => (pt.row ? [pt.row] : []));
  const startYear = points[0].year;
  const showNominal = mode !== 'real';
  const showReal = mode !== 'nominal';
  const gid = `wg-${t.dark ? 'd' : 'l'}`;
  // Label an event only if it is at least 3 years after the last labelled one, so text never collides.
  let lastLabelled = -Infinity;
  const eventRows = rows
    .filter((r) => r.events.length)
    .map((r) => {
      const labelled = r.year - lastLabelled >= 3;
      if (labelled) lastLabelled = r.year;
      return { r, labelled };
    });

  return (
    <div role="img" aria-label={ariaLabel ?? `Projected net worth from ${startYear} to ${points[points.length - 1].year}`} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: topPad, right: 12, bottom: 0, left: 0 }}
          onClick={(e) => {
            const i = e?.activeTooltipIndex;
            const y = i === undefined || i === null ? undefined : data[Number(i)]?.row?.year;
            if (y && onSelectYear) onSelectYear(y);
          }}
          style={{ cursor: onSelectYear ? 'pointer' : undefined }}
        >
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={t.primaryFill} stopOpacity={0.18} />
              <stop offset="100%" stopColor={t.primaryFill} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey="year" {...axisProps(t)} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...axisProps(t)} tickFormatter={formatAxis} width={52} />
          <Tooltip
            cursor={{ stroke: t.axis, strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[number];
              return (
                <div className="glass min-w-[180px] px-3.5 py-2.5 text-xs">
                  <p className="mb-1 font-semibold text-evergreen">{d.today ? `Today · age ${d.age}` : `1 January ${d.year} · age ${d.age}`}</p>
                  {showNominal && (
                    <p className="num flex justify-between gap-6">
                      <span className="text-grey">Net worth</span>
                      <span className="font-semibold">{money(d.netWorth)}</span>
                    </p>
                  )}
                  {showReal && (
                    <p className="num flex justify-between gap-6">
                      <span className="text-grey">In today’s rupees</span>
                      <span className="font-semibold">{money(d.real)}</span>
                    </p>
                  )}
                  {d.p10 !== undefined && d.p90 !== undefined && (
                    <p className="num flex justify-between gap-6">
                      <span className="text-grey">Range (P10–P90)</span>
                      <span>
                        {money(d.p10)}–{money(d.p90)}
                      </span>
                    </p>
                  )}
                  {showFiTarget && d.fiTarget && (
                    <p className="num flex justify-between gap-6">
                      <span className="text-grey">FI target</span>
                      <span>{money(d.fiTarget)}</span>
                    </p>
                  )}
                  {d.events.length > 0 && <p className="mt-1 text-grey">During {d.year - 1}: {d.events.join(', ')}</p>}
                  {onSelectYear && !d.today && <p className="mt-1 text-[11px] text-grey">Click to inspect {d.year - 1}</p>}
                </div>
              );
            }}
          />
          {showEvents &&
            eventRows.map(({ r, labelled }) => (
              <ReferenceLine
                key={`ev-${r.year}`}
                x={r.year}
                stroke={t.secondary}
                strokeOpacity={0.7}
                strokeDasharray="2 4"
                label={labelled ? { value: r.events[0].length > 16 ? `${r.events[0].slice(0, 15)}…` : r.events[0], position: 'insideTopLeft', fill: t.axis, fontSize: 10.5 } : undefined}
              />
            ))}
          {selectedYear && <ReferenceLine x={selectedYear + 1} stroke={t.primary} strokeWidth={1.5} />}
          {band && <Area isAnimationActive={false} type="monotone" dataKey="band" stroke="none" fill={t.primaryFill} fillOpacity={0.14} name="Range (P10–P90)" activeDot={false} />}
          {showFiTarget && <Line animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="fiTarget" stroke={t.secondary} strokeWidth={1.5} dot={false} name="FI target" connectNulls />}
          {showNominal && (
            <Area animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="netWorth" stroke={t.primary} strokeWidth={2} fill={`url(#${gid})`} name="Net worth" activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }} />
          )}
          {showReal && (
            <Line animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="real" stroke={showNominal ? t.secondary : t.primary} strokeWidth={2} strokeDasharray={showNominal ? '5 4' : undefined} dot={false} name="Today’s rupees" activeDot={{ r: 4 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WealthLegend({ mode, fi, band }: { mode: WealthMode; fi?: boolean; band?: boolean }) {
  const t = useChartTheme();
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-grey">
      {mode !== 'real' && (
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ background: t.primary }} /> Net worth (future rupees)
        </span>
      )}
      {mode !== 'nominal' && (
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: mode === 'real' ? t.primary : t.secondary }} /> In today’s rupees
        </span>
      )}
      {fi && (
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ background: t.secondary }} /> FI target
        </span>
      )}
      {band && (
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: t.primaryFill, opacity: 0.3 }} /> Range of outcomes (10th–90th percentile)
        </span>
      )}
    </div>
  );
}
