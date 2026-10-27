import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { MODULE_GROUPS } from '@/components/layout/nav';
import { PublicHero } from '@/components/layout/PublicHero';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Motion';
import { useExploreDemo } from '@/state/useDemo';
import { useMemo } from 'react';
import { computePlan } from '@/state/selectors';
import { DEFAULT_ASSUMPTIONS, demoProfile } from '@/state/demo';
import { SectionHead } from '@/components/ui/Misc';
import { Comparison, EngineDiagram, FeatureTabs, RulesMarquee, StepsShowcase } from '@/features/landing/Showcase';
import { CoachShowcase } from '@/features/landing/CoachShowcase';

/** One line per module, keyed by its nav path. */
const DESCRIPTIONS: Record<string, string> = {
  '/app': 'Net worth, what’s left after bills, savings rate, FI age and plan health, with ranges, your 20-year trajectory, Fix my plan and how accurate the plan is.',
  '/app/offers': 'Your CTC broken down under the Labour Codes, offers compared side by side, and the tax regime for each year of your plan.',
  '/app/plan': 'The 20-year projection with a range of outcomes, a year inspector and the regime timeline. Scenarios and the tornado chart are a click away.',
  '/app/health': 'A 0 to 100 score from six components, each with its rule shown.',
  '/app/budget': 'CTC to take-home under both tax regimes, monthly spending, EMIs and SIPs, with an optional 50/30/20 check.',
  '/app/emergency-debt': 'A 3 to 12 month reserve, and avalanche against snowball for your loans.',
  '/app/goals': 'Each goal priced for its year and paid from savings, a loan or both. Drag to set which gets money first.',
  '/app/portfolio': 'Seven asset classes, fund costs, drift, and rebalancing with new SIP money only.',
  '/app/sip': 'Step-up SIPs with the corpus before and after capital-gains tax.',
  '/app/simulator': 'Every year to 2046, a year inspector, three scenarios, a tornado chart and CSV export.',
  '/app/life-events': 'Promotions, breaks, a wedding or a home, with stamp duty and the lender’s 50% limit checked.',
  '/app/risk-lab': 'One-click stress tests and 1,000 market paths using fat-tailed returns or Nifty 50 history.',
  '/app/fi': 'Your FI target with healthcare, the corpus after tax, and the extra SIP needed to reach it.',
  '/app/coach': 'Questions about your plan, answered by a free AI model that runs in your browser, with nothing to set up. The engine works out every figure; the model explains it.',
  '/app/learn': 'Eleven short lessons with worked examples, plus tax notes for 2026-27.',
};

export default function Features() {
  const explore = useExploreDemo();
  const navigate = useNavigate();
  const sample = useMemo(() => computePlan(demoProfile(), DEFAULT_ASSUMPTIONS), []);
  const endYear = sample.headline.year;
  return (
    <>
      <PublicHero title={<span className="serif-accent">Features</span>}>
        <p>Every module reads the same 20-year projection. Five are in the sidebar by default; the rest sit under Advanced tools. Click any of them to open it on the demo plan.</p>
      </PublicHero>

      <div className="container-x flex flex-col gap-24 lg:gap-36">
        {MODULE_GROUPS.map((g, gi) => (
          <section key={g.group} aria-labelledby={`grp-${gi}`} className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-36">
                <span className="num text-sm text-grey">0{gi + 1}</span>
                <h2 id={`grp-${gi}`} className="display mt-3 text-[40px] leading-none sm:text-[56px]">
                  {g.group}
                </h2>
              </div>
            </div>
            <ul className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
              {g.items.map(({ to, label, icon: Icon }, i) => (
                <Reveal as="li" key={to} delay={i * 80}>
                  <button type="button" onClick={() => explore(to, true)} className="bezel lift group flex h-full w-full flex-col p-7 text-left sm:p-8">
                    <span className="flex w-full items-start justify-between gap-4">
                      <span className="well flex h-12 w-12 items-center justify-center rounded-2xl text-forest">
                        <Icon size={22} aria-hidden />
                      </span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-grey transition-transform duration-500 ease-spring group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:scale-105 group-hover:text-evergreen" aria-hidden>
                        <ArrowUpRight size={16} />
                      </span>
                    </span>
                    <span className="mt-12 text-[20px] font-semibold tracking-[-0.02em] text-evergreen">{label}</span>
                    <span className="mt-2 block text-sm leading-relaxed text-grey">{DESCRIPTIONS[to]}</span>
                  </button>
                </Reveal>
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="tour-h">
          <SectionHead id="tour-h" center title={<>The planner, on the <span className="text-gradient">sample plan</span></>}>
            <p>The same panels you get for your own numbers, not screenshots.</p>
          </SectionHead>
          <FeatureTabs plan={sample} />
        </section>
        <section aria-labelledby="steps-h">
          <SectionHead id="steps-h" title={<>From pay to plan in <span className="text-gradient">three steps</span></>}>
            <p>Every screen reads from the same 20-year projection.</p>
          </SectionHead>
          <StepsShowcase plan={sample} />
        </section>
        <section aria-labelledby="engine-h">
          <SectionHead id="engine-h" title={<>One model connects <span className="text-gradient">everything</span></>}>
            <p>Change your rent and the plan reruns: this month’s surplus, every goal, the stress tests and your FI age.</p>
          </SectionHead>
          <EngineDiagram year={endYear} />
        </section>
        <section aria-labelledby="coach-h">
          <SectionHead id="coach-h" title={<>Ask your plan <span className="text-gradient">anything</span></>}>
            <p>An AI model running in your browser explains your own projection in plain words. The planner’s engine works out every figure first.</p>
          </SectionHead>
          <CoachShowcase plan={sample} />
        </section>
        <section aria-labelledby="cmp-h">
          <SectionHead id="cmp-h" center title={<>Beyond a SIP <span className="text-gradient">calculator</span></>}>
            <p>What a typical online SIP calculator models, and what your plan adds.</p>
          </SectionHead>
          <Comparison endYear={endYear} />
        </section>
        <RulesMarquee />

        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => navigate('/start')}>
            Build your plan <ArrowRight size={16} aria-hidden />
          </Button>
          <Link to="/how-it-works" className="hit inline-flex h-12 items-center px-4 text-sm font-medium text-forest hover:underline">
            How the model works
          </Link>
        </div>
      </div>
    </>
  );
}
