import { useMemo, useState } from 'react';
import type { SimOverrides } from '@/types/sim';
import type { LifeEvent } from '@/types/profile';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore, defaultRiskLab } from '@/state/store';
import { PageHeader, Section, Slider, Toggle, Stat, Segmented, Disclaimer, Button, Notice, Field, MoneyInput, NumberInput, Progress } from '@/components/ui';
import { MultiLineChart, FanChart } from '@/components/charts/SeriesCharts';
import { useChartTheme } from '@/components/charts/theme';
import { simulate } from '@/finance/simulate';
import { fiAnalysis } from '@/finance/fi';
import { monteCarlo, type MonteCarloResult } from '@/finance/montecarlo';
import { formatPct, formatINR } from '@/finance/money';

const pp = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1).replace(/\.0$/, '')} pts`;

export default function RiskLab() {
  const plan = usePlan();
  const money = useMoney();
  const t = useChartTheme();
  const r = useStore((s) => s.riskLab);
  const set = useStore((s) => s.setRiskLab);
  const { profile: p, assumptions: a } = plan;
  const start = p.planStartYear;
  const end = start + a.horizonYears - 1;
  const [mc, setMc] = useState<{ base: MonteCarloResult; mod: MonteCarloResult } | null>(null);
  const [running, setRunning] = useState(false);

  const overrides: SimOverrides = useMemo(() => {
    const extra: LifeEvent[] = [];
    if (r.breakMonths > 0) extra.push({ id: 'rl-break', kind: 'careerBreak', label: 'Career break (test)', year: r.breakYear, oneTimeCost: 0, incomeChangePct: 0, monthlyExpenseChange: 0, breakMonths: r.breakMonths });
    if (r.purchaseCost > 0) extra.push({ id: 'rl-buy', kind: 'majorPurchase', label: 'Major purchase (test)', year: r.purchaseYear, oneTimeCost: r.purchaseCost, incomeChangePct: 0, monthlyExpenseChange: 0, breakMonths: 0 });
    return {
      salaryGrowth: p.income.salaryGrowth + r.salaryGrowthDelta,
      inflation: Math.max(0, a.inflation + r.inflationDelta),
      expenseCut: r.expenseCut,
      sipStepUp: Math.max(0, a.sipStepUp + r.stepUpDelta),
      extraEvents: extra,
      shock: r.shockOn ? { year: r.shockYear, drop: r.shockDrop, recoveryYears: r.recoveryYears } : undefined,
    };
  }, [r, p.income.salaryGrowth, a.inflation, a.sipStepUp]);

  const base = plan.sim;
  const mod = useMemo(() => simulate(p, a, overrides), [p, a, overrides]);
  const fiMod = useMemo(() => fiAnalysis({ ...p, about: { ...p.about, fiAge: p.about.fiAge + r.retireDelay } }, a, overrides), [p, a, overrides, r.retireDelay]);
  const changed = Boolean(r.salaryGrowthDelta || r.inflationDelta || r.expenseCut || r.stepUpDelta || r.retireDelay || r.breakMonths || r.purchaseCost || r.shockOn);

  const bEnd = base.rows.at(-1)!;
  const mEnd = mod.rows.at(-1)!;
  const shockIdx = r.shockYear - start;
  const shockImpact = r.shockOn && shockIdx >= 0 && shockIdx < mod.rows.length ? (shockIdx > 0 ? mod.rows[shockIdx - 1].portfolio : plan.sheet.investments) * r.shockDrop : 0;
  const recoveredRow = r.shockOn ? mod.rows.find((row) => row.year >= r.shockYear && row.netWorth >= (base.rows[row.index - 1]?.netWorth ?? Infinity) * 0.98) : undefined;
  const goalsB = base.rows.flatMap((x) => x.goals);
  const goalsM = mod.rows.flatMap((x) => x.goals);

  const runMc = () => {
    setRunning(true);
    setMc(null);
    setTimeout(() => {
      const { shock: _s, ...noShock } = overrides;
      void _s;
      setMc({ base: monteCarlo(p, a, { seed: 42 }), mod: monteCarlo(p, a, { seed: 42, overrides: noShock }) });
      setRunning(false);
    }, 30);
  };

  return (
    <div className="flex flex-col gap-14">
      <PageHeader title="Risk Lab" description="Stress-test your plan. Change one assumption or several, and compare the result with your baseline side by side." actions={<Button variant="secondary" onClick={() => { set(defaultRiskLab()); setMc(null); }}>Reset tests</Button>} />

      <div className="grid gap-12 lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-4">
          <fieldset className="flex flex-col gap-5">
            <legend className="eyebrow mb-4">Income & spending</legend>
            <Slider label="Salary growth change" value={r.salaryGrowthDelta} min={-0.08} max={0.05} step={0.005} onChange={(v) => set({ salaryGrowthDelta: v })} format={pp} help={`Baseline ${formatPct(p.income.salaryGrowth)} a year.`} />
            <Slider label="Inflation change" value={r.inflationDelta} min={-0.02} max={0.05} step={0.005} onChange={(v) => set({ inflationDelta: v })} format={pp} help={`Baseline ${formatPct(a.inflation)}.`} />
            <Slider label="Increase savings (cut lifestyle spend)" value={r.expenseCut} min={0} max={Math.max(5000, Math.round(plan.cashflow.lifestyle / 500) * 500)} step={500} onChange={(v) => set({ expenseCut: v })} format={(v) => `${formatINR(v)}/mo`} />
            <Slider label="SIP step-up change" value={r.stepUpDelta} min={-0.1} max={0.15} step={0.01} onChange={(v) => set({ stepUpDelta: v })} format={pp} help={`Baseline ${formatPct(a.sipStepUp, 0)} a year.`} />
            <Slider label="Delay financial independence by" value={r.retireDelay} min={0} max={10} step={1} onChange={(v) => set({ retireDelay: v })} format={(v) => (v ? `${v} yrs (age ${p.about.fiAge + v})` : 'No delay')} />
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-4">
            <legend className="eyebrow mb-4">Career break & purchases</legend>
            <Field label="Break (months)">{(id) => <NumberInput id={id} value={r.breakMonths} min={0} max={60} onChange={(v) => set({ breakMonths: Math.round(v) })} />}</Field>
            <Field label="Starting in">{(id) => <NumberInput id={id} value={r.breakYear} min={start} max={end} onChange={(v) => set({ breakYear: Math.round(v) })} />}</Field>
            <Field label="Major purchase">{(id) => <MoneyInput id={id} value={r.purchaseCost} max={1e9} onChange={(v) => set({ purchaseCost: v })} />}</Field>
            <Field label="In year">{(id) => <NumberInput id={id} value={r.purchaseYear} min={start} max={end} onChange={(v) => set({ purchaseYear: Math.round(v) })} />}</Field>
          </fieldset>
          <fieldset className="flex flex-col gap-5">
            <legend className="eyebrow mb-4">Market decline</legend>
            <Toggle checked={r.shockOn} onChange={(v) => set({ shockOn: v })} label="Apply a market decline" description="The portfolio falls once, at the start of the chosen year." />
            {r.shockOn && (
              <>
                <div>
                  <p className="mb-2 text-[13px] font-medium">Size of decline</p>
                  <Segmented label="Decline size" size="sm" value={r.shockDrop === 0.2 ? '20' : r.shockDrop === 0.3 ? '30' : 'custom'} onChange={(v) => set({ shockDrop: v === '20' ? 0.2 : v === '30' ? 0.3 : 0.4 })} options={[{ value: '20', label: '−20%' }, { value: '30', label: '−30%' }, { value: 'custom', label: 'Custom' }]} />
                </div>
                {r.shockDrop !== 0.2 && r.shockDrop !== 0.3 && <Slider label="Custom decline" value={r.shockDrop} min={0.05} max={0.6} step={0.05} onChange={(v) => set({ shockDrop: v })} format={(v) => `−${formatPct(v, 0)}`} />}
                <Slider label="Decline year" value={r.shockYear} min={start} max={end} step={1} onChange={(v) => set({ shockYear: v })} format={(v) => `${v} (Y${v - start + 1})`} />
                <Slider label="Recovery" value={r.recoveryYears} min={0} max={10} step={1} onChange={(v) => set({ recoveryYears: v })} format={(v) => (v === 0 ? 'No catch-up' : `Recovers over ${v} yrs`)} help="‘No catch-up’ means returns resume at the assumed rate but the lost value is never regained. Otherwise extra returns restore the lost value over the chosen period." />
              </>
            )}
          </fieldset>
        </div>

        <div className="lg:col-span-8">
          {!changed && <Notice>Move any control to compare a stress test against your baseline.</Notice>}
          <dl className="mt-6 grid grid-cols-2 gap-8 border-b border-line pb-8 sm:grid-cols-4">
            <Stat size="sm" label={`Net worth ${bEnd.year + 1}`} value={money(mEnd.netWorth)} sub={<>baseline {money(bEnd.netWorth)}<br /><span className={mEnd.netWorth < bEnd.netWorth ? 'text-danger' : 'text-forest'}>{mEnd.netWorth - bEnd.netWorth >= 0 ? '+' : ''}{money(mEnd.netWorth - bEnd.netWorth)}</span></>} />
            <Stat size="sm" label="Today’s rupees" value={money(mEnd.netWorthReal)} sub={`baseline ${money(bEnd.netWorthReal)}`} />
            <Stat size="sm" label="Goals funded" value={`${goalsM.filter((g) => g.status === 'funded').length} of ${goalsM.length}`} sub={`baseline ${goalsB.filter((g) => g.status === 'funded').length}`} />
            <Stat size="sm" label="FI age estimate" value={fiMod.fiAge ? String(fiMod.fiAge) : 'Beyond'} sub={`baseline ${plan.fi.fiAge ?? 'beyond projection'}`} />
          </dl>
          <div className="mt-8">
            <MultiLineChart
              data={base.rows.map((row, i) => ({ year: row.year, base: row.netWorth, mod: mod.rows[i].netWorth }))}
              xKey="year"
              height={320}
              ariaLabel="Net worth: baseline versus stress test"
              series={[{ key: 'base', name: 'Baseline', color: t.muted, dashed: true }, { key: 'mod', name: 'Stress test', color: t.primary }]}
            />
          </div>
          {r.shockOn && (
            <div className="mt-8 grid grid-cols-2 gap-6 border-t border-line pt-6 sm:grid-cols-4">
              <Stat size="sm" label="Decline year" value={String(r.shockYear)} />
              <Stat size="sm" label="Portfolio impact" value={`−${money(shockImpact)}`} tone="negative" sub={`−${formatPct(r.shockDrop, 0)} of the portfolio`} />
              <Stat size="sm" label="Net worth back on baseline" value={recoveredRow ? String(recoveredRow.year + 1) : 'Not within horizon'} sub="Within 2% of baseline" />
              <Stat size="sm" label="Goals affected" value={String(goalsM.filter((g, i) => g.status !== goalsB[i]?.status).length)} sub="Status changed vs baseline" />
            </div>
          )}
          <p className="mt-6 text-sm text-charcoal">
            Financial independence target at age {p.about.fiAge + r.retireDelay}: {money(fiMod.targetCorpus)}. Projected: {money(fiMod.projectedCorpus)} ({Math.round(fiMod.progress * 100)}%).
            {r.retireDelay > 0 && ' Delaying gives your investments more years to grow and shortens the period they must fund.'}
          </p>
        </div>
      </div>

      <Section title="Range of outcomes (Monte Carlo)" description="1,000 simulated paths with randomly varying annual returns. Includes your income, spending and event tests, but not the single market decline above.">
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={runMc} disabled={running}>{running ? 'Running 1,000 paths…' : mc ? 'Run again' : 'Run 1,000 simulations'}</Button>
          <p className="text-xs text-grey">Mean return {formatPct(plan.portfolioReturn)}, volatility {formatPct(plan.volatility)} (from your allocation). Fixed seed for repeatable results.</p>
        </div>
        {running && <div role="status" className="mt-6 text-sm text-grey">Simulating…</div>}
        {mc && (
          <div className="mt-8 grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <FanChart data={mc.mod.percentiles} baseline={mod.rows.map((x) => x.netWorth)} />
              <p className="mt-2 text-xs text-grey">Shaded band: 10th–90th percentile of net worth. Solid line: median. Dashed: the deterministic projection.</p>
            </div>
            <div className="flex flex-col gap-6 lg:col-span-4">
              <div className="grid grid-cols-3 gap-4">
                <Stat size="sm" label="10th pct" value={money(mc.mod.finalP10)} />
                <Stat size="sm" label="Median" value={money(mc.mod.finalP50)} />
                <Stat size="sm" label="90th pct" value={money(mc.mod.finalP90)} />
              </div>
              <div>
                <p className="eyebrow mb-3">Estimated probability of funding</p>
                <ul className="space-y-3">
                  {mc.mod.goalProbabilities.map((g) => (
                    <li key={g.goalId}>
                      <div className="mb-1 flex justify-between text-sm"><span>{g.name} ({g.year})</span><span className="num font-semibold">{formatPct(g.probability, 0)}</span></div>
                      <Progress value={g.probability} label={`${g.name} probability`} tone={g.probability >= 0.75 ? 'forest' : g.probability >= 0.5 ? 'champagne' : 'danger'} />
                    </li>
                  ))}
                  <li>
                    <div className="mb-1 flex justify-between text-sm"><span>FI within {a.horizonYears} years</span><span className="num font-semibold">{formatPct(mc.mod.fiProbability, 0)}</span></div>
                    <Progress value={mc.mod.fiProbability} label="FI probability" />
                  </li>
                </ul>
                {changed && <p className="mt-3 text-xs text-grey">Baseline median: {money(mc.base.finalP50)}. Baseline FI probability: {formatPct(mc.base.fiProbability, 0)}.</p>}
              </div>
            </div>
          </div>
        )}
        <Disclaimer className="mt-8">Returns are drawn independently each year from a lognormal distribution with your assumed mean and a simplified volatility. Real markets show streaks, regime changes and fat tails that this model does not capture. Neither historical nor assumed return distributions predict future results. Probabilities are illustrative, not forecasts.</Disclaimer>
      </Section>
    </div>
  );
}
