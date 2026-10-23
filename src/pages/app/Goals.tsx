import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Reorder, motion, useDragControls } from 'motion/react';
import { GripVertical, Pencil, Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import type { Goal } from '@/types/profile';
import { goalStatusLabel, usePlan, useMoney, type GoalPlanStatus, type GoalView } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Stat, Notice, Badge, Button, Slider, EmptyState, Disclaimer, Segmented, confirmAction, toast, type BadgeTone } from '@/components/ui';
import { GoalForm, GOAL_CATEGORIES, PRIORITY_LABEL, newGoal } from '@/features/editors/GoalForm';
import { analyzeGoal, fundingOrder, reorderGoals, type GoalAnalysis, type GoalStatus } from '@/finance/goals';
import { FUNDING_MODE_LABELS, goalFundingMode, goalLoanTerms } from '@/finance/goalFunding';
import { formatINR, formatMonths, formatPct } from '@/finance/money';
import { FundingBar, GoalTimeline, PLAN_STATUS } from '@/features/goals/GoalTimeline';

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
    <div className="bezel mt-6 p-5 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold">Explore options for “{a.goal.name}”</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
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

type CardProps = {
  v: GoalView;
  money: (n: number) => string;
  exploring: boolean;
  onExplore: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onApply: (g: Goal) => void;
  dragHandle?: ReactNode;
};

function GoalCard({ v, money, exploring, onExplore, onEdit, onDelete, onApply, dragHandle }: CardProps) {
  const a = v.analysis;
  const g = v.goal;
  const mode = goalFundingMode(g);
  const terms = goalLoanTerms(g);
  return (
    <article id={`goal-${g.id}`} className="well scroll-mt-28 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          {dragHandle}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[17px] font-semibold text-evergreen">{g.name}</h3>
              <Badge tone={PLAN_STATUS[v.status].tone}>{PLAN_STATUS[v.status].label}</Badge>
              <Badge>{PRIORITY_LABEL[g.priority]} priority</Badge>
            </div>
            <p className="mt-1 text-[13px] text-grey">
              {GOAL_CATEGORIES[g.category].label}, target {g.targetYear} ({a.months > 0 ? `in ${formatMonths(a.months)}` : 'now'}), {formatPct(g.inflation)} cost inflation. {FUNDING_MODE_LABELS[mode]}
              {mode !== 'savings' && ` at ${formatPct(terms.rate)} over ${terms.tenureYears} years${terms.moratoriumMonths ? ` after a ${terms.moratoriumMonths}-month moratorium` : ''}`}.
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" icon={<SlidersHorizontal size={14} />} onClick={onExplore} aria-expanded={exploring}>
            Explore options
          </Button>
          <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={onDelete} aria-label={`Delete ${g.name}`}>
            Delete
          </Button>
        </div>
      </div>

      <p className={`mt-4 text-sm font-medium ${v.status === 'unfunded' ? 'text-danger' : 'text-evergreen'}`}>{goalStatusLabel(v, money)}</p>
      {v.outcome && (
        <div className="mt-3 max-w-xl">
          <FundingBar view={v} />
          <p className="mt-1.5 flex flex-wrap gap-x-4 text-[11.5px] text-grey">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-forest" aria-hidden />
              Savings
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-champagne" aria-hidden />
              Loan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger" aria-hidden />
              Gap
            </span>
          </p>
        </div>
      )}
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
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
      </div>

      <details className="group mt-5">
        <summary className="tap flex cursor-pointer items-center text-[13px] font-medium text-forest">Dedicated savings view</summary>
        <p className="mt-2 max-w-2xl text-xs text-grey">If you set money aside for this goal alone, in funding order from your monthly surplus. Useful for sizing a goal-specific SIP. The status above comes from the full projection.</p>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
          <Stat size="sm" label="Saved" value={money(g.saved)} sub={`grows to ${money(a.fvSaved)}`} />
          <Stat size="sm" label="Covered so far" value={formatPct(a.fundedPct, 0)} def="fundedPct" />
          <Stat size="sm" label="Needed monthly" value={Number.isFinite(a.requiredMonthly) ? money(a.requiredMonthly) : '—'} />
          <Stat size="sm" label="Set aside" value={money(a.allocatedMonthly)} sub={a.shortfallMonthly > 0 && Number.isFinite(a.shortfallMonthly) ? <span className="text-danger">short {money(a.shortfallMonthly)}</span> : undefined} />
          <Stat size="sm" label="Dedicated status" value={<Badge tone={DEDICATED[a.status].tone}>{DEDICATED[a.status].label}</Badge>} />
        </div>
      </details>

      {exploring && <Explorer a={a} onClose={onExplore} onApply={onApply} />}
    </article>
  );
}

/** A draggable goal card. Only the grip starts a drag, so the buttons on the card still work. */
function DraggableGoal(props: Omit<CardProps, 'dragHandle'> & { onDragEnd: () => void }) {
  const controls = useDragControls();
  const { onDragEnd, ...card } = props;
  return (
    <Reorder.Item value={props.v.goal.id} dragListener={false} dragControls={controls} onDragEnd={onDragEnd} className="list-none" layout>
      <GoalCard
        {...card}
        dragHandle={
          <button
            type="button"
            onPointerDown={(e) => controls.start(e)}
            className="hit mt-0.5 cursor-grab touch-none rounded-sm text-grey hover:text-evergreen active:cursor-grabbing"
            aria-label={`Drag to reorder ${props.v.goal.name}`}
          >
            <GripVertical size={18} aria-hidden />
          </button>
        }
      />
    </Reorder.Item>
  );
}

type View = 'list' | 'board' | 'timeline';
const BOARD: { status: GoalPlanStatus[]; title: string }[] = [
  { status: ['funded'], title: 'Paid from savings' },
  { status: ['financed'], title: 'Loan needed' },
  { status: ['unfunded'], title: 'Unpaid' },
  { status: ['beyond', 'corpus'], title: 'Later or tracked' },
];

export default function Goals() {
  const plan = usePlan();
  const money = useMoney();
  const update = useStore((s) => s.updateProfile);
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const [editing, setEditing] = useState<Goal | null>(null);
  const [exploring, setExploring] = useState<string | null>(null);
  const [view, setView] = useState<View>('list');
  const { goals: summary, profile: p, goalViews } = plan;
  const ordered = useMemo(() => [...goalViews].sort((a, b) => fundingOrder(a.goal, b.goal)), [goalViews]);
  const [order, setOrder] = useState<string[]>(() => ordered.map((v) => v.goal.id));
  useEffect(() => setOrder(ordered.map((v) => v.goal.id)), [ordered]);

  // The command palette's "Add goal" opens the form; "#goal-…" scrolls to a goal.
  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing(newGoal('education', p.planStartYear));
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams, p.planStartYear]);
  useEffect(() => {
    if (hash.startsWith('#goal-')) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

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
  const commitOrder = () => {
    if (order.join() === ordered.map((v) => v.goal.id).join()) return;
    update((x) => void (x.goals = reorderGoals(x.goals, order)));
    toast('Funding order updated');
  };
  const counts = { paid: goalViews.filter((v) => v.status === 'funded').length, loan: goalViews.filter((v) => v.status === 'financed').length, unpaid: goalViews.filter((v) => v.status === 'unfunded').length };
  const linkedEvents = (id: string) => p.lifeEvents.filter((e) => e.goalId === id).map((e) => e.label);
  const cardProps = (v: GoalView) => ({
    v,
    money,
    exploring: exploring === v.goal.id,
    onExplore: () => setExploring(exploring === v.goal.id ? null : v.goal.id),
    onEdit: () => setEditing(v.goal),
    onDelete: () => remove(v.goal),
    onApply: (next: Goal) => {
      save(next);
      setExploring(null);
    },
  });
  const byId = new Map(goalViews.map((v) => [v.goal.id, v]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Goals"
        description="Enter each goal in today’s prices. In its target year your plan pays for it from savings, a loan, or both, depending on how you fund it."
        actions={
          !editing && (
            <Button icon={<Plus size={16} />} onClick={() => setEditing(newGoal('education', p.planStartYear))}>
              Add goal
            </Button>
          )
        }
      />

      {editing && (
        <div className="bezel p-5 sm:p-6">
          <h2 className="mb-8 text-[22px] font-semibold tracking-[-0.02em]">{p.goals.some((g) => g.id === editing.id) ? `Edit “${editing.name}”` : 'New goal'}</h2>
          <GoalForm initial={editing} startYear={p.planStartYear} onSave={save} onCancel={() => setEditing(null)} linkedEvents={linkedEvents(editing.id)} />
        </div>
      )}

      {p.goals.length > 0 && (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          <div className="bezel p-5 sm:p-6">
            <Stat label="Paid from savings" value={`${counts.paid} of ${p.goals.length}`} />
          </div>
          <div className="bezel p-5 sm:p-6">
            <Stat label="Need a loan" value={String(counts.loan)} />
          </div>
          <div className="bezel p-5 sm:p-6">
            <Stat label="Unpaid" value={String(counts.unpaid)} tone={counts.unpaid > 0 ? 'negative' : undefined} />
          </div>
          <div className="bezel p-5 sm:p-6">
            <Stat label="Monthly surplus" value={money(summary.capacity)} def="surplus" sub={`Dedicated plans need ${money(summary.totalRequired)}`} />
          </div>
        </div>
      )}

      {plan.unfundedGoals.length > 0 && (
        <Notice tone="error" title={`${plan.unfundedGoals.map((u) => u.name).join(', ')} can’t be paid for`}>
          Your savings won’t cover {plan.unfundedGoals.length === 1 ? 'it' : 'them'} in the target year. Allow a loan, move the date, or lower the cost.
        </Notice>
      )}

      {p.goals.length === 0 && !editing ? (
        <EmptyState
          art="goals"
          title="No goals yet"
          action={
            <Button icon={<Plus size={16} />} onClick={() => setEditing(newGoal('education', p.planStartYear))}>
              Add your first goal
            </Button>
          }
        >
          A degree, a car, a wedding or a home. Add one to see its cost in the year you need it and how your plan pays for it.
        </EmptyState>
      ) : (
        <Section
          title="Your goals"
          description={view === 'list' ? 'In funding order. Drag the grip to change which goal gets money first.' : view === 'board' ? 'Grouped by how your plan pays for each one.' : 'In date order.'}
          actions={
            <Segmented<View>
              label="Goals view"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: 'Priority' },
                { value: 'board', label: 'Board' },
                { value: 'timeline', label: 'Timeline' },
              ]}
            />
          }
        >
          {view === 'list' && (
            <Reorder.Group axis="y" values={order} onReorder={setOrder} className="flex flex-col gap-3">
              {order.map((id) => {
                const v = byId.get(id);
                return v ? <DraggableGoal key={id} {...cardProps(v)} onDragEnd={commitOrder} /> : null;
              })}
            </Reorder.Group>
          )}
          {view === 'board' && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {BOARD.map((col) => {
                const items = ordered.filter((v) => col.status.includes(v.status));
                return (
                  <section key={col.title} aria-label={col.title} className="well p-3">
                    <h3 className="mb-3 flex items-center justify-between px-1 text-[13px] font-medium text-evergreen">
                      {col.title}
                      <span className="num text-grey">{items.length}</span>
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {items.map((v) => (
                        <motion.li layout key={v.goal.id} className="rounded-xl bg-surface p-4 shadow-[0_0_0_1px_var(--shell-line),var(--shadow-sm)]">
                          <button type="button" className="w-full text-left" onClick={() => setEditing(v.goal)}>
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="text-[14px] font-medium text-evergreen">{v.goal.name}</span>
                              <span className="num text-xs text-grey">{v.goal.targetYear}</span>
                            </span>
                            <span className="mt-2 block">
                              <FundingBar view={v} />
                            </span>
                            <span className="num mt-1.5 block text-[12px] text-grey">{goalStatusLabel(v, money)}</span>
                          </button>
                        </motion.li>
                      ))}
                      {items.length === 0 && <li className="px-1 text-xs text-grey">None</li>}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
          {view === 'timeline' && (
            <div className="bezel p-5 sm:p-6">
              <GoalTimeline goals={goalViews} />
            </div>
          )}
        </Section>
      )}

      <Disclaimer>
        Each goal is paid in its target year from cash and investments above your emergency reserve, from a loan, or both. Loan EMIs and interest flow into every projection. Future rupee amounts are nominal; today’s cost shows current purchasing power.
      </Disclaimer>
    </div>
  );
}
