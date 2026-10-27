import { useMemo } from 'react';
import type { RiskProfile } from '@/types/profile';
import { ASSET_CLASSES } from '@/types/profile';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Stat, Notice, Disclaimer, MoneyInput, PercentInput, Button, Field, toast } from '@/components/ui';
import { AllocationEditor } from '@/features/editors/Allocation';
import { RegularPlansToggle } from '@/features/editors/RegularPlans';
import { AllocationBar } from '@/components/charts/Bars';
import { ContribGainsChart } from '@/components/charts/SeriesCharts';
import { useChartTheme } from '@/components/charts/theme';
import { ASSET_LABELS, PRESETS, isValidAllocation, maxDrift, rebalancePlan, riskBand, DEFAULT_RETURNS, DEFAULT_EXPENSE_RATIOS, EXPENSE_PRESETS } from '@/finance/portfolio';
import { projectSip } from '@/finance/sip';
import { formatMonths, formatPct } from '@/finance/money';

export default function Portfolio() {
  const plan = usePlan();
  const money = useMoney();
  const t = useChartTheme();
  const update = useStore((s) => s.updateProfile);
  const updateAssumptions = useStore((s) => s.updateAssumptions);
  const { profile: p, assumptions: a } = plan;
  const target = p.preferences.targetAllocation;
  const valid = isValidAllocation(target);
  const rebalance = rebalancePlan(p.position.holdings, target, plan.cashflow.plannedInvestments, p.position.elssLocked ?? 0);
  const rows = rebalance.rows;
  const drift = maxDrift(rows);
  const band = riskBand(plan.volatility);
  const total = plan.sheet.investments;

  const projection = useMemo(
    () => projectSip({ monthly: plan.cashflow.plannedInvestments, lumpSum: total, years: a.horizonYears, annualReturn: plan.portfolioReturn, stepUp: a.sipStepUp, timing: a.contributionTiming, inflation: a.inflation }),
    [plan.cashflow.plannedInvestments, total, a, plan.portfolioReturn],
  );

  const applyPreset = (k: RiskProfile) => {
    update((x) => {
      x.preferences.risk = k;
      x.preferences.targetAllocation = { ...PRESETS[k].weights };
    });
    toast(`Applied the ${PRESETS[k].label} example allocation`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Portfolio" description="Your target mix across seven asset classes, fund costs, drift, and how to rebalance with new SIP money." />

      <div className="bezel grid grid-cols-2 gap-x-6 gap-y-6 p-5 sm:p-6 lg:grid-cols-4">
        <Stat label="Current value" value={money(total)} def="portfolio" />
        <Stat label="Return after fund costs" value={formatPct(plan.portfolioReturn)} def="weightedReturn" sub={`${formatPct(plan.portfolioReturnGross)} before costs; real ≈ ${formatPct((1 + plan.portfolioReturn) / (1 + a.inflation) - 1)} after inflation`} />
        <Stat label="Illustrative volatility" value={formatPct(plan.volatility)} def="volatility" sub={`${band.label}: ${band.note}`} />
        <Stat label="Largest drift" value={`${(drift * 100).toFixed(1)} pts`} sub={drift > 0.05 ? 'Consider rebalancing' : 'Within 5 points'} />
      </div>

      <Section title="Example allocations" description="Educational illustrations of different risk levels, not personalised recommendations. Applying one replaces your target weights.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(PRESETS) as RiskProfile[]).map((k) => (
            <div key={k} className={`well flex flex-col gap-3 p-6 ${p.preferences.risk === k ? 'ring-2 ring-inset ring-champagne/70' : ''}`}>
              <div className="flex items-baseline justify-between">
                <p className="font-semibold text-evergreen">{PRESETS[k].label}</p>
                <span className="num text-xs text-grey">{formatPct(ASSET_CLASSES.reduce((s, c) => s + PRESETS[k].weights[c] * a.returns[c], 0))}</span>
              </div>
              <AllocationBar weights={PRESETS[k].weights} label={`${PRESETS[k].label} example`} height={8} />
              <p className="flex-1 text-[13px] leading-relaxed text-grey">{PRESETS[k].description}</p>
              <Button variant="secondary" size="sm" onClick={() => applyPreset(k)}>
                Apply example
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Target weights & assumed returns" description="Returns are long-run assumptions you control. They feed every projection in the app.">
          <AllocationEditor weights={target} onChange={(w) => update((x) => void (x.preferences.targetAllocation = w))} returns={a.returns} onReturnsChange={(r) => updateAssumptions({ returns: r })} />
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => updateAssumptions({ returns: { ...DEFAULT_RETURNS } })}>
            Reset returns to defaults
          </Button>
        </Section>
        <Section title="Projected portfolio growth" description={`Current portfolio plus ${money(plan.cashflow.plannedInvestments)}/month, stepping up ${formatPct(a.sipStepUp, 0)} a year, at ${formatPct(plan.portfolioReturn)}.`}>
          <ContribGainsChart data={projection.years.map((y) => ({ year: y.year, contributions: y.contributions, gains: y.gains }))} height={260} />
          <div className="mt-4 grid grid-cols-3 gap-4">
            <Stat size="sm" label="Contributed" value={money(projection.totalContributions)} />
            <Stat size="sm" label={`Value in ${a.horizonYears} yrs`} value={money(projection.corpus)} />
            <Stat size="sm" label="Today’s rupees" value={money(projection.corpusReal)} def="real" />
          </div>
          <p className="mt-3 text-xs text-grey">Portfolio only. Excludes cash sweeps, goal withdrawals and life events, which the Wealth Simulator includes.</p>
        </Section>
      </div>

      <Section title="Fund costs" description="Expense ratios are deducted from returns in every projection. Index funds cost about 0.2% a year; actively managed direct plans up to about 0.8%; regular plans more.">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => updateAssumptions({ expenseRatios: { ...a.expenseRatios, indianEquity: EXPENSE_PRESETS.index, intlEquity: 0.005 } })}>Equity in index funds</Button>
          <Button variant="secondary" size="sm" onClick={() => updateAssumptions({ expenseRatios: { ...a.expenseRatios, indianEquity: EXPENSE_PRESETS.activeDirect, intlEquity: EXPENSE_PRESETS.activeDirect } })}>Equity in active direct funds</Button>
          <Button variant="ghost" size="sm" onClick={() => updateAssumptions({ expenseRatios: { ...DEFAULT_EXPENSE_RATIOS } })}>Reset</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ASSET_CLASSES.filter((c) => c !== 'govtSchemes').map((c) => (
            <Field key={c} label={ASSET_LABELS[c]} hint={`${formatPct(a.returns[c])} → ${formatPct(a.returns[c] - a.expenseRatios[c])} after costs`}>
              {(id, d) => <PercentInput id={id} describedBy={d} value={a.expenseRatios[c]} max={3} onChange={(v) => updateAssumptions({ expenseRatios: { ...a.expenseRatios, [c]: v } })} />}
            </Field>
          ))}
        </div>
        <div className="mt-6 border-t border-line pt-5">
          <RegularPlansToggle />
        </div>
      </Section>

      <Section title="Current vs target, and rebalancing" description="Edit current values to match your statements. Rebalancing uses new SIP money only: under-weight classes get your monthly investment until the mix is back on target. Nothing is sold.">
        {!valid && <Notice tone="error">Target weights must total 100% before drift and rebalancing are meaningful.</Notice>}
        <div className="-mx-1 mt-4 overflow-x-auto px-1">
          <table className="table-fin w-full min-w-[760px]">
            <thead>
              <tr>
                <th scope="col">Asset class</th>
                <th scope="col">Current value</th>
                <th scope="col">Current</th>
                <th scope="col">Target</th>
                <th scope="col">Drift</th>
                <th scope="col">To rebalance</th>
                <th scope="col">New money each month</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.asset}>
                  <td className="font-sans">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: t.asset[r.asset] }} />
                      {ASSET_LABELS[r.asset]}
                    </span>
                  </td>
                  <td className="w-40">
                    <MoneyInput size="sm" ariaLabel={`${ASSET_LABELS[r.asset]} current value`} value={p.position.holdings[r.asset]} onChange={(v) => update((x) => void (x.position.holdings[r.asset] = v))} max={1e10} />
                  </td>
                  <td>{formatPct(r.current)}</td>
                  <td>{formatPct(r.target)}</td>
                  <td className={Math.abs(r.drift) > 0.05 ? 'font-semibold text-danger' : 'text-grey'}>
                    {r.drift > 0 ? '+' : ''}
                    {(r.drift * 100).toFixed(1)} pts
                  </td>
                  <td className={`font-sans text-[13px] ${r.action === 'add' ? 'text-forest' : 'text-grey'}`}>
                    {r.action === 'add' && `Add ${money(r.trade)}`}
                    {r.action === 'locked' && 'Locked in. Hold, and add nothing new'}
                    {r.action === 'pause' && 'Over target. Pause new money'}
                    {r.action === 'none' && '—'}
                    {r.lockedValue > 0 && !r.locked && <span className="block text-xs">{money(r.lockedValue)} in ELSS still locked</span>}
                  </td>
                  <td>{money(r.newMoneyMonthly)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-charcoal">
          {total === 0
            ? 'Once you add current holdings, drift and rebalancing amounts will appear here.'
            : drift <= 0.05
              ? 'Your current mix is within 5 points of target in every asset class. No rebalancing is needed now.'
              : rebalance.monthsToTarget === null
                ? 'Your mix has drifted more than 5 points. Without a monthly SIP, new money can’t rebalance it. Start one in the Budget Planner.'
                : `Your mix has drifted more than 5 points. Directing your ${money(plan.cashflow.plannedInvestments)} monthly SIP as shown restores the target in about ${formatMonths(rebalance.monthsToTarget)}, without selling. PPF, EPF and NPS can’t be withdrawn early, and selling other funds can trigger tax and exit loads.`}
        </p>
        <div className="mt-6 max-w-xs">
          <Field label="ELSS bought in the last 3 years" optional hint="Counted inside Indian equities. Still in its lock-in, so it can’t be sold.">
            {(id, d) => <MoneyInput id={id} describedBy={d} value={p.position.elssLocked ?? 0} max={p.position.holdings.indianEquity} onChange={(v) => update((x) => void (x.position.elssLocked = v))} />}
          </Field>
        </div>
      </Section>

      <Disclaimer>Return and volatility figures are illustrative assumptions, not forecasts. Volatility uses a simplified model with a constant 0.3 correlation between asset classes. Example allocations are for education and are not recommendations to buy or sell any product.</Disclaimer>
    </div>
  );
}
