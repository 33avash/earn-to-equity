import { useState } from 'react';
import type { FundingMode, Goal, GoalCategory, Priority } from '@/types/profile';
import { Field, MoneyInput, NumberInput, PercentInput, Select, TextInput } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { uid } from '@/state/demo';
import { FUNDING_MODE_LABELS, defaultFundingMode, goalFundingMode, goalLoanTerms } from '@/finance/goalFunding';

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
  return { id: uid(), name: c.label, category, cost: c.cost, targetYear: startYear + c.years, saved: 0, priority: 2, inflation: c.inflation, source: 'investments', fundingMode: defaultFundingMode(category) };
}

/**
 * Create / edit form for a single goal, with validation.
 * `linkedEvents` lists life events that depend on this goal, for the "keep these events anyway" choice.
 */
export function GoalForm({ initial, startYear, onSave, onCancel, saveLabel = 'Save goal', linkedEvents = [] }: { initial: Goal; startYear: number; onSave: (g: Goal) => void; onCancel?: () => void; saveLabel?: string; linkedEvents?: string[] }) {
  const [g, setG] = useState<Goal>(initial);
  const [tried, setTried] = useState(false);
  const mode = goalFundingMode(g);
  const terms = goalLoanTerms(g);
  const errors = {
    name: !g.name.trim() ? 'Give the goal a name.' : null,
    cost: g.cost <= 0 ? 'Enter an estimated cost above zero.' : null,
    targetYear: !Number.isInteger(g.targetYear) ? 'Enter a year.' : g.targetYear < startYear ? `Target year must be ${startYear} or later.` : g.targetYear > startYear + 50 ? 'Target year must be within 50 years.' : null,
    saved: g.saved < 0 ? 'Savings cannot be negative.' : null,
    loanRate: mode !== 'savings' && (terms.rate < 0 || terms.rate > 0.3) ? 'Use a rate between 0% and 30%.' : null,
    tenure: mode !== 'savings' && (!Number.isInteger(terms.tenureYears) || terms.tenureYears < 1 || terms.tenureYears > 30) ? 'Use 1 to 30 years.' : null,
    moratorium: mode !== 'savings' && (!Number.isInteger(terms.moratoriumMonths) || terms.moratoriumMonths < 0 || terms.moratoriumMonths > 48) ? 'Use 0 to 48 months.' : null,
  };
  const setLoan = (patch: Partial<typeof terms>) => setG((x) => ({ ...x, loan: { ...goalLoanTerms(x), ...patch } }));
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
              set({ category, inflation: c.inflation, fundingMode: defaultFundingMode(category), loan: undefined, name: Object.values(GOAL_CATEGORIES).some((x) => x.label === g.name) ? c.label : g.name });
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
        {(id, d, invalid) => <NumberInput native id={id} describedBy={d} invalid={invalid} value={g.targetYear} onChange={(v) => set({ targetYear: v })} min={startYear} max={startYear + 50} />}
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
      <Field label="How to pay for it" help="Savings only: if your cash and investments can’t cover it in the target year, the goal is marked unpaid. Savings, then a loan: savings first, a loan for the rest. Loan: the whole cost is borrowed. Loan EMIs flow into every projection.">
        {(id) => (
          <Select id={id} value={mode} onChange={(e) => set({ fundingMode: e.target.value as FundingMode })}>
            {(Object.keys(FUNDING_MODE_LABELS) as FundingMode[]).map((m) => (
              <option key={m} value={m}>
                {FUNDING_MODE_LABELS[m]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {mode !== 'savings' && (
        <fieldset className="grid gap-5 rounded border border-line p-4 sm:col-span-2 sm:grid-cols-3">
          <legend className="px-1 text-[13px] font-medium text-charcoal">Loan terms</legend>
          <Field label="Interest rate" error={tried ? errors.loanRate : null}>
            {(id, d, invalid) => <PercentInput id={id} describedBy={d} invalid={invalid} value={terms.rate} onChange={(v) => setLoan({ rate: v })} max={30} />}
          </Field>
          <Field label="Tenure (years)" error={tried ? errors.tenure : null}>
            {(id, d, invalid) => <NumberInput native id={id} describedBy={d} invalid={invalid} value={terms.tenureYears} onChange={(v) => setLoan({ tenureYears: v })} min={1} max={30} />}
          </Field>
          <Field label="Moratorium (months)" help="Months before EMIs start, such as the course period for an education loan. Interest is added to the balance during this time." error={tried ? errors.moratorium : null}>
            {(id, d, invalid) => <NumberInput native id={id} describedBy={d} invalid={invalid} value={terms.moratoriumMonths} onChange={(v) => setLoan({ moratoriumMonths: v })} min={0} max={48} />}
          </Field>
        </fieldset>
      )}
      {linkedEvents.length > 0 && (
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--c-forest))]" checked={g.keepEventsIfUnfunded ?? false} onChange={(e) => set({ keepEventsIfUnfunded: e.target.checked })} />
          <span>
            <span className="font-medium text-charcoal">Keep these events anyway</span>
            <span className="block text-xs text-grey">
              {linkedEvents.join(', ')} depend{linkedEvents.length === 1 ? 's' : ''} on this goal. If the plan can’t pay for the goal, they are left out of the projection unless you tick this.
            </span>
          </span>
        </label>
      )}
      <Field label="Where dedicated savings sit" help="Used for the dedicated-savings view. Investments use your portfolio’s assumed return (debt returns if the goal is under 3 years away). Savings use the cash return.">
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
