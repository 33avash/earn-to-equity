import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ScenarioKey } from '@/types/profile';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Stat, Field, PercentInput, Segmented, Disclaimer, Badge, Button } from '@/components/ui';
import { WealthChart, WealthLegend, type WealthMode } from '@/components/charts/WealthChart';
import { MultiLineChart } from '@/components/charts/SeriesCharts';
import { useChartTheme } from '@/components/charts/theme';
import { runScenario, attributeScenario, SCENARIO_LABELS, DRIVER_LABELS, type DriverKey } from '@/finance/scenarios';
import { formatPct } from '@/finance/money';

const KEYS: ScenarioKey[] = ['conservative', 'base', 'high'];

export default function Simulator() {
  const plan = usePlan();
  const money = useMoney();
  const t = useChartTheme();
  const deltas = useStore((s) => s.scenarioDeltas);
  const setDelta = useStore((s) => s.setScenarioDelta);
  const resetDeltas = useStore((s) => s.resetScenarioDeltas);
  const update = useStore((s) => s.updateProfile);
  const updateA = useStore((s) => s.updateAssumptions);
  const { profile: p, assumptions: a } = plan;
  const [mode, setMode] = useState<WealthMode>('both');
  const [selected, setSelected] = useState<number | null>(p.planStartYear + 4);

  const scen = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, runScenario(p, a, deltas[k])])) as Record<ScenarioKey, ReturnType<typeof runScenario>>, [p, a, deltas]);
  const attribution = useMemo(() => ({ conservative: attributeScenario(p, a, deltas.conservative), high: attributeScenario(p, a, deltas.high) }), [p, a, deltas]);
  const rows = plan.sim.rows;
  const sel = rows.find((r) => r.year === selected) ?? null;
  const prev = sel ? rows[sel.index - 2] : null;
  const goalsInYear = sel ? p.goals.filter((g) => g.targetYear === sel.year) : [];

  const effective = (k: ScenarioKey) => ({
    salaryGrowth: p.income.salaryGrowth + deltas[k].salaryGrowth,
    returns: plan.portfolioReturn + deltas[k].returns,
    inflation: a.inflation + deltas[k].inflation,
    sipStepUp: Math.max(0, a.sipStepUp + deltas[k].sipStepUp),
  });

  return (
    <div className="flex flex-col gap-14">
      <PageHeader title="Wealth Simulator" description="The engine behind every number in your plan. Twenty years of income, spending, contributions, returns, loans, goals and life events, projected one year at a time." />

      <Section title="Core assumptions" description="Edit the base case. Every module updates immediately.">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Salary growth">{(id) => <PercentInput id={id} value={p.income.salaryGrowth} min={-20} max={50} onChange={(v) => update((x) => void (x.income.salaryGrowth = v))} />}</Field>
          <Field label="Inflation">{(id) => <PercentInput id={id} value={a.inflation} max={20} onChange={(v) => updateA({ inflation: v })} />}</Field>
          <Field label="Annual SIP step-up">{(id) => <PercentInput id={id} value={a.sipStepUp} max={50} onChange={(v) => updateA({ sipStepUp: v })} />}</Field>
          <Field label="Portfolio return" help="Weighted from your target allocation. Edit asset-class returns in the Portfolio Builder.">
            {() => <p className="num flex h-10 items-center text-sm font-semibold text-evergreen">{formatPct(plan.portfolioReturn)} <Link to="/app/portfolio" className="ml-2 text-xs font-normal text-forest hover:underline">edit</Link></p>}
          </Field>
        </div>
      </Section>

      <Section
        title="Projected net worth"
        description="Click any year on the chart or in the table to inspect it."
        actions={<Segmented label="Values shown" size="sm" value={mode} onChange={setMode} options={[{ value: 'both', label: 'Both' }, { value: 'nominal', label: 'Future ₹' }, { value: 'real', label: 'Today’s ₹' }]} />}
      >
        <WealthChart rows={rows} startNetWorth={plan.sim.startNetWorth} startYear={p.planStartYear} mode={mode} height={360} selectedYear={selected} onSelectYear={setSelected} showFiTarget />
        <div className="mt-3"><WealthLegend mode={mode} fi /></div>
      </Section>

      {sel && (
        <Section title={`Inside ${sel.year}`} description={`Age ${sel.age - 1} → ${sel.age}. Year ${sel.index} of ${rows.length}.`} actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={sel.index === 1} onClick={() => setSelected(sel.year - 1)}>← Previous</Button>
            <Button variant="secondary" size="sm" disabled={sel.index === rows.length} onClick={() => setSelected(sel.year + 1)}>Next →</Button>
          </div>
        }>
          <div className="grid gap-10 lg:grid-cols-12">
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:col-span-8">
              <Stat size="sm" label="Income" value={money(sel.income)} sub={prev ? `${sel.income >= prev.income ? '+' : ''}${formatPct(prev.income ? sel.income / prev.income - 1 : 0)} vs prior year` : undefined} />
              <Stat size="sm" label="Living expenses" value={money(sel.expenses)} />
              <Stat size="sm" label="Debt payments" value={money(sel.debtPayments)} sub={`${money(sel.interestPaid)} interest`} />
              <Stat size="sm" label="Invested" value={money(sel.contributions)} />
              <Stat size="sm" label="One-time costs & goals" value={money(sel.oneTimeCosts + sel.goalWithdrawals)} />
              <Stat size="sm" label="Portfolio (year-end)" value={money(sel.portfolio)} />
              <Stat size="sm" label="Retirement accounts" value={money(sel.retirement)} />
              <Stat size="sm" label="Liabilities" value={money(sel.liabilities)} />
              <Stat size="sm" label="Net worth" value={money(sel.netWorth)} sub={`${money(sel.netWorthReal)} in today’s ₹`} />
            </dl>
            <div className="lg:col-span-4">
              <p className="eyebrow mb-3">What happens this year</p>
              <ul className="space-y-2 text-sm">
                {sel.events.map((e) => <li key={e} className="flex gap-2"><Badge>Event</Badge>{e}</li>)}
                {sel.goals.map((g) => <li key={g.goalId} className="flex flex-wrap gap-2"><Badge tone={g.status === 'funded' ? 'good' : 'bad'}>{g.status === 'funded' ? 'Goal funded' : 'Goal short'}</Badge>{g.name} · {money(g.cost)}{g.shortfall > 0 && <span className="text-danger">(short {money(g.shortfall)})</span>}</li>)}
                {goalsInYear.filter((g) => !sel.goals.some((o) => o.goalId === g.id)).map((g) => <li key={g.id} className="text-grey">{g.name}: tracked against your corpus</li>)}
                {sel.flags.includes('deficit') && <li className="text-danger">Spending exceeds income for part of the year. Savings cover the gap.</li>}
                {sel.flags.includes('borrowing') && <li className="text-danger">Liquid assets run out. Unfunded costs are shown as borrowing at 14%.</li>}
                {sel.fiReached && <li className="text-forest">Financial assets exceed the FI target ({money(sel.fiTarget)}).</li>}
                {!sel.events.length && !sel.goals.length && !sel.flags.length && !sel.fiReached && <li className="text-grey">No events or goals this year.</li>}
              </ul>
              <Link to="/app/life-events" className="mt-4 inline-block text-sm font-medium text-forest hover:underline">Add or edit life events</Link>
            </div>
          </div>
        </Section>
      )}

      <Section title="Year-by-year projection" description="Year-end balances and full-year flows, in future rupees.">
        <div className="-mx-1 max-h-[480px] overflow-auto px-1">
          <table className="table-fin w-full min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-ivory">
              <tr>
                {['Year', 'Age', 'Income', 'Expenses', 'Debt paid', 'Invested', 'Portfolio', 'Cash', 'Liabilities', 'Net worth', 'Today’s ₹', ''].map((h) => <th key={h} scope="col">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year} onClick={() => setSelected(r.year)} className={`cursor-pointer hover:bg-mint/40 ${selected === r.year ? 'bg-mint/60' : ''}`} aria-selected={selected === r.year}>
                  <td><button type="button" className="font-semibold text-evergreen" onClick={() => setSelected(r.year)}>{r.year}</button></td>
                  <td>{r.age}</td>
                  <td>{money(r.income)}</td>
                  <td>{money(r.expenses)}</td>
                  <td>{money(r.debtPayments)}</td>
                  <td>{money(r.contributions)}</td>
                  <td>{money(r.portfolio)}</td>
                  <td className={r.cash < 0 ? 'text-danger' : ''}>{money(r.cash)}</td>
                  <td>{money(r.liabilities)}</td>
                  <td className="font-semibold text-evergreen">{money(r.netWorth)}</td>
                  <td>{money(r.netWorthReal)}</td>
                  <td className="font-sans">{r.events.length > 0 && <Badge>{r.events.length} event{r.events.length > 1 ? 's' : ''}</Badge>}{r.flags.includes('goal-shortfall') && <Badge tone="bad">Goal short</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Scenario comparison" description="Three futures, built by adjusting four assumptions around your base case. Edit the adjustments below." actions={<Button variant="ghost" size="sm" onClick={resetDeltas}>Reset scenarios</Button>}>
        <MultiLineChart
          data={rows.map((r, i) => ({ year: r.year, conservative: scen.conservative.rows[i].netWorth, base: scen.base.rows[i].netWorth, high: scen.high.rows[i].netWorth }))}
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
                <td className="font-sans font-semibold text-evergreen">Net worth, {rows.at(-1)!.year + 1}</td>
                {KEYS.map((k) => <td key={k} className="font-semibold text-evergreen">{money(scen[k].rows.at(-1)!.netWorth)}</td>)}
              </tr>
              <tr>
                <td className="font-sans text-evergreen">In today’s rupees</td>
                {KEYS.map((k) => <td key={k}>{money(scen[k].rows.at(-1)!.netWorthReal)}</td>)}
              </tr>
              <tr>
                <td className="font-sans text-evergreen">FI reached</td>
                {KEYS.map((k) => <td key={k}>{scen[k].fiYear ?? 'Beyond horizon'}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-grey">Adjustment columns show the change applied to the base case, in percentage points.</p>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          {(['conservative', 'high'] as const).map((k) => {
            const at = attribution[k];
            return (
              <div key={k}>
                <p className="text-[15px] font-semibold">Why {SCENARIO_LABELS[k].toLowerCase()} differs by {money(at.total)}</p>
                <ul className="mt-3">
                  {[...at.parts].sort((x, y) => Math.abs(y.impact) - Math.abs(x.impact)).map((x) => (
                    <li key={x.driver} className="flex justify-between border-b border-line/70 py-2 text-sm">
                      <span className="text-grey">{x.label}</span>
                      <span className={`num font-semibold ${x.impact < 0 ? 'text-danger' : 'text-forest'}`}>{x.impact >= 0 ? '+' : ''}{money(x.impact)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between py-2 text-sm"><span className="text-grey">Interaction between changes</span><span className="num">{at.interaction >= 0 ? '+' : ''}{money(at.interaction)}</span></li>
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-grey">Each assumption’s impact is measured by changing only that assumption from the base case. Effects compound together, so the remainder is shown as interaction.</p>
      </Section>

      <Disclaimer>Projections are estimates, not guarantees. Constant annual returns are assumed here. See the Risk Lab for market declines and a range of outcomes.</Disclaimer>
    </div>
  );
}
