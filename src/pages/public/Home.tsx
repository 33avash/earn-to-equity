import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
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
import { Aurora, Reveal } from '@/components/motion/Motion';

const QUESTIONS = [
  { q: 'Where do I stand today?', a: 'Income, spending, savings, investments and loans become one balance sheet, with a savings rate and an emergency buffer you can actually read.' },
  { q: 'What am I working towards?', a: 'A degree, a first home, a wedding, time off. Each goal is priced in today’s rupees and inflated to the year you need it.' },
  { q: 'What could I change?', a: 'Move a goal, raise a SIP, survive a 30% market fall. Every change reruns the same 20-year projection.' },
];

const FEATURES = [
  { to: '/app/simulator', title: 'A year-by-year engine, not a single number', body: 'Twenty rows of income, spending, contributions, loans and goals. Click any year to see what happened in it.' },
  { to: '/app/risk-lab', title: 'Stress tests you can feel', body: 'Slower raises, higher inflation, a career break, a market decline in Year 4, and 1,000 simulated paths for the honest range.' },
  { to: '/app/coach', title: 'A coach that only quotes your numbers', body: 'Ask “can I afford a home in five years?” The engine does the maths, and the coach explains it in plain language.' },
];

export default function Home() {
  const exploreDemo = useExploreDemo();
  const explore = () => exploreDemo('/app');
  // The sample plan behind every figure on this page: the same engine and selectors as the dashboard.
  const sample = useMemo(() => computePlan(demoProfile(), DEFAULT_ASSUMPTIONS), []);
  const series = useMemo(() => heroSeries(sample), [sample]);

  return (
    <>
      {/* HERO: sits under the transparent nav so the colour fields reach the top edge */}
      <section className="relative -mt-16 overflow-hidden pt-16">
        <Aurora />
        <div className="container-x relative z-10 grid items-center gap-14 pb-20 pt-14 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-12 lg:gap-6 lg:pb-24 lg:pt-10">
          <div className="lg:col-span-6">
            <p className="eyebrow page-enter">Wealth planning for India’s first-salary generation</p>
            <h1 className="display page-enter mt-7 text-[46px] leading-[0.98] tracking-[-0.025em] [animation-delay:80ms] sm:text-[60px] lg:text-[64px] xl:text-[72px]">
              Your salary is
              <br />
              where your
              <br />
              <em className="italic text-forest">wealth</em> story
              <br />
              begins.
            </h1>
            <p className="page-enter mt-7 max-w-[30rem] text-[17px] leading-relaxed text-charcoal/75 [animation-delay:160ms]">
              Turn this month’s paycheck, your goals and the life you want into a 20-year plan. See where you stand today and which decisions move the line.
            </p>
            <div className="page-enter mt-9 flex flex-wrap items-center gap-x-6 gap-y-4 [animation-delay:240ms]">
              <ButtonLink to="/start" size="lg">
                Build My Wealth Plan <ArrowRight size={16} aria-hidden />
              </ButtonLink>
              <button type="button" onClick={explore} className="hit group inline-flex items-center gap-1.5 text-[15px] font-medium text-evergreen">
                <span className="border-b border-evergreen/30 pb-0.5 transition-colors group-hover:border-evergreen">Explore the demo</span>
                <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </button>
            </div>
            <p className="page-enter mt-10 text-xs text-grey [animation-delay:320ms]">No bank logins · No sign-up · Your data stays in this browser</p>
          </div>

          <div className="relative lg:col-span-6 lg:pl-4">
            <HeroGraphic series={series} />
            {/* Floating summary panels: illustrative figures for the fictional sample profile */}
            <div className="fade-late absolute left-0 top-0 hidden sm:block lg:-left-6 lg:top-2"><div className="glass float-slow w-[210px] p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-grey">Net worth today</p>
              <p className="num mt-1 text-[26px] font-semibold tracking-tight text-evergreen">{formatCompact(sample.sheet.netWorth)}</p>
              <p className="mt-1 text-[11.5px] leading-snug text-grey">
                Investing {formatCompact(sample.cashflow.plannedInvestments)} of {formatCompact(sample.cashflow.income)} a month
              </p>
            </div></div>
            <div className="fade-late absolute bottom-16 right-0 hidden sm:block lg:-right-2"><div className="glass float-slower w-[230px] p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-grey">{series.end.year}, in today’s ₹</p>
              <p className="num mt-1 text-[26px] font-semibold tracking-tight text-evergreen">{formatCompact(series.end.netWorthReal)}</p>
              <div className="mt-2 flex items-center justify-between border-t border-line/70 pt-2 text-[11.5px]">
                <span className="text-grey">Future rupees</span>
                <span className="num font-semibold text-evergreen">{formatCompact(series.end.netWorth)}</span>
              </div>
            </div></div>
            <p className="mt-3 text-[11px] text-grey">
              <span className="font-semibold uppercase tracking-[0.12em] text-[#8a6a33] dark:text-champagne">Illustrative</span> · A fictional {sample.profile.about.age}-year-old in Pune. {formatPct(DEFAULT_ASSUMPTIONS.inflation, 0)} inflation, {formatPct(sample.portfolioReturn)} assumed return.
              {series.fiBeyond && ` Work becomes optional in ${series.fiBeyond.year}, at ${series.fiBeyond.age}.`}
            </p>
          </div>
        </div>
      </section>

      {/* THREE QUESTIONS: how it works, compressed */}
      <section aria-labelledby="how-h" className="border-t border-line bg-ivory">
        <div className="container-x py-24 lg:py-28">
          <Reveal className="grid gap-6 lg:grid-cols-12">
            <h2 id="how-h" className="display text-[34px] leading-[1.05] tracking-[-0.015em] sm:text-[44px] lg:col-span-5">
              One model.
              <br />
              Three honest questions.
            </h2>
            <p className="max-w-md self-end text-[15px] leading-relaxed text-grey lg:col-span-5 lg:col-start-8">
              Every screen reads from the same profile and the same projection. Change one number, and the whole plan moves with it.{' '}
              <Link to="/how-it-works" className="link whitespace-nowrap">See the method</Link>
            </p>
          </Reveal>
          <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-0">
            {QUESTIONS.map((s, i) => (
              <Reveal as="li" key={s.q} delay={i * 90} className="relative md:border-l md:border-line md:px-8 md:first:border-l-0 md:first:pl-0">
                <span className="num text-xs text-[#8a6a33] dark:text-champagne">0{i + 1}</span>
                <h3 className="mt-3 text-[19px] font-semibold tracking-tight">{s.q}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-grey">{s.a}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* FEATURES: one feature shown with the real component, the rest as editorial rows */}
      <section aria-labelledby="feat-h" className="border-t border-line bg-surface">
        <div className="container-x grid gap-14 py-24 lg:grid-cols-12 lg:gap-10 lg:py-28">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow">Goals that tell the truth</p>
            <h2 id="feat-h" className="display mt-4 max-w-xl text-[32px] leading-[1.08] tracking-[-0.015em] sm:text-[40px]">
              Adding a goal doesn’t make it affordable. We show you which ones are.
            </h2>
            <div className="relative mt-10 rounded-md border border-line bg-ivory p-6 sm:p-8">
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-evergreen">Sample plan · {formatCompact(sample.goals.capacity)}/month to work with</p>
                <p className="text-xs text-grey">Needs {formatCompact(sample.goals.totalRequired)}/month in total</p>
              </div>
              <GoalTimeline goals={sample.goalViews} />
            </div>
          </Reveal>
          <div className="flex flex-col lg:col-span-5 lg:pt-28">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <button type="button" onClick={() => exploreDemo(f.to, true)} className="group block w-full border-t border-line py-7 text-left last:border-b">
                  <span className="flex items-start justify-between gap-4">
                    <span className="text-lg font-semibold leading-snug tracking-tight text-evergreen">{f.title}</span>
                    <ArrowUpRight size={18} className="mt-1 shrink-0 text-grey transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-forest" aria-hidden />
                  </span>
                  <span className="mt-2 block text-[15px] leading-relaxed text-grey">{f.body}</span>
                </button>
              </Reveal>
            ))}
            <Link to="/features" className="hit mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-forest hover:underline">
              All fourteen tools <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* SIP CALCULATOR */}
      <section aria-labelledby="sip-h" className="border-t border-line">
        <div className="container-x py-24 lg:py-28">
          <Reveal className="mb-14 grid gap-4 lg:grid-cols-12">
            <h2 id="sip-h" className="display text-[34px] leading-[1.05] tracking-[-0.015em] sm:text-[44px] lg:col-span-6">
              What could ₹10,000 a month become?
            </h2>
            <p className="max-w-sm self-end text-[15px] text-grey lg:col-span-4 lg:col-start-9">Drag the sliders. The chart separates what you put in from what compounding adds.</p>
          </Reveal>
          <Reveal>
            <SipPreview />
          </Reveal>
        </div>
      </section>

      {/* PRODUCT PREVIEW */}
      <section aria-labelledby="preview-h" className="relative overflow-hidden bg-evergreen dark:bg-[#0b1512]">
        <Aurora dark />
        <div className="container-x relative z-10 py-24 lg:py-28">
          <Reveal className="mb-14 grid gap-6 lg:grid-cols-12">
            <h2 id="preview-h" className="display text-[34px] leading-[1.05] tracking-[-0.015em] !text-[#F8F7F2] sm:text-[44px] lg:col-span-6">
              The dashboard answers one question at a time.
            </h2>
            <p className="max-w-md self-end text-[15px] leading-relaxed text-[#F8F7F2]/70 lg:col-span-5 lg:col-start-8">
              This is the real application running on the sample profile, not a mock-up. Same charts, same engine, same next steps.
            </p>
          </Reveal>
          <Reveal>
            <div className="rounded-[14px] border border-white/10 bg-white/[0.04] p-2 shadow-[0_60px_120px_-60px_rgba(0,0,0,0.8)] backdrop-blur-sm">
              <div className="overflow-hidden rounded-[10px] bg-ivory">
                <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
                  <Mark size={16} />
                  <span className="text-xs text-grey">Overview · sample profile</span>
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
                    <div className="grid gap-x-10 md:grid-cols-2">
                      <NextStepsPanel plan={{ ...sample, insights: sample.insights.slice(0, 2) }} linkable={false} />
                      <NextStepsPanel plan={{ ...sample, insights: sample.insights.slice(2, 4) }} linkable={false} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
          <div className="mt-10">
            <Button variant="inverse" size="lg" onClick={explore}>
              Open the full demo <ArrowUpRight size={16} aria-hidden />
            </Button>
          </div>
        </div>
      </section>

      {/* LIFE SCENARIOS */}
      <section aria-labelledby="scen-h">
        <div className="container-x py-24 lg:py-28">
          <Reveal className="mb-14 max-w-2xl">
            <h2 id="scen-h" className="display text-[34px] leading-[1.05] tracking-[-0.015em] sm:text-[44px]">
              Small decisions,
              <br />
              twenty years later.
            </h2>
          </Reveal>
          <Reveal>
            <LifeScenarios plan={sample} />
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden bg-evergreen dark:bg-[#0b1512]">
        <Aurora dark />
        <div className="container-x relative z-10 grid gap-10 py-24 lg:grid-cols-12 lg:items-end lg:py-32">
          <h2 className="display text-[38px] leading-[1.04] tracking-[-0.02em] !text-[#F8F7F2] sm:text-[56px] lg:col-span-8">
            Make your next financial decision with a clearer picture of the future.
          </h2>
          <div className="flex flex-col items-start gap-4 lg:col-span-4 lg:items-end">
            <ButtonLink to="/start" size="lg" variant="inverse">
              Build My Wealth Plan <ArrowRight size={16} aria-hidden />
            </ButtonLink>
            <p className="text-xs text-[#F8F7F2]/60">About eight minutes. Save and come back any time.</p>
          </div>
        </div>
      </section>
    </>
  );
}
