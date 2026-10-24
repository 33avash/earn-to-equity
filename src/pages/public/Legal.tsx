import { Bezel } from '@/components/ui/Misc';
import { Reveal } from '@/components/motion/Motion';

export const DISCLAIMER_TEXT = [
  'Earn to Equity is an educational financial-planning prototype. It is not a SEBI-registered investment adviser, research analyst, stockbroker, insurance intermediary or tax practitioner, and it does not provide personalised investment, tax, legal or insurance advice.',
  'All projections are illustrative estimates produced from the information you enter and assumptions you can change, including returns, inflation, salary growth and withdrawal rates. Markets are volatile and actual outcomes will differ, sometimes materially. Past performance and assumed return distributions do not predict future results.',
  'Example portfolios and presets are educational illustrations of how allocations work. They are not recommendations to buy or sell any security or product. Tax information is dated reference material that may be out of date. Verify it with official sources or a qualified professional before acting.',
  'The financial health score is an internal educational measure with a documented methodology. It is not a credit score or an official rating of any kind.',
];

const TOC = [
  ['privacy', 'Privacy'],
  ['terms', 'Terms of use'],
  ['disclaimers', 'Financial disclaimers'],
];

export default function Legal() {
  return (
    <div className="container-x pt-10 lg:pt-20">
      <Reveal>
        <h1 className="display max-w-4xl text-[44px] leading-[0.98] sm:text-[64px] lg:text-[80px]">
          Privacy, terms & <span className="serif-accent">disclaimers</span>
        </h1>
        <p className="mt-6 text-[17px] text-grey">Plain-language summary for this prototype.</p>
      </Reveal>

      <div className="mt-20 grid gap-12 lg:mt-28 lg:grid-cols-12">
        <nav aria-label="On this page" className="lg:col-span-3">
          <ul className="flex flex-wrap gap-2 lg:sticky lg:top-36 lg:flex-col lg:items-start">
            {TOC.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="tap inline-flex items-center rounded-full bg-surface px-4 py-2 text-sm text-grey shadow-[0_0_0_1px_var(--shell-line)] transition-colors hover:text-evergreen">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-8 lg:col-span-9">
          <Bezel as="section" id="privacy" className="scroll-mt-32 p-7 sm:p-12">
            <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Privacy</h2>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-charcoal/90">
              <p>Your profile, goals, budgets and settings are stored only in your browser’s local storage on this device. Nothing is sent to an Earn to Equity server, because there isn’t one holding your data.</p>
              <p>If the AI Wealth Coach is configured with a Gemini key by whoever runs this deployment, your question is sent to Google’s Gemini API together with a summary of calculated figures from your plan. No name is included. If it is not configured, the coach runs entirely in your browser.</p>
              <p>We never ask for bank credentials, card numbers, PAN, Aadhaar or other identity documents. Local storage is not encrypted and offers no multi-device sync. You can erase everything at any time from Settings → Data.</p>
            </div>
          </Bezel>

          <Bezel as="section" id="terms" className="scroll-mt-32 p-7 sm:p-12">
            <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Terms of use</h2>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-charcoal/90">
              <p>Earn to Equity is provided as-is for education and personal exploration. You are responsible for your financial decisions. Use the projections as one input among many, and consult a qualified, registered professional for advice specific to your situation.</p>
              <p>The prototype may contain errors. Calculations are documented and tested, but simplified. Income tax, capital-gains tax and fund costs are modelled; exit loads, surcharge on capital gains and most tax deductions beyond 80C, 80D and HRA are not.</p>
            </div>
          </Bezel>

          <Bezel as="section" id="disclaimers" className="scroll-mt-32 p-7 sm:p-12">
            <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Financial disclaimers</h2>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-charcoal/90">
              {DISCLAIMER_TEXT.map((t) => (
                <p key={t.slice(0, 20)}>{t}</p>
              ))}
            </div>
          </Bezel>
        </div>
      </div>
    </div>
  );
}
