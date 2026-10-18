import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { HeroGraphic } from '@/features/landing/HeroGraphic';
import { SipPreview } from '@/features/sip/SipPreview';
import { LifeScenarios } from '@/features/landing/LifeScenarios';
import { AllocationPanel, FiPanel, NextStepsPanel, TrajectoryPanel } from '@/features/overview/Panels';
import { GoalTimeline } from '@/features/goals/GoalTimeline';
import { computePlan, heroSeries } from '@/state/selectors';
import { DEFAULT_ASSUMPTIONS, demoProfile } from '@/state/demo';
import { formatCompact, formatPct } from '@/finance/money';
import { useExploreDemo } from '@/state/useDemo';
import { Mark } from '@/components/layout/Wordmark';
import { AnimatedNumber, GridBackground, Reveal, Spotlight } from '@/components/motion/Motion';

const STEPS = [
  { title: 'Enter your pay and spending', body: 'Your CTC, rent, EMIs and SIPs. We work out take-home under both tax regimes and your EPF contribution.' },
  { title: 'Add goals and life events', body: 'An MBA in 2029, a flat in 2039, a wedding. Each goal is priced in today’s rupees and inflated to its year.' },
  { title: 'See every year to 2046', body: 'One projection drives every screen. Change a number and the whole plan reruns, from this month’s surplus to your FI age.' },
];

const COMPARE: { row: string; calc: boolean; plan: boolean }[] = [
  { row: 'Compounding on a monthly SIP', calc: true, plan: true },
  { row: 'Take-home recalculated as your CTC crosses tax slabs', calc: false, plan: true },
  { row: 'EPF growing at the declared rate', calc: false, plan: true },
  { row: 'Loans, EMIs and the 50% lender limit', calc: false, plan: true },
  { row: 'Goals paid from savings or a loan in the year they fall due', calc: false, plan: true },
  { row: 'Capital-gains tax when you sell', calc: false, plan: true },
  { row: 'Market crashes and career breaks', calc: false, plan: true },
];

export default function Home() {
  const exploreDemo = useExploreDemo();
  const sample = useMemo(() => computePlan(demoProfile(), DEFAULT_ASSUMPTIONS), []);
  const series = useMemo(() => heroSeries(sample), [sample]);

  return (
    <>
      {/* HERO */}
      <section className="relative -mt-16 overflow-hidden pt-16">
        <GridBackground />
        <div className="container-x relative grid items-center gap-14 pb-20 pt-16 lg:grid-cols-12 lg:gap-8 lg:pb-28 lg:pt-20">
          <div className="lg:col-span-6">
            <Reveal as="div">
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] text-grey">
                <span className="h-1.5 w-1.5 rounded-full bg-forest" aria-hidden />
                For salaried professionals in India.
              </p>
            </Reveal>
            <Reveal as="div" delay={60}>
              <h1 className="display mt-6 text-[44px] leading-[1.02] sm:text-[56px] lg:text-[64px]">Plan the next 20 years of your salary.</h1>
            </Reveal>
            <Reveal as="div" delay={120}>
              <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-grey">
                Enter your CTC, spending, loans and goals. Get a year-by-year projection to {series.end.year}, with income tax, EPF, inflation and EMIs built in.
              </p>
            </Reveal>
            <Reveal as="div" delay={180}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <ButtonLink to="/start" size="lg">
                  Build your plan <ArrowRight size={16} aria-hidden />
                </ButtonLink>
                <button type="button" onClick={() => exploreDemo('/app')} className="tap inline-flex h-12 items-center rounded-md border border-line bg-surface px-5 text-[15px] font-medium text-evergreen hover:bg-muted">
                  See the demo plan
                </button>
              </div>
            </Reveal>
          </div>

          <div className="relative lg:col-span-6">
            <div className="rounded-lg border border-line bg-surface/80 p-4 shadow-[var(--shadow-float)] backdrop-blur-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[12px] text-grey">Net worth today</p>
                  <p className="num text-[22px] font-semibold text-evergreen">
                    <AnimatedNumber value={sample.sheet.netWorth} format={formatCompact} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-grey">In {series.end.year}, in today’s ₹</p>
                  <p className="num text-[22px] font-semibold text-forest">
                    <AnimatedNumber value={series.end.netWorthReal} format={formatCompact} />
                  </p>
                </div>
              </div>
              <HeroGraphic series={series} />
              <p className="mt-3 text-[12px] text-grey">
                Sample plan for a fictional {sample.profile.about.age}-year-old in Pune earning {formatCompact(sample.profile.income.ctc ?? 0)} a year, at {formatPct(DEFAULT_ASSUMPTIONS.inflation, 0)} inflation and a {formatPct(sample.portfolioReturn)} return after fund costs.
                {series.fiBeyond && ` Work becomes optional in ${series.fiBeyond.year}, at ${series.fiBeyond.age}.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section aria-labelledby="how-h" className="border-t border-line">
        <div className="container-x py-20 lg:py-24">
          <Reveal className="max-w-2xl">
            <h2 id="how-h" className="display text-[32px] leading-tight sm:text-[40px]">
              How it works
            </h2>
            <p className="mt-3 text-[16px] text-grey">
              Three steps and about eight minutes. Every screen then reads from the same 20-year projection.{' '}
              <Link to="/how-it-works" className="link">
                Read the method
              </Link>
            </p>
          </Reveal>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 70} className="lift rounded-lg border border-line bg-surface p-6">
                <span className="num text-[13px] text-forest">0{i + 1}</span>
                <h3 className="mt-3 text-[17px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-grey">{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* BENTO */}
      <section aria-labelledby="feat-h" className="border-t border-line bg-surface">
        <div className="container-x py-20 lg:py-24">
          <Reveal className="max-w-2xl">
            <h2 id="feat-h" className="display text-[32px] leading-tight sm:text-[40px]">
              Goals, priced for the year you need them
            </h2>
            <p className="mt-3 text-[16px] text-grey">See which goals your surplus covers, and what to change for the rest.</p>
          </Reveal>
          <div className="mt-12 grid gap-4 lg:grid-cols-6">
            <Reveal className="lift rounded-lg border border-line bg-ivory p-6 lg:col-span-4 lg:row-span-2">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-evergreen">Sample plan: {formatCompact(sample.goals.capacity)} a month to work with</p>
                <Link to="/features" className="hit text-xs text-grey hover:text-evergreen">
                  All features
                </Link>
              </div>
              <GoalTimeline goals={sample.goalViews} />
            </Reveal>
            <Reveal delay={60} className="lift rounded-lg border border-line bg-ivory p-6 lg:col-span-2">
              <h3 className="text-[16px] font-semibold tracking-tight">Year-by-year projection</h3>
              <p className="mt-2 text-sm leading-relaxed text-grey">Twenty years of take-home, tax, spending, EMIs, investments and EPF. Click any year to see what happened in it.</p>
              <button type="button" onClick={() => exploreDemo('/app/simulator', true)} className="hit mt-4 inline-flex items-center gap-1 text-sm font-medium text-forest">
                Open the simulator <ArrowRight size={14} aria-hidden />
              </button>
            </Reveal>
            <Reveal delay={120} className="lift rounded-lg border border-line bg-ivory p-6 lg:col-span-2">
              <h3 className="text-[16px] font-semibold tracking-tight">Stress tests</h3>
              <p className="mt-2 text-sm leading-relaxed text-grey">A 2008-style crash in year 4, six months without a job, three years of 8% inflation, and 1,000 market paths with fat tails.</p>
              <button type="button" onClick={() => exploreDemo('/app/risk-lab', true)} className="hit mt-4 inline-flex items-center gap-1 text-sm font-medium text-forest">
                Open the risk lab <ArrowRight size={14} aria-hidden />
              </button>
            </Reveal>
            <Reveal delay={60} className="lift rounded-lg border border-line bg-ivory p-6 lg:col-span-3">
              <h3 className="text-[16px] font-semibold tracking-tight">Ask questions about your plan</h3>
              <p className="mt-2 text-sm leading-relaxed text-grey">“Can I afford a ₹75 L flat in 2031?” The answer quotes your own projection: down payment, stamp duty, EMI and what a lender would approve.</p>
            </Reveal>
            <Reveal delay={120} className="lift rounded-lg border border-line bg-ivory p-6 lg:col-span-3">
              <h3 className="text-[16px] font-semibold tracking-tight">Tax-year 2026-27 rules</h3>
              <p className="mt-2 text-sm leading-relaxed text-grey">New and old regime slabs, the ₹12.75 lakh nil-tax salary, 12.5% LTCG above ₹1.25 lakh, and EPF at 8.25%. Each rate shows its date and source.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SIP CALCULATOR */}
      <section aria-labelledby="sip-h" className="border-t border-line">
        <div className="container-x py-20 lg:py-24">
          <Reveal className="mb-12 max-w-2xl">
            <h2 id="sip-h" className="display text-[32px] leading-tight sm:text-[40px]">
              What could ₹10,000 a month become?
            </h2>
            <p className="mt-3 text-[16px] text-grey">Drag the sliders. The chart splits what you put in from what compounding adds.</p>
          </Reveal>
          <Reveal>
            <SipPreview />
          </Reveal>
        </div>
      </section>

      {/* PRODUCT PREVIEW */}
      <section aria-labelledby="preview-h" className="border-t border-line bg-surface">
        <div className="container-x py-20 lg:py-24">
          <Reveal className="mb-12 max-w-2xl">
            <h2 id="preview-h" className="display text-[32px] leading-tight sm:text-[40px]">
              The dashboard, on the sample plan
            </h2>
            <p className="mt-3 text-[16px] text-grey">The same charts and next steps you’ll see for your own numbers.</p>
          </Reveal>
          <Reveal>
            <div className="overflow-hidden rounded-lg border border-line bg-ivory shadow-[var(--shadow-float)]">
              <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
                <Mark size={16} />
                <span className="text-xs text-grey">Overview, sample plan</span>
              </div>
              <div className="grid gap-10 p-5 sm:p-8 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <TrajectoryPanel plan={sample} height={260} interactive={false} />
                </div>
                <div className="flex flex-col gap-10 lg:col-span-4 lg:border-l lg:border-line lg:pl-8">
                  <FiPanel plan={sample} />
                  <AllocationPanel plan={sample} showTarget={false} />
                </div>
                <div className="border-t border-line pt-6 lg:col-span-12">
                  <p className="eyebrow mb-4">Next steps</p>
                  <NextStepsPanel plan={{ ...sample, insights: sample.insights.slice(0, 4) }} linkable={false} />
                </div>
              </div>
            </div>
          </Reveal>
          <button type="button" onClick={() => exploreDemo('/app')} className="tap mt-8 inline-flex h-11 items-center gap-1.5 rounded-md border border-line bg-surface px-4 text-sm font-medium text-evergreen hover:bg-muted">
            Open the demo plan <ArrowRight size={15} aria-hidden />
          </button>
        </div>
      </section>

      {/* WHAT-IF SCENARIOS */}
      <section aria-labelledby="scen-h" className="border-t border-line">
        <div className="container-x py-20 lg:py-24">
          <Reveal className="mb-12 max-w-2xl">
            <h2 id="scen-h" className="display text-[32px] leading-tight sm:text-[40px]">
              What-if scenarios
            </h2>
            <p className="mt-3 text-[16px] text-grey">Three changes to the sample plan, each measured in {series.end.year} net worth in today’s rupees.</p>
          </Reveal>
          <Reveal>
            <LifeScenarios plan={sample} />
          </Reveal>
        </div>
      </section>

      {/* COMPARISON */}
      <section aria-labelledby="cmp-h" className="border-t border-line bg-surface">
        <div className="container-x py-20 lg:py-24">
          <Reveal className="mb-10 max-w-2xl">
            <h2 id="cmp-h" className="display text-[32px] leading-tight sm:text-[40px]">
              Beyond a SIP calculator
            </h2>
            <p className="mt-3 text-[16px] text-grey">What a typical online SIP calculator models, and what your plan adds.</p>
          </Reveal>
          <Reveal>
            <div className="overflow-x-auto rounded-lg border border-line bg-ivory">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th scope="col" className="px-5 py-3 font-medium text-grey">What’s modelled</th>
                    <th scope="col" className="w-36 px-5 py-3 text-center font-medium text-grey">SIP calculator</th>
                    <th scope="col" className="w-36 bg-mint/60 px-5 py-3 text-center font-semibold text-evergreen">Earn to Equity</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((r) => (
                    <tr key={r.row} className="border-b border-line last:border-0">
                      <th scope="row" className="px-5 py-3 text-left font-normal text-charcoal">{r.row}</th>
                      <td className="px-5 py-3 text-center">{r.calc ? <Check size={16} className="mx-auto text-forest" aria-label="Yes" /> : <Minus size={16} className="mx-auto text-grey" aria-label="No" />}</td>
                      <td className="bg-mint/60 px-5 py-3 text-center">{r.plan ? <Check size={16} className="mx-auto text-forest" aria-label="Yes" /> : <Minus size={16} className="mx-auto text-grey" aria-label="No" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line">
        <div className="container-x py-20 lg:py-24">
          <Spotlight className="rounded-lg border border-line bg-surface">
            <div className="grid gap-8 p-8 sm:p-12 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-8">
                <h2 className="display text-[34px] leading-tight sm:text-[44px]">Build your plan</h2>
                <p className="mt-3 max-w-xl text-[16px] text-grey">Eight steps: pay, spending, savings, loans, protection, goals and investments, then a review.</p>
              </div>
              <div className="lg:col-span-4 lg:text-right">
                <ButtonLink to="/start" size="lg">
                  Start <ArrowRight size={16} aria-hidden />
                </ButtonLink>
              </div>
            </div>
          </Spotlight>
        </div>
      </section>
    </>
  );
}
