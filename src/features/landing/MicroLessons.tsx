import { useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { projectSip, sipFutureValue } from '@/finance/sip';
import { inflate, toReal } from '@/finance/rates';
import { DEFAULT_SALARY, salaryBreakdown } from '@/finance/tax';
import { simulatePayoff } from '@/finance/debt';
import { NEW_REGIME } from '@/finance/assumptions';
import { formatCompact, formatINR, formatMonths, formatPct } from '@/finance/money';
import { MODULES, type QuizQ } from '@/features/learn/modules';
import { DEFAULT_TAX } from '@/features/learn/tax';
import { Slider } from '@/components/ui/Form';
import { AnimatedNumber } from '@/components/motion/Motion';
import { useExploreDemo } from '@/state/useDemo';

/*
 * Six bite-size lessons on the landing page. Every figure comes from the same finance engine as the
 * planner, and each quiz question is taken from the full module in src/features/learn/modules.ts.
 */

const RETURN = 0.11;
const INFLATION = 0.06;
const mod = (id: string) => MODULES.find((m) => m.id === id)!;

/** Horizontal bar that grows to its share, with a label and value. */
function Bar({ label, value, share, tone = 'accent' }: { label: string; value: ReactNode; share: number; tone?: 'accent' | 'violet' | 'amber' | 'muted' }) {
  const reduce = useReducedMotion();
  const fill = { accent: 'bg-forest', violet: 'bg-[rgb(var(--chart-2))]', amber: 'bg-champagne', muted: 'bg-sage' }[tone];
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
        <span className="text-grey">{label}</span>
        <span className="num font-medium text-evergreen">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div className={`h-full rounded-full ${fill}`} initial={false} animate={{ width: `${Math.max(2, Math.min(100, share * 100))}%` }} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 140, damping: 22 }} />
      </div>
    </div>
  );
}

function Compounding() {
  const [years, setYears] = useState(20);
  const r = useMemo(() => projectSip({ monthly: 10000, years, annualReturn: RETURN }), [years]);
  return (
    <>
      <Slider label="₹10,000 a month for" value={years} min={5} max={30} step={1} onChange={setYears} format={(v) => `${v} years`} />
      <p className="num mt-4 text-[30px] font-semibold leading-none tracking-[-0.04em] text-evergreen [&_.num]:font-sans">
        <AnimatedNumber value={r.corpus} format={formatCompact} />
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <Bar label="You put in" value={formatCompact(r.totalContributions)} share={r.totalContributions / r.corpus} tone="muted" />
        <Bar label="Compounding added" value={formatCompact(r.gains)} share={r.gains / r.corpus} />
      </div>
    </>
  );
}

function CostOfWaiting() {
  const [delay, setDelay] = useState(5);
  const now = sipFutureValue(10000, RETURN, 30 * 12);
  const later = sipFutureValue(10000, RETURN, (30 - delay) * 12);
  return (
    <>
      <Slider label="Start investing later by" value={delay} min={0} max={10} step={1} onChange={setDelay} format={(v) => `${v} yr${v === 1 ? '' : 's'}`} />
      <p className="mt-4 text-[12.5px] text-grey">Waiting costs you, by age 55</p>
      <p className="num mt-1 text-[30px] font-semibold leading-none tracking-[-0.04em] text-danger [&_.num]:font-sans">
        <AnimatedNumber value={now - later} format={formatCompact} />
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <Bar label="Start at 25" value={formatCompact(now)} share={1} />
        <Bar label={`Start at ${25 + delay}`} value={formatCompact(later)} share={later / now} tone="violet" />
      </div>
    </>
  );
}

function Inflation() {
  const [years, setYears] = useState(15);
  return (
    <>
      <Slider label="Years from now" value={years} min={5} max={30} step={1} onChange={setYears} format={(v) => `${v} years`} />
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[12.5px] text-grey">₹1 L of shopping will cost</p>
          <p className="num mt-1 text-[24px] font-semibold leading-none tracking-[-0.04em] text-evergreen [&_.num]:font-sans">
            <AnimatedNumber value={inflate(100000, INFLATION, years)} format={formatCompact} />
          </p>
        </div>
        <div>
          <p className="text-[12.5px] text-grey">₹1 L kept as cash buys</p>
          <p className="num mt-1 text-[24px] font-semibold leading-none tracking-[-0.04em] text-danger [&_.num]:font-sans">
            <AnimatedNumber value={toReal(100000, INFLATION, years)} format={formatCompact} />
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Bar label="Purchasing power left" value={formatPct(toReal(1, INFLATION, years), 0)} share={toReal(1, INFLATION, years)} tone="amber" />
      </div>
    </>
  );
}

function Regimes() {
  const [ctc, setCtc] = useState(1800000);
  const b = useMemo(() => salaryBreakdown({ ...DEFAULT_SALARY, ctc, other80C: 150000, sec80D: 25000 }), [ctc]);
  const max = Math.max(b.taxNew, b.taxOld, 1);
  const better = b.taxNew <= b.taxOld ? 'New' : 'Old';
  return (
    <>
      <Slider label="Annual CTC" value={ctc} min={600000} max={4000000} step={50000} onChange={setCtc} format={formatCompact} />
      <div className="mt-5 flex flex-col gap-3">
        <Bar label="New regime tax" value={formatINR(b.taxNew)} share={b.taxNew / max} />
        <Bar label="Old regime tax (full Sec 123 + Sec 126)" value={formatINR(b.taxOld)} share={b.taxOld / max} tone="violet" />
      </div>
      <p className="mt-4 text-[12.5px] text-grey">
        <span className="font-medium text-evergreen">{better} regime</span> saves {formatINR(Math.abs(b.taxNew - b.taxOld))} a year here.
      </p>
    </>
  );
}

function CardDebt() {
  const [pay, setPay] = useState(5000);
  const r = useMemo(() => simulatePayoff([{ id: 'c', kind: 'creditCard', label: 'Card', balance: 100000, rate: 0.36, emi: pay }], 0, 'avalanche'), [pay]);
  const never = !Number.isFinite(r.months);
  return (
    <>
      <Slider label="Monthly payment on ₹1 L at 36%" value={pay} min={3500} max={20000} step={500} onChange={setPay} format={formatINR} />
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[12.5px] text-grey">Debt-free in</p>
          <p className="num mt-1 font-sans text-[24px] font-semibold leading-none tracking-[-0.04em] text-evergreen">{never ? 'Never' : formatMonths(r.months)}</p>
        </div>
        <div>
          <p className="text-[12.5px] text-grey">Interest paid</p>
          <p className="num mt-1 text-[24px] font-semibold leading-none tracking-[-0.04em] text-danger [&_.num]:font-sans">{never ? '—' : <AnimatedNumber value={r.totalInterest} format={formatCompact} />}</p>
        </div>
      </div>
      <div className="mt-4">
        <Bar label="Interest as a share of the balance" value={never ? '—' : formatPct(r.totalInterest / 100000, 0)} share={never ? 1 : r.totalInterest / 100000} tone="amber" />
      </div>
    </>
  );
}

function FiftyThirtyTwenty() {
  const [ctc, setCtc] = useState(1200000);
  const m = useMemo(() => salaryBreakdown({ ...DEFAULT_SALARY, ctc }).monthlyTakeHome, [ctc]);
  return (
    <>
      <Slider label="Annual CTC" value={ctc} min={400000} max={4000000} step={50000} onChange={setCtc} format={formatCompact} />
      <p className="mt-4 text-[12.5px] text-grey">Monthly take-home after tax and EPF</p>
      <p className="num mt-1 text-[24px] font-semibold leading-none tracking-[-0.04em] text-evergreen [&_.num]:font-sans">
        <AnimatedNumber value={m} format={formatINR} />
      </p>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full" aria-hidden>
        <span className="h-full w-1/2 bg-forest" />
        <span className="h-full w-[30%] bg-[rgb(var(--chart-2))]" />
        <span className="h-full w-1/5 bg-champagne" />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
        {[
          ['Needs 50%', 0.5],
          ['Wants 30%', 0.3],
          ['Save 20%', 0.2],
        ].map(([k, s]) => (
          <div key={k as string}>
            <dt className="text-grey">{k}</dt>
            <dd className="num font-medium text-evergreen">{formatCompact(m * (s as number))}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

interface Lesson {
  id: string;
  module: string;
  title: string;
  takeaway: string;
  widget: ReactNode;
  quiz: QuizQ;
  fact?: string;
}

const LESSONS: Lesson[] = [
  { id: 'compounding', module: 'compounding', title: 'Compounding', takeaway: 'Returns earn their own returns. Time matters more than the amount.', widget: <Compounding />, quiz: mod('compounding').quiz[0] },
  { id: 'waiting', module: 'sip', title: 'The cost of waiting', takeaway: 'A year of delay is lost from the end of the plan, where compounding adds the most.', widget: <CostOfWaiting />, quiz: mod('compounding').quiz[1] },
  { id: 'inflation', module: 'inflation', title: 'Inflation', takeaway: 'At 6% a year, prices double about every 12 years. Cash quietly shrinks.', widget: <Inflation />, quiz: mod('inflation').quiz[0] },
  {
    id: 'tax',
    module: 'tax',
    title: 'Old vs new tax regime',
    takeaway: 'With its larger rebate, the new regime costs less unless your deductions are large.',
    widget: <Regimes />,
    quiz: mod('tax').quiz[0],
    fact: `Under the new regime, salary up to ${formatCompact(DEFAULT_TAX.newRegimeZeroTaxIncome + NEW_REGIME.value.standardDeduction)} pays no income tax.`,
  },
  { id: 'debt', module: 'debt', title: 'Credit-card debt', takeaway: 'At 36% a year, minimum payments mostly feed interest. Pay the costliest debt first.', widget: <CardDebt />, quiz: mod('debt').quiz[1] },
  { id: 'budgeting', module: 'budgeting', title: 'The 50/30/20 rule', takeaway: 'A starting split for take-home pay: needs, wants, and the part that builds wealth.', widget: <FiftyThirtyTwenty />, quiz: mod('budgeting').quiz[1] },
];

function Quiz({ q, name }: { q: QuizQ; name: string }) {
  const [pick, setPick] = useState<number | null>(null);
  const done = pick !== null;
  const right = pick === q.answer;
  return (
    <fieldset className="mt-6 border-t border-line pt-5">
      <legend className="sr-only">Quick check: {name}</legend>
      <p className="text-[13px] font-medium text-evergreen">{q.q}</p>
      <div className="mt-3 grid grid-cols-1 gap-1.5">
        {q.options.map((o, i) => {
          const state = !done ? '' : i === q.answer ? 'ring-1 ring-forest bg-mint text-evergreen' : i === pick ? 'ring-1 ring-danger/60 text-danger' : 'opacity-60';
          return (
            <button key={o} type="button" disabled={done} onClick={() => setPick(i)} aria-pressed={pick === i} className={`tap flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2 text-left text-[12.5px] text-charcoal transition-colors hover:bg-muted disabled:cursor-default ${state}`}>
              {o}
              {done && i === q.answer && <Check size={14} className="shrink-0 text-forest" aria-label="Correct answer" />}
              {done && i === pick && !right && <X size={14} className="shrink-0 text-danger" aria-label="Your answer" />}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-2 min-h-[1.25rem] text-[12px] text-grey">
        {done && (
          <>
            <span className={right ? 'font-medium text-forest' : 'font-medium text-danger'}>{right ? 'Correct.' : 'Not quite.'}</span> {q.explain}
          </>
        )}
      </p>
    </fieldset>
  );
}

/** Snap-scrolling deck of lesson cards with previous / next controls. */
export function MicroLessons() {
  const deck = useRef<HTMLUListElement>(null);
  const explore = useExploreDemo();
  const scroll = (dir: 1 | -1) => {
    const el = deck.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 360) + 20), behavior: 'smooth' });
  };
  return (
    <div>
      <ul ref={deck} className="snap-deck -mx-4 flex gap-5 overflow-x-auto px-4 pb-6 pt-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" aria-label="Micro-lessons">
        {LESSONS.map((l, i) => (
          <motion.li
            key={l.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
            transition={{ duration: 0.8, delay: i * 0.06, ease: [0.32, 0.72, 0, 1] }}
            className="frame flex w-[86vw] max-w-[380px] shrink-0 flex-col p-6 sm:p-7"
          >
            <div className="flex items-center justify-between">
              <span className="num text-[12px] text-grey">0{i + 1} / 0{LESSONS.length}</span>
              <span className="chip !py-1 !text-[11px]">{mod(l.module).minutes} min lesson</span>
            </div>
            <h3 className="mt-5 text-[22px] font-semibold tracking-[-0.03em]">{l.title}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-grey">{l.takeaway}</p>
            <div className="well mt-5 p-4">{l.widget}</div>
            {l.fact && <p className="mt-4 text-[12px] leading-relaxed text-grey"><span className="font-medium text-forest">Did you know?</span> {l.fact}</p>}
            <Quiz q={l.quiz} name={l.title} />
            <button type="button" onClick={() => explore(`/app/learn/${l.module}`, true)} className="hit mt-auto inline-flex items-center gap-1.5 self-start pt-4 text-left text-[13px] font-medium text-forest">
              Full lesson: {mod(l.module).title} <ArrowRight size={14} aria-hidden />
            </button>
          </motion.li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-[12.5px] text-grey">Figures use the planner’s own engine: {formatPct(RETURN, 0)} return, {formatPct(INFLATION, 0)} inflation, tax year 2026-27.</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous lesson" className="tap chip !h-10 !w-10 justify-center !p-0 transition-colors hover:text-evergreen">
            <ArrowLeft size={16} aria-hidden />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Next lesson" className="tap chip !h-10 !w-10 justify-center !p-0 transition-colors hover:text-evergreen">
            <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
