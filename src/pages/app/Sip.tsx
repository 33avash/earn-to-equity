import { useMemo, useState } from 'react';
import type { ContributionTiming } from '@/types/profile';
import { usePlan, useMoney } from '@/state/selectors';
import { PageHeader, Section, Slider, Field, MoneyInput, Segmented, Stat, Disclaimer, Toggle } from '@/components/ui';
import { ContribGainsChart } from '@/components/charts/SeriesCharts';
import { projectSip } from '@/finance/sip';
import { formatINR, formatPct } from '@/finance/money';

export default function Sip() {
  const plan = usePlan();
  const money = useMoney();
  const [monthly, setMonthly] = useState(Math.max(500, Math.round(plan.cashflow.plannedInvestments) || 10000));
  const [lump, setLump] = useState(0);
  const [years, setYears] = useState(20);
  const [ret, setRet] = useState(Math.round(plan.portfolioReturn * 1000) / 1000);
  const [step, setStep] = useState(plan.assumptions.sipStepUp);
  const [timing, setTiming] = useState<ContributionTiming>(plan.assumptions.contributionTiming);
  const [compare, setCompare] = useState(true);
  const infl = plan.assumptions.inflation;

  const stepped = useMemo(() => projectSip({ monthly, lumpSum: lump, years, annualReturn: ret, stepUp: step, timing, inflation: infl }), [monthly, lump, years, ret, step, timing, infl]);
  const flat = useMemo(() => projectSip({ monthly, lumpSum: lump, years, annualReturn: ret, stepUp: 0, timing, inflation: infl }), [monthly, lump, years, ret, timing, infl]);
  const data = stepped.years.map((y, i) => ({ year: y.year, contributions: y.contributions, gains: y.gains, compare: flat.years[i].value }));

  return (
    <div className="flex flex-col gap-12">
      <PageHeader title="SIP Calculator" description={`Monthly compounding at the effective annual rate, with explicit contribution timing. Defaults come from your plan: ${formatINR(plan.cashflow.plannedInvestments)}/month at ${formatPct(plan.portfolioReturn)}.`} />
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Slider label="Monthly investment" value={monthly} min={500} max={300000} step={500} onChange={setMonthly} format={formatINR} />
          <Field label="Initial lump sum" optional>{(id) => <MoneyInput id={id} value={lump} onChange={setLump} max={1e10} />}</Field>
          <Slider label="Duration" value={years} min={1} max={40} step={1} onChange={setYears} format={(v) => `${v} yrs`} />
          <Slider label="Expected annual return" value={ret} min={0} max={0.18} step={0.005} onChange={setRet} format={(v) => formatPct(v)} help="Assumption only. A 0% return gives exactly your contributions." />
          <Slider label="Annual step-up" value={step} min={0} max={0.25} step={0.01} onChange={setStep} format={(v) => formatPct(v, 0)} />
          <div>
            <p className="mb-2 text-[13px] font-medium">Contribution timing</p>
            <Segmented label="Contribution timing" value={timing} onChange={setTiming} options={[{ value: 'end', label: 'End of month' }, { value: 'start', label: 'Start of month' }]} />
          </div>
          <Toggle checked={compare} onChange={setCompare} label="Compare with a flat SIP" description="Same starting amount, no annual increase." />
        </div>
        <div className="lg:col-span-8">
          <div className="grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-4">
            <Stat size="sm" label="Total contributions" value={money(stepped.totalContributions)} />
            <Stat size="sm" label="Estimated gains" value={money(stepped.gains)} />
            <Stat size="sm" label="Nominal corpus" value={money(stepped.corpus)} def="projected" />
            <Stat size="sm" label="Inflation-adjusted" value={money(stepped.corpusReal)} def="real" sub={`at ${formatPct(infl)} inflation`} />
          </div>
          <div className="mt-6">
            <ContribGainsChart data={data} height={300} compareKey={compare ? 'Flat SIP value' : undefined} />
          </div>
          {compare && (
            <p className="mt-4 text-sm text-charcoal">
              Flat SIP: <strong className="num">{money(flat.corpus)}</strong> from {money(flat.totalContributions)} contributed. The step-up adds{' '}
              <strong className="num text-forest">{money(stepped.corpus - flat.corpus)}</strong>.
            </p>
          )}
        </div>
      </div>
      <Section title="Year by year">
        <div className="-mx-1 max-h-[420px] overflow-auto px-1">
          <table className="table-fin w-full min-w-[560px]">
            <thead className="sticky top-0 bg-ivory">
              <tr><th scope="col">Year</th><th scope="col">Monthly</th><th scope="col">Contributed</th><th scope="col">Gains</th><th scope="col">Value</th><th scope="col">Today’s ₹</th></tr>
            </thead>
            <tbody>
              {stepped.years.map((y) => (
                <tr key={y.year}><td>{y.year}</td><td>{money(y.monthly)}</td><td>{money(y.contributions)}</td><td>{money(y.gains)}</td><td className="font-semibold text-evergreen">{money(y.value)}</td><td>{money(y.valueReal)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Disclaimer>Illustrative. Ignores fund expenses, exit loads and taxes. Actual market returns vary year to year and can be negative.</Disclaimer>
    </div>
  );
}
