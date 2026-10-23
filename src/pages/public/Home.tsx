import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { ButtonLink, btn } from '@/components/ui/Button';
import { Bezel, Tag } from '@/components/ui/Misc';
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
import { AnimatedNumber, GridBackground, Reveal } from '@/components/motion/Motion';

const STEPS = [
  { title: 'Enter your pay and spending', body: 'Your CTC, rent, EMIs and SIPs. We work out take-home under both tax regimes and your EPF contribution.' },
  { title: 'Add goals and life events', body: 'An MBA in 2029, a flat in 2039, a wedding. Each goal is priced in today’s rupees and inflated to its year.' },
  { title: 'See every year to 2046', body: 'One projection drives every screen. Change a number and the whole plan reruns, from this month’s surplus to your FI age.' },
];

/* Z-axis cascade: on wide screens the step cards tilt and step down like cards dealt on a table. */
const CASCADE = ['lg:-rotate-2 lg:translate-y-0', 'lg:rotate-1 lg:translate-y-10 lg:-ml-6', 'lg:-rotate-1 lg:translate-y-20 lg:-ml-6'];

const COMPARE: { row: string; calc: boolean; plan: boolean }[] = [
  { row: 'Compounding on a monthly SIP', calc: true, plan: true },
  { row: 'Take-home recalculated as your CTC crosses tax slabs', calc: false, plan: true },
  { row: 'EPF growing at the declared rate', calc: false, plan: true },
  { row: 'Loans, EMIs and the 50% lender limit', calc: false, plan: true },
  { row: 'Goals paid from savings or a loan in the year they fall due', calc: false, plan: true },
  { row: 'Capital-gains tax when you sell', calc: false, plan: true },
  { row: 'Market crashes and career breaks', calc: false, plan: true },
];

/** Editorial section heading: tag and large title on the left, the supporting line on the right. */
function SectionHead({ id, tag, title, children }: { id: string; tag: string; title: ReactNode; children?: ReactNode }) {
  return (
    <Reveal className="mb-14 grid gap-6 lg:mb-20 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        <Tag>{tag}</Tag>
        <h2 id={id} className="display mt-6 text-[38px] leading-[1] sm:text-[52px] lg:text-[60px]">
          {title}
        </h2>
      </div>
      {children && <div className="text-[16px] leading-relaxed text-grey lg:col-span-4 lg:col-start-9">{children}</div>}
    </Reveal>
  );
}

const section = 'container-x py-24 sm:py-32 lg:py-40';

export default function Home() {
  const exploreDemo = useExploreDemo();
  const sample = useMemo(() => computePlan(demoProfile(), DEFAULT_ASSUMPTIONS), []);
  const series = useMemo(() => heroSeries(sample), [sample]);

  return (
    <>
      {/* HERO: editorial split, with the chart card tilted and a glass chip overlapping it */}
      <section className="relative -mt-24 overflow-hidden pt-24 sm:-mt-28 sm:pt-28">
        <GridBackground />
        <div className="container-x relative grid items-center gap-20 pb-24 pt-10 lg:min-h-[min(calc(100dvh-7rem),820px)] lg:grid-cols-12 lg:gap-10 lg:pb-32 lg:pt-6">
          <div className="lg:col-span-6">
            <Reveal as="div">
              <Tag>For salaried professionals in India.</Tag>
            </Reveal>
            <Reveal as="div" delay={80}>
              <h1 className="display mt-8 text-[48px] leading-[0.95] sm:text-[68px] lg:text-[80px]">
                Plan the next 20 years of your <span className="serif-accent text-forest">salary.</span>
              </h1>
            </Reveal>
            <Reveal as="div" delay={160}>
              <p className="mt-8 max-w-[32rem] text-[17px] leading-relaxed text-grey">
                Enter your CTC, spending, loans and goals. Get a year-by-year projection to {series.end.year}, with income tax, EPF, inflation and EMIs built in.
              </p>
            </Reveal>
            <Reveal as="div" delay={240}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <ButtonLink to="/start" size="lg">
                  Build your plan <ArrowRight size={16} aria-hidden />
                </ButtonLink>
                <button type="button" onClick={() => exploreDemo('/app')} className={btn('secondary', 'lg')}>
                  See the demo plan
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="relative lg:col-span-6">
            <Bezel className="p-5 transition-transform duration-1000 ease-spring sm:p-7 lg:rotate-[1.5deg] lg:hover:rotate-0">
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-grey">In {series.end.year}, in today’s ₹</p>
                  <p className="num mt-2 text-[32px] font-semibold leading-none tracking-[-0.04em] text-forest [&_.num]:font-sans">
                    <AnimatedNumber value={series.end.netWorthReal} format={formatCompact} />
                  </p>
                </div>
                <Mark size={26} />
              </div>
              <HeroGraphic series={series} />
              <p className="mt-3 text-[12px] leading-relaxed text-grey">
                Sample plan for a fictional {sample.profile.about.age}-year-old in Pune earning {formatCompact(sample.profile.income.ctc ?? 0)} a year, at {formatPct(DEFAULT_ASSUMPTIONS.inflation, 0)} inflation and a {formatPct(sample.portfolioReturn)} return after fund costs.
                {series.fiBeyond && ` Work becomes optional in ${series.fiBeyond.year}, at ${series.fiBeyond.age}.`}
              </p>
            </Bezel>
            <div className="bezel mt-6 inline-flex flex-col rounded-2xl px-5 py-4 lg:absolute lg:-bottom-10 lg:-left-12 lg:mt-0 lg:-rotate-3 lg:shadow-float">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-grey">Net worth today</p>
              <p className="num mt-1.5 text-[24px] font-semibold leading-none tracking-[-0.04em] text-evergreen [&_.num]:font-sans">
                <AnimatedNumber value={sample.sheet.netWorth} format={formatCompact} />
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS: cascading cards */}
      <section aria-labelledby="how-h">
        <div className={section}>
          <SectionHead
            id="how-h"
            tag="Method"
            title={
              <>
                How it <span className="serif-accent">works</span>
              </>
            }
          >
            <p>
              Three steps and about eight minutes. Every screen then reads from the same 20-year projection.{' '}
              <Link to="/how-it-works" className="link">
                Read the method
              </Link>
            </p>
          </SectionHead>
          <ol className="grid gap-6 lg:grid-cols-3 lg:gap-0 lg:pb-20">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 100} className="relative hover:z-10">
                <Bezel className={`flex h-full min-h-[260px] flex-col justify-between p-8 transition-transform duration-1000 ease-spring sm:p-10 lg:hover:rotate-0 ${CASCADE[i]}`}>
                  <span className="num text-[64px] font-light leading-none tracking-[-0.06em] text-forest/80">0{i + 1}</span>
                  <div className="mt-12">
                    <h3 className="text-[20px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-grey">{s.body}</p>
                  </div>
                </Bezel>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* BENTO: asymmetric grid */}
      <section aria-labelledby="feat-h">
        <div className={section}>
          <SectionHead
            id="feat-h"
            tag="Goals"
            title={
              <>
                Goals, priced for the year you <span className="serif-accent">need them</span>
              </>
            }
          >
            <p>See which goals your surplus covers, and what to change for the rest.</p>
          </SectionHead>
          <div className="grid gap-6 lg:grid-cols-12">
            <Reveal className="lg:col-span-7 lg:row-span-2">
              <Bezel className="h-full p-7 sm:p-10">
                <div className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[15px] font-semibold text-evergreen">Sample plan: {formatCompact(sample.goals.capacity)} a month to work with</p>
                  <Link to="/features" className="hit text-xs text-grey hover:text-evergreen">
                    All features
                  </Link>
                </div>
                <GoalTimeline goals={sample.goalViews} />
              </Bezel>
            </Reveal>
            <Reveal delay={80} className="lg:col-span-5">
              <Bezel className="flex h-full flex-col p-7 sm:p-10">
                <h3 className="text-[20px] font-semibold tracking-[-0.02em]">Year-by-year projection</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-grey">Twenty years of take-home, tax, spending, EMIs, investments and EPF. Click any year to see what happened in it.</p>
                <button type="button" onClick={() => exploreDemo('/app/simulator', true)} className={btn('secondary', 'sm', 'mt-8 self-start')}>
                  Open the simulator <ArrowRight size={14} aria-hidden />
                </button>
              </Bezel>
            </Reveal>
            <Reveal delay={160} className="lg:col-span-5">
              <Bezel className="flex h-full flex-col p-7 sm:p-10">
                <h3 className="text-[20px] font-semibold tracking-[-0.02em]">Stress tests</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-grey">A 2008-style crash in year 4, six months out of work, three years of 8% inflation, and 1,000 market paths with fat tails.</p>
                <button type="button" onClick={() => exploreDemo('/app/risk-lab', true)} className={btn('secondary', 'sm', 'mt-8 self-start')}>
                  Open the risk lab <ArrowRight size={14} aria-hidden />
                </button>
              </Bezel>
            </Reveal>
            <Reveal delay={80} className="lg:col-span-4">
              <Bezel className="h-full p-7 sm:p-10">
                <h3 className="text-[20px] font-semibold tracking-[-0.02em]">Ask questions about your plan</h3>
                <p className="mt-3 text-sm leading-relaxed text-grey">“Can I afford a ₹75 L flat in 2031?” The answer quotes your own projection: down payment, stamp duty, EMI and what a lender would approve.</p>
              </Bezel>
            </Reveal>
            <Reveal delay={160} className="lg:col-span-8">
              <Bezel className="h-full p-7 sm:p-10">
                <h3 className="text-[20px] font-semibold tracking-[-0.02em]">Tax-year 2026-27 rules</h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-grey">New and old regime slabs, the ₹12.75 lakh nil-tax salary, 12.5% LTCG above ₹1.25 lakh, and EPF at 8.25%. Each rate shows its date and source.</p>
              </Bezel>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SIP CALCULATOR */}
      <section aria-labelledby="sip-h">
        <div className={section}>
          <SectionHead
            id="sip-h"
            tag="Calculator"
            title={
              <>
                What could ₹10,000 a month <span className="serif-accent">become?</span>
              </>
            }
          >
            <p>Drag the sliders. The chart splits what you put in from what compounding adds.</p>
          </SectionHead>
          <Reveal>
            <Bezel className="p-6 sm:p-10 lg:p-12">
              <SipPreview />
            </Bezel>
          </Reveal>
        </div>
      </section>

      {/* PRODUCT PREVIEW */}
      <section aria-labelledby="preview-h">
        <div className={section}>
          <SectionHead
            id="preview-h"
            tag="Preview"
            title={
              <>
                The dashboard, on the <span className="serif-accent">sample plan</span>
              </>
            }
          >
            <p>The same charts and next steps you’ll see for your own numbers.</p>
          </SectionHead>
          <Reveal>
            <Bezel className="overflow-hidden">
              <div className="flex items-center gap-3 border-b border-line/70 px-5 py-3.5">
                <span className="flex gap-1.5" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-line" />
                  <span className="h-2.5 w-2.5 rounded-full bg-line" />
                  <span className="h-2.5 w-2.5 rounded-full bg-line" />
                </span>
                <span className="ml-2 inline-flex items-center gap-2 rounded-full bg-muted/70 px-3 py-1 text-xs text-grey">
                  <Mark size={14} />
                  Overview, sample plan
                </span>
              </div>
              <div className="grid gap-12 p-6 sm:p-10 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <TrajectoryPanel plan={sample} height={260} interactive={false} />
                </div>
                <div className="flex flex-col gap-12 lg:col-span-4 lg:border-l lg:border-line/70 lg:pl-10">
                  <FiPanel plan={sample} />
                  <AllocationPanel plan={sample} showTarget={false} />
                </div>
                <div className="border-t border-line/70 pt-8 lg:col-span-12">
                  <p className="eyebrow mb-5">Next steps</p>
                  <NextStepsPanel plan={{ ...sample, insights: sample.insights.slice(0, 4) }} linkable={false} />
                </div>
              </div>
            </Bezel>
          </Reveal>
          <button type="button" onClick={() => exploreDemo('/app')} className={btn('secondary', 'md', 'mt-12')}>
            Open the demo plan <ArrowRight size={15} aria-hidden />
          </button>
        </div>
      </section>

      {/* WHAT-IF SCENARIOS */}
      <section aria-labelledby="scen-h">
        <div className={section}>
          <SectionHead
            id="scen-h"
            tag="Scenarios"
            title={
              <>
                What-if <span className="serif-accent">scenarios</span>
              </>
            }
          >
            <p>Three changes to the sample plan, each measured in {series.end.year} net worth in today’s rupees.</p>
          </SectionHead>
          <Reveal>
            <Bezel className="p-6 sm:p-10 lg:p-12">
              <LifeScenarios plan={sample} />
            </Bezel>
          </Reveal>
        </div>
      </section>

      {/* COMPARISON */}
      <section aria-labelledby="cmp-h">
        <div className={section}>
          <SectionHead
            id="cmp-h"
            tag="Comparison"
            title={
              <>
                Beyond a SIP <span className="serif-accent">calculator</span>
              </>
            }
          >
            <p>What a typical online SIP calculator models, and what your plan adds.</p>
          </SectionHead>
          <Reveal>
            <Bezel className="overflow-x-auto p-2 sm:p-3">
              <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left">
                    <th scope="col" className="px-5 py-4 font-medium text-grey">What’s modelled</th>
                    <th scope="col" className="w-40 px-5 py-4 text-center font-medium text-grey">SIP calculator</th>
                    <th scope="col" className="w-40 rounded-t-2xl bg-mint/70 px-5 py-4 text-center font-semibold text-evergreen">Earn to Equity</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((r, i) => (
                    <tr key={r.row}>
                      <th scope="row" className="border-t border-line/70 px-5 py-4 text-left font-normal text-charcoal">{r.row}</th>
                      <td className="border-t border-line/70 px-5 py-4 text-center">{r.calc ? <Check size={16} className="mx-auto text-forest" aria-label="Yes" /> : <Minus size={16} className="mx-auto text-grey" aria-label="No" />}</td>
                      <td className={`border-t border-line/40 bg-mint/70 px-5 py-4 text-center ${i === COMPARE.length - 1 ? 'rounded-b-2xl' : ''}`}>{r.plan ? <Check size={16} className="mx-auto text-forest" aria-label="Yes" /> : <Minus size={16} className="mx-auto text-grey" aria-label="No" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Bezel>
          </Reveal>
        </div>
      </section>

      {/* CTA: an inverted island in its own tray */}
      <section className="container-x pb-8 pt-16 lg:pt-24">
        <Reveal>
          <div className="rounded-[2.5rem] bg-[var(--shell)] p-2 shadow-[0_0_0_1px_var(--shell-line)]">
            <div className="relative overflow-hidden rounded-[calc(2.5rem-0.5rem)] bg-evergreen px-7 py-16 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] sm:px-14 sm:py-24">
              <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgb(var(--chart-1)/0.35),rgb(0_0_0/0)_65%)]" />
              <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/4 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgb(var(--chart-2)/0.25),rgb(0_0_0/0)_65%)]" />
              <div className="relative grid gap-10 lg:grid-cols-12 lg:items-end">
                <div className="lg:col-span-8">
                  <h2 className="display text-[44px] leading-[0.95] !text-onbrand sm:text-[64px] lg:text-[80px]">
                    Build your <span className="serif-accent">plan</span>
                  </h2>
                  <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-onbrand/70">Eight steps: pay, spending, savings, loans, protection, goals and investments, then a review.</p>
                </div>
                <div className="lg:col-span-4 lg:text-right">
                  <ButtonLink to="/start" size="lg" variant="inverse">
                    Start <ArrowRight size={16} aria-hidden />
                  </ButtonLink>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
