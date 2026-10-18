import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { Section, Disclaimer, EmptyState, ButtonLink, Notice } from '@/components/ui';
import { TrajectoryPanel, AllocationPanel, FiPanel } from '@/features/overview/Panels';
import { KpiStrip, MonthWaterfall, NextStepsChecklist } from '@/features/overview/Kpis';
import { GoalTimeline } from '@/features/goals/GoalTimeline';
import { formatPct } from '@/finance/money';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const sectionLink = 'hit inline-flex items-center gap-1 text-sm font-medium text-forest hover:underline';

export default function Overview() {
  const plan = usePlan();
  const money = useMoney();
  const isDemo = useStore((s) => s.isDemo);
  const { profile, cashflow: cf, sheet, headline, unfundedGoals } = plan;

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="eyebrow">
          {isDemo ? 'Demo plan' : 'Overview'}, {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
        <h1 className="display mt-2 text-[30px] leading-tight sm:text-[36px]">
          {greeting()}
          {profile.about.name ? `, ${profile.about.name}` : ''}.
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-grey">
          You keep <strong className="font-semibold text-evergreen">{formatPct(cf.savingsRate, 0)}</strong> of your take-home after spending and EMIs. On today’s assumptions you reach{' '}
          <strong className="font-semibold text-evergreen">{money(headline.netWorthReal)}</strong> in today’s rupees by {headline.year}, at {headline.age}.
        </p>
      </header>

      <KpiStrip plan={plan} />

      {unfundedGoals.map((u) => (
        <Notice
          key={u.goalId}
          tone="error"
          title={u.droppedEvents.length || u.keptEvents.length ? `Your plan assumes the ${u.name} happens but doesn’t pay for it.` : `Your plan can’t pay for ${u.name} in ${u.year}.`}
          action={
            <ButtonLink to="/app/goals" size="sm" variant="secondary">
              Fix in Goals
            </ButtonLink>
          }
        >
          {money(u.shortfall)} short in {u.year}.{' '}
          {u.keptEvents.length > 0
            ? `${u.keptEvents.join(' and ')} ${u.keptEvents.length === 1 ? 'is' : 'are'} still in the projection because you chose to keep ${u.keptEvents.length === 1 ? 'it' : 'them'}.`
            : u.droppedEvents.length > 0
              ? `${u.droppedEvents.join(' and ')} ${u.droppedEvents.length === 1 ? 'has' : 'have'} been left out of the projection until the goal is paid for.`
              : 'Allow a loan for the gap, move the date, or lower the cost.'}
        </Notice>
      ))}

      <div className="grid gap-6 lg:grid-cols-12">
        <section aria-labelledby="traj-h" className="rounded-lg border border-line bg-surface p-5 lg:col-span-8">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="traj-h" className="text-[15px] font-semibold tracking-tight">
              Net worth to {headline.year}
            </h2>
            <Link to="/app/simulator" className={sectionLink}>
              Inspect any year <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          <TrajectoryPanel plan={plan} height={300} />
        </section>
        <section aria-labelledby="month-h" className="rounded-lg border border-line bg-surface p-5 lg:col-span-4">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 id="month-h" className="text-[15px] font-semibold tracking-tight">
              This month
            </h2>
            <Link to="/app/budget" className={sectionLink}>
              Budget
            </Link>
          </div>
          <MonthWaterfall plan={plan} />
          {cf.investableSurplus < 0 && <p className="mt-3 text-[13px] text-danger">You spend more than you earn. The projection covers the gap from savings.</p>}
        </section>
      </div>

      <Section title="Next steps" description="From your own figures. Tick them off as you go.">
        <NextStepsChecklist plan={plan} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Goals"
          actions={
            <Link to="/app/goals" className={sectionLink}>
              Goals
            </Link>
          }
        >
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
        </Section>
        <Section
          title="Financial independence"
          actions={
            <Link to="/app/fi" className={sectionLink}>
              Details
            </Link>
          }
        >
          <FiPanel plan={plan} />
        </Section>
      </div>

      <Section
        title="Asset allocation"
        actions={
          <Link to="/app/portfolio" className={sectionLink}>
            Portfolio
          </Link>
        }
      >
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
      </Section>

      <Disclaimer>
        Projections use your inputs and editable assumptions: {formatPct(plan.assumptions.inflation)} inflation, {formatPct(profile.income.salaryGrowth)} salary growth and a {formatPct(plan.portfolioReturn)} portfolio return after fund costs. They are not guarantees or investment advice.
      </Disclaimer>
    </div>
  );
}
