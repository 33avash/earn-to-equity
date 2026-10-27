import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { useStore } from '@/state/store';
import { useMoney } from '@/state/selectors';
import { Dialog, DialogClose, DialogDescription, DialogTitle, SheetContent } from '@/components/ui/shadcn/dialog';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Misc';
import { applyFixes, type Fix, type PlanMetrics } from '@/finance/fixPlan';
import { runJob, usePlanJob } from '@/services/planWorker';

/** Signed change in plain words, for a fix's impact chip. Picks the change that matters most. */
export function impactChip(before: PlanMetrics, after: PlanMetrics, money: (n: number) => string): string {
  if (after.unpaidGoals < before.unpaidGoals) return before.unpaidGoals - after.unpaidGoals === 1 ? 'Pays an unpaid goal' : `Pays ${before.unpaidGoals - after.unpaidGoals} unpaid goals`;
  if (before.fiAge !== null && after.fiAge !== null && after.fiAge < before.fiAge) return `FI ${before.fiAge - after.fiAge} yr${before.fiAge - after.fiAge === 1 ? '' : 's'} sooner`;
  const pts = Math.round((after.fiSuccess - before.fiSuccess) * 100);
  if (pts >= 2) return `+${pts} pts chance of FI`;
  const h = Math.round(after.health - before.health);
  if (h >= 1) return `+${h} plan health`;
  const nw = after.netWorthReal - before.netWorthReal;
  if (nw > 0) return `+${money(nw)} by the end`;
  return 'Small effect alone';
}

const fmtAge = (a: number | null) => (a === null ? 'After 65' : String(a));

/** The before → after strip: five numbers, each with its change. */
export function BeforeAfter({ before, after, targetAge, endYear, money, pending = false }: { before: PlanMetrics; after: PlanMetrics | null; targetAge: number; endYear: number; money: (n: number) => string; pending?: boolean }) {
  const rows: { label: string; b: string; a: string | null; better: boolean | null }[] = [
    { label: 'FI age', b: fmtAge(before.fiAge), a: after && fmtAge(after.fiAge), better: after ? (after.fiAge ?? 99) < (before.fiAge ?? 99) : null },
    { label: `Chance of FI by ${targetAge}`, b: `${Math.round(before.fiSuccess * 100)}%`, a: after && `${Math.round(after.fiSuccess * 100)}%`, better: after ? after.fiSuccess > before.fiSuccess + 0.005 : null },
    { label: 'Unpaid goals', b: String(before.unpaidGoals), a: after && String(after.unpaidGoals), better: after ? after.unpaidGoals < before.unpaidGoals : null },
    { label: `Net worth ${endYear}, today’s ₹`, b: money(before.netWorthReal), a: after && money(after.netWorthReal), better: after ? after.netWorthReal > before.netWorthReal : null },
    { label: 'Plan health', b: String(Math.round(before.health)), a: after && String(Math.round(after.health)), better: after ? after.health > before.health + 0.5 : null },
  ];
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line sm:grid-cols-5 ${pending ? 'opacity-70' : ''}`} aria-live="polite">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-1 bg-surface p-3 last:col-span-2 sm:last:col-span-1">
          <dt className="text-[11.5px] leading-tight text-grey">{r.label}</dt>
          <dd className="flex flex-wrap items-baseline gap-x-1.5 text-[13px]">
            <span className="num text-grey">{r.b}</span>
            <ArrowRight size={11} className="text-grey" aria-label="becomes" />
            <span className={`num font-semibold ${r.better ? 'text-forest' : 'text-evergreen'}`}>{r.a ?? '…'}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * "Fix my plan": the planner's fixes for this plan, each tested alone and then together. Untick any fix and the
 * after-strip reruns. Apply changes the plan (with Undo); Save as scenario keeps it to compare in the Simulator.
 */
export function FixPlanSheet() {
  const open = useStore((s) => s.fixOpen);
  const setOpen = useStore((s) => s.setFixOpen);
  const profile = useStore((s) => s.profile);
  const assumptions = useStore((s) => s.assumptions);
  const replacePlan = useStore((s) => s.replacePlan);
  const saveBaselineFrom = useStore((s) => s.saveBaselineFrom);
  const money = useMoney();
  const navigate = useNavigate();
  const { data, loading } = usePlanJob('fixes', profile, assumptions, open, 0);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [after, setAfter] = useState<PlanMetrics | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Start with the fixes the combined pass kept.
  useEffect(() => {
    if (!data) return;
    setTicked(new Set(data.combined.applied));
    setAfter(data.combined.after);
  }, [data]);

  const ordered: Fix[] = useMemo(() => {
    if (!data) return [];
    const byKey = new Map(data.fixes.map((f) => [f.key, f]));
    const keys = [...data.combined.applied, ...data.combined.dropped.map((d) => d.key)];
    return [...keys.map((k) => byKey.get(k)!).filter(Boolean), ...data.fixes.filter((f) => !keys.includes(f.key))];
  }, [data]);
  const selected = ordered.filter((f) => ticked.has(f.key));

  // Rerun the after-strip when the selection differs from the combined result.
  useEffect(() => {
    if (!data) return;
    const same = selected.length === data.combined.applied.length && selected.every((f, i) => f.key === data.combined.applied[i]);
    if (same) {
      setAfter(data.combined.after);
      return;
    }
    if (!selected.length) {
      setAfter(data.fixes[0]?.impact.before ?? null);
      return;
    }
    let live = true;
    setEvaluating(true);
    const next = applyFixes(profile, assumptions, selected);
    runJob({ kind: 'evaluate', profile: next.profile, assumptions: next.assumptions })
      .then((m) => live && setAfter(m))
      .finally(() => live && setEvaluating(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticked, data]);

  const toggle = (key: string) =>
    setTicked((t) => {
      const n = new Set(t);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const apply = () => {
    const next = applyFixes(profile, assumptions, selected);
    const prev = replacePlan(next.profile, next.assumptions);
    setOpen(false);
    toast(`Applied ${selected.length} change${selected.length === 1 ? '' : 's'} to your plan.`, {
      duration: 8000,
      action: { label: 'Undo', onClick: () => replacePlan(prev.profile, prev.assumptions) },
    });
  };
  const saveScenario = () => {
    const next = applyFixes(profile, assumptions, selected);
    saveBaselineFrom('Fixed plan', next.profile, next.assumptions);
    setOpen(false);
    toast('Saved as a scenario. Compare it in the Simulator.', { action: { label: 'Open', onClick: () => navigate('/app/simulator') } });
  };

  const before = data?.fixes[0]?.impact.before ?? data?.combined.before;
  const endYear = profile.planStartYear + assumptions.horizonYears;
  const droppedReason = (key: string) => data?.combined.dropped.find((d) => d.key === key)?.reason;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-[calc(100vw-1.5rem)] max-w-[600px] gap-5 px-4 pb-5 pt-5 sm:px-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <DialogTitle>Fix my plan</DialogTitle>
            <DialogDescription className="!mt-1 text-[13px]">Changes the planner found for your plan, each tested on your own projection and on 300 simulated market paths.</DialogDescription>
          </div>
          <DialogClose className="hit -mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-grey hover:bg-muted hover:text-evergreen" aria-label="Close">
            <X size={17} aria-hidden />
          </DialogClose>
        </div>

        {loading || !data || !before ? (
          <div role="status" className="flex flex-col gap-3">
            <p className="text-[13px] text-grey">Testing each change on your plan…</p>
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
          </div>
        ) : data.fixes.length === 0 ? (
          <p className="text-sm text-grey">Nothing to fix that the planner can test: no costly debt, the reserve is full, goals are paid for and FI is on track. Insurance cover is in Next steps.</p>
        ) : (
          <>
            <BeforeAfter before={before} after={after} targetAge={profile.about.fiAge} endYear={endYear} money={money} pending={evaluating} />
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-evergreen">Changes ({selected.length} of {ordered.length} ticked)</legend>
              <ul className="flex flex-col divide-y divide-line/70 rounded-2xl ring-1 ring-inset ring-line">
                {ordered.map((f) => {
                  const on = ticked.has(f.key);
                  const reason = droppedReason(f.key);
                  return (
                    <li key={f.key} className="flex gap-3 p-3.5">
                      <input id={`fix-${f.key}`} type="checkbox" checked={on} onChange={() => toggle(f.key)} className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--c-forest))]" aria-describedby={`fix-${f.key}-why`} />
                      <div className="min-w-0 flex-1">
                        <label htmlFor={`fix-${f.key}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[14px] font-medium text-evergreen">
                          {f.title}
                          <span className="num rounded-full bg-forest/10 px-2 py-0.5 text-[11.5px] font-medium text-forest">{impactChip(f.impact.before, f.impact.after, money)}</span>
                        </label>
                        <p id={`fix-${f.key}-why`} className="mt-1 text-[12.5px] leading-relaxed text-grey">
                          {f.why}
                          {reason && !on && <span className="mt-1 block text-charcoal">{reason === 'conflict' ? 'Not ticked: it changes the same setting as a fix above.' : 'Not ticked: once the fixes above are in, it doesn’t improve the plan further.'}</span>}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <Button onClick={apply} disabled={!selected.length}>Apply to my plan</Button>
              <Button variant="secondary" onClick={saveScenario} disabled={!selected.length}>Save as scenario</Button>
            </div>
            <p className="text-[12px] leading-relaxed text-grey">Insurance cover isn’t changed here; see Next steps on Overview. The range comes from simulated market paths and isn’t a forecast. Education only, not investment advice.</p>
          </>
        )}
      </SheetContent>
    </Dialog>
  );
}
