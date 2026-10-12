import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { Stat, Section, Disclaimer, EmptyState, ButtonLink } from '@/components/ui';
import { TrajectoryPanel, AllocationPanel, FiPanel, NextStepsPanel } from '@/features/overview/Panels';
import { CashflowBar } from '@/components/charts/Bars';
import { useChartTheme } from '@/components/charts/theme';
import { GoalTimeline } from '@/features/goals/GoalTimeline';
import { formatPct } from '@/finance/money';
import { AnimatedNumber } from '@/components/motion/Motion';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Overview() {
  const plan = usePlan();
  const money = useMoney();
  const t = useChartTheme();
  const isDemo = useStore((s) => s.isDemo);
  const { profile, cashflow: cf, sheet, emergency: ef, final, health } = plan;

  const parts = [
    { key: 'ess', label: 'Essential', value: cf.essential, color: t.dark ? '#5A8BD0' : '#3F6FA8' },
    { key: 'life', label: 'Lifestyle', value: cf.lifestyle, color: t.dark ? '#A07ACB' : '#8B5FB0' },
    { key: 'debt', label: 'Debt repayments', value: cf.debtPayments, color: t.dark ? '#D0674C' : '#C0573E' },
    { key: 'inv', label: 'Investments', value: Math.min(cf.plannedInvestments, Math.max(0, cf.investableSurplus)), color: t.dark ? '#2FA578' : '#138A5F' },
    { key: 'sav', label: 'Savings', value: Math.min(cf.plannedSavings, Math.max(0, cf.investableSurplus - cf.plannedInvestments)), color: t.dark ? '#B88428' : '#C08A2E' },
    { key: 'free', label: 'Unallocated', value: cf.unallocated, color: t.muted },
  ];

  return (
    <div className="flex flex-col gap-16">
      <header className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="eyebrow">{isDemo ? 'Demo overview' : 'Overview'} · {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          <h1 className="display mt-3 text-[36px] leading-[1.02] tracking-[-0.02em] sm:text-[48px]">
            {greeting()}
            {profile.about.name ? `, ${profile.about.name}` : ''}.
          </h1>
          <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-grey">
            You keep <strong className="num font-semibold text-evergreen">{formatPct(cf.savingsRate, 0)}</strong> of what you earn after spending and repayments. On today’s assumptions, that grows to{' '}
            <strong className="num font-semibold text-evergreen">{money(final.netWorthReal)}</strong> in today’s rupees by {final.year + 1}.
          </p>
        </div>
        <div className="lg:col-span-5 lg:border-l lg:border-line lg:pl-10">
          <Stat label="Net worth today" value={<AnimatedNumber value={sheet.netWorth} format={money} />} size="xl" def="netWorth" tone={sheet.netWorth < 0 ? 'negative' : undefined} />
          <p className="mt-3 text-[13px] text-grey">
            <span className="num font-medium text-charcoal">{money(sheet.totalAssets)}</span> owned − <span className="num font-medium text-charcoal">{money(sheet.liabilities)}</span> owed
          </p>
        </div>
      </header>

      <Section title="Wealth trajectory" description="Net worth, year by year, from the engine every page shares." actions={<Link to="/app/simulator" className="inline-flex items-center gap-1 text-sm font-medium text-forest hover:underline">Inspect any year <ArrowRight size={14} /></Link>}>
        <TrajectoryPanel plan={plan} height={320} />
      </Section>

      {/* This month, written as an equation rather than a row of identical cards */}
      <section aria-labelledby="month-h" className="grid gap-10 border-y border-line py-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2 id="month-h" className="eyebrow">This month</h2>
          <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-4">
            <Stat label="Income" value={<AnimatedNumber value={cf.income} format={money} />} def="income" />
            <span aria-hidden className="pb-1 text-2xl font-light text-grey">−</span>
            <Stat label="Spending" value={<AnimatedNumber value={cf.expenses} format={money} />} def="expenses" />
            <span aria-hidden className="pb-1 text-2xl font-light text-grey">−</span>
            <Stat label="Repayments" value={<AnimatedNumber value={cf.debtPayments} format={money} />} def="Monthly EMIs and minimum card payments." />
            <span aria-hidden className="pb-1 text-2xl font-light text-grey">=</span>
            <div className="rounded-md bg-mint/70 px-4 py-3">
              <Stat label="Left to invest" value={<AnimatedNumber value={cf.investableSurplus} format={money} />} def="surplus" tone={cf.investableSurplus < 0 ? 'negative' : undefined} />
            </div>
          </div>
          <p className="mt-5 max-w-xl text-[13px] leading-relaxed text-grey">
            {cf.investableSurplus < 0
              ? 'You are spending more than you earn. The projection covers the gap from savings, so start with the Budget Planner.'
              : `${money(cf.plannedInvestments)} goes to SIPs and ${money(cf.plannedSavings)} to savings${cf.unallocated > 0 ? `, which leaves ${money(cf.unallocated)} without a job` : ''}.`}{' '}
            <Link to="/app/budget" className="link">Adjust budget</Link>
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-6 lg:col-span-4 lg:grid-cols-1 lg:gap-5 lg:border-l lg:border-line lg:pl-10">
          <div>
            <dt className="text-xs text-grey">Emergency cover</dt>
            <dd className="num mt-0.5 text-lg font-semibold text-evergreen">{ef.coverageMonths === Infinity ? '—' : ef.coverageMonths.toFixed(1)} <span className="text-sm font-normal text-grey">of {ef.targetMonths} months</span></dd>
          </div>
          <div>
            <dt className="text-xs text-grey">Portfolio</dt>
            <dd className="num mt-0.5 text-lg font-semibold text-evergreen">{money(sheet.investments)} <span className="text-sm font-normal text-grey">at {formatPct(plan.portfolioReturn)}</span></dd>
          </div>
          <div>
            <dt className="text-xs text-grey">Health score</dt>
            <dd className="num mt-0.5 text-lg font-semibold text-evergreen">
              {Math.round(health.score)} <Link to="/app/health" className="text-sm font-normal text-forest hover:underline">breakdown</Link>
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-14 lg:grid-cols-2">
        <Section title="Asset allocation" actions={<Link to="/app/portfolio" className="text-sm font-medium text-forest hover:underline">Portfolio Builder</Link>}>
          {sheet.investments > 0 ? (
            <AllocationPanel plan={plan} />
          ) : (
            <EmptyState title="No investments yet" action={<ButtonLink to="/app/portfolio" size="sm" variant="secondary">Set a target allocation</ButtonLink>}>
              Your target allocation still shapes the returns assumed for future contributions.
            </EmptyState>
          )}
        </Section>
        <Section title="Monthly cash flow" actions={<Link to="/app/budget" className="text-sm font-medium text-forest hover:underline">Budget Planner</Link>}>
          <CashflowBar parts={parts} total={cf.income} />
          <p className="mt-4 text-xs text-grey">Investments and savings are transfers to your future self, not expenses.</p>
        </Section>
      </div>

      <div className="grid gap-14 lg:grid-cols-2">
        <Section title="Goals" actions={<Link to="/app/goals" className="text-sm font-medium text-forest hover:underline">Goals Planner</Link>}>
          {plan.goals.goals.length ? (
            <GoalTimeline goals={plan.goals.goals} compact />
          ) : (
            <EmptyState title="No goals yet" action={<ButtonLink to="/app/goals" size="sm" variant="secondary">Add a goal</ButtonLink>}>
              Add what you’re working towards to see the true future cost and what it takes to fund it.
            </EmptyState>
          )}
        </Section>
        <Section title="Financial independence" actions={<Link to="/app/fi" className="text-sm font-medium text-forest hover:underline">Details</Link>}>
          <FiPanel plan={plan} />
        </Section>
      </div>

      <Section title="Your next steps" description="Prioritised from your own figures. Each one links to the tool that helps.">
        <NextStepsPanel plan={plan} limit={5} />
      </Section>

      <Disclaimer>
        Projections are illustrative estimates based on your inputs and editable assumptions ({formatPct(plan.assumptions.inflation)} inflation, {formatPct(profile.income.salaryGrowth)} salary growth, {formatPct(plan.portfolioReturn)} portfolio return). They are not guarantees or investment advice.
      </Disclaimer>
    </div>
  );
}
