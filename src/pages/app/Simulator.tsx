import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlan, useMoney, baselineComparison } from '@/state/selectors';
import { ScenarioSection, YearInspector } from '@/features/simulator/Sections';
import { ProjectionTable } from '@/features/simulator/ProjectionTable';
import { exportProjectionCsv } from '@/services/export';
import { Bookmark, Download } from 'lucide-react';
import { useStore } from '@/state/store';
import { PageHeader, Section, Field, PercentInput, Segmented, Disclaimer, Button, toast } from '@/components/ui';
import { WealthChart, WealthLegend, type WealthMode } from '@/components/charts/WealthChart';
import { MultiLineChart } from '@/components/charts/SeriesCharts';
import { useChartTheme } from '@/components/charts/theme';
import { formatPct } from '@/finance/money';

export default function Simulator() {
  const plan = usePlan();
  const money = useMoney();
  const t = useChartTheme();
  const baseline = useStore((s) => s.baseline);
  const saveBaseline = useStore((s) => s.saveBaseline);
  const clearBaseline = useStore((s) => s.clearBaseline);
  const update = useStore((s) => s.updateProfile);
  const updateA = useStore((s) => s.updateAssumptions);
  const { profile: p, assumptions: a } = plan;
  const [mode, setMode] = useState<WealthMode>('both');
  const [selected, setSelected] = useState<number | null>(p.planStartYear + 4);

  const cmp = useMemo(() => (baseline ? baselineComparison(plan, baseline) : null), [plan, baseline]);
  const rows = plan.sim.rows;
  const close = plan.sim.points.at(-1)!;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Wealth simulator" description="Twenty years of take-home, tax, spending, EMIs, investments, EPF, goals and life events, one year at a time." />

      <Section title="Core assumptions" description="Edit the base case. Every module updates immediately.">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Salary growth">{(id) => <PercentInput id={id} value={p.income.salaryGrowth} min={-20} max={50} onChange={(v) => update((x) => void (x.income.salaryGrowth = v))} />}</Field>
          <Field label="Inflation">{(id) => <PercentInput id={id} value={a.inflation} max={20} onChange={(v) => updateA({ inflation: v })} />}</Field>
          <Field label="Annual SIP step-up">{(id) => <PercentInput id={id} value={a.sipStepUp} max={50} onChange={(v) => updateA({ sipStepUp: v })} />}</Field>
          <Field label="Portfolio return" help="Weighted from your target allocation. Edit asset-class returns in the Portfolio Builder.">
            {() => <p className="num flex h-10 items-center text-sm font-semibold text-evergreen">{formatPct(plan.portfolioReturn)} <Link to="/app/portfolio" className="hit ml-2 text-xs font-normal text-forest hover:underline">edit</Link></p>}
          </Field>
        </div>
      </Section>

      <Section
        title="Projected net worth"
        description="Click any year on the chart or in the table to inspect it."
        actions={<Segmented label="Values shown" size="sm" value={mode} onChange={setMode} options={[{ value: 'both', label: 'Both' }, { value: 'nominal', label: 'Future ₹' }, { value: 'real', label: 'Today’s ₹' }]} />}
      >
        <WealthChart points={plan.sim.points} mode={mode} height={360} selectedYear={selected} onSelectYear={setSelected} showFiTarget />
        <div className="mt-3"><WealthLegend mode={mode} fi /></div>
      </Section>

      <YearInspector plan={plan} selected={selected} setSelected={setSelected} />

      <Section
        title="Year-by-year projection"
        description={`Flows for each calendar year and balances on 31 December, in future rupees. The last line is your position on 1 January ${close.year}, the date every headline figure uses.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={<Bookmark size={14} />} onClick={() => { saveBaseline(`Saved ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`); toast('Saved as your comparison baseline'); }}>
              {baseline ? 'Replace baseline' : 'Save as baseline'}
            </Button>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={() => exportProjectionCsv(plan)}>
              Export CSV
            </Button>
          </div>
        }
      >
        {cmp && baseline && (
          <div className="well mb-6 p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="text-sm text-charcoal">
                Compared with <strong className="text-evergreen">{baseline.label}</strong>:{' '}
                {cmp.finalDiff === null ? 'no overlap in years.' : <>net worth in {close.year} is <strong className={`num ${cmp.finalDiff < 0 ? 'text-danger' : 'text-forest'}`}>{cmp.finalDiff >= 0 ? '+' : '−'}{money(Math.abs(cmp.finalDiff))}</strong></>}
                {cmp.fiChange !== null && cmp.fiChange !== 0 && <>, and FI comes {Math.abs(cmp.fiChange)} year{Math.abs(cmp.fiChange) === 1 ? '' : 's'} {cmp.fiChange < 0 ? 'earlier' : 'later'}</>}.
              </p>
              <Button variant="ghost" size="sm" onClick={clearBaseline}>Clear baseline</Button>
            </div>
            <div className="mt-4">
              <MultiLineChart
                data={cmp.points.map((x) => ({ year: x.year, current: x.current, baseline: x.baseline ?? Number.NaN }))}
                xKey="year"
                height={220}
                ariaLabel="Net worth: current plan versus saved baseline"
                series={[{ key: 'baseline', name: baseline.label, color: t.muted, dashed: true }, { key: 'current', name: 'Current plan', color: t.primary }]}
              />
            </div>
          </div>
        )}
        <ProjectionTable rows={rows} close={close} money={money} selected={selected} onSelect={setSelected} baselineDiff={cmp ? new Map(cmp.points.map((x) => [x.year, x.diff])) : undefined} />
      </Section>

      <ScenarioSection plan={plan} />

      <Disclaimer>Projections are estimates, not guarantees. Constant annual returns are assumed here. See the Risk Lab for market declines and a range of outcomes.</Disclaimer>
    </div>
  );
}
