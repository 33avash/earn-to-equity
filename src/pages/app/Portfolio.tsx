import { useMemo } from 'react';
import type { RiskProfile } from '@/types/profile';
import { ASSET_CLASSES } from '@/types/profile';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Stat, Notice, Disclaimer, MoneyInput, Button, toast } from '@/components/ui';
import { AllocationEditor } from '@/features/editors/Allocation';
import { AllocationBar } from '@/components/charts/Bars';
import { ContribGainsChart } from '@/components/charts/SeriesCharts';
import { useChartTheme } from '@/components/charts/theme';
import { ASSET_LABELS, PRESETS, allocationDrift, isValidAllocation, maxDrift, riskBand, DEFAULT_RETURNS } from '@/finance/portfolio';
import { projectSip } from '@/finance/sip';
import { formatPct } from '@/finance/money';

export default function Portfolio() {
  const plan = usePlan();
  const money = useMoney();
  const t = useChartTheme();
  const update = useStore((s) => s.updateProfile);
  const updateAssumptions = useStore((s) => s.updateAssumptions);
  const { profile: p, assumptions: a } = plan;
  const target = p.preferences.targetAllocation;
  const valid = isValidAllocation(target);
  const rows = allocationDrift(p.position.holdings, target, plan.cashflow.plannedInvestments);
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
    <div className="flex flex-col gap-14">
      <PageHeader title="Portfolio Builder" description="Set a target mix across seven asset classes, edit the return assumptions, and see drift, rebalancing and projected growth." />

      <dl className="grid grid-cols-2 gap-8 border-b border-line pb-8 lg:grid-cols-4">
        <Stat label="Current value" value={money(total)} def="portfolio" />
        <Stat label="Weighted assumed return" value={formatPct(plan.portfolioReturn)} def="weightedReturn" sub={`Real ≈ ${formatPct((1 + plan.portfolioReturn) / (1 + a.inflation) - 1)} after inflation`} />
        <Stat label="Illustrative volatility" value={formatPct(plan.volatility)} def="volatility" sub={`${band.label}: ${band.note}`} />
        <Stat label="Largest drift" value={`${(drift * 100).toFixed(1)} pts`} sub={drift > 0.05 ? 'Consider rebalancing' : 'Within 5 points'} />
      </dl>

      <Section title="Example allocations" description="Educational illustrations of different risk levels, not personalised recommendations. Applying one replaces your target weights.">
        <div className="grid gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(PRESETS) as RiskProfile[]).map((k) => (
            <div key={k} className={`flex flex-col gap-3 bg-surface p-5 ${p.preferences.risk === k ? 'shadow-[inset_0_2px_0_rgb(var(--c-champagne))]' : ''}`}>
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

      <div className="grid gap-14 xl:grid-cols-2">
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

      <Section title="Current vs target, and rebalancing" description="Edit current values to match your statements. Trades show what would restore the target mix. Monthly contributions follow the target weights.">
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
                <th scope="col">Monthly SIP split</th>
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
                  <td className={r.trade > 0 ? 'text-forest' : r.trade < 0 ? 'text-danger' : 'text-grey'}>{Math.abs(r.trade) < 1 ? '—' : `${r.trade > 0 ? 'Add' : 'Reduce'} ${money(Math.abs(r.trade))}`}</td>
                  <td>{money(r.monthlyContribution)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-charcoal">
          {total === 0
            ? 'Once you add current holdings, drift and rebalancing amounts will appear here.'
            : drift > 0.05
              ? 'Your mix has drifted more than 5 points in at least one asset class. A low-cost way to rebalance is to direct new contributions to under-weight assets before selling anything. Selling can trigger tax and exit loads.'
              : 'Your current mix is within 5 points of target in every asset class. No rebalancing is needed now.'}
        </p>
      </Section>

      <Disclaimer>Return and volatility figures are illustrative assumptions, not forecasts. Volatility uses a simplified model with a constant 0.3 correlation between asset classes. Example allocations are for education and are not recommendations to buy or sell any product.</Disclaimer>
    </div>
  );
}
