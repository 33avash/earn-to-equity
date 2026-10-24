import { ArrowRight, Check } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Bezel, Disclaimer } from '@/components/ui/Misc';
import { PublicHero } from '@/components/layout/PublicHero';
import { Reveal } from '@/components/motion/Motion';

const STEPS = [
  {
    n: '01',
    title: 'Understand your finances',
    body: 'Eight short steps collect your age, CTC, monthly spending, savings, investments by asset class, loans, insurance, goals and preferred investment mix. Each question says why it is asked, and optional ones can be skipped.',
    out: ['Take-home under both tax regimes', 'Net worth, assets and liabilities', 'Monthly cash flow and savings rate', 'A health score with its rules shown'],
  },
  {
    n: '02',
    title: 'Define what matters',
    body: 'Add goals in today’s prices: a degree, a car, a wedding or a home. Add life events such as a promotion, a career break or a home purchase. Each cost is inflated to its year, then paid from savings, a loan or both, depending on how you fund it.',
    out: ['Cost of each goal in its year', 'Savings, loan and gap for each goal', 'A warning when a goal can’t be paid for', 'Options to delay, shrink or borrow'],
  },
  {
    n: '03',
    title: 'Explore your future',
    body: 'One engine projects 20 years of take-home, tax, spending, SIPs, EPF, loans, goals and events. Compare three scenarios, run a 2008-style crash, and ask the coach to explain any figure.',
    out: ['Net worth in future and today’s rupees', 'Year-by-year table, exportable as CSV', 'Scenario and stress-test comparisons', 'Your estimated FI year and age'],
  },
];

const CONVENTIONS = [
  ['Returns', 'Effective annual rates, compounded monthly as (1 + r)^(1/12) − 1.'],
  ['Contributions', 'Added at the end of each month by default. You can switch to the start of the month.'],
  ['Loans', 'Interest at APR ÷ 12 on the outstanding balance, followed by the EMI.'],
  ['Inflation', 'Applied once a year to expenses. Goal and event costs are entered in today’s rupees.'],
  ['Ages', 'Your age on 1 January of each year. A 20-year plan has 21 points: today and 1 January of each following year.'],
  ['Salary', 'Take-home is recomputed from CTC every year, under the cheaper tax regime, after PF and professional tax.'],
  ['Spending', 'Rises with inflation, plus 40% of each raise above inflation (lifestyle creep, editable).'],
  ['Investments', 'Returns are after fund costs. Selling to pay a goal triggers capital-gains tax.'],
  ['Transfers', 'Savings and SIPs are transfers, not expenses, so nothing is counted twice.'],
  ['Deficits', 'Covered from cash above your emergency reserve, then investments, then the reserve. Anything still unfunded is shown as borrowing.'],
];

export default function HowItWorks() {
  return (
    <>
      <PublicHero
        title={
          <>
            How it <span className="serif-accent">works</span>
          </>
        }
      >
        <p>The budget, goals, portfolio, simulator, stress tests and coach all read one profile and one 20-year projection. Change your rent on the Budget page and your FI age moves on the next screen.</p>
      </PublicHero>

      <div className="container-x">
        <ol className="flex flex-col gap-8 lg:gap-10">
          {STEPS.map((s) => (
            <Reveal as="li" key={s.n}>
              <Bezel className="grid gap-10 p-7 sm:p-10 lg:grid-cols-12 lg:gap-8 lg:p-14">
                <span className="num text-[80px] font-light leading-none tracking-[-0.06em] text-forest/80 lg:col-span-2 lg:text-[96px]">{s.n}</span>
                <div className="lg:col-span-6">
                  <h2 className="text-[28px] font-semibold tracking-[-0.03em] sm:text-[32px]">{s.title}</h2>
                  <p className="mt-4 text-[15px] leading-relaxed text-grey">{s.body}</p>
                </div>
                <ul className="well flex flex-col gap-1 self-start p-2 lg:col-span-4">
                  {s.out.map((o) => (
                    <li key={o} className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm text-charcoal">
                      <Check size={15} className="mt-0.5 shrink-0 text-forest" aria-hidden />
                      {o}
                    </li>
                  ))}
                </ul>
              </Bezel>
            </Reveal>
          ))}
        </ol>

        <section className="grid gap-12 pt-28 lg:grid-cols-12 lg:pt-40">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-36">
              <h2 className="display text-[40px] leading-none sm:text-[52px]">
                Calculation <span className="serif-accent">rules</span>
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-grey">Every projection follows these rules. The engine is plain TypeScript, separate from the interface, with more than 100 automated tests.</p>
            </div>
          </div>
          <Reveal className="lg:col-span-8">
            <Bezel className="px-6 py-2 sm:px-10">
              <dl>
                {CONVENTIONS.map(([k, v], i) => (
                  <div key={k} className={`grid grid-cols-1 gap-1.5 py-6 sm:grid-cols-[180px_1fr] sm:gap-6 ${i ? 'border-t border-line/70' : ''}`}>
                    <dt className="text-sm font-semibold text-evergreen">{k}</dt>
                    <dd className="text-sm leading-relaxed text-grey">{v}</dd>
                  </div>
                ))}
              </dl>
            </Bezel>
          </Reveal>
        </section>

        <div className="mt-28 flex flex-col items-start gap-8 lg:mt-40">
          <Disclaimer>Earn to Equity provides educational projections, not investment, tax or legal advice. All projections depend on assumptions you can change, and actual outcomes will differ.</Disclaimer>
          <ButtonLink to="/start" size="lg">
            Build your plan <ArrowRight size={16} aria-hidden />
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
