import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import type { Goal } from '@/types/profile';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Stat, Notice, Badge, Button, Slider, EmptyState, Disclaimer, confirmAction, toast } from '@/components/ui';
import { GoalForm, GOAL_CATEGORIES, PRIORITY_LABEL, newGoal } from '@/features/editors/GoalForm';
import { analyzeGoal, type GoalAnalysis } from '@/finance/goals';
import { NON_WITHDRAWAL_GOALS } from '@/finance/simulate';
import { formatINR, formatMonths, formatPct } from '@/finance/money';
import { STATUS } from '@/features/goals/GoalTimeline';

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
        <button type="button" onClick={onClose} className="text-sm text-grey hover:text-evergreen">
          Close
        </button>
      </div>
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Slider label="Delay the goal" value={delay} min={0} max={10} step={1} onChange={setDelay} format={(v) => (v === 0 ? 'No delay' : `+${v} yr${v > 1 ? 's' : ''} (${a.goal.targetYear + v})`)} />
          <Slider label="Reduce the cost" value={reduce} min={0} max={0.5} step={0.05} onChange={setReduce} format={(v) => (v === 0 ? 'No change' : `−${formatPct(v, 0)}`)} />
          <Slider label="Contribute more each month" value={extra} min={0} max={Math.max(20000, Math.ceil(a.requiredMonthly / 1000) * 1000 || 20000)} step={500} onChange={setExtra} format={(v) => `+${formatINR(v)}`} />
        </div>
        <div>
          <div className="grid grid-cols-2 gap-6">
            <Stat label="Future cost" value={money(r.futureCost)} size="sm" sub={`${money(modified.cost)} today`} />
            <Stat label="Required monthly" value={Number.isFinite(r.requiredMonthly) ? money(r.requiredMonthly) : '—'} size="sm" />
            <Stat label="Contribution" value={money(r.allocatedMonthly)} size="sm" sub={extra > 0 ? `incl. +${money(extra)}` : 'from current surplus'} />
            <Stat label="Projected completion" value={r.completionYear ? String(Math.ceil(r.completionYear)) : 'Not reached'} size="sm" />
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
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
  const { goals: summary, profile: p } = plan;

  const simOutcome = useMemo(() => {
    const m = new Map<string, { status: string; shortfall: number; year: number }>();
    for (const r of plan.sim.rows) for (const g of r.goals) m.set(g.goalId, g);
    return m;
  }, [plan.sim]);

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
    update((x) => void (x.goals = x.goals.filter((y) => y.id !== g.id)));
    toast(`Deleted “${g.name}”`);
  };
  const onTrack = summary.goals.filter((g) => g.status === 'funded' || g.status === 'on-track').length;
  const ordered = [...summary.goals].sort((a, b) => a.goal.priority - b.goal.priority || a.goal.targetYear - b.goal.targetYear);

  return (
    <div className="flex flex-col gap-12">
      <PageHeader
        title="Goals Planner"
        description="Goals are entered in today’s prices and inflated to their target year. Your monthly surplus funds them in priority order. A goal counts as on track only if that money actually covers it."
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
          <GoalForm initial={editing} startYear={p.planStartYear} onSave={save} onCancel={() => setEditing(null)} />
        </div>
      )}

      {p.goals.length > 0 && (
        <dl className="grid grid-cols-2 gap-8 border-y border-line py-6 lg:grid-cols-4">
          <Stat label="Monthly capacity" value={money(summary.capacity)} def="surplus" sub="Investable surplus" />
          <Stat label="Required for all goals" value={money(summary.totalRequired)} sub="Per month, from today" />
          <Stat label="Combined shortfall" value={summary.totalShortfall > 0 ? money(summary.totalShortfall) : 'None'} tone={summary.totalShortfall > 0 ? 'negative' : undefined} sub="Per month" />
          <Stat label="On track" value={`${onTrack} of ${p.goals.length}`} />
        </dl>
      )}

      {summary.totalShortfall > 0 && (
        <Notice tone="warning" title="Your goals need more than your current surplus">
          Together they need {money(summary.totalRequired)} a month against {money(summary.capacity)} available. Lower-priority goals receive less. Use “Explore options” to delay a goal, reduce its cost or test higher contributions.
        </Notice>
      )}

      {p.goals.length === 0 && !editing ? (
        <EmptyState title="No goals yet" action={<Button icon={<Plus size={16} />} onClick={() => setEditing(newGoal('education', p.planStartYear))}>Add your first goal</Button>}>
          A degree, a car, a wedding, a home, or time off to start something. Add what matters, and see the true future cost and what it takes to fund it.
        </EmptyState>
      ) : (
        <Section title="Your goals" description="Sorted by priority, then by date.">
          <ul>
            {ordered.map((a) => {
              const sim = simOutcome.get(a.goal.id);
              return (
                <li key={a.goal.id} className="border-t border-line py-6 last:border-b">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-evergreen">{a.goal.name}</h3>
                        <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>
                        <Badge>{PRIORITY_LABEL[a.goal.priority]} priority</Badge>
                      </div>
                      <p className="mt-1 text-[13px] text-grey">
                        {GOAL_CATEGORIES[a.goal.category].label} · target {a.goal.targetYear} ({a.months > 0 ? formatMonths(a.months) : 'now'}) · {formatPct(a.goal.inflation)} cost inflation · funded from {a.goal.source === 'savings' ? 'savings' : 'investments'} at {formatPct(a.expectedReturn)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" icon={<SlidersHorizontal size={14} />} onClick={() => setExploring(exploring === a.goal.id ? null : a.goal.id)} aria-expanded={exploring === a.goal.id}>
                        Explore options
                      </Button>
                      <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setEditing(a.goal)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => remove(a.goal)} aria-label={`Delete ${a.goal.name}`}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-7">
                    <Stat size="sm" label="Cost today" value={money(a.goal.cost)} />
                    <Stat size="sm" label={`Cost in ${a.goal.targetYear}`} value={money(a.futureCost)} def="futureCost" />
                    <Stat size="sm" label="Saved" value={money(a.goal.saved)} sub={`grows to ${money(a.fvSaved)}`} />
                    <Stat size="sm" label="Funded" value={formatPct(a.fundedPct, 0)} def="fundedPct" />
                    <Stat size="sm" label="Needs monthly" value={Number.isFinite(a.requiredMonthly) ? money(a.requiredMonthly) : '—'} />
                    <Stat size="sm" label="Allocated" value={money(a.allocatedMonthly)} sub={a.shortfallMonthly > 0 && Number.isFinite(a.shortfallMonthly) ? <span className="text-danger">short {money(a.shortfallMonthly)}</span> : undefined} />
                    <Stat size="sm" label="Est. completion" value={a.status === 'funded' ? 'Funded' : a.completionYear ? String(Math.ceil(a.completionYear)) : 'Not reached'} />
                  </dl>
                  <p className="mt-4 text-xs text-grey">
                    {NON_WITHDRAWAL_GOALS.has(a.goal.category)
                      ? 'Whole-plan projection: tracked against your corpus in Financial Independence, not withdrawn.'
                      : sim
                        ? sim.status === 'funded'
                          ? `Whole-plan projection: funded in ${sim.year} from your overall savings and investments.`
                          : `Whole-plan projection: in ${sim.year} your liquid assets would fall ${money(sim.shortfall)} short, so the projection does not withdraw it.`
                        : 'Whole-plan projection: falls outside the 20-year horizon.'}
                  </p>
                  {exploring === a.goal.id && (
                    <Explorer
                      a={a}
                      onClose={() => setExploring(null)}
                      onApply={(g) => {
                        save(g);
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
        Two views are shown. The <strong>dedicated plan</strong> sets aside a monthly amount per goal from your surplus. The <strong>whole-plan projection</strong> uses the 20-year simulation, where goals are paid from all liquid assets when due. Future rupee amounts are nominal. Today’s cost shows current purchasing power.
      </Disclaimer>
    </div>
  );
}
