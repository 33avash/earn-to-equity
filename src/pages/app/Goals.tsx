import { useState } from 'react';
import { Pencil, Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import type { Goal } from '@/types/profile';
import { goalStatusLabel, usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Stat, Notice, Badge, Button, Slider, EmptyState, Disclaimer, confirmAction, toast, type BadgeTone } from '@/components/ui';
import { GoalForm, GOAL_CATEGORIES, PRIORITY_LABEL, newGoal } from '@/features/editors/GoalForm';
import { analyzeGoal, type GoalAnalysis, type GoalStatus } from '@/finance/goals';
import { FUNDING_MODE_LABELS, goalFundingMode, goalLoanTerms } from '@/finance/goalFunding';
import { formatINR, formatMonths, formatPct } from '@/finance/money';
import { FundingBar, PLAN_STATUS } from '@/features/goals/GoalTimeline';

/** Status of the dedicated-savings view (a monthly amount set aside per goal). Secondary to the whole-plan status. */
const DEDICATED: Record<GoalStatus, { label: string; tone: BadgeTone }> = {
  funded: { label: 'Already saved', tone: 'good' },
  'on-track': { label: 'On track', tone: 'good' },
  'at-risk': { label: 'At risk', tone: 'warn' },
  shortfall: { label: 'Short', tone: 'bad' },
  overdue: { label: 'Overdue', tone: 'bad' },
};

function Explorer({ a, onApply, onClose }: { a: GoalAnalysis; onApply: (g: Goal) => void; onClose: () => void }) {
  const plan = usePlan();
  const money = useMoney();
  const [delay, setDelay] = useState(0);
  const [reduce, setReduce] = useState(0);
  const [extra, setExtra] = useState(0);
  const modified: Goal = { ...a.goal, targetYear: a.goal.targetYear + delay, cost: a.goal.cost * (1 - reduce) };
  const probe = analyzeGoal(modified, 0, plan.profile, plan.assumptions);
  const allocated = Math.min(probe.requiredMonthly, a.allocatedMonthly + extra);
  const r = analyzeGoal(modified, allocated, plan.profile, plan.assumptions);

  return (
    <div className="panel mt-4 p-5 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold">Explore options for “{a.goal.name}”</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Slider label="Delay the goal" value={delay} min={0} max={10} step={1} onChange={setDelay} format={(v) => (v === 0 ? 'No delay' : `+${v} yr${v > 1 ? 's' : ''} (${a.goal.targetYear + v})`)} />
          <Slider label="Reduce the cost" value={reduce} min={0} max={0.5} step={0.05} onChange={setReduce} format={(v) => (v === 0 ? 'No change' : `−${formatPct(v, 0)}`)} />
          <Slider label="Set aside more each month" value={extra} min={0} max={Math.max(20000, Math.ceil(a.requiredMonthly / 1000) * 1000 || 20000)} step={500} onChange={setExtra} format={(v) => `+${formatINR(v)}`} />
        </div>
        <div>
          <p className="eyebrow mb-4">Dedicated savings for this goal</p>
          <div className="grid grid-cols-2 gap-6">
            <Stat label="Future cost" value={money(r.futureCost)} size="sm" sub={`${money(modified.cost)} today`} />
            <Stat label="Needed monthly" value={Number.isFinite(r.requiredMonthly) ? money(r.requiredMonthly) : '—'} size="sm" />
            <Stat label="Set aside" value={money(r.allocatedMonthly)} size="sm" sub={extra > 0 ? `incl. +${money(extra)}` : 'from current surplus'} />
            <Stat label="Saved up by" value={r.status === 'funded' ? 'Already' : r.completionYear ? String(Math.ceil(r.completionYear)) : `After ${plan.profile.planStartYear + 50}`} size="sm" />
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Badge tone={DEDICATED[r.status].tone}>{DEDICATED[r.status].label}</Badge>
            {r.shortfallMonthly > 0 && Number.isFinite(r.shortfallMonthly) && <span className="num text-sm text-grey">Still short by {money(r.shortfallMonthly)}/month</span>}
          </div>
          {extra > 0 && <p className="mt-3 text-xs text-grey">Extra contributions must come from somewhere: lower spending, a raise or another goal. Check the Budget Planner.</p>}
          <Button className="mt-6" variant="secondary" disabled={delay === 0 && reduce === 0} onClick={() => onApply(modified)}>
            Apply date & cost changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Goals() {
  const plan = usePlan();
  const money = useMoney();
  const update = useStore((s) => s.updateProfile);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [exploring, setExploring] = useState<string | null>(null);
  const { goals: summary, profile: p, goalViews } = plan;

  const save = (g: Goal) => {
    const isNew = !p.goals.some((x) => x.id === g.id);
    update((x) => {
      const i = x.goals.findIndex((y) => y.id === g.id);
      if (i >= 0) x.goals[i] = g;
      else x.goals.push(g);
    });
    setEditing(null);
    toast(isNew ? `Added “${g.name}”` : `Updated “${g.name}”`);
  };
  const remove = async (g: Goal) => {
    const ok = await confirmAction({ title: `Delete “${g.name}”?`, body: 'This removes the goal from your plan and every projection. This cannot be undone.', confirmLabel: 'Delete goal', danger: true });
    if (!ok) return;
    update((x) => {
      x.goals = x.goals.filter((y) => y.id !== g.id);
      for (const e of x.lifeEvents) if (e.goalId === g.id) delete e.goalId;
    });
    toast(`Deleted “${g.name}”`);
  };
  const counts = { paid: goalViews.filter((v) => v.status === 'funded').length, loan: goalViews.filter((v) => v.status === 'financed').length, unpaid: goalViews.filter((v) => v.status === 'unfunded').length };
  const ordered = [...goalViews].sort((a, b) => a.goal.priority - b.goal.priority || a.goal.targetYear - b.goal.targetYear);
  const linkedEvents = (id: string) => p.lifeEvents.filter((e) => e.goalId === id).map((e) => e.label);

  return (
    <div className="flex flex-col gap-12">
      <PageHeader
        title="Goals Planner"
        description="Goals are entered in today’s prices and inflated to their target year. In that year your plan pays for each one from savings, a loan, or both, depending on how you chose to fund it."
        actions={
          !editing && (
            <Button icon={<Plus size={16} />} onClick={() => setEditing(newGoal('education', p.planStartYear))}>
              Add goal
            </Button>
          )
        }
      />

      {editing && (
        <div className="panel p-5 sm:p-6">
          <h2 className="mb-5 text-[15px] font-semibold">{p.goals.some((g) => g.id === editing.id) ? `Edit “${editing.name}”` : 'New goal'}</h2>
          <GoalForm initial={editing} startYear={p.planStartYear} onSave={save} onCancel={() => setEditing(null)} linkedEvents={linkedEvents(editing.id)} />
        </div>
      )}

      {p.goals.length > 0 && (
        <dl className="grid grid-cols-2 gap-8 border-y border-line py-6 lg:grid-cols-4">
          <Stat label="Paid from savings" value={`${counts.paid} of ${p.goals.length}`} />
          <Stat label="Need a loan" value={String(counts.loan)} />
          <Stat label="Unpaid" value={String(counts.unpaid)} tone={counts.unpaid > 0 ? 'negative' : undefined} />
          <Stat label="Monthly surplus" value={money(summary.capacity)} def="surplus" sub={`Dedicated plans need ${money(summary.totalRequired)}`} />
        </dl>
      )}

      {plan.unfundedGoals.length > 0 && (
        <Notice tone="error" title={`${plan.unfundedGoals.map((u) => u.name).join(', ')} can’t be paid for`}>
          Your savings won’t cover {plan.unfundedGoals.length === 1 ? 'it' : 'them'} in the target year. Allow a loan, move the date, or lower the cost.
        </Notice>
      )}

      {p.goals.length === 0 && !editing ? (
        <EmptyState title="No goals yet" action={<Button icon={<Plus size={16} />} onClick={() => setEditing(newGoal('education', p.planStartYear))}>Add your first goal</Button>}>
          A degree, a car, a wedding, a home, or time off to start something. Add one to see its cost in the year you need it and how your plan pays for it.
        </EmptyState>
      ) : (
        <Section title="Your goals" description="Sorted by priority, then by date.">
          <ul>
            {ordered.map((v) => {
              const a = v.analysis;
              const g = v.goal;
              const mode = goalFundingMode(g);
              const terms = goalLoanTerms(g);
              return (
                <li key={g.id} className="border-t border-line py-6 last:border-b">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-evergreen">{g.name}</h3>
                        <Badge tone={PLAN_STATUS[v.status].tone}>{PLAN_STATUS[v.status].label}</Badge>
                        <Badge>{PRIORITY_LABEL[g.priority]} priority</Badge>
                      </div>
                      <p className="mt-1 text-[13px] text-grey">
                        {GOAL_CATEGORIES[g.category].label}, target {g.targetYear} ({a.months > 0 ? `in ${formatMonths(a.months)}` : 'now'}), {formatPct(g.inflation)} cost inflation. {FUNDING_MODE_LABELS[mode]}
                        {mode !== 'savings' && ` at ${formatPct(terms.rate)} over ${terms.tenureYears} years${terms.moratoriumMonths ? ` after a ${terms.moratoriumMonths}-month moratorium` : ''}`}.
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" icon={<SlidersHorizontal size={14} />} onClick={() => setExploring(exploring === g.id ? null : g.id)} aria-expanded={exploring === g.id}>
                        Explore options
                      </Button>
                      <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setEditing(g)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => remove(g)} aria-label={`Delete ${g.name}`}>
                        Delete
                      </Button>
                    </div>
                  </div>

                  <p className={`mt-4 text-sm font-medium ${v.status === 'unfunded' ? 'text-danger' : 'text-evergreen'}`}>{goalStatusLabel(v, money)}</p>
                  {v.outcome && (
                    <div className="mt-3 max-w-xl">
                      <FundingBar view={v} />
                    </div>
                  )}
                  <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
                    <Stat size="sm" label="Cost today" value={money(g.cost)} />
                    <Stat size="sm" label={`Cost in ${g.targetYear}`} value={money(v.outcome?.cost ?? a.futureCost)} def="futureCost" />
                    <Stat
                      size="sm"
                      label={v.status === 'unfunded' ? 'Savings available' : 'From savings'}
                      value={v.outcome ? money(v.status === 'unfunded' ? v.outcome.cost - v.outcome.shortfall : v.outcome.fromSavings) : '—'}
                      sub={v.status === 'unfunded' ? 'not enough, so nothing is paid' : undefined}
                    />
                    <Stat size="sm" label="Loan" value={v.outcome ? money(v.outcome.loan) : '—'} />
                    <Stat size="sm" label="Unpaid" value={v.outcome ? money(v.outcome.shortfall) : '—'} tone={v.outcome && v.outcome.shortfall > 0 ? 'negative' : undefined} />
                  </dl>

                  <details className="group mt-5">
                    <summary className="tap flex cursor-pointer items-center text-[13px] font-medium text-forest">Dedicated savings view</summary>
                    <p className="mt-2 max-w-2xl text-xs text-grey">If you set money aside for this goal alone, in priority order from your monthly surplus. Useful for sizing a goal-specific SIP. Your plan’s status above comes from the full projection.</p>
                    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
                      <Stat size="sm" label="Saved" value={money(g.saved)} sub={`grows to ${money(a.fvSaved)}`} />
                      <Stat size="sm" label="Covered so far" value={formatPct(a.fundedPct, 0)} def="fundedPct" />
                      <Stat size="sm" label="Needed monthly" value={Number.isFinite(a.requiredMonthly) ? money(a.requiredMonthly) : '—'} />
                      <Stat size="sm" label="Set aside" value={money(a.allocatedMonthly)} sub={a.shortfallMonthly > 0 && Number.isFinite(a.shortfallMonthly) ? <span className="text-danger">short {money(a.shortfallMonthly)}</span> : undefined} />
                      <Stat size="sm" label="Dedicated status" value={<Badge tone={DEDICATED[a.status].tone}>{DEDICATED[a.status].label}</Badge>} />
                    </dl>
                  </details>

                  {exploring === g.id && (
                    <Explorer
                      a={a}
                      onClose={() => setExploring(null)}
                      onApply={(next) => {
                        save(next);
                        setExploring(null);
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Disclaimer>
        Each goal is paid in its target year from cash and investments above your emergency reserve, from a loan, or both. Loan EMIs and interest flow into every projection. Future rupee amounts are nominal; today’s cost shows current purchasing power.
      </Disclaimer>
    </div>
  );
}
