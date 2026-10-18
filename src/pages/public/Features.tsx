import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { APP_NAV } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { useExploreDemo } from '@/state/useDemo';

const DESCRIPTIONS: Record<string, string> = {
  Overview: 'Net worth, cash flow, emergency cover, portfolio, projected corpus and FI progress, with the wealth trajectory at the centre.',
  'Financial Health': 'A transparent 0–100 score from six documented components, with strengths and practical improvements.',
  'Budget Planner': 'An editable monthly cash-flow table with an optional 50/30/20 comparison. Changes flow straight to the dashboard.',
  'Emergency Fund & Debt': 'A 3–12 month reserve calculator, plus avalanche and snowball repayment comparisons for your loans.',
  'Goals Planner': 'Inflation-adjusted goal costs, required contributions and funding shortfalls, with options to delay, reduce or fund more.',
  'Portfolio Builder': 'Seven asset classes, educational presets, weighted return, drift and the rebalancing needed.',
  'SIP Calculator': 'Lump sum, step-up, contribution timing and a flat versus step-up comparison, with a year-by-year table.',
  'Wealth Simulator': 'The 20-year year-by-year engine, a year inspector, and conservative, base and high-growth scenarios with attribution.',
  'Life Events': 'A timeline of promotions, breaks, marriage, a home and more, with before-and-after impact on your roadmap.',
  'Risk Lab': 'Stress tests for salary, inflation and market falls, plus 1,000-path Monte Carlo goal probabilities.',
  'Financial Independence': 'Target corpus, projected corpus, gap, estimated FI age and the extra monthly investment needed.',
  'AI Wealth Coach': 'Plain-language explanations of your own calculated figures. Uses Gemini when configured, otherwise a labelled rule-based coach.',
  'Learning Centre': 'Eleven short modules with worked examples and knowledge checks, plus dated tax-awareness notes.',
};

export default function Features() {
  const explore = useExploreDemo();
  const navigate = useNavigate();
  return (
    <div className="container-x py-16 lg:py-24">
      <p className="eyebrow">Features</p>
      <h1 className="display mt-3 max-w-3xl text-[44px] leading-[1.06] sm:text-[56px]">Fourteen tools. One financial model.</h1>
      <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-grey">Each module answers a practical question and shares the same numbers as every other module. Open any of them with the demo profile.</p>
      {APP_NAV.map((g) => (
        <section key={g.group} className="mt-16">
          <h2 className="eyebrow mb-4">{g.group}</h2>
          <ul className="grid border-t border-line md:grid-cols-2">
            {g.items.map(({ to, label, icon: Icon }) => (
              <li key={to} className="border-b border-line md:odd:border-r md:odd:pr-8 md:even:pl-8">
                <button
                  type="button"
                  onClick={() => explore(to, true)}
                  className="group flex w-full items-start gap-4 py-6 text-left"
                >
                  <Icon size={20} strokeWidth={1.5} className="mt-1 shrink-0 text-forest" aria-hidden />
                  <span className="flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-lg font-semibold tracking-tight text-evergreen">{label}</span>
                      <ArrowUpRight size={16} className="text-grey opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-grey">{DESCRIPTIONS[label]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="mt-16 flex flex-wrap gap-3">
        <Button size="lg" onClick={() => navigate('/start')}>
          Build My Wealth Plan
        </Button>
        <Link to="/how-it-works" className="hit inline-flex h-12 items-center px-2 text-sm font-medium text-forest hover:underline">
          How the model works
        </Link>
      </div>
    </div>
  );
}
