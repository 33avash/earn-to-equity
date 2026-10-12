import { useState } from 'react';
import type { Goal, GoalCategory, Priority } from '@/types/profile';
import { Field, MoneyInput, NumberInput, PercentInput, Select, TextInput } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { uid } from '@/state/demo';

export const GOAL_CATEGORIES: Record<GoalCategory, { label: string; inflation: number; cost: number; years: number }> = {
  education: { label: 'Higher education', inflation: 0.08, cost: 1500000, years: 3 },
  travel: { label: 'Travel', inflation: 0.06, cost: 200000, years: 1 },
  car: { label: 'Car', inflation: 0.05, cost: 800000, years: 4 },
  wedding: { label: 'Wedding', inflation: 0.07, cost: 1000000, years: 5 },
  home: { label: 'Home down payment', inflation: 0.06, cost: 1500000, years: 7 },
  business: { label: 'Starting a business', inflation: 0.06, cost: 1000000, years: 6 },
  family: { label: 'Family expenses', inflation: 0.06, cost: 500000, years: 5 },
  retirement: { label: 'Retirement', inflation: 0.06, cost: 30000000, years: 30 },
  fi: { label: 'Financial independence', inflation: 0.06, cost: 30000000, years: 20 },
  other: { label: 'Other', inflation: 0.06, cost: 300000, years: 3 },
};

export const PRIORITY_LABEL: Record<Priority, string> = { 1: 'High', 2: 'Medium', 3: 'Low' };

export function newGoal(category: GoalCategory, startYear: number): Goal {
  const c = GOAL_CATEGORIES[category];
  return { id: uid(), name: c.label, category, cost: c.cost, targetYear: startYear + c.years, saved: 0, priority: 2, inflation: c.inflation, source: 'investments' };
}

/** Create / edit form for a single goal, with validation. */
export function GoalForm({ initial, startYear, onSave, onCancel, saveLabel = 'Save goal' }: { initial: Goal; startYear: number; onSave: (g: Goal) => void; onCancel?: () => void; saveLabel?: string }) {
  const [g, setG] = useState<Goal>(initial);
  const [tried, setTried] = useState(false);
  const errors = {
    name: !g.name.trim() ? 'Give the goal a name.' : null,
    cost: g.cost <= 0 ? 'Enter an estimated cost above zero.' : null,
    targetYear: g.targetYear < startYear ? `Target year must be ${startYear} or later.` : g.targetYear > startYear + 50 ? 'Target year must be within 50 years.' : null,
    saved: g.saved < 0 ? 'Savings cannot be negative.' : null,
  };
  const valid = !Object.values(errors).some(Boolean);
  const set = (patch: Partial<Goal>) => setG((x) => ({ ...x, ...patch }));
  return (
    <form
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (valid) onSave({ ...g, name: g.name.trim() });
      }}
      noValidate
    >
      <Field label="Category">
        {(id) => (
          <Select
            id={id}
            value={g.category}
            onChange={(e) => {
              const category = e.target.value as GoalCategory;
              const c = GOAL_CATEGORIES[category];
              set({ category, inflation: c.inflation, name: Object.values(GOAL_CATEGORIES).some((x) => x.label === g.name) ? c.label : g.name });
            }}
          >
            {Object.entries(GOAL_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Goal name" error={tried ? errors.name : null}>
        {(id, d) => <TextInput id={id} aria-describedby={d} value={g.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} />}
      </Field>
      <Field label="Estimated cost in today’s rupees" hint="What it would cost if you paid today. Inflation is applied for you." error={tried ? errors.cost : null}>
        {(id, d) => <MoneyInput id={id} describedBy={d} value={g.cost} onChange={(v) => set({ cost: v })} max={1e10} />}
      </Field>
      <Field label="Target year" error={tried ? errors.targetYear : null}>
        {(id, d) => <NumberInput id={id} describedBy={d} value={g.targetYear} onChange={(v) => set({ targetYear: Math.round(v) })} min={startYear} max={startYear + 50} />}
      </Field>
      <Field label="Already saved for this goal" optional hint="Money already set aside. It should also be included in your cash or investments." error={tried ? errors.saved : null}>
        {(id, d) => <MoneyInput id={id} describedBy={d} value={g.saved} onChange={(v) => set({ saved: v })} max={1e10} />}
      </Field>
      <Field label="Priority" help="Higher-priority goals receive your monthly surplus first.">
        {(id) => (
          <Select id={id} value={g.priority} onChange={(e) => set({ priority: Number(e.target.value) as Priority })}>
            <option value={1}>High</option>
            <option value={2}>Medium</option>
            <option value={3}>Low</option>
          </Select>
        )}
      </Field>
      <Field label="Cost inflation" help="How fast this cost is likely to rise. Education often rises faster than general prices.">
        {(id) => <PercentInput id={id} value={g.inflation} onChange={(v) => set({ inflation: v })} max={20} />}
      </Field>
      <Field label="Expected funding source" help="Investments use your portfolio’s assumed return (debt returns if the goal is under 3 years away). Savings use the cash return.">
        {(id) => (
          <Select id={id} value={g.source} onChange={(e) => set({ source: e.target.value as Goal['source'] })}>
            <option value="investments">Investments</option>
            <option value="savings">Bank savings / deposits</option>
          </Select>
        )}
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit">{saveLabel}</Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
