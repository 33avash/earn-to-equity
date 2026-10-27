import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { MODULE_GROUPS } from '@/components/layout/nav';
import { PublicHero } from '@/components/layout/PublicHero';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Motion';
import { useExploreDemo } from '@/state/useDemo';

/** One line per module, keyed by its nav path. */
const DESCRIPTIONS: Record<string, string> = {
  '/app': 'Net worth, monthly surplus, savings rate, FI age and plan health, with your 20-year trajectory and this month’s cash flow.',
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
  return (
    <>
      <PublicHero title={<span className="serif-accent">Features</span>}>
        <p>Thirteen modules, all reading the same 20-year projection. Click any of them to open it on the demo plan.</p>
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
