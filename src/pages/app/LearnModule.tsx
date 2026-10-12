import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { MODULES, type LearnModule as LM } from '@/features/learn/modules';
import { useStore } from '@/state/store';
import { Button, ButtonLink, Disclaimer, Notice, Field, PercentInput, MoneyInput, TextInput, Stat, Segmented } from '@/components/ui';
import { DEFAULT_TAX, TAX_SOURCES, equityGainsTax } from '@/features/learn/tax';
import { formatINR, formatPct } from '@/finance/money';
import { NotFound } from '@/components/layout/AppShell';

function Quiz({ m }: { m: LM }) {
  const setScore = useStore((s) => s.setLearnScore);
  const [answers, setAnswers] = useState<(number | null)[]>(m.quiz.map(() => null));
  const [checked, setChecked] = useState(false);
  const score = answers.filter((a, i) => a === m.quiz[i].answer).length;
  return (
    <section className="border-t border-line pt-10">
      <h2 className="text-xl font-semibold tracking-tight">Knowledge check</h2>
      <ol className="mt-6 space-y-8">
        {m.quiz.map((q, qi) => (
          <li key={q.q}>
            <fieldset>
              <legend className="font-medium text-evergreen">{qi + 1}. {q.q}</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((o, oi) => {
                  const sel = answers[qi] === oi;
                  const right = checked && oi === q.answer;
                  const wrong = checked && sel && oi !== q.answer;
                  return (
                    <label key={o} className={`flex cursor-pointer items-center gap-3 rounded border px-3 py-2.5 text-sm transition-colors ${right ? 'border-forest bg-mint' : wrong ? 'border-danger bg-danger/5' : sel ? 'border-evergreen' : 'border-line hover:border-sage'}`}>
                      <input type="radio" name={`q${qi}`} className="accent-[rgb(var(--c-forest))]" checked={sel} disabled={checked} onChange={() => setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)))} />
                      {o}
                    </label>
                  );
                })}
              </div>
              {checked && <p className={`mt-2 text-sm ${answers[qi] === q.answer ? 'text-forest' : 'text-danger'}`}>{answers[qi] === q.answer ? 'Correct. ' : 'Not quite. '}<span className="text-grey">{q.explain}</span></p>}
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {!checked ? (
          <Button disabled={answers.some((a) => a === null)} onClick={() => { setChecked(true); setScore(m.id, score); }}>Check answers</Button>
        ) : (
          <>
            <p className="font-semibold text-evergreen" role="status">You scored {score} of {m.quiz.length}.</p>
            <Button variant="secondary" onClick={() => { setAnswers(m.quiz.map(() => null)); setChecked(false); }}>Try again</Button>
          </>
        )}
      </div>
    </section>
  );
}

function TaxAwareness() {
  const tax = useStore((s) => s.tax);
  const setTax = useStore((s) => s.setTax);
  const [gain, setGain] = useState(300000);
  const [held, setHeld] = useState<'short' | 'long'>('long');
  const calc = equityGainsTax(gain, held === 'long' ? 24 : 6, tax);
  const rows: [string, string][] = [
    ['Listed equity & equity mutual funds', `Held ≤ 12 months: short-term gains taxed at ${formatPct(tax.equityStcgRate)}. Held > 12 months: long-term gains above ${formatINR(tax.equityLtcgExemption)} a year taxed at ${formatPct(tax.equityLtcgRate)}.`],
    ['Debt mutual funds', 'Units bought on or after 1 April 2023 are taxed at your income-tax slab rate, whatever the holding period.'],
    ['EPF', `Interest declared by EPFO (reference: ${formatPct(tax.epfRate, 2)}). Employee contributions qualify under 80C in the old regime. Interest on employee contributions above ₹2.5 lakh a year is taxable. Withdrawals after 5 years of continuous service are generally tax-free.`],
    ['PPF', `15-year government-backed scheme (reference rate ${formatPct(tax.ppfRate)}, notified quarterly). Contributions qualify under 80C up to ${formatINR(tax.sec80cLimit)} in the old regime. Interest and maturity are tax-free.`],
    ['NPS', `Additional deduction of ${formatINR(tax.nps80ccd1b)} under 80CCD(1B) in the old regime. Employer contributions can be deductible under 80CCD(2) in both regimes, within limits. At 60, up to 60% can be withdrawn tax-free. The remainder buys an annuity, whose income is taxable.`],
    ['ELSS', `Equity funds with a 3-year lock-in. They qualify under 80C (old regime only), and gains are taxed like other equity funds.`],
    ['New vs old regime', `The new regime is the default and has lower rates but few deductions. A rebate means no tax up to about ${formatINR(tax.newRegimeZeroTaxIncome)} of taxable income under the new regime (reference value). Compare both before choosing tax-saving products.`],
  ];
  return (
    <div className="flex flex-col gap-12">
      <Notice tone="warning" title="Education, not tax advice">
        These are reference values for <strong>{tax.asOf}</strong>. Tax law changes with each Budget, and from April 2026 provisions may be renumbered under the Income-tax Act, 2025. Verify on the official sources below or with a qualified professional before acting.
      </Notice>
      <section>
        <h2 className="text-xl font-semibold tracking-tight">How common instruments are taxed</h2>
        <dl className="mt-4">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 border-t border-line py-4 sm:grid-cols-[220px_1fr]">
              <dt className="font-semibold text-evergreen">{k}</dt>
              <dd className="text-sm leading-relaxed text-grey">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="grid gap-10 border-t border-line pt-10 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Illustrative equity gains tax</h2>
          <div className="mt-6 grid gap-5">
            <Field label="Capital gain">{(id) => <MoneyInput id={id} value={gain} onChange={setGain} max={1e10} />}</Field>
            <div><p className="mb-2 text-[13px] font-medium">Holding period</p><Segmented label="Holding period" value={held} onChange={setHeld} options={[{ value: 'short', label: '12 months or less' }, { value: 'long', label: 'More than 12 months' }]} /></div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <Stat label={`Estimated ${calc.kind}`} value={formatINR(calc.tax)} />
            <Stat label="Effective rate on gain" value={formatPct(gain > 0 ? calc.tax / gain : 0)} />
          </div>
          <p className="mt-3 text-xs text-grey">Ignores surcharge, 4% cess, loss set-offs, grandfathering and the other gains you realise in the same year.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Reference values (editable)</h2>
          <p className="mt-1 text-sm text-grey">Update them if the rules change. They are saved in this browser.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Values reflect" className="sm:col-span-2">{(id) => <TextInput id={id} value={tax.asOf} maxLength={120} onChange={(e) => setTax({ asOf: e.target.value })} />}</Field>
            <Field label="Equity STCG rate">{(id) => <PercentInput id={id} value={tax.equityStcgRate} max={50} onChange={(v) => setTax({ equityStcgRate: v })} />}</Field>
            <Field label="Equity LTCG rate">{(id) => <PercentInput id={id} value={tax.equityLtcgRate} max={50} onChange={(v) => setTax({ equityLtcgRate: v })} />}</Field>
            <Field label="LTCG annual exemption">{(id) => <MoneyInput id={id} value={tax.equityLtcgExemption} max={1e8} onChange={(v) => setTax({ equityLtcgExemption: v })} />}</Field>
            <Field label="80C limit (old regime)">{(id) => <MoneyInput id={id} value={tax.sec80cLimit} max={1e8} onChange={(v) => setTax({ sec80cLimit: v })} />}</Field>
            <Field label="NPS 80CCD(1B)">{(id) => <MoneyInput id={id} value={tax.nps80ccd1b} max={1e8} onChange={(v) => setTax({ nps80ccd1b: v })} />}</Field>
            <Field label="New-regime zero-tax income">{(id) => <MoneyInput id={id} value={tax.newRegimeZeroTaxIncome} max={1e9} onChange={(v) => setTax({ newRegimeZeroTaxIncome: v })} />}</Field>
            <Field label="PPF rate">{(id) => <PercentInput id={id} value={tax.ppfRate} max={20} onChange={(v) => setTax({ ppfRate: v })} />}</Field>
            <Field label="EPF rate">{(id) => <PercentInput id={id} value={tax.epfRate} max={20} onChange={(v) => setTax({ epfRate: v })} />}</Field>
          </div>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setTax({ ...DEFAULT_TAX })}>Restore reference values</Button>
        </div>
      </section>
      <section className="border-t border-line pt-10">
        <h2 className="text-xl font-semibold tracking-tight">Official sources</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {TAX_SOURCES.map((s) => <li key={s.url}><a className="link inline-flex items-center gap-1 text-sm" href={s.url} target="_blank" rel="noreferrer noopener">{s.label}<ExternalLink size={12} aria-hidden /></a></li>)}
        </ul>
      </section>
    </div>
  );
}

export default function LearnModule() {
  const { id } = useParams();
  if (id === 'tax-awareness') {
    return (
      <article className="flex flex-col gap-8">
        <Link to="/app/learn" className="inline-flex items-center gap-1 text-sm text-grey hover:text-evergreen"><ArrowLeft size={14} /> Learning Centre</Link>
        <h1 className="display text-[40px] leading-tight">Tax Awareness</h1>
        <TaxAwareness />
      </article>
    );
  }
  const m = MODULES.find((x) => x.id === id);
  if (!m) return <NotFound />;
  const i = MODULES.indexOf(m);
  const next = MODULES[i + 1];
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-10">
      <div>
        <Link to="/app/learn" className="inline-flex items-center gap-1 text-sm text-grey hover:text-evergreen"><ArrowLeft size={14} /> Learning Centre</Link>
        <p className="eyebrow mt-6">Module {i + 1} · {m.minutes} min</p>
        <h1 className="display mt-2 text-[40px] leading-tight">{m.title}</h1>
        <p className="mt-3 text-lg leading-relaxed text-grey">{m.summary}</p>
      </div>
      <div className="space-y-5 text-[16px] leading-[1.75] text-charcoal/90">{m.body.map((b) => <p key={b.slice(0, 24)}>{b}</p>)}</div>
      <section className="panel p-6">
        <p className="eyebrow">Worked example</p>
        <h2 className="mt-1 text-lg font-semibold">{m.example.title}</h2>
        <dl className="mt-4">
          {m.example.lines.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-line/70 py-2 text-sm"><dt className="text-grey">{k}</dt><dd className="num font-semibold text-evergreen">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-charcoal">{m.example.note}</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold tracking-tight">Key takeaways</h2>
        <ul className="mt-4 space-y-2">{m.takeaways.map((t) => <li key={t} className="flex gap-3 text-[15px]"><span className="text-champagne">—</span>{t}</li>)}</ul>
      </section>
      <Quiz key={m.id} m={m} />
      <section className="border-t border-line pt-8">
        <h2 className="eyebrow mb-3">Official resources</h2>
        <ul className="space-y-1.5">{m.links.map((l) => <li key={l.url}><a className="link inline-flex items-center gap-1 text-sm" href={l.url} target="_blank" rel="noreferrer noopener">{l.label}<ExternalLink size={12} aria-hidden /></a></li>)}</ul>
      </section>
      <div className="flex flex-wrap gap-3 border-t border-line pt-8">
        {m.tool && <ButtonLink to={m.tool.to} variant="secondary">{m.tool.label}</ButtonLink>}
        {next && <ButtonLink to={`/app/learn/${next.id}`}>Next: {next.title}</ButtonLink>}
      </div>
      <Disclaimer>Educational content only. Figures use illustrative assumptions and are not recommendations.</Disclaimer>
    </article>
  );
}
