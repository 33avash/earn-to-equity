import { Link } from 'react-router-dom';
import { PublicHero } from '@/components/layout/PublicHero';
import { Bezel } from '@/components/ui/Misc';
import { LAST_REVIEW } from '@/finance/assumptions';
import { DISCLAIMER_SHORT } from '@/pages/public/Legal';

const QA: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Is this advice?',
    a: (
      <>
        No. {DISCLAIMER_SHORT} The planner shows what your own numbers and choices lead to. Personalised advice on what to buy needs a SEBI-registered investment adviser.
      </>
    ),
  },
  {
    q: 'Where is my data?',
    a: (
      <>
        In this browser’s local storage, on this device only. There is no account and no server that holds your plan. The optional live figures (index-fund prices, the dollar rate, inflation history) are fetched from public sources; nothing from your plan is sent with those requests. See{' '}
        <Link className="link" to="/legal">
          Privacy
        </Link>
        .
      </>
    ),
  },
  {
    q: 'How accurate is the tax?',
    a: (
      <>
        It follows the 2026-27 rules for a resident individual under 60: both regimes, the rebate, surcharge with marginal relief, cess, professional tax, PF, gratuity, employer NPS, HRA from your rent and home-loan interest, recomputed every year of the plan. Section numbers follow the Income-tax Act, 2025. Each rule is dated on the{' '}
        <Link className="link" to="/sources">
          Sources
        </Link>{' '}
        page (last full review {LAST_REVIEW}). It is a planning estimate, not a tax computation for filing; check with your Form 16 or a CA.
      </>
    ),
  },
  {
    q: 'Why ranges instead of one number?',
    a: 'Markets don’t return the same amount every year. The planner runs your plan through 300 simulated market paths and shows the middle outcome with the range most paths fall in (10th to 90th percentile). The single “base case” line is what happens if every year earns the assumed return. Neither is a forecast.',
  },
  {
    q: 'Why no stock or fund tips?',
    a: 'Recommending specific stocks, funds or insurers is regulated: it needs SEBI registration as an investment adviser or research analyst, and SEBI has tightened rules on unregistered advice. So the planner works at the level of asset classes and SEBI fund categories (for example, “a Nifty 50 index fund is one way to hold this bucket”) and shows facts about funds you already hold. It never ranks or rates funds or says what to buy.',
  },
];

export default function Faq() {
  return (
    <>
      <PublicHero title={<>Questions, <span className="serif-accent">answered</span></>}>
        <p>Short answers about advice, your data, tax accuracy, ranges and why we never name what to buy.</p>
      </PublicHero>
      <div className="container-x flex max-w-4xl flex-col gap-5 pb-10">
        {QA.map(({ q, a }) => (
          <Bezel as="section" key={q} className="p-6 sm:p-8">
            <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-evergreen">{q}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-charcoal">{a}</p>
          </Bezel>
        ))}
      </div>
    </>
  );
}
