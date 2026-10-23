import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ScenarioKey } from '@/types/profile';
import { usePlan, useMoney, scenarioSet, yearInspector, baselineComparison } from '@/state/selectors';
import { ProjectionTable } from '@/features/simulator/ProjectionTable';
import { exportProjectionCsv } from '@/services/export';
import { Bookmark, Download } from 'lucide-react';
import { useStore } from '@/state/store';
import { PageHeader, Section, Stat, Field, PercentInput, Segmented, Disclaimer, Badge, Button, toast } from '@/components/ui';
import { WealthChart, WealthLegend, type WealthMode } from '@/components/charts/WealthChart';
import { MultiLineChart } from '@/components/charts/SeriesCharts';
import { useChartTheme } from '@/components/charts/theme';
import { tornado, SCENARIO_LABELS, DRIVER_LABELS, type DriverKey } from '@/finance/scenarios';
import { Tornado } from '@/components/charts/Tornado';
import { formatPct } from '@/finance/money';

const KEYS: ScenarioKey[] = ['conservative', 'base', 'high'];

export default function Simulator() {
  const plan = usePlan();
  const money = useMoney();
  const t = useChartTheme();
  const deltas = useStore((s) => s.scenarioDeltas);
  const setDelta = useStore((s) => s.setScenarioDelta);
  const resetDeltas = useStore((s) => s.resetScenarioDeltas);
  const baseline = useStore((s) => s.baseline);
  const saveBaseline = useStore((s) => s.saveBaseline);
  const clearBaseline = useStore((s) => s.clearBaseline);
  const update = useStore((s) => s.updateProfile);
  const updateA = useStore((s) => s.updateAssumptions);
  const { profile: p, assumptions: a } = plan;
  const [mode, setMode] = useState<WealthMode>('both');
  const [selected, setSelected] = useState<number | null>(p.planStartYear + 4);

  const scen = useMemo(() => scenarioSet(plan, deltas), [plan, deltas]);
  const cmp = useMemo(() => (baseline ? baselineComparison(plan, baseline) : null), [plan, baseline]);
  const bars = useMemo(() => tornado(p, a, deltas.conservative, deltas.high), [p, a, deltas]);
  const rows = plan.sim.rows;
  const close = plan.sim.points.at(-1)!;
  const inspect = selected === null ? null : yearInspector(plan, selected);
  const sel = inspect?.row ?? null;
  const goalsInYear = inspect?.goalsTracked ?? [];
  const change = inspect?.incomeChange;

  const effective = (k: ScenarioKey) => ({
    salaryGrowth: p.income.salaryGrowth + deltas[k].salaryGrowth,
    returns: plan.portfolioReturn + deltas[k].returns,
    inflation: a.inflation + deltas[k].inflation,
    sipStepUp: Math.max(0, a.sipStepUp + deltas[k].sipStepUp),
  });

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

      {sel && inspect && (
        <Section title={`Inside ${inspect.label}`} description={`Year ${inspect.index} of ${inspect.count}. Flows for the whole year, balances on 31 December.`} actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={sel.index === 1} onClick={() => setSelected(sel.year - 1)}>← Previous</Button>
            <Button variant="secondary" size="sm" disabled={sel.index === rows.length} onClick={() => setSelected(sel.year + 1)}>Next →</Button>
          </div>
        }>
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:col-span-8">
              <Stat
                size="sm"
                label="Income"
                value={money(sel.income)}
                sub={change?.kind === 'pct' ? `${change.value >= 0 ? '+' : ''}${formatPct(change.value)} vs ${sel.year - 1}` : change?.kind === 'resumed' ? 'Resumes after break' : sel.index > 1 ? 'n/a vs prior year' : undefined}
              />
              <Stat size="sm" label="Living expenses" value={money(sel.expenses)} />
              <Stat size="sm" label="Debt payments" value={money(sel.debtPayments)} sub={`${money(sel.interestPaid)} interest`} />
              <Stat size="sm" label="Invested" value={money(sel.contributions)} />
              <Stat size="sm" label="One-time costs & goals" value={money(sel.oneTimeCosts + sel.goalWithdrawals)} />
              <Stat size="sm" label="Portfolio (year-end)" value={money(sel.portfolio)} />
              <Stat size="sm" label="Retirement accounts" value={money(sel.retirement)} sub={sel.epf > 0 ? `incl. EPF ${money(sel.epf)} (+${money(sel.epfInterest)} interest)` : undefined} />
              <Stat size="sm" label="Liabilities" value={money(sel.liabilities)} />
              <Stat size="sm" label="Net worth" value={money(sel.netWorth)} sub={`${money(sel.netWorthReal)} in today’s ₹`} />
            </div>
            <div className="lg:col-span-4">
              <p className="eyebrow mb-3">What happens this year</p>
              <ul className="space-y-2 text-sm">
                {sel.events.map((e) => <li key={e} className="flex gap-2"><Badge>Event</Badge>{e}</li>)}
                {sel.goals.map((g) => (
                  <li key={g.goalId} className="flex flex-wrap gap-2">
                    <Badge tone={g.status === 'shortfall' ? 'bad' : g.status === 'financed' ? 'warn' : 'good'}>{g.status === 'shortfall' ? 'Goal unpaid' : g.status === 'financed' ? 'Goal + loan' : 'Goal paid'}</Badge>
                    {g.name} · {money(g.cost)}
                    {g.loan > 0 && <span className="text-grey">({money(g.loan)} loan)</span>}
                    {g.shortfall > 0 && <span className="text-danger">(short {money(g.shortfall)})</span>}
                  </li>
                ))}
                {goalsInYear.filter((g) => !sel.goals.some((o) => o.goalId === g.id)).map((g) => <li key={g.id} className="text-grey">{g.name}: tracked against your corpus</li>)}
                {sel.flags.includes('deficit') && <li className="text-danger">Spending exceeds income for part of the year. Savings cover the gap.</li>}
                {sel.flags.includes('borrowing') && <li className="text-danger">Liquid assets run out. Unfunded costs are shown as borrowing at 14%.</li>}
                {sel.flags.includes('emi-over-limit') && <li className="text-danger">EMIs take more than half of take-home. Most lenders would not approve new loans at this level.</li>}
                {sel.capitalGainsTax > 0 && <li className="text-grey">Selling investments this year costs {money(sel.capitalGainsTax)} in capital gains tax.</li>}
                {sel.incomeTax > 0 && <li className="text-grey">Income tax: {money(sel.incomeTax)} under the {sel.regime} regime, already deducted from take-home.</li>}
                {sel.fiReached && <li className="text-forest">Financial assets exceed the FI target ({money(sel.fiTarget)}).</li>}
                {!sel.events.length && !sel.goals.length && !sel.flags.length && !sel.fiReached && <li className="text-grey">No events or goals this year.</li>}
              </ul>
              <Link to="/app/life-events" className="hit mt-4 inline-block text-sm font-medium text-forest hover:underline">Add or edit life events</Link>
            </div>
          </div>
        </Section>
      )}

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

      <Section title="Scenario comparison" description="Three futures, built by adjusting four assumptions around your base case. Edit the adjustments below." actions={<Button variant="ghost" size="sm" onClick={resetDeltas}>Reset scenarios</Button>}>
        <MultiLineChart
          data={plan.sim.points.map((pt, i) => ({ year: pt.year, conservative: scen.conservative.points[i].netWorth, base: scen.base.points[i].netWorth, high: scen.high.points[i].netWorth }))}
          xKey="year"
          height={280}
          ariaLabel="Net worth under conservative, base and high-growth scenarios"
          series={[
            { key: 'conservative', name: 'Conservative', color: t.scenario.conservative, dashed: true },
            { key: 'base', name: 'Base case', color: t.scenario.base },
            { key: 'high', name: 'High growth', color: t.scenario.high, dashed: true },
          ]}
        />
        <div className="-mx-1 mt-8 overflow-x-auto px-1">
          <table className="table-fin w-full min-w-[640px]">
            <thead>
              <tr><th scope="col">Assumption</th>{KEYS.map((k) => <th key={k} scope="col">{SCENARIO_LABELS[k]}</th>)}</tr>
            </thead>
            <tbody>
              {(Object.keys(DRIVER_LABELS) as DriverKey[]).map((d) => (
                <tr key={d}>
                  <td className="font-sans text-evergreen">{DRIVER_LABELS[d]}</td>
                  {KEYS.map((k) => (
                    <td key={k}>
                      {k === 'base' ? formatPct(effective(k)[d]) : (
                        <div className="flex items-center gap-2">
                          <span className="w-14">{formatPct(effective(k)[d])}</span>
                          <PercentInput size="sm" className="w-24" ariaLabel={`${SCENARIO_LABELS[k]} ${DRIVER_LABELS[d]} adjustment`} value={deltas[k][d]} min={-20} max={20} onChange={(v) => setDelta(k, { [d]: v })} />
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="font-sans font-semibold text-evergreen">Net worth, {close.year}</td>
                {KEYS.map((k) => <td key={k} className="font-semibold text-evergreen">{money(scen[k].points.at(-1)!.netWorth)}</td>)}
              </tr>
              <tr>
                <td className="font-sans text-evergreen">In today’s rupees</td>
                {KEYS.map((k) => <td key={k}>{money(scen[k].points.at(-1)!.netWorthReal)}</td>)}
              </tr>
              <tr>
                <td className="font-sans text-evergreen">FI reached</td>
                {KEYS.map((k) => <td key={k}>{scen[k].fiYear ? `${scen[k].fiYear} · age ${scen[k].fiAge}` : `Not by ${close.year}`}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-grey">Adjustment columns show the change applied to the base case, in percentage points.</p>

        <div className="mt-10">
          <h3 className="text-[15px] font-semibold">What moves the outcome most</h3>
          <p className="mt-1 text-sm text-grey">
            {bars[0].label} matters most: alone, it moves your {plan.headline.year} net worth from {bars[0].low >= 0 ? '+' : ''}{money(bars[0].low)} to {bars[0].high >= 0 ? '+' : ''}{money(bars[0].high)} in today’s rupees.
          </p>
          <div className="mt-5 max-w-3xl">
            <Tornado bars={bars} lowLabel={SCENARIO_LABELS.conservative} highLabel={SCENARIO_LABELS.high} />
          </div>
          <p className="mt-4 text-xs text-grey">Each bar changes one assumption to its conservative or high-growth setting and leaves the rest at the base case. Together, the changes compound, so the scenarios differ by more than the bars add up to.</p>
        </div>
      </Section>

      <Disclaimer>Projections are estimates, not guarantees. Constant annual returns are assumed here. See the Risk Lab for market declines and a range of outcomes.</Disclaimer>
    </div>
  );
}
