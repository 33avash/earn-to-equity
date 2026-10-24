import { useMemo } from 'react';
import { FanChart } from '@/components/charts/SeriesCharts';
import { Mark } from '@/components/layout/Wordmark';
import { monteCarlo } from '@/finance/montecarlo';
import { formatCompact, formatPct } from '@/finance/money';
import { answerWithRules } from '@/services/coach/ruleCoach';
import type { Plan } from '@/state/selectors';

/* Landing-page feature tabs that need heavy code (Monte Carlo, the coach). Loaded on demand from Home. */

export function RiskPanel({ plan }: { plan: Plan }) {
  const mc = useMemo(() => monteCarlo(plan.profile, plan.assumptions, { paths: 400, seed: 7 }), [plan]);
  return (
    <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <FanChart data={mc.percentiles} height={260} />
      </div>
      <dl className="flex flex-col justify-center gap-6 lg:col-span-4">
        <div>
          <dt className="text-[12.5px] text-grey">Chance of reaching FI within the plan</dt>
          <dd className="num mt-1 font-sans text-[30px] font-semibold tracking-[-0.04em] text-evergreen">{formatPct(mc.fiProbability, 0)}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-grey">Final net worth, bad decade (10th percentile)</dt>
          <dd className="num mt-1 font-sans text-[22px] font-semibold tracking-[-0.04em] text-evergreen">{formatCompact(mc.finalP10)}</dd>
        </div>
        <p className="text-[12px] leading-relaxed text-grey">{mc.paths} market paths drawn from Nifty 50 history with fat tails. The Risk Lab runs 1,000 and adds crashes, job loss and high inflation.</p>
      </dl>
    </div>
  );
}

export function CoachPanel({ plan }: { plan: Plan }) {
  const q = 'Can I afford a ₹75 L flat in 2031?';
  const a = useMemo(() => answerWithRules(q, plan).text.split('\n\n').slice(0, 3).join('\n\n'), [plan]);
  return (
    <div className="flex flex-col gap-4 p-5 sm:p-7">
      <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-forest px-4 py-2.5 text-[14px] text-onbrand">{q}</p>
      <div className="flex max-w-[92%] gap-3">
        <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted">
          <Mark size={16} animate={false} />
        </span>
        <p className="whitespace-pre-line rounded-2xl rounded-tl-md bg-muted/70 px-4 py-3 text-[13.5px] leading-relaxed text-charcoal">{a}</p>
      </div>
      <p className="text-[12px] text-grey">Every figure in the answer is read from the sample plan’s own projection.</p>
    </div>
  );
}
