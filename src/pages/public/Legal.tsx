export const DISCLAIMER_TEXT = [
  'Earn to Equity is an educational financial-planning prototype. It is not a SEBI-registered investment adviser, research analyst, stockbroker, insurance intermediary or tax practitioner, and it does not provide personalised investment, tax, legal or insurance advice.',
  'All projections are illustrative estimates produced from the information you enter and assumptions you can change, including returns, inflation, salary growth and withdrawal rates. Markets are volatile and actual outcomes will differ, sometimes materially. Past performance and assumed return distributions do not predict future results.',
  'Example portfolios and presets are educational illustrations of how allocations work. They are not recommendations to buy or sell any security or product. Tax information is dated reference material that may be out of date. Verify it with official sources or a qualified professional before acting.',
  'The financial health score is an internal educational measure with a documented methodology. It is not a credit score or an official rating of any kind.',
];

export default function Legal() {
  return (
    <div className="container-x max-w-3xl py-16 lg:py-24">
      <h1 className="display text-[44px] leading-tight">Privacy, terms & disclaimers</h1>
      <p className="mt-2 text-sm text-grey">Plain-language summary for this prototype.</p>

      <section id="privacy" className="mt-12 scroll-mt-24 border-t border-line pt-8">
        <h2 className="text-2xl font-semibold tracking-tight">Privacy</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-charcoal/90">
          <p>Your profile, goals, budgets and settings are stored only in your browser’s local storage on this device. Nothing is sent to an Earn to Equity server, because there isn’t one holding your data.</p>
          <p>If the AI Wealth Coach is configured with a Gemini key by whoever runs this deployment, your question is sent to Google’s Gemini API together with a summary of calculated figures from your plan. No name is included. If it is not configured, the coach runs entirely in your browser.</p>
          <p>We never ask for bank credentials, card numbers, PAN, Aadhaar or other identity documents. Local storage is not encrypted and offers no multi-device sync. You can erase everything at any time from Settings → Data.</p>
        </div>
      </section>

      <section id="terms" className="mt-12 scroll-mt-24 border-t border-line pt-8">
        <h2 className="text-2xl font-semibold tracking-tight">Terms of use</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-charcoal/90">
          <p>Earn to Equity is provided as-is for education and personal exploration. You are responsible for your financial decisions. Use the projections as one input among many, and consult a qualified, registered professional for advice specific to your situation.</p>
          <p>The prototype may contain errors. Calculations are documented and tested, but simplified. For example, they ignore taxes on returns, fees and exit loads unless stated otherwise.</p>
        </div>
      </section>

      <section id="disclaimers" className="mt-12 scroll-mt-24 border-t border-line pt-8">
        <h2 className="text-2xl font-semibold tracking-tight">Financial disclaimers</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-charcoal/90">
          {DISCLAIMER_TEXT.map((t) => (
            <p key={t.slice(0, 20)}>{t}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
