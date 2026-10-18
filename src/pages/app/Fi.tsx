import { useMemo } from 'react';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Stat, Slider, Progress, Disclaimer, Notice } from '@/components/ui';
import { WealthChart, WealthLegend } from '@/components/charts/WealthChart';
import { fiAnalysis } from '@/finance/fi';
import { formatPct } from '@/finance/money';
import { fiAgeBounds } from '@/finance/validate';

export default function Fi() {
  const plan = usePlan();
  const money = useMoney();
  const update = useStore((s) => s.updateProfile);
  const updateA = useStore((s) => s.updateAssumptions);
  const { profile: p, assumptions: a, fi } = plan;
  const bounds = fiAgeBounds(p.about.age);

  const impacts = useMemo(() => {
    const extra = [5000, 10000, 20000].map((x) => ({ label: `Invest ${money(x)} more a month`, r: fiAnalysis(p, a, { extraMonthlyInvestment: x }) }));
    const delays = [2, 5]
      .filter((d) => p.about.fiAge + d <= bounds.max)
      .map((d) => ({ label: `Target age ${p.about.fiAge + d} instead of ${p.about.fiAge}`, r: fiAnalysis({ ...p, about: { ...p.about, fiAge: p.about.fiAge + d } }, a) }));
    const spend = { label: `Spend ${money(5000)} less a month`, r: fiAnalysis(p, a, { expenseCut: 5000 }) };
    return [...extra, spend, ...delays];
  }, [p, a, money, bounds.max]);

  return (
    <div className="flex flex-col gap-14">
      <PageHeader title="Financial Independence" description="When could your investments cover your living costs? An illustrative estimate built on your expenses, your projection and a withdrawal-rate assumption." />

      <div className="grid gap-12 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Slider label="Target FI age" value={Math.min(bounds.max, Math.max(bounds.min, p.about.fiAge))} min={bounds.min} max={bounds.max} step={1} onChange={(v) => update((x) => void (x.about.fiAge = v))} format={(v) => `${v}`} />
          <Slider label="Withdrawal rate" value={a.withdrawalRate} min={0.025} max={0.05} step={0.0025} onChange={(v) => updateA({ withdrawalRate: v })} format={(v) => formatPct(v, 2)} help="Share of the corpus withdrawn in the first year. Lower is more cautious. Many Indian planners suggest 3–3.5% given higher inflation." />
          <Slider label="Inflation" value={a.inflation} min={0.03} max={0.1} step={0.0025} onChange={(v) => updateA({ inflation: v })} format={(v) => formatPct(v)} />
          <div className="mt-4 rounded border-l-2 border-champagne pl-4 text-sm leading-relaxed text-grey">
            <p className="font-semibold text-evergreen">How it’s calculated</p>
            <p className="mt-1">Target = living expenses in the target year ÷ withdrawal rate, plus any loans still outstanding then. Expenses are inflated each year and include recurring costs from life events.</p>
            <p className="mt-2">Financial assets = investments + EPF/PPF/NPS + cash. Your home is excluded because you need somewhere to live.</p>
          </div>
        </div>
        <div className="lg:col-span-8">
          <dl className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <Stat label={`Target corpus at ${fi.targetAge}`} value={money(fi.targetCorpus)} def="fiTarget" sub={`${money(fi.targetCorpusReal)} in today’s ₹`} />
            <Stat label="Projected corpus" value={money(fi.projectedCorpus)} sub={`in ${fi.targetYear}`} />
            <Stat label="Funding gap" value={fi.gap > 0 ? money(fi.gap) : 'None'} tone={fi.gap > 0 ? 'negative' : undefined} def="fiGap" />
            <Stat label="Estimated FI year" value={fi.fiYear ? String(fi.fiYear) : 'Not reached'} sub={fi.fiAge ? `on 1 January, age ${fi.fiAge}` : `Projection runs to ${fi.sim.points.at(-1)!.year}, age ${fi.sim.points.at(-1)!.age}`} />
            <Stat label="Extra monthly investment needed" value={fi.gap === 0 ? 'None' : fi.extraMonthlyNeeded === null ? 'Not reachable' : money(fi.extraMonthlyNeeded)} sub={fi.gap > 0 ? `rising ${formatPct(a.sipStepUp, 0)} a year` : 'You’re on track'} />
            <div>
              <p className="eyebrow">Progress</p>
              <p className="num mt-1.5 text-2xl font-semibold text-evergreen">{Math.round(fi.progress * 100)}%</p>
              <div className="mt-2"><Progress value={fi.progress} label="FI progress" /></div>
            </div>
          </dl>
          <div className="mt-10">
            <WealthChart points={fi.sim.points} mode="nominal" height={300} showEvents={false} showFiTarget ariaLabel="Net worth compared with the FI target" />
            <div className="mt-3"><WealthLegend mode="nominal" fi /></div>
            <p className="mt-2 text-xs text-grey">The chart shows net worth (including property), while the FI test uses financial assets only.</p>
          </div>
        </div>
      </div>

      <Section title="What would change the date?" description="Each row reruns the full projection with one change.">
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="table-fin w-full min-w-[600px]">
            <thead><tr><th scope="col">Change</th><th scope="col">Corpus at target age</th><th scope="col">Progress</th><th scope="col">Estimated FI age</th></tr></thead>
            <tbody>
              <tr className="bg-mint/40"><td className="font-sans font-semibold text-evergreen">Current plan</td><td>{money(fi.projectedCorpus)}</td><td>{Math.round(fi.progress * 100)}%</td><td>{fi.fiAge ?? 'Not reached'}</td></tr>
              {impacts.map((x) => (
                <tr key={x.label}><td className="font-sans text-evergreen">{x.label}</td><td>{money(x.r.projectedCorpus)}</td><td>{Math.round(x.r.progress * 100)}%</td><td>{x.r.fiAge ?? 'Not reached'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-grey">Extra investments step up {formatPct(a.sipStepUp, 0)} a year and are assumed to come from new money, such as a raise or bonus. Spending less also lowers the target itself.</p>
      </Section>

      {fi.sim.rows.some((r) => r.flags.includes('borrowing')) && <Notice tone="warning">The projection runs out of liquid assets in some years, so the FI estimate is less reliable. Review your Budget and Life Events.</Notice>}
      <Disclaimer>A withdrawal-rate model is a simplification. It cannot guarantee lifelong financial security. Sequence of returns, healthcare costs, longevity, taxes and changing rules can all make a corpus last a shorter or longer time than this estimate suggests.</Disclaimer>
    </div>
  );
}
