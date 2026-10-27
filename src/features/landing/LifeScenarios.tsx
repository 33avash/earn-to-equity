import { useMemo, useState } from 'react';
import { formatCompact, formatPct } from '@/finance/money';
import { landingScenarios, type LandingScenarioKey, type Plan } from '@/state/plan';
import { MultiLineChart } from '@/components/charts/SeriesCharts';
import { useChartTheme } from '@/components/charts/theme';
import { Disclaimer } from '@/components/ui/Misc';
import { AnimatedNumber } from '@/components/motion/Motion';

/** Three what-ifs on the sample plan. The baseline is the same plan the hero and dashboard show. */
export function LifeScenarios({ plan }: { plan: Plan }) {
  const t = useChartTheme();
  const [key, setKey] = useState<LandingScenarioKey>('salary');
  const scenarios = useMemo(() => landingScenarios(plan), [plan]);
  const s = scenarios.find((x) => x.key === key)!;
  const diff = s.altFinal - s.baseFinal;
  const { profile: p } = plan;

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div role="tablist" aria-label="Life scenarios" className="flex flex-col lg:col-span-5">
        {scenarios.map((x, i) => (
          <button
            key={x.key}
            role="tab"
            type="button"
            aria-selected={key === x.key}
            aria-controls="scenario-panel"
            onClick={() => setKey(x.key)}
            className={`group flex items-baseline gap-4 border-t border-line py-5 text-left transition-colors last:border-b ${key === x.key ? '' : 'opacity-60 hover:opacity-100'}`}
          >
            <span className="num text-xs text-grey">0{i + 1}</span>
            <span>
              <span className="display block text-[22px] leading-snug sm:text-2xl">{x.q}</span>
              {key === x.key && <span className="mt-2 block text-sm leading-relaxed text-grey">{x.summary}</span>}
            </span>
          </button>
        ))}
      </div>
      <div id="scenario-panel" role="tabpanel" className="lg:col-span-7">
        <div className="relative">
          <div className="bezel relative z-10 mb-4 inline-block rounded-2xl px-5 py-4 md:absolute md:left-16 md:top-2 md:mb-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-grey">{plan.headline.year} · today’s ₹</p>
            <p className="num mt-1 text-[28px] font-semibold tracking-tight text-evergreen">
              <AnimatedNumber value={s.altFinal} format={formatCompact} />
            </p>
            <p className="num mt-0.5 text-[13px] text-grey">
              <span className={`font-semibold ${diff < 0 ? 'text-danger' : 'text-forest'}`}>
                {diff >= 0 ? '+' : '−'}
                <AnimatedNumber value={Math.abs(diff)} format={formatCompact} />
              </span>{' '}
              vs {formatCompact(s.baseFinal)} base case
            </p>
          </div>
          <MultiLineChart
            data={s.data}
            xKey="year"
            height={320}
            ariaLabel={`Net worth in today’s rupees to ${plan.headline.year}: base case versus ${s.label}`}
            series={[
              { key: 'base', name: 'Base case', color: t.muted, dashed: true },
              { key: 'alt', name: s.label, color: t.primary },
            ]}
          />
        </div>
        <Disclaimer className="mt-4">
          Illustrative. The fictional sample plan: a {p.about.age}-year-old taking home {formatCompact(plan.cashflow.income)} a month, {formatPct(p.income.salaryGrowth, 0)} salary growth, {formatPct(plan.assumptions.inflation, 0)} inflation and a portfolio assumed to return {formatPct(plan.portfolioReturn)} a year, with an MBA, a wedding and a flat along the way.
        </Disclaimer>
      </div>
    </div>
  );
}
