import { Link } from 'react-router-dom';
import { ArrowRight, Plus, Wand2 } from 'lucide-react';
import { useStore } from '@/state/store';
import { Button } from '@/components/ui/Button';
import { usePlan, useMoney } from '@/state/selectors';
import { Disclaimer, EmptyState, ButtonLink, Notice } from '@/components/ui';
import { TrajectoryPanel, AllocationPanel, FiPanel } from '@/features/overview/Panels';
import { KpiStrip, MonthWaterfall, NextStepsChecklist } from '@/features/overview/Kpis';
import { GoalTimeline } from '@/features/goals/GoalTimeline';
import { formatPct } from '@/finance/money';
import type { ReactNode } from 'react';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Dashboard card: a title row with a quiet link, then the body. */
function Card({ id, title, to, linkLabel, className = '', children }: { id: string; title: string; to?: string; linkLabel?: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`bezel flex flex-col ${className}`}>
      <div className="card-head">
        <h2 id={id} className="card-title">
          {title}
        </h2>
        {to && (
          <Link to={to} className="card-link">
            {linkLabel} <ArrowRight size={13} aria-hidden />
          </Link>
        )}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

export default function Overview() {
  const plan = usePlan();
  const money = useMoney();
  const { profile, cashflow: cf, sheet, headline, unfundedGoals, fi } = plan;
  const setFixOpen = useStore((s) => s.setFixOpen);
  const isDemo = useStore((s) => s.isDemo);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1.5 text-[12px] font-medium text-grey">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-evergreen sm:text-[28px]">
            {greeting()}
            {profile.about.name ? `, ${profile.about.name}` : ''}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-grey">
            You keep <strong className="font-semibold text-evergreen">{formatPct(cf.savingsRate, 0)}</strong> of your take-home after spending and EMIs. On today’s assumptions you reach{' '}
            <strong className="font-semibold text-evergreen">{money(headline.netWorthReal)}</strong> in today’s rupees by {headline.year}, at {headline.age}.
            {fi.fiAge !== null ? (
              <> Financial independence comes at <strong className="font-semibold text-evergreen">{fi.fiAge}</strong>{fi.fiAge <= fi.targetAge ? `, on or before your target of ${fi.targetAge}` : `, after your target of ${fi.targetAge}`}.</>
            ) : (
              <> By your FI target age of {fi.targetAge}, the plan reaches <strong className="font-semibold text-evergreen">{formatPct(fi.progress, 0)}</strong> of the corpus you would need.</>
            )}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink to="/app/goals?new=1" size="sm" variant="secondary">
              <Plus size={14} aria-hidden /> Add goal
            </ButtonLink>
            <Button size="sm" onClick={() => setFixOpen(true)}>
              <Wand2 size={14} aria-hidden /> Fix my plan
            </Button>
          </div>
          {isDemo && plan.fixes.length > 0 && <p className="text-[12.5px] text-grey">Riya’s plan has gaps. Try Fix my plan.</p>}
        </div>
      </header>

      <KpiStrip plan={plan} />

      {unfundedGoals.length > 0 &&
        (() => {
          // One warning at a time, pointing to the fix.
          const u = unfundedGoals[0];
          return (
            <Notice
              tone="error"
              title={u.droppedEvents.length || u.keptEvents.length ? `Your plan assumes the ${u.name} happens but doesn’t pay for it.` : `Your plan can’t pay for ${u.name} in ${u.year}.`}
              action={
                <Button size="sm" variant="secondary" onClick={() => setFixOpen(true)}>
                  Fix my plan
                </Button>
              }
            >
              {money(u.shortfall)} short in {u.year}.{' '}
              {u.keptEvents.length > 0
                ? `${u.keptEvents.join(' and ')} ${u.keptEvents.length === 1 ? 'is' : 'are'} still in the projection because you chose to keep ${u.keptEvents.length === 1 ? 'it' : 'them'}.`
                : u.droppedEvents.length > 0
                  ? `${u.droppedEvents.join(' and ')} ${u.droppedEvents.length === 1 ? 'has' : 'have'} been left out of the projection until the goal is paid for.`
                  : 'Allow a loan for the gap, move the date, or lower the cost.'}
              {unfundedGoals.length > 1 && ` ${unfundedGoals.length - 1} more goal${unfundedGoals.length > 2 ? 's are' : ' is'} short too.`}
            </Notice>
          );
        })()}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card id="traj-h" title={`Net worth to ${headline.year}`} to="/app/simulator" linkLabel="Inspect any year" className="lg:col-span-8">
          <TrajectoryPanel plan={plan} height={300} />
        </Card>
        <Card id="month-h" title="This month" to="/app/budget" linkLabel="Budget" className="lg:col-span-4">
          <MonthWaterfall plan={plan} />
          {cf.investableSurplus < 0 && <p className="mt-3 text-[13px] text-danger">You spend more than you earn. The projection covers the gap from savings.</p>}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card id="steps-h" title="Next steps" className="lg:col-span-7">
          <NextStepsChecklist plan={plan} />
        </Card>
        <Card id="goals-h" title="Goals" to="/app/goals" linkLabel="All goals" className="lg:col-span-5">
          {plan.goals.goals.length ? (
            <GoalTimeline goals={plan.goalViews} />
          ) : (
            <EmptyState
              art="goals"
              title="No goals yet"
              action={
                <ButtonLink to="/app/goals?new=1" size="sm">
                  Add a goal
                </ButtonLink>
              }
            >
              Add a degree, a car or a home to see its cost in the year you need it and how your plan pays for it.
            </EmptyState>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="fi-h" title="Financial independence" to="/app/fi" linkLabel="Details">
          <FiPanel plan={plan} />
        </Card>
        <Card id="alloc-h" title="Asset allocation" to="/app/portfolio" linkLabel="Portfolio">
          {sheet.investments > 0 ? (
            <AllocationPanel plan={plan} />
          ) : (
            <EmptyState
              art="portfolio"
              title="No investments yet"
              action={
                <ButtonLink to="/app/portfolio" size="sm">
                  Set a target mix
                </ButtonLink>
              }
            >
              Your target mix still sets the return assumed for future SIPs.
            </EmptyState>
          )}
        </Card>
      </div>

      <Disclaimer>
        Projections use your inputs and editable assumptions: {formatPct(plan.assumptions.inflation)} inflation, {formatPct(profile.income.salaryGrowth)} salary growth and a {formatPct(plan.portfolioReturn)} portfolio return after fund costs. They are not guarantees or investment advice.
      </Disclaimer>
    </div>
  );
}
