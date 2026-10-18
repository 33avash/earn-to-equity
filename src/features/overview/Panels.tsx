import { useEffect, useState } from 'react';

function useWide(query = '(min-width: 768px)') {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return wide;
}
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Plan } from '@/state/selectors';
import { useMoney } from '@/state/selectors';
import { formatPct } from '@/finance/money';
import { WealthChart, WealthLegend, type WealthMode } from '@/components/charts/WealthChart';
import { AllocationBar, AllocationLegend } from '@/components/charts/Bars';
import { Progress, Segmented } from '@/components/ui';
import { AnimatedNumber } from '@/components/motion/Motion';

export function TrajectoryPanel({ plan, height = 320, interactive = true }: { plan: Plan; height?: number; interactive?: boolean }) {
  const [mode, setMode] = useState<WealthMode>('both');
  const [range, setRange] = useState<'5' | '10' | '20'>('20');
  // Range N shows today plus N annual points, so 20Y ends on the plan's headline year.
  const points = plan.sim.points.slice(0, Number(range) + 1);
  const end = points[points.length - 1];
  const money = useMoney();
  const wide = useWide();
  return (
    <div>
      {interactive && (
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <Segmented
            label="Time range"
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { value: '5', label: '5Y' },
              { value: '10', label: '10Y' },
              { value: '20', label: '20Y' },
            ]}
          />
          <Segmented
            label="Values shown"
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'both', label: 'Both' },
              { value: 'nominal', label: 'Future ₹' },
              { value: 'real', label: 'Today’s ₹' },
            ]}
          />
        </div>
      )}
      <div className="relative">
        {/* Projection read-out floats over the empty upper-left of the chart */}
        <div className="glass relative z-10 mb-4 inline-flex flex-wrap gap-x-8 gap-y-3 px-5 py-4 md:absolute md:left-14 md:top-0 md:mb-0">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-grey">
              Projected, {end.year} · age {end.age}
            </p>
            <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-evergreen"><AnimatedNumber value={end.netWorth} format={money} /></p>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-grey">In today’s rupees</p>
            <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-[#8a6a33] dark:text-champagne"><AnimatedNumber value={end.netWorthReal} format={money} /></p>
          </div>
        </div>
        <WealthChart points={points} mode={mode} height={height + (wide ? 72 : 0)} topPad={wide ? 92 : 16} />
      </div>
      <div className="mt-3">
        <WealthLegend mode={mode} />
      </div>
    </div>
  );
}

export function FiPanel({ plan }: { plan: Plan }) {
  const money = useMoney();
  const fi = plan.fi;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">Financial independence by {fi.targetAge}</p>
        <span className="num text-sm font-semibold text-evergreen">{Math.round(fi.progress * 100)}%</span>
      </div>
      <Progress value={fi.progress} label="Progress towards the financial independence target" tone={fi.progress >= 1 ? 'forest' : 'champagne'} />
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-grey">Target corpus ({fi.targetYear})</dt>
          <dd className="num font-semibold text-evergreen">{money(fi.targetCorpus)}</dd>
        </div>
        <div>
          <dt className="text-xs text-grey">Projected</dt>
          <dd className="num font-semibold text-evergreen">{money(fi.projectedCorpus)}</dd>
        </div>
        <div>
          <dt className="text-xs text-grey">Remaining gap</dt>
          <dd className={`num font-semibold ${fi.gap > 0 ? 'text-danger' : 'text-forest'}`}>{fi.gap > 0 ? money(fi.gap) : 'None'}</dd>
        </div>
        <div>
          <dt className="text-xs text-grey">Estimated FI age</dt>
          <dd className="num font-semibold text-evergreen">{fi.fiAge ? `${fi.fiAge} (${fi.fiYear})` : 'Not reached'}</dd>
        </div>
      </dl>
    </div>
  );
}

export function AllocationPanel({ plan, showTarget = true }: { plan: Plan; showTarget?: boolean }) {
  const money = useMoney();
  const total = plan.sheet.investments;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">Portfolio · {money(total)}</p>
        <span className="text-xs text-grey">Assumed return {formatPct(plan.portfolioReturn)}</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-[11px] text-grey">Current</span>
          <AllocationBar weights={plan.currentAllocation} label="Current allocation" />
        </div>
        {showTarget && (
          <div className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-[11px] text-grey">Target</span>
            <AllocationBar weights={plan.profile.preferences.targetAllocation} label="Target allocation" />
          </div>
        )}
      </div>
      <AllocationLegend weights={plan.currentAllocation} compare={showTarget ? plan.profile.preferences.targetAllocation : undefined} />
      {showTarget && <p className="text-[11px] text-grey">Shown as current / target share</p>}
    </div>
  );
}

export function NextStepsPanel({ plan, limit = 4, linkable = true }: { plan: Plan; limit?: number; linkable?: boolean }) {
  const items = plan.insights.slice(0, limit);
  if (!items.length) {
    return <p className="text-sm text-grey">Nothing urgent stands out. Your plan covers the basics. Explore the Wealth Simulator to test different futures.</p>;
  }
  return (
    <ol className="flex flex-col">
      {items.map((i, k) => (
        <li key={i.id} className="border-t border-line py-4 first:border-t-0 first:pt-0">
          <div className="flex gap-4">
            <span className="num pt-0.5 text-xs text-champagne">{String(k + 1).padStart(2, '0')}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-evergreen">{i.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-grey">{i.detail}</p>
              {linkable && (
                <Link to={i.link} className="hit mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-forest hover:underline">
                  Open <ArrowRight size={13} aria-hidden />
                </Link>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
