import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Disclaimer } from '@/components/ui/Misc';

const STEPS = [
  {
    n: '01',
    title: 'Understand your finances',
    body: 'An eight-step guided setup collects your age, take-home pay, monthly spending, savings, investments by asset class, loans, insurance, goals and investment preferences. Every question explains why it is asked. Optional questions can be skipped, and sensible defaults are pre-filled.',
    out: ['Net worth, assets and liabilities', 'Monthly cash flow and savings rate', 'Emergency-fund coverage', 'A transparent financial health score'],
  },
  {
    n: '02',
    title: 'Define what matters',
    body: 'Add goals in today’s prices: a degree, a car, a wedding, a home, a business or financial independence. Add life events such as promotions, career breaks or a home purchase. The planner inflates each cost to its target year and checks whether your current surplus can really fund it.',
    out: ['Future cost of each goal', 'Required monthly contribution', 'Funding shortfalls, never hidden', 'Options to delay, reduce or fund more'],
  },
  {
    n: '03',
    title: 'Explore your future',
    body: 'A single year-by-year engine projects 20 years of income, spending, contributions, portfolio growth, loans, goals and events. Compare conservative, base and high-growth scenarios, stress-test market falls, and ask the Wealth Coach to explain any number in plain language.',
    out: ['Wealth in future and today’s rupees', 'Year-by-year projection table', 'Scenario and stress-test comparisons', 'Estimated financial independence age'],
  },
];

const CONVENTIONS = [
  ['Returns', 'Effective annual rates, compounded monthly as (1 + r)^(1/12) − 1.'],
  ['Contributions', 'Added at the end of each month by default. You can switch to the start of the month.'],
  ['Loans', 'Interest at APR ÷ 12 on the outstanding balance, followed by the EMI.'],
  ['Inflation', 'Applied once a year to expenses. Goal and event costs are entered in today’s rupees.'],
  ['Transfers', 'Savings and SIPs are transfers, not expenses, so nothing is counted twice.'],
  ['Deficits', 'Covered from cash above your emergency reserve, then investments, then the reserve. Anything still unfunded is shown as borrowing.'],
];

export default function HowItWorks() {
  return (
    <div className="container-x py-16 lg:py-24">
      <p className="eyebrow">How it works</p>
      <h1 className="display mt-3 max-w-3xl text-[44px] leading-[1.06] sm:text-[56px]">From a paycheck to a plan, in one connected model.</h1>
      <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-grey">
        Earn to Equity is not a set of separate calculators. The budget, goals, portfolio, simulator, stress tests and coach all read from one profile and one projection engine, so a change anywhere flows everywhere.
      </p>

      <ol className="mt-16">
        {STEPS.map((s) => (
          <li key={s.n} className="grid gap-6 border-t border-line py-12 lg:grid-cols-12">
            <span className="display text-[64px] leading-none text-champagne lg:col-span-2">{s.n}</span>
            <div className="lg:col-span-6">
              <h2 className="text-2xl font-semibold tracking-tight">{s.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-grey">{s.body}</p>
            </div>
            <ul className="space-y-2 lg:col-span-4">
              {s.out.map((o) => (
                <li key={o} className="border-b border-line/70 pb-2 text-sm text-charcoal">
                  {o}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <section className="mt-8 grid gap-10 border-t border-line pt-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="display text-3xl">Calculation conventions</h2>
          <p className="mt-3 text-sm leading-relaxed text-grey">Every projection follows these documented rules. The financial engine is separate from the interface and covered by automated tests.</p>
        </div>
        <dl className="lg:col-span-8">
          {CONVENTIONS.map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 gap-1 border-t border-line py-4 sm:grid-cols-[160px_1fr]">
              <dt className="text-sm font-semibold text-evergreen">{k}</dt>
              <dd className="text-sm leading-relaxed text-grey">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-16 flex flex-col items-start gap-6 border-t border-line pt-12">
        <Disclaimer>Earn to Equity provides educational projections, not investment, tax or legal advice. All projections depend on assumptions you can change, and actual outcomes will differ.</Disclaimer>
        <ButtonLink to="/start" size="lg">
          Build My Wealth Plan <ArrowRight size={16} aria-hidden />
        </ButtonLink>
      </div>
    </div>
  );
}
