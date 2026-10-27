import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Wand2 } from 'lucide-react';
import type { Plan } from '@/state/plan';
import { useStore } from '@/state/store';
import { useMoney } from '@/state/selectors';
import { Button, ButtonLink } from '@/components/ui';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/shadcn/dialog';
import { formatCompact, formatPct } from '@/finance/money';

/*
 * "Who is Riya?": the demo explained for someone who has never seen the planner. Who she is, what she earns
 * and owes, what she is planning, and where her plan falls short, all read from the live plan so the figures
 * stay right if the demo is edited. Shown on Overview and from the demo banner on every screen.
 */

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-grey">{title}</h3>
      <div className="text-[13.5px] leading-relaxed text-charcoal">{children}</div>
    </div>
  );
}

/** Where the demo plan falls short right now, in plain words. Empty once every gap is closed. */
export function demoGaps(plan: Plan, money: (n: number) => string): string[] {
  const { profile: p, emergency, unfundedGoals, cashflow } = plan;
  const out: string[] = [];
  for (const u of unfundedGoals) out.push(`Savings can’t pay for the ${u.name} in ${u.year}: ${money(u.shortfall)} short.`);
  if (emergency.gap > 0)
    out.push(`Her emergency reserve covers ${emergency.coverageMonths.toFixed(1)} months of essential bills and EMIs; the target is ${emergency.targetMonths}.`);
  const costly = p.liabilities.filter((l) => l.rate >= 0.2 && l.balance > 0);
  for (const l of costly) out.push(`${rupees(l.balance)} on her ${l.label.toLowerCase()} at ${formatPct(l.rate, 0)} interest, the most expensive money in her plan.`);
  if (p.income.mode === 'ctc' && !(p.income.salary?.employerNpsShare ?? 0)) out.push('Her employer puts nothing into NPS. Up to 14% of basic paid that way is not taxed, and she can ask HR to move part of her CTC into it.');
  if (p.about.parentsAsDependents && p.protection.lifeCover <= 0) out.push('Her parents rely on the money she sends home, but she has no term life cover.');
  if (cashflow.unallocated < 0) out.push(`She has committed ${money(-cashflow.unallocated)} a month more than she has left over.`);
  return out;
}

const BRIEF_KEY = 'e2e:demo-brief-closed';

/** The brief as a card at the top of Overview while the demo is open. Folding it is remembered on this device. */
export function DemoIntroCard({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(BRIEF_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const toggle = () =>
    setOpen((o) => {
      try {
        localStorage.setItem(BRIEF_KEY, o ? '1' : '0');
      } catch {
        /* storage unavailable */
      }
      return !o;
    });
  return (
    <section aria-labelledby="demo-brief-h" className="bezel border-l-2 border-l-champagne">
      <div className="card-head">
        <h2 id="demo-brief-h" className="card-title">
          Meet {plan.profile.about.name}: the demo plan
        </h2>
        <button type="button" onClick={toggle} aria-expanded={open} aria-controls="demo-brief-body" className="card-link">
          {open ? 'Hide' : 'Who is this?'} <ChevronDown size={13} aria-hidden className={open ? 'rotate-180' : ''} />
        </button>
      </div>
      {open && (
        <div id="demo-brief-body" className="p-5">
          <DemoBrief plan={plan} />
        </div>
      )}
    </section>
  );
}

/** "Who is Riya?" from the demo banner, so the brief is one click away on every screen. */
export function DemoBriefDialog({ plan, open, onOpenChange }: { plan: Plan; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] w-[min(94vw,760px)] overflow-y-auto" aria-describedby={undefined}>
        <DialogTitle className="mb-4 pr-8">Meet {plan.profile.about.name}: the demo plan</DialogTitle>
        <DemoBrief plan={plan} onAction={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function DemoBrief({ plan, onAction }: { plan: Plan; onAction?: () => void }) {
  const money = useMoney();
  const setFixOpen = useStore((s) => s.setFixOpen);
  const { profile: p, cashflow: cf, sheet } = plan;
  const Y = p.planStartYear;
  const age = (year: number) => p.about.age + (year - Y);
  const variable = p.income.salary?.variablePay?.targetShare ?? 0;
  const rent = p.cashflow.essential.find((l) => /rent/i.test(l.label))?.amount ?? 0;
  const family = p.cashflow.essential.filter((l) => l.familySupport).reduce((s, l) => s + l.amount, 0);
  const loans = p.liabilities.filter((l) => l.balance > 0);
  const goals = [...p.goals].sort((a, b) => a.targetYear - b.targetYear);
  const events = [...p.lifeEvents].sort((a, b) => a.year - b.year);
  const gaps = demoGaps(plan, money);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[14px] leading-relaxed text-charcoal">
        This is a <strong className="font-semibold text-evergreen">demo plan</strong> for a made-up person, so you can see what the planner does before typing in your own numbers. Every figure is
        illustrative. You can change anything here; your own plan, if you make one, is kept separately and the demo stays untouched.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        <Block title="Who she is">
          <p>
            {p.about.name}, {p.about.age}, a software analyst in Pune. Her CTC is <span className="num">{formatCompact(p.income.ctc ?? 0)}</span>
            {variable > 0 && <> with {formatPct(variable, 0)} of it as variable pay</>}, which after PF, tax and the rest reaches her bank as about{' '}
            <strong className="num font-semibold text-evergreen">{money(cf.income)}</strong> a month.
          </p>
          <p className="mt-1.5">
            She spends <span className="num">{money(cf.expenses)}</span> a month{rent > 0 && <>, including <span className="num">{money(rent)}</span> rent</>}
            {family > 0 && <> and <span className="num">{money(family)}</span> sent to her parents</>}. She invests <span className="num">{money(cf.plannedInvestments)}</span> a month in SIPs and has{' '}
            <span className="num">{money(sheet.investments)}</span> invested so far.
          </p>
          {loans.length > 0 && (
            <p className="mt-1.5">
              She owes {loans.map((l, i) => (
                <span key={l.id}>
                  {i > 0 && (i === loans.length - 1 ? ' and ' : ', ')}
                  <span className="num">{rupees(l.balance)}</span> on her {l.label.toLowerCase()} ({formatPct(l.rate, 1)} a year)
                </span>
              ))}
              .
            </p>
          )}
        </Block>

        <Block title="What she’s planning">
          <ul className="flex flex-col gap-1">
            {goals.map((g) => (
              <li key={g.id} className="flex gap-2">
                <span className="num w-10 shrink-0 text-grey">{g.targetYear}</span>
                <span>
                  {g.name}, <span className="num">{formatCompact(g.cost)}</span> in today’s prices
                </span>
              </li>
            ))}
            {events.map((e) => (
              <li key={e.id} className="flex gap-2">
                <span className="num w-10 shrink-0 text-grey">{e.year}</span>
                <span>
                  {e.label}
                  {e.incomeChangePct ? <>, pay up {formatPct(e.incomeChangePct, 0)}</> : null}
                  {e.home ? <>, a <span className="num">{formatCompact(e.home.propertyValue)}</span> flat at {age(e.year)}</> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-grey">She wants to be financially independent by {p.about.fiAge}.</p>
        </Block>
      </div>

      <Block title={gaps.length ? 'Where her plan falls short' : 'Her plan now'}>
        {gaps.length ? (
          <>
            <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-champagne">
              {gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            <p className="mt-2">
              These gaps are there on purpose: they are the ones most first plans have. <strong className="font-semibold text-evergreen">Fix my plan</strong> tries {plan.fixes.length || 'each'} change
              {plan.fixes.length === 1 ? '' : 's'} on her projection and on simulated market paths, and shows what each one moves before you apply it.
            </p>
          </>
        ) : (
          <p>The gaps the demo started with are closed. Reset it from Settings to see them again.</p>
        )}
      </Block>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {plan.fixes.length > 0 && (
          <Button
            size="sm"
            onClick={() => {
              onAction?.();
              setFixOpen(true);
            }}
          >
            <Wand2 size={14} aria-hidden /> Fix my plan
          </Button>
        )}
        <ButtonLink to="/app/goals" size="sm" variant="secondary" onClick={onAction}>
          See her goals
        </ButtonLink>
        <ButtonLink to="/app/plan" size="sm" variant="secondary" onClick={onAction}>
          Her plan year by year
        </ButtonLink>
        <Link to="/start" className="link ml-auto inline-flex items-center gap-1 text-[13px] font-medium" onClick={onAction}>
          Build your own instead <ArrowRight size={13} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
