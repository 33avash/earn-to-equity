import { useMemo, useState } from 'react';
import { projectSip } from '@/finance/sip';
import { formatINR, formatPct } from '@/finance/money';
import { Slider } from '@/components/ui/Form';
import { Stat, Disclaimer } from '@/components/ui/Misc';
import { ContribGainsChart } from '@/components/charts/SeriesCharts';
import { useMoney } from '@/state/selectors';

const INFLATION = 0.06;

/** Compact, fully functional SIP calculator used on the landing page and Tools page. */
export function SipPreview() {
  const money = useMoney();
  const [monthly, setMonthly] = useState(10000);
  const [years, setYears] = useState(15);
  const [ret, setRet] = useState(0.11);
  const [step, setStep] = useState(0.1);
  const r = useMemo(() => projectSip({ monthly, years, annualReturn: ret, stepUp: step, inflation: INFLATION }), [monthly, years, ret, step]);
  const data = r.years.map((y) => ({ year: y.year, contributions: y.contributions, gains: y.gains }));

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-4">
        <Slider label="Monthly investment" value={monthly} min={500} max={200000} step={500} onChange={setMonthly} format={formatINR} />
        <Slider label="Investment duration" value={years} min={1} max={40} step={1} onChange={setYears} format={(v) => `${v} yr${v === 1 ? '' : 's'}`} />
        <Slider label="Expected annual return" value={ret} min={0} max={0.18} step={0.005} onChange={setRet} format={(v) => formatPct(v)} help="An assumption, not a promise. Long-run Indian equity returns have varied widely by period." />
        <Slider label="Annual SIP step-up" value={step} min={0} max={0.25} step={0.01} onChange={setStep} format={(v) => formatPct(v, 0)} help="How much you raise the monthly amount each year, for example as your salary grows." />
      </div>
      <div className="lg:col-span-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-line pb-6 sm:grid-cols-4">
          <Stat label="Total contributions" value={money(r.totalContributions)} size="sm" />
          <Stat label="Estimated gains" value={money(r.gains)} size="sm" />
          <Stat label="Projected corpus" value={money(r.corpus)} size="sm" def="projected" />
          <Stat label="In today’s rupees" value={money(r.corpusReal)} size="sm" sub={`at ${formatPct(INFLATION, 0)} inflation`} def="real" />
        </div>
        <div className="mt-6">
          <ContribGainsChart data={data} height={240} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-4 text-xs text-grey">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-forest" /> Contributions</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-champagne" /> Estimated gains</span>
            </div>
            <Disclaimer className="max-w-md">Monthly compounding at the effective annual rate, with contributions at month-end. These are illustrative figures, not guaranteed returns.</Disclaimer>
          </div>
        </div>
      </div>
    </div>
  );
}
