import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { LifeEvent, LifeEventKind } from '@/types/profile';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Stat, Button, Field, Select, TextInput, MoneyInput, NumberInput, PercentInput, EmptyState, Disclaimer, Badge, confirmAction, toast } from '@/components/ui';
import { MultiLineChart } from '@/components/charts/SeriesCharts';
import { useChartTheme } from '@/components/charts/theme';
import { simulate } from '@/finance/simulate';
import { fiAnalysis } from '@/finance/fi';
import { uid } from '@/state/demo';
import { formatPct } from '@/finance/money';

export const EVENT_KINDS: Record<LifeEventKind, { label: string; defaults: Partial<LifeEvent> }> = {
  promotion: { label: 'Promotion', defaults: { incomeChangePct: 0.2 } },
  jobChange: { label: 'Job change', defaults: { incomeChangePct: 0.15 } },
  careerBreak: { label: 'Career break', defaults: { breakMonths: 12 } },
  education: { label: 'Education', defaults: { oneTimeCost: 1000000 } },
  marriage: { label: 'Marriage', defaults: { oneTimeCost: 800000, monthlyExpenseChange: 8000 } },
  homePurchase: { label: 'Home purchase', defaults: { oneTimeCost: 300000, monthlyExpenseChange: -15000, home: { propertyValue: 6000000, downPaymentPct: 0.2, loanRate: 0.085, tenureYears: 20 } } },
  family: { label: 'Child / family expenses', defaults: { oneTimeCost: 150000, monthlyExpenseChange: 15000 } },
  majorPurchase: { label: 'Major purchase', defaults: { oneTimeCost: 800000 } },
  emergency: { label: 'Emergency expense', defaults: { oneTimeCost: 300000 } },
  retirement: { label: 'Retirement / stop working', defaults: {} },
};

function blank(kind: LifeEventKind, year: number): LifeEvent {
  return { id: uid(), kind, label: EVENT_KINDS[kind].label, year, oneTimeCost: 0, incomeChangePct: 0, monthlyExpenseChange: 0, breakMonths: 0, ...structuredClone(EVENT_KINDS[kind].defaults) };
}

function EventForm({ initial, start, onSave, onCancel }: { initial: LifeEvent; start: number; onSave: (e: LifeEvent) => void; onCancel: () => void }) {
  const [e, setE] = useState(initial);
  const set = (patch: Partial<LifeEvent>) => setE((x) => ({ ...x, ...patch }));
  const yearErr = e.year < start || e.year > start + 49 ? `Choose a year between ${start} and ${start + 49}.` : null;
  const labelErr = !e.label.trim() ? 'Give the event a name.' : null;
  return (
    <form className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" noValidate onSubmit={(ev) => { ev.preventDefault(); if (!yearErr && !labelErr) onSave(e); }}>
      <Field label="Type">{(id) => (
        <Select id={id} value={e.kind} onChange={(x) => { const k = x.target.value as LifeEventKind; setE({ ...blank(k, e.year), id: e.id }); }}>
          {Object.entries(EVENT_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      )}</Field>
      <Field label="Name" error={labelErr}>{(id) => <TextInput id={id} value={e.label} maxLength={40} onChange={(x) => set({ label: x.target.value })} />}</Field>
      <Field label="Year" error={yearErr}>{(id) => <NumberInput id={id} value={e.year} min={start} max={start + 49} onChange={(v) => set({ year: Math.round(v) })} />}</Field>
      <Field label="One-time cost (today’s ₹)" hint="Inflated to the event year.">{(id, d) => <MoneyInput id={id} describedBy={d} value={e.oneTimeCost} max={1e10} onChange={(v) => set({ oneTimeCost: v })} />}</Field>
      <Field label="Permanent salary change" hint="e.g. +20% for a promotion, −30% for a lower-paid role.">{(id, d) => <PercentInput id={id} describedBy={d} value={e.incomeChangePct} min={-100} max={300} onChange={(v) => set({ incomeChangePct: v })} />}</Field>
      <Field label="Recurring monthly expense change" hint="Today’s ₹. Negative for savings, such as rent no longer paid.">{(id, d) => <NumberInput id={id} describedBy={d} prefix="₹" value={e.monthlyExpenseChange} min={-1e7} max={1e7} onChange={(v) => set({ monthlyExpenseChange: v })} />}</Field>
      {(e.kind === 'careerBreak' || e.breakMonths > 0) && <Field label="Months without salary">{(id) => <NumberInput id={id} value={e.breakMonths} min={0} max={120} onChange={(v) => set({ breakMonths: Math.round(v) })} />}</Field>}
      {e.kind === 'homePurchase' && e.home && (
        <>
          <Field label="Property value (today’s ₹)" hint="Grows with the property-growth assumption until purchase.">{(id, d) => <MoneyInput id={id} describedBy={d} value={e.home!.propertyValue} max={1e10} onChange={(v) => set({ home: { ...e.home!, propertyValue: v } })} />}</Field>
          <Field label="Down payment">{(id) => <PercentInput id={id} value={e.home!.downPaymentPct} max={100} onChange={(v) => set({ home: { ...e.home!, downPaymentPct: v } })} />}</Field>
          <Field label="Loan rate">{(id) => <PercentInput id={id} value={e.home!.loanRate} max={30} onChange={(v) => set({ home: { ...e.home!, loanRate: v } })} />}</Field>
          <Field label="Loan tenure (years)">{(id) => <NumberInput id={id} value={e.home!.tenureYears} min={1} max={30} onChange={(v) => set({ home: { ...e.home!, tenureYears: Math.round(v) } })} />}</Field>
        </>
      )}
      {e.kind === 'retirement' && <p className="text-sm text-grey sm:col-span-2">Salary stops from January of this year. Expenses continue and are paid from savings and investments.</p>}
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit">Save event</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function describe(e: LifeEvent, money: (v: number) => string) {
  const bits: string[] = [];
  if (e.oneTimeCost) bits.push(`${money(e.oneTimeCost)} one-time`);
  if (e.incomeChangePct) bits.push(`salary ${e.incomeChangePct > 0 ? '+' : ''}${formatPct(e.incomeChangePct, 0)}`);
  if (e.monthlyExpenseChange) bits.push(`${e.monthlyExpenseChange > 0 ? '+' : '−'}${money(Math.abs(e.monthlyExpenseChange))}/mo expenses`);
  if (e.breakMonths) bits.push(`${e.breakMonths} months without salary`);
  if (e.home) bits.push(`${money(e.home.propertyValue)} home, ${formatPct(e.home.downPaymentPct, 0)} down, ${formatPct(e.home.loanRate)} over ${e.home.tenureYears} yrs`);
  if (e.kind === 'retirement') bits.push('salary stops');
  return bits.join(' · ') || 'No financial impact entered';
}

export default function LifeEvents() {
  const plan = usePlan();
  const money = useMoney();
  const t = useChartTheme();
  const update = useStore((s) => s.updateProfile);
  const { profile: p, assumptions: a } = plan;
  const [editing, setEditing] = useState<LifeEvent | null>(null);
  const events = [...p.lifeEvents].sort((x, y) => x.year - y.year);

  const cmp = useMemo(() => {
    const without = simulate(p, a, { excludeEvents: true });
    const fiWithout = fiAnalysis(p, a, { excludeEvents: true });
    const goalsFunded = (rows: typeof without.rows) => rows.flatMap((r) => r.goals).filter((g) => g.status === 'funded').length;
    return { without, fiWithout, goalsWithout: goalsFunded(without.rows), goalsWith: goalsFunded(plan.sim.rows), goalsTotal: plan.sim.rows.flatMap((r) => r.goals).length };
  }, [p, a, plan.sim]);
  const w = plan.sim.rows.at(-1)!;
  const wo = cmp.without.rows.at(-1)!;

  const save = (e: LifeEvent) => {
    update((x) => { const i = x.lifeEvents.findIndex((y) => y.id === e.id); if (i >= 0) x.lifeEvents[i] = e; else x.lifeEvents.push(e); });
    setEditing(null);
    toast('Roadmap recalculated');
  };
  const remove = async (e: LifeEvent) => {
    if (!(await confirmAction({ title: `Remove “${e.label}”?`, body: 'The event will be removed from your timeline and every projection.', confirmLabel: 'Remove', danger: true }))) return;
    update((x) => void (x.lifeEvents = x.lifeEvents.filter((y) => y.id !== e.id)));
    toast('Roadmap recalculated');
  };

  return (
    <div className="flex flex-col gap-14">
      <PageHeader title="Life Events" description="Promotions, breaks, marriage, a home, a family. Add the moments that change your finances, and see how your roadmap shifts." actions={!editing && <Button icon={<Plus size={16} />} onClick={() => setEditing(blank('promotion', p.planStartYear + 2))}>Add event</Button>} />

      {editing && (
        <div className="panel p-5 sm:p-6">
          <h2 className="mb-5 text-[15px] font-semibold">{p.lifeEvents.some((x) => x.id === editing.id) ? 'Edit event' : 'New event'}</h2>
          <EventForm initial={editing} start={p.planStartYear} onSave={save} onCancel={() => setEditing(null)} />
        </div>
      )}

      <Section title="Timeline">
        {events.length === 0 ? (
          <EmptyState title="No life events yet" action={<Button variant="secondary" icon={<Plus size={14} />} onClick={() => setEditing(blank('promotion', p.planStartYear + 2))}>Add your first event</Button>}>A promotion in two years? A career break for a degree? Add it here to see its effect.</EmptyState>
        ) : (
          <ol className="relative ml-2 border-l border-line">
            {events.map((e) => (
              <li key={e.id} className="relative pb-8 pl-8 last:pb-0">
                <span className="absolute -left-[6px] top-1.5 h-[11px] w-[11px] rounded-full border-2 border-champagne bg-surface" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="num text-xs font-semibold text-champagne">{e.year} · age {p.about.age + (e.year - p.planStartYear)}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-lg font-semibold text-evergreen">{e.label} <Badge>{EVENT_KINDS[e.kind].label}</Badge></p>
                    <p className="mt-1 text-[13px] text-grey">{describe(e, money)}</p>
                    {e.year >= p.planStartYear + a.horizonYears && <p className="mt-1 text-xs text-danger">Outside the {a.horizonYears}-year projection.</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setEditing(e)}>Edit</Button>
                    <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => remove(e)} aria-label={`Remove ${e.label}`}>Remove</Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Before and after" description="Your roadmap with these events, compared with the same plan without any events.">
        <dl className="grid grid-cols-2 gap-8 border-y border-line py-6 lg:grid-cols-4">
          <Stat label={`Net worth, ${w.year + 1}`} value={money(w.netWorth)} sub={<>without events: {money(wo.netWorth)} · <span className={w.netWorth - wo.netWorth < 0 ? 'text-danger' : 'text-forest'}>{w.netWorth - wo.netWorth >= 0 ? '+' : ''}{money(w.netWorth - wo.netWorth)}</span></>} />
          <Stat label="Final financial corpus" value={money(w.financialAssets)} sub={`without events: ${money(wo.financialAssets)}`} />
          <Stat label="Goals funded in projection" value={`${cmp.goalsWith} of ${cmp.goalsTotal}`} sub={`without events: ${cmp.goalsWithout}`} />
          <Stat label="Estimated FI age" value={plan.fi.fiAge ? String(plan.fi.fiAge) : 'Beyond projection'} sub={`without events: ${cmp.fiWithout.fiAge ?? 'beyond projection'}`} />
        </dl>
        <div className="mt-8">
          <MultiLineChart
            data={plan.sim.rows.map((r, i) => ({ year: r.year, with: r.netWorth, without: cmp.without.rows[i].netWorth }))}
            xKey="year"
            height={280}
            ariaLabel="Net worth with and without life events"
            series={[{ key: 'without', name: 'Without events', color: t.muted, dashed: true }, { key: 'with', name: 'With your events', color: t.primary }]}
          />
        </div>
      </Section>
      <Disclaimer>Event costs are entered in today’s rupees and inflated to the event year. Home purchases convert savings into property (growing at {formatPct(a.propertyGrowth)} a year) and add a loan. Net worth changes only through costs and interest, not the purchase itself.</Disclaimer>
    </div>
  );
}
