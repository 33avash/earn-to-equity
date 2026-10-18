import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ArrowRight, Check } from 'lucide-react';
import { kpis, monthWaterfall, useMoney, type Kpi, type Plan } from '@/state/selectors';
import { useStore } from '@/state/store';
import { formatPct } from '@/finance/money';
import { useChartTheme } from '@/components/charts/theme';
import { AnimatedNumber } from '@/components/motion/Motion';

export function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const W = 96;
  const H = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - 2 - ((v - min) / span) * (H - 4)}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className={className}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function DeltaChip({ k, money }: { k: Kpi; money: (v: number) => string }) {
  if (!k.delta) return k.note ? <span className="text-[11.5px] text-grey">{k.note}</span> : null;
  const { value, kind } = k.delta;
  if (k.key === 'fiAge') {
    return (
      <span className="text-[11.5px] text-grey">
        <span className="num font-medium text-charcoal">{formatPct(value, 0)}</span> {k.note}
      </span>
    );
  }
  const up = value >= 0;
  const text = kind === 'money' ? money(Math.abs(value)) : kind === 'pts' ? `${(Math.abs(value) * 100).toFixed(1)} pts` : formatPct(Math.abs(value), 0);
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="flex items-center gap-1.5 text-[11.5px] text-grey">
      <span className={`num inline-flex items-center gap-0.5 rounded-sm px-1 py-px font-medium ${up ? 'bg-forest/10 text-forest' : 'bg-danger/10 text-danger'}`}>
        <Icon size={12} aria-hidden />
        <span className="sr-only">{up ? 'up' : 'down'}</span>
        {text}
      </span>
      {k.note}
    </span>
  );
}

export function KpiStrip({ plan }: { plan: Plan }) {
  const money = useMoney();
  const items = kpis(plan);
  const fmt = (k: Kpi) => (v: number) => (k.kind === 'money' ? money(v) : k.kind === 'pct' ? formatPct(v, 0) : String(Math.round(v)));
  const links: Record<Kpi['key'], string> = { netWorth: '/app/simulator', surplus: '/app/budget', savingsRate: '/app/budget', fiAge: '/app/fi', health: '/app/health' };
  return (
    <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
      {items.map((k) => (
        <li key={k.key} className="bg-surface">
          <Link to={links[k.key]} className="group flex h-full flex-col gap-2 p-4 transition-colors hover:bg-muted/50">
            <span className="flex items-center justify-between text-[12.5px] text-grey">
              {k.label}
              <ArrowRight size={13} className="opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </span>
            <span className="flex items-end justify-between gap-2">
              <span className={`text-[24px] font-semibold leading-none tracking-[-0.03em] [&_.num]:font-sans ${k.value !== null && k.kind === 'money' && k.value < 0 ? 'text-danger' : 'text-evergreen'}`}>
                {k.value === null ? <span className="text-[17px]">Not reached</span> : <AnimatedNumber value={k.value} format={fmt(k)} />}
                {k.kind === 'score' && <span className="text-[13px] font-normal text-grey">/100</span>}
              </span>
              <Sparkline values={k.spark} className="hidden shrink-0 text-forest sm:block" />
            </span>
            <DeltaChip k={k} money={money} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** This month as a waterfall from take-home to what is left unassigned. */
export function MonthWaterfall({ plan }: { plan: Plan }) {
  const money = useMoney();
  const t = useChartTheme();
  const bars = monthWaterfall(plan);
  const max = Math.max(1, ...bars.map((b) => b.to));
  const min = Math.min(0, ...bars.map((b) => b.from));
  const span = max - min;
  const colors: Record<string, string> = { income: t.chart[0], essential: t.chart[1], lifestyle: t.chart[5], debt: t.chart[3], invest: t.chart[0], save: t.chart[2], left: t.muted };
  return (
    <div>
      <ul className="flex flex-col gap-2" aria-label="This month, from take-home to unassigned">
        {bars.map((b) => (
          <li key={b.key} className="grid grid-cols-[84px_1fr_auto] items-center gap-3 text-[13px]">
            <span className="text-grey">{b.label}</span>
            <span className="relative h-5 rounded-sm bg-muted/60">
              <span className="absolute inset-y-0 rounded-sm" style={{ left: `${((b.from - min) / span) * 100}%`, width: `${Math.max(0.5, ((b.to - b.from) / span) * 100)}%`, background: colors[b.key], opacity: b.kind === 'total' ? 1 : 0.85 }} />
            </span>
            <span className={`num w-[86px] text-right ${b.kind === 'total' ? 'font-semibold text-evergreen' : 'text-charcoal'} ${b.value < 0 && b.kind === 'total' ? 'text-danger' : ''}`}>
              {b.kind === 'step' ? `−${money(-b.value)}` : money(b.value)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-grey">SIPs and savings are transfers to your future self, not spending.</p>
    </div>
  );
}

/** Next steps you can tick off. Ticked steps are remembered and move to the end. */
export function NextStepsChecklist({ plan, limit = 6 }: { plan: Plan; limit?: number }) {
  const done = useStore((s) => s.doneSteps);
  const toggle = useStore((s) => s.toggleStep);
  const items = [...plan.insights.slice(0, limit)].sort((a, b) => Number(!!done[a.id]) - Number(!!done[b.id]));
  if (!items.length) return <p className="text-sm text-grey">Nothing urgent. Try a stress test in the Risk Lab.</p>;
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {items.map((i) => {
        const isDone = !!done[i.id];
        return (
          <li key={i.id} className="flex gap-3 p-4">
            <button
              type="button"
              role="checkbox"
              aria-checked={isDone}
              aria-label={`Mark “${i.title}” as ${isDone ? 'not done' : 'done'}`}
              onClick={() => toggle(i.id)}
              className={`hit mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${isDone ? 'border-forest bg-forest text-onbrand' : 'border-sage hover:border-forest'}`}
            >
              {isDone && <Check size={13} strokeWidth={3} aria-hidden />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-[14px] font-medium ${isDone ? 'text-grey line-through' : 'text-evergreen'}`}>{i.title}</p>
              {!isDone && <p className="mt-1 text-[13px] leading-relaxed text-grey">{i.detail}</p>}
            </div>
            {!isDone && (
              <Link to={i.link} className="hit shrink-0 self-center text-[13px] font-medium text-forest hover:underline">
                Open
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
