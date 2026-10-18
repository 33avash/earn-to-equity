import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from 'recharts';
import { formatAxis } from '@/finance/money';
import { useMoney } from '@/state/selectors';
import { axisProps, useChartTheme } from './theme';

interface TipRow {
  name: string;
  value: number;
  color: string;
}
function MoneyTip({ title, rows }: { title: string; rows: TipRow[] }) {
  const money = useMoney();
  return (
    <div className="glass min-w-[180px] px-3.5 py-2.5 text-xs">
      <p className="mb-1 font-semibold text-evergreen">{title}</p>
      {rows.map((r) => (
        <p key={r.name} className="num flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-grey">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: r.color }} />
            {r.name}
          </span>
          <span className="font-semibold">{money(r.value)}</span>
        </p>
      ))}
    </div>
  );
}

/** Stacked contributions + gains (SIP growth). */
export function ContribGainsChart({ data, height = 280, compareKey }: { data: { year: number; contributions: number; gains: number; compare?: number }[]; height?: number; compareKey?: string }) {
  const t = useChartTheme();
  const gains = t.secondary;
  return (
    <div style={{ height }} role="img" aria-label="Contributions and estimated gains by year">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey="year" {...axisProps(t)} tickFormatter={(v) => `Y${v}`} interval="preserveStartEnd" minTickGap={16} />
          <YAxis {...axisProps(t)} tickFormatter={formatAxis} width={52} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <MoneyTip
                  title={`End of year ${label}`}
                  rows={[
                    { name: 'Contributions', value: (payload[0].payload as { contributions: number }).contributions, color: t.primary },
                    { name: 'Estimated gains', value: (payload[0].payload as { gains: number }).gains, color: gains },
                    { name: 'Total value', value: (payload[0].payload as { contributions: number; gains: number }).contributions + (payload[0].payload as { gains: number }).gains, color: 'transparent' },
                    ...(compareKey ? [{ name: compareKey, value: (payload[0].payload as { compare: number }).compare, color: t.axis }] : []),
                  ]}
                />
              ) : null
            }
          />
          <Area animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="contributions" stackId="1" stroke={t.primary} fill={t.primary} fillOpacity={0.85} name="Contributions" />
          <Area animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="gains" stackId="1" stroke={gains} fill={gains} fillOpacity={0.7} name="Estimated gains" />
          {compareKey && <Line animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="compare" stroke={t.axis} strokeDasharray="5 4" strokeWidth={2} dot={false} name={compareKey} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Multiple named series on one axis (scenarios, before/after, debt strategies). */
export function MultiLineChart({
  data,
  series,
  xKey,
  height = 280,
  xFormat,
  ariaLabel,
}: {
  data: Record<string, number>[];
  series: { key: string; name: string; color: string; dashed?: boolean }[];
  xKey: string;
  height?: number;
  xFormat?: (v: number) => string;
  ariaLabel: string;
}) {
  const t = useChartTheme();
  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey={xKey} {...axisProps(t)} tickFormatter={xFormat} interval="preserveStartEnd" minTickGap={20} />
          <YAxis {...axisProps(t)} tickFormatter={formatAxis} width={52} />
          <Tooltip
            cursor={{ stroke: t.axis, strokeDasharray: '3 3' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <MoneyTip
                  title={xFormat ? xFormat(label as number) : String(label)}
                  rows={series.map((s) => ({ name: s.name, value: (payload[0].payload as Record<string, number>)[s.key], color: s.color }))}
                />
              ) : null
            }
          />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: t.axis, paddingTop: 8 }} />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '5 4' : undefined} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Monte Carlo percentile band (10th–90th) with the median path. */
export function FanChart({ data, baseline, height = 300 }: { data: { year: number; p10: number; p50: number; p90: number }[]; baseline?: number[]; height?: number }) {
  const t = useChartTheme();
  const rows = data.map((d, i) => ({ year: d.year, base: d.p10, band: d.p90 - d.p10, p10: d.p10, p50: d.p50, p90: d.p90, baseline: baseline?.[i] }));
  return (
    <div style={{ height }} role="img" aria-label="Range of simulated net worth outcomes: 10th to 90th percentile with median">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey="year" {...axisProps(t)} interval="preserveStartEnd" minTickGap={20} />
          <YAxis {...axisProps(t)} tickFormatter={formatAxis} width={52} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <MoneyTip
                  title={`1 January ${label}`}
                  rows={[
                    { name: '90th percentile', value: (payload[0].payload as { p90: number }).p90, color: t.muted },
                    { name: 'Median', value: (payload[0].payload as { p50: number }).p50, color: t.primary },
                    { name: '10th percentile', value: (payload[0].payload as { p10: number }).p10, color: t.muted },
                    ...(baseline ? [{ name: 'Deterministic plan', value: (payload[0].payload as { baseline: number }).baseline, color: t.secondary }] : []),
                  ]}
                />
              ) : null
            }
          />
          <Area animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="base" stackId="b" stroke="none" fill="transparent" />
          <Area animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="band" stackId="b" stroke="none" fill={t.muted} fillOpacity={0.35} name="10th–90th percentile" />
          <Area animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="p90" stroke={t.axis} strokeWidth={1} strokeDasharray="3 3" fill="none" name="90th percentile" />
          <Area animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="p10" stroke={t.axis} strokeWidth={1} strokeDasharray="3 3" fill="none" name="10th percentile" />
          <Area animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="p50" stroke={t.primary} strokeWidth={2} fill="none" name="Median" />
          {baseline && <Area animationDuration={900} animationEasing="ease-out" type="monotone" dataKey="baseline" stroke={t.secondary} strokeDasharray="5 4" strokeWidth={2} fill="none" name="Deterministic plan" />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
