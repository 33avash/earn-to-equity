import { useMemo, useState } from 'react';
import { simulate } from '@/finance/simulate';
import { formatCompact } from '@/finance/money';
import { DEFAULT_ASSUMPTIONS, demoProfile } from '@/state/demo';
import { MultiLineChart } from '@/components/charts/SeriesCharts';
import { useChartTheme } from '@/components/charts/theme';
import { Disclaimer } from '@/components/ui/Misc';
import { AnimatedNumber } from '@/components/motion/Motion';
import type { SimOverrides } from '@/types/sim';

type Key = 'salary' | 'house' | 'stepup';

/** Three illustrative what-ifs on a simplified sample profile, all run through the real engine. */
export function LifeScenarios() {
  const t = useChartTheme();
  const [key, setKey] = useState<Key>('salary');
  const base = useMemo(() => {
    const p = demoProfile();
    p.lifeEvents = [];
    p.goals = [];
    return p;
  }, []);
  const a = useMemo(() => ({ ...DEFAULT_ASSUMPTIONS, sipStepUp: 0.05 }), []);

  const scenarios: Record<Key, { q: string; summary: string; overrides: SimOverrides; label: string }> = {
    salary: {
      q: 'What if my salary grows more slowly?',
      summary: 'Salary growth of 4% a year instead of 8%. Spending is unchanged, so there is less left over to invest.',
      overrides: { salaryGrowth: 0.04 },
      label: '4% salary growth',
    },
    house: {
      q: 'What if I buy a house in five years?',
      summary: 'A ₹60 lakh flat (today’s prices) bought in Year 5 with 20% down, an 8.5% loan over 20 years, and rent of ₹20,000 a month no longer paid.',
      overrides: {
        extraEvents: [
          {
            id: 'h',
            kind: 'homePurchase',
            label: 'Home',
            year: base.planStartYear + 5,
            oneTimeCost: 250000,
            incomeChangePct: 0,
            monthlyExpenseChange: -20000,
            breakMonths: 0,
            home: { propertyValue: 6000000, downPaymentPct: 0.2, loanRate: 0.085, tenureYears: 20 },
          },
        ],
      },
      label: 'Buy a home in Year 5',
    },
    stepup: {
      q: 'What if I increase my investments every year?',
      summary: 'Monthly investments rise 15% each year instead of 5%, and any surplus not invested stays in cash.',
      overrides: { sipStepUp: 0.15 },
      label: '15% annual step-up',
    },
  };

  const s = scenarios[key];
  const { data, baseFinal, altFinal } = useMemo(() => {
    const ax = { ...a, sweepExcessCash: key !== 'stepup' };
    const b = simulate(base, ax);
    const v = simulate(base, ax, s.overrides);
    return {
      data: b.rows.map((r, i) => ({ year: r.year, base: r.netWorthReal, alt: v.rows[i].netWorthReal })),
      baseFinal: b.rows.at(-1)!.netWorthReal,
      altFinal: v.rows.at(-1)!.netWorthReal,
    };
  }, [base, a, key, s.overrides]);
  const diff = altFinal - baseFinal;

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div role="tablist" aria-label="Life scenarios" className="flex flex-col lg:col-span-5">
        {(Object.keys(scenarios) as Key[]).map((k, i) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={key === k}
            aria-controls="scenario-panel"
            onClick={() => setKey(k)}
            className={`group flex items-baseline gap-4 border-t border-line py-5 text-left transition-colors last:border-b ${key === k ? '' : 'opacity-60 hover:opacity-100'}`}
          >
            <span className="num text-xs text-grey">0{i + 1}</span>
            <span>
              <span className="display block text-[22px] leading-snug sm:text-2xl">{scenarios[k].q}</span>
              {key === k && <span className="mt-2 block text-sm leading-relaxed text-grey">{scenarios[k].summary}</span>}
            </span>
          </button>
        ))}
      </div>
      <div id="scenario-panel" role="tabpanel" className="lg:col-span-7">
        <div className="relative">
          <div className="glass relative z-10 mb-4 inline-block px-5 py-4 md:absolute md:left-16 md:top-2 md:mb-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-grey">After 20 years · today’s ₹</p>
            <p className="num mt-1 text-[28px] font-semibold tracking-tight text-evergreen">
              <AnimatedNumber value={altFinal} format={formatCompact} />
            </p>
            <p className="num mt-0.5 text-[13px] text-grey">
              <span className={`font-semibold ${diff < 0 ? 'text-danger' : 'text-forest'}`}>
                {diff >= 0 ? '+' : '−'}
                <AnimatedNumber value={Math.abs(diff)} format={formatCompact} />
              </span>{' '}
              vs {formatCompact(baseFinal)} base case
            </p>
          </div>
          <MultiLineChart
            data={data}
            xKey="year"
            height={320}
            ariaLabel={`Net worth over 20 years: base case versus ${s.label}`}
            series={[
              { key: 'base', name: 'Base case', color: t.muted, dashed: true },
              { key: 'alt', name: s.label, color: t.primary },
            ]}
          />
        </div>
        <Disclaimer className="mt-4">Illustrative. Uses a fictional 26-year-old earning ₹85,000 a month, 8% salary growth, 6% inflation and a growth-oriented portfolio assumed to return about 9.5% a year.</Disclaimer>
      </div>
    </div>
  );
}
