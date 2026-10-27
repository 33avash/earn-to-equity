import { useRef, type ReactNode, type RefObject } from 'react';
import { Check, Minus, Target, LineChart, FlaskConical, MessageSquareText, Wallet, Landmark, CalendarRange, IndianRupee, TrendingUp, Mountain, PiggyBank, Receipt } from 'lucide-react';
import { DeviceFrame, Frame } from '@/components/ui/Misc';
import { GoalTimeline, PLAN_STATUS } from '@/features/goals/GoalTimeline';
import type { Plan } from '@/state/selectors';
import { formatCompact } from '@/finance/money';
import { Mark } from '@/components/layout/Wordmark';
import { Marquee } from '@/components/motion/Marquee';
import { TiltCard } from '@/components/motion/TiltCard';
import { TabsMorph } from '@/components/motion/TabsMorph';
import { ScrollStack } from '@/components/motion/ScrollStack';
import { AnimatedBeam } from '@/components/motion/AnimatedBeam';
import { Reveal } from '@/components/motion/Motion';
import { Suspense, lazy } from 'react';

/*
 * Sections that used to sit on the landing page, now on /features: the planner's real panels on the demo plan,
 * the step cards, the engine diagram, the comparison and the rules strip.
 */

/** Rules the engine applies, shown as a moving strip of facts. */
export const RULES = [
  'New regime: ₹12 L taxable pays no tax (Sec 156)',
  'Standard deduction ₹75,000',
  'EPF at 8.25% a year',
  'EPF wage ceiling ₹25,000',
  'Basic at least 50% of CTC (Labour Codes)',
  'LTCG 12.5% above ₹1.25 L',
  'Lenders cap EMIs at 50% of take-home',
  'Stamp duty, registration and GST on a flat',
  'Lifestyle creep as pay rises',
  'Nifty 50 history in three-year blocks',
  'Goals inflated to the year they fall due',
  'HRA worked out from your rent',
];

export function RulesMarquee() {
  return (
    <section aria-label="Rules the engine models" className="py-8">
      <Marquee duration={55}>
        {RULES.map((r) => (
          <span key={r} className="chip">
            <span className="h-1.5 w-1.5 rounded-full bg-forest" aria-hidden /> {r}
          </span>
        ))}
      </Marquee>
    </section>
  );
}

const COMPARE: { row: string; calc: boolean }[] = [
  { row: 'Compounding on a monthly SIP', calc: true },
  { row: 'Take-home recalculated as your CTC crosses tax slabs', calc: false },
  { row: 'EPF growing at the declared rate', calc: false },
  { row: 'Loans, EMIs and the 50% lender limit', calc: false },
  { row: 'Goals paid from savings or a loan in the year they fall due', calc: false },
  { row: 'Capital-gains tax when you sell', calc: false },
  { row: 'Market crashes and career breaks', calc: false },
];

/** What a typical SIP calculator models against what the plan adds. */
export function Comparison({ endYear }: { endYear: number }) {
  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      <Reveal>
        <TiltCard className="frame frame-lg h-full p-7 sm:p-9">
          <p className="text-[13px] font-medium text-grey">Typical SIP calculator</p>
          <p className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-evergreen">One number</p>
          <ul className="mt-8 flex flex-col gap-3.5">
            {COMPARE.map((r) => (
              <li key={r.row} className={`flex items-start gap-3 text-[14px] ${r.calc ? 'text-charcoal' : 'text-grey'}`}>
                {r.calc ? <Check size={16} className="mt-0.5 shrink-0 text-forest" aria-label="Included" /> : <Minus size={16} className="mt-0.5 shrink-0 text-grey" aria-label="Not included" />}
                {r.row}
              </li>
            ))}
          </ul>
        </TiltCard>
      </Reveal>
      <Reveal delay={120}>
        <TiltCard className="frame frame-lg h-full overflow-hidden p-7 sm:p-9">
          <div aria-hidden className="glow -right-20 -top-20 h-72 w-72" />
          <p className="relative flex items-center gap-2 text-[13px] font-medium text-forest">
            <Mark size={16} animate={false} /> Earn to Equity
          </p>
          <p className="relative mt-2 text-[28px] font-semibold tracking-[-0.04em] text-evergreen">Every year to {endYear}</p>
          <ul className="relative mt-8 flex flex-col gap-3.5">
            {COMPARE.map((r) => (
              <li key={r.row} className="flex items-start gap-3 text-[14px] text-charcoal">
                <Check size={16} className="mt-0.5 shrink-0 text-forest" aria-label="Included" />
                {r.row}
              </li>
            ))}
          </ul>
        </TiltCard>
      </Reveal>
    </div>
  );
}

/** The three step cards, stacked as you scroll. */
export function StepsShowcase({ plan }: { plan: Plan }) {
  return <ScrollStack items={[<StepPay key="pay" plan={plan} />, <StepGoals key="goals" plan={plan} />, <StepYears key="years" plan={plan} />]} />;
}

// The Monte Carlo engine, its Nifty history and the coach load only when their tab is opened.
const RiskPanel = lazy(() => import('@/features/landing/FeaturePanels').then((m) => ({ default: m.RiskPanel })));
const CoachPanel = lazy(() => import('@/features/landing/FeaturePanels').then((m) => ({ default: m.CoachPanel })));
const panelFallback = <div className="skeleton m-6 h-64" role="status" aria-label="Loading" />;

/* ---------- How it works: three pinned step cards, each with a live mini visual ---------- */

function StepCard({ n, title, body, children }: { n: number; title: string; body: string; children: ReactNode }) {
  return (
    <Frame size="xl" className="grid gap-8 overflow-hidden p-7 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-14">
      <div className="flex flex-col justify-between lg:col-span-5">
        <span className="num text-[72px] font-light leading-none tracking-[-0.06em] text-forest/80">0{n}</span>
        <div className="mt-10">
          <h3 className="text-[26px] font-semibold tracking-[-0.03em] sm:text-[30px]">{title}</h3>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-grey">{body}</p>
        </div>
      </div>
      <div className="well p-5 sm:p-7 lg:col-span-7">{children}</div>
    </Frame>
  );
}

function StepPay({ plan }: { plan: Plan }) {
  const cf = plan.cashflow;
  const rows = [
    { label: 'Essentials', v: cf.essential, icon: Receipt, tone: 'bg-sage' },
    { label: 'Lifestyle', v: cf.lifestyle, icon: Wallet, tone: 'bg-champagne' },
    { label: 'EMIs', v: cf.debtPayments, icon: Landmark, tone: 'bg-danger' },
    { label: 'Investments', v: cf.plannedInvestments, icon: TrendingUp, tone: 'bg-forest' },
    { label: 'Savings', v: cf.plannedSavings, icon: PiggyBank, tone: 'bg-[rgb(var(--chart-2))]' },
  ];
  return (
    <StepCard n={1} title="Enter your pay and spending" body="Your CTC, rent, EMIs and SIPs. The plan works out take-home under both tax regimes, and your EPF contribution.">
      <p className="text-[12.5px] text-grey">Sample plan: monthly take-home</p>
      <p className="num mt-1 font-sans text-[30px] font-semibold tracking-[-0.04em] text-evergreen">{formatCompact(cf.income)}</p>
      <ul className="mt-6 flex flex-col gap-3.5">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[1.5rem_6.5rem_1fr_4.5rem] items-center gap-3 text-[13px]">
            <r.icon size={15} className="text-grey" aria-hidden />
            <span className="text-charcoal">{r.label}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-muted">
              <span className={`block h-full rounded-full ${r.tone}`} style={{ width: `${Math.max(2, (r.v / cf.income) * 100)}%` }} />
            </span>
            <span className="num text-right text-evergreen">{formatCompact(r.v)}</span>
          </li>
        ))}
      </ul>
    </StepCard>
  );
}

function StepGoals({ plan }: { plan: Plan }) {
  return (
    <StepCard n={2} title="Add goals and life events" body="An MBA in 2029, a flat in 2039, a wedding. Each goal is priced in today’s rupees and inflated to the year it falls due.">
      <ul className="flex flex-col divide-y divide-line">
        {plan.goalViews.slice(0, 5).map((v) => (
          <li key={v.goal.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-forest">
              <Target size={16} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-evergreen">{v.goal.name}</p>
              <p className="text-[12px] text-grey">{v.goal.targetYear}</p>
            </div>
            <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-muted sm:flex">
              <span className="h-full bg-forest" style={{ width: `${v.split.savings * 100}%` }} />
              <span className="h-full bg-[rgb(var(--chart-2))]" style={{ width: `${v.split.loan * 100}%` }} />
            </div>
            <span className="chip !py-1 !text-[11px]">{PLAN_STATUS[v.status].label}</span>
          </li>
        ))}
      </ul>
    </StepCard>
  );
}

function StepYears({ plan }: { plan: Plan }) {
  const pts = plan.sim.points.map((p) => p.netWorthReal);
  const max = Math.max(...pts, 1);
  const line = pts.map((v, i) => `${(i / (pts.length - 1)) * 100},${40 - (Math.max(0, v) / max) * 36}`).join(' ');
  return (
    <StepCard n={3} title={`See every year to ${plan.headline.year}`} body="One projection drives every screen. Change a number and the whole plan reruns, from this month’s surplus to your FI age.">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[12.5px] text-grey">Net worth, today’s ₹</p>
          <p className="num mt-1 font-sans text-[30px] font-semibold tracking-[-0.04em] text-evergreen">{formatCompact(plan.headline.netWorthReal)}</p>
        </div>
        <span className="chip">{plan.sim.points.length} years</span>
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden className="mt-6 h-40 w-full overflow-visible">
        <defs>
          <linearGradient id="step-years-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'rgb(var(--accent))', stopOpacity: 0.3 }} />
            <stop offset="1" style={{ stopColor: 'rgb(var(--accent))', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <polygon points={`0,40 ${line} 100,40`} fill="url(#step-years-fill)" />
        <polyline points={line} fill="none" stroke="rgb(var(--accent))" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="mt-3 flex justify-between text-[11.5px] text-grey">
        <span className="num">{plan.sim.points[0].year}</span>
        <span className="num">{plan.headline.year}</span>
      </div>
    </StepCard>
  );
}

/* ---------- Feature tabs ---------- */

function YearTable({ plan }: { plan: Plan }) {
  const rows = plan.sim.rows.filter((_, i) => i === 0 || (i + 1) % 5 === 0);
  return (
    <div className="overflow-x-auto p-5 sm:p-7">
      <table className="table-fin w-full min-w-[560px]">
        <thead>
          <tr>
            {['Year', 'Age', 'Take-home', 'Income tax', 'Invested', 'Net worth (today’s ₹)'].map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}>
              <td>{r.year}</td>
              <td>{r.age}</td>
              <td>{formatCompact(r.income)}</td>
              <td>{formatCompact(r.incomeTax)}</td>
              <td>{formatCompact(r.contributions)}</td>
              <td className="font-semibold text-evergreen">{formatCompact(r.netWorthReal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-[12px] text-grey">Every fifth year shown. The simulator lets you open any year and see what happened in it.</p>
    </div>
  );
}

export function FeatureTabs({ plan }: { plan: Plan }) {
  const frame = (label: string, node: ReactNode) => (
    <DeviceFrame label={label} className="mx-auto max-w-5xl" chrome={<Mark size={16} animate={false} />}>
      {node}
    </DeviceFrame>
  );
  return (
    <TabsMorph
      label="Planner features"
      tabs={[
        { id: 'goals', label: 'Goals', icon: <Target size={15} aria-hidden />, content: frame('Goals · sample plan', <div className="p-5 sm:p-8"><GoalTimeline goals={plan.goalViews} /></div>) },
        { id: 'sim', label: 'Simulator', icon: <LineChart size={15} aria-hidden />, content: frame('Simulator · year by year', <YearTable plan={plan} />) },
        { id: 'risk', label: 'Risk lab', icon: <FlaskConical size={15} aria-hidden />, content: frame('Risk lab · Monte Carlo', <Suspense fallback={panelFallback}><RiskPanel plan={plan} /></Suspense>) },
        { id: 'coach', label: 'Coach', icon: <MessageSquareText size={15} aria-hidden />, content: frame('Coach · your numbers', <Suspense fallback={panelFallback}><CoachPanel plan={plan} /></Suspense>) },
      ]}
    />
  );
}

/* ---------- Engine diagram: inputs → one projection → outputs, joined by animated beams ---------- */

function Node({ icon, label, nodeRef }: { icon: ReactNode; label: string; nodeRef: RefObject<HTMLDivElement> }) {
  return (
    <div ref={nodeRef} className="frame-glass relative z-10 flex items-center gap-2.5 !rounded-2xl px-4 py-3 text-[13px] font-medium text-evergreen">
      <span className="text-forest">{icon}</span>
      {label}
    </div>
  );
}

export function EngineDiagram({ year }: { year: number }) {
  const box = useRef<HTMLDivElement>(null);
  const core = useRef<HTMLDivElement>(null);
  const i1 = useRef<HTMLDivElement>(null);
  const i2 = useRef<HTMLDivElement>(null);
  const i3 = useRef<HTMLDivElement>(null);
  const i4 = useRef<HTMLDivElement>(null);
  const o1 = useRef<HTMLDivElement>(null);
  const o2 = useRef<HTMLDivElement>(null);
  const o3 = useRef<HTMLDivElement>(null);
  const o4 = useRef<HTMLDivElement>(null);
  const inputs = [
    { ref: i1, label: 'CTC and tax regime', icon: <IndianRupee size={15} aria-hidden /> },
    { ref: i2, label: 'Rent and spending', icon: <Wallet size={15} aria-hidden /> },
    { ref: i3, label: 'Loans and EMIs', icon: <Landmark size={15} aria-hidden /> },
    { ref: i4, label: 'Goals and life events', icon: <CalendarRange size={15} aria-hidden /> },
  ];
  const outputs = [
    { ref: o1, label: 'Take-home and tax', icon: <Receipt size={15} aria-hidden /> },
    { ref: o2, label: 'Net worth each year', icon: <TrendingUp size={15} aria-hidden /> },
    { ref: o3, label: 'Goal funding', icon: <Target size={15} aria-hidden /> },
    { ref: o4, label: 'FI age and odds', icon: <Mountain size={15} aria-hidden /> },
  ];
  return (
    <Frame size="xl" className="overflow-hidden p-6 sm:p-10 lg:p-14">
      <div ref={box} className="relative grid items-center gap-8 md:grid-cols-[1fr_auto_1fr] md:gap-16">
        <div className="flex flex-col gap-4">
          {inputs.map((n) => (
            <Node key={n.label} nodeRef={n.ref} icon={n.icon} label={n.label} />
          ))}
        </div>
        <div ref={core} className="relative z-10 mx-auto grid h-44 w-44 place-items-center rounded-full bg-[rgb(var(--card))] text-center shadow-[0_0_0_1px_var(--frame-line),var(--edge-highlight),0_0_80px_-10px_var(--glow-accent)]">
          <div>
            <Mark size={40} animate={false} />
            <p className="mt-3 text-[13px] font-semibold text-evergreen">One projection</p>
            <p className="num text-[11.5px] text-grey">monthly, to {year}</p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {outputs.map((n) => (
            <Node key={n.label} nodeRef={n.ref} icon={n.icon} label={n.label} />
          ))}
        </div>
        <div className="hidden md:contents">
          {inputs.map((n, i) => (
            <AnimatedBeam key={n.label} container={box} from={n.ref} to={core} curvature={(i - 1.5) * -30} delay={i * 0.4} />
          ))}
          {outputs.map((n, i) => (
            <AnimatedBeam key={n.label} container={box} from={core} to={n.ref} curvature={(i - 1.5) * 30} delay={1.6 + i * 0.4} />
          ))}
        </div>
      </div>
    </Frame>
  );
}
