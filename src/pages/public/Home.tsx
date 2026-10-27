import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CalendarCheck, MonitorSmartphone, BookOpen } from 'lucide-react';
import { ButtonLink, btn } from '@/components/ui/Button';
import { DeviceFrame, Frame, SectionHead } from '@/components/ui/Misc';
import { HeroGraphic } from '@/features/landing/HeroGraphic';
import { CtcCalculator } from '@/features/landing/CtcCalculator';
import { BeforeAfter, impactChip } from '@/features/fixplan/BeforeAfter';
import { computePlan, heroSeries } from '@/state/selectors';
import { DEFAULT_ASSUMPTIONS, demoProfile } from '@/state/demo';
import { formatCompact, formatPct } from '@/finance/money';
import { useExploreDemo } from '@/state/useDemo';
import { Mark } from '@/components/layout/Wordmark';
import { AnimatedNumber, Reveal } from '@/components/motion/Motion';
import { TextReveal } from '@/components/motion/TextReveal';
import { DISCLAIMER_SHORT } from '@/pages/public/Legal';
import demoFix from '@/content/demoFix.json';

const section = 'container-x py-16 sm:py-24';

/**
 * The landing page in five parts: what it is, the CTC calculator, a plan getting fixed, why to trust the
 * numbers, and where to start. Lessons, the feature tour and the coach live on /learn and /features.
 */
export default function Home() {
  const exploreDemo = useExploreDemo();
  const sample = useMemo(() => computePlan(demoProfile(), DEFAULT_ASSUMPTIONS), []);
  const series = useMemo(() => heroSeries(sample), [sample]);

  return (
    <>
      {/* 1. HERO */}
      <section className="relative -mt-24 overflow-hidden pt-24 sm:-mt-28 sm:pt-28">
        <div aria-hidden className="glow left-[55%] top-10 h-[34rem] w-[34rem]" />
        <div className="container-x relative grid items-center gap-14 pb-16 pt-10 lg:grid-cols-12 lg:gap-10 lg:pb-20 lg:pt-6">
          <div className="lg:col-span-6">
            <h1 className="display text-[48px] leading-[0.95] sm:text-[68px] lg:text-[84px]">
              <TextReveal parts={['Your salary,', 'compounded into', { text: 'equity.', className: 'text-gradient' }]} delay={0.1} />
            </h1>
            <Reveal delay={300}>
              <p className="mt-7 max-w-[34rem] text-[17px] leading-relaxed text-grey">
                Turn your first CTC into a 20-year plan: what actually reaches your bank, what each goal will cost in its year, and the changes that would fix the gaps.
              </p>
            </Reveal>
            <Reveal delay={400}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <ButtonLink to="/start" size="lg">
                  Start in 2 minutes <ArrowRight size={16} aria-hidden />
                </ButtonLink>
                <button type="button" onClick={() => exploreDemo('/app?fix=1')} className={btn('secondary', 'lg')}>
                  See a plan get fixed
                </button>
              </div>
            </Reveal>
            <Reveal delay={500}>
              <ul className="mt-9 flex flex-wrap gap-2" aria-label="What the plan uses">
                {['Tax year 2026-27', 'EPF ceiling ₹25,000', 'Labour Codes pay structure', 'No sign-up'].map((c) => (
                  <li key={c} className="chip">
                    <Check size={13} className="text-forest" aria-hidden /> {c}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={250} className="lg:col-span-6">
            <DeviceFrame label="Overview · sample plan" chrome={<Mark size={18} />}>
              <div className="p-5 sm:p-7">
                <p className="text-[12px] font-medium text-grey">Net worth in {series.end.year}, in today’s ₹ (base case)</p>
                <p className="num mt-2 text-[34px] font-semibold leading-none tracking-[-0.04em] text-evergreen [&_.num]:font-sans">
                  <AnimatedNumber value={series.end.netWorthReal} format={formatCompact} />
                </p>
                <HeroGraphic series={series} />
                <p className="mt-3 text-[12px] leading-relaxed text-grey">
                  Riya, a fictional {sample.profile.about.age}-year-old in Pune on {formatCompact(sample.profile.income.ctc ?? 0)} CTC, {formatPct(DEFAULT_ASSUMPTIONS.inflation, 0)} inflation, {formatPct(sample.portfolioReturn)} return after fund costs.
                </p>
              </div>
            </DeviceFrame>
          </Reveal>
        </div>
      </section>

      {/* 2. CTC → REAL IN-HAND */}
      <section aria-labelledby="ctc-h">
        <div className={section}>
          <SectionHead id="ctc-h" title={<>Your CTC, <span className="text-gradient">in your bank</span></>}>
            <p>PF, gratuity and variable pay all sit inside CTC. Here is what arrives each month under this year’s rules.</p>
          </SectionHead>
          <Frame size="xl" className="p-6 sm:p-10">
            <CtcCalculator offerLink="/tools" />
          </Frame>
        </div>
      </section>

      {/* 3. A PLAN, FIXED */}
      <section aria-labelledby="fix-h">
        <div className={section}>
          <SectionHead id="fix-h" title={<>Riya’s plan, <span className="text-gradient">fixed</span></>}>
            <p>Her MBA and first car land a year apart, her emergency fund is short and her employer puts nothing in NPS. These are the planner’s changes, each tested on her projection and 300 market paths.</p>
          </SectionHead>
          <Frame size="xl" className="flex flex-col gap-6 p-6 sm:p-10">
            <BeforeAfter before={demoFix.before} after={demoFix.after} targetAge={demoFix.targetAge} endYear={demoFix.endYear} money={formatCompact} />
            <ol className="grid gap-3 sm:grid-cols-2">
              {demoFix.fixes.map((f, i) => (
                <li key={f.key} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4">
                  <span className="num pt-0.5 text-xs text-champagne">{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-evergreen">{f.title}</span>
                    <span className="num mt-1 inline-block rounded-full bg-forest/10 px-2 py-0.5 text-[11.5px] font-medium text-forest">{impactChip(f.before, f.after, formatCompact)}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => exploreDemo('/app?fix=1')} className={btn('primary', 'md')}>
                Open Riya’s plan <ArrowRight size={15} aria-hidden />
              </button>
              <p className="text-[12.5px] text-grey">Computed on her plan from {demoFix.planStartYear}. Ranges come from simulated market paths, not forecasts.</p>
            </div>
          </Frame>
        </div>
      </section>

      {/* 4. TRUST */}
      <section aria-label="Why you can check these numbers" className="container-x py-10">
        <ul className="grid gap-px overflow-hidden rounded-[1.75rem] bg-line sm:grid-cols-3">
          {[
            { icon: CalendarCheck, title: 'Every rate dated and sourced', body: 'Each rule shows the date it was checked and the official page.', to: '/sources', link: 'See the sources' },
            { icon: MonitorSmartphone, title: 'Runs in your browser, no sign-up', body: 'Your plan stays on this device. There is no account and no server holding it.', to: '/legal', link: 'Privacy' },
            { icon: BookOpen, title: 'Not investment advice; education only', body: DISCLAIMER_SHORT, to: '/faq', link: 'Why we never name funds' },
          ].map(({ icon: Icon, title, body, to, link }) => (
            <li key={title} className="flex flex-col gap-2 bg-surface p-6">
              <Icon size={18} className="text-forest" aria-hidden />
              <p className="text-[15px] font-semibold text-evergreen">{title}</p>
              <p className="text-[13px] leading-relaxed text-grey">{body}</p>
              <Link to={to} className="link mt-auto pt-1 text-[13px] font-medium">
                {link}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. FINAL CTA */}
      <section className="container-x pb-8 pt-12 lg:pt-16">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[rgb(7_7_10)] px-7 py-14 shadow-[0_0_0_1px_rgb(255_255_255/0.08),inset_0_1px_0_rgb(255_255_255/0.1)] sm:px-14 sm:py-20">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgb(45_212_191/0.3),rgb(0_0_0/0)_65%)]" />
          <div className="relative grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <h2 className="text-[40px] font-semibold leading-[0.95] tracking-[-0.05em] !text-white sm:text-[60px]">
                Start with <span className="text-[#2DD4BF]">five numbers</span>
              </h2>
              <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-[#A8A8AC]">Age, CTC, city, monthly spending and one goal. Everything else starts from sensible defaults you can change later.</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
              <Link to="/start" className={btn('primary', 'lg', '!bg-white !text-[#07070A] hover:!bg-[#CCFBF1]')}>
                Start in 2 minutes <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
