import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { PageHeader, Section, Field, MoneyInput, Toggle, Notice, Stat, Disclaimer } from '@/components/ui';
import { LineItemsEditor } from '@/features/editors/LineItems';
import { SalaryEditor } from '@/features/editors/SalaryEditor';
import { LoansEditor } from '@/features/editors/Loans';
import { fiftyThirtyTwenty } from '@/finance/cashflow';
import { formatPct } from '@/finance/money';

export default function Budget() {
  const plan = usePlan();
  const money = useMoney();
  const update = useStore((s) => s.updateProfile);
  const show = useStore((s) => s.settings.showRule503020);
  const setSettings = useStore((s) => s.setSettings);
  const { profile: p, cashflow: cf } = plan;
  const rule = fiftyThirtyTwenty(cf);

  return (
    <div className="flex flex-col gap-12">
      <PageHeader title="Budget Planner" description="Your monthly cash flow. Every change here immediately updates your surplus, dashboard, goals and 20-year projection." />

      <div className="grid gap-12 xl:grid-cols-12">
        <div className="flex flex-col gap-12 xl:col-span-8">
          <Section title="Income">
            <SalaryEditor p={p} update={update} />
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <Field label="Other monthly income" hint="After tax. Assumed to rise with inflation.">{(id) => <MoneyInput id={id} value={p.income.otherMonthlyIncome} max={1e8} onChange={(v) => update((x) => void (x.income.otherMonthlyIncome = v))} />}</Field>
            </div>
          </Section>
          <Section title="Essential expenses" description="Costs that continue even if income stops.">
            <LineItemsEditor title="Essential expenses" items={p.cashflow.essential} onChange={(items) => update((x) => void (x.cashflow.essential = items))} addLabel="Add essential expense" />
          </Section>
          <Section title="Lifestyle expenses" description="Spending you choose and could adjust.">
            <LineItemsEditor title="Lifestyle expenses" items={p.cashflow.lifestyle} onChange={(items) => update((x) => void (x.cashflow.lifestyle = items))} addLabel="Add lifestyle expense" />
          </Section>
          <Section title="Debt repayments" description="Monthly EMIs and minimum card payments. Balances and rates are edited under Emergency Fund & Debt.">
            <LoansEditor loans={p.liabilities} columns={['kind', 'label', 'emi']} onChange={(l) => update((x) => void (x.liabilities = l))} />
          </Section>
          <Section title="Savings & investments" description="Transfers to your future self. They are not counted as expenses.">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Monthly investments (SIPs)">{(id) => <MoneyInput id={id} value={p.cashflow.monthlyInvestments} max={1e8} onChange={(v) => update((x) => void (x.cashflow.monthlyInvestments = v))} />}</Field>
              <Field label="Monthly savings to bank / reserve">{(id) => <MoneyInput id={id} value={p.cashflow.monthlySavings} max={1e8} onChange={(v) => update((x) => void (x.cashflow.monthlySavings = v))} />}</Field>
            </div>
          </Section>
        </div>

        <aside className="xl:col-span-4">
          <div className="panel sticky top-6 flex flex-col gap-6 p-6">
            <div>
              <p className="eyebrow mb-4">Monthly summary</p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-grey">Income</dt><dd className="num">{money(cf.income)}</dd></div>
                <div className="flex justify-between"><dt className="text-grey">Essential</dt><dd className="num">−{money(cf.essential)}</dd></div>
                <div className="flex justify-between"><dt className="text-grey">Lifestyle</dt><dd className="num">−{money(cf.lifestyle)}</dd></div>
                <div className="flex justify-between"><dt className="text-grey">Debt repayments</dt><dd className="num">−{money(cf.debtPayments)}</dd></div>
                <div className="flex justify-between border-t border-line pt-2"><dt className="font-semibold">Remaining after expenses & repayments</dt><dd className={`num font-semibold ${cf.investableSurplus < 0 ? 'text-danger' : 'text-evergreen'}`}>{money(cf.investableSurplus)}</dd></div>
                <div className="flex justify-between"><dt className="text-grey">Investments</dt><dd className="num">−{money(cf.plannedInvestments)}</dd></div>
                <div className="flex justify-between"><dt className="text-grey">Savings</dt><dd className="num">−{money(cf.plannedSavings)}</dd></div>
                <div className="flex justify-between border-t border-line pt-2"><dt className="font-semibold">Unallocated</dt><dd className={`num font-semibold ${cf.unallocated < 0 ? 'text-danger' : 'text-evergreen'}`}>{money(cf.unallocated)}</dd></div>
              </dl>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-line pt-5">
              <Stat label="Savings rate" value={formatPct(cf.savingsRate)} size="sm" def="savingsRate" />
              <Stat label="Debt-to-income" value={formatPct(cf.debtToIncome)} size="sm" def="dti" />
            </div>
            {cf.investableSurplus < 0 && <Notice tone="error">You’re spending more than you earn. The projection draws on savings to cover the gap.</Notice>}
            {cf.investableSurplus >= 0 && cf.unallocated < 0 && <Notice tone="warning">Planned transfers exceed your surplus by {money(-cf.unallocated)}. Projections invest only what is available.</Notice>}
            {cf.unallocated > 0 && <p className="text-xs text-grey">Unallocated money builds up in cash. By default, cash above your emergency target is invested at each year-end (you can change this in Settings).</p>}
          </div>
        </aside>
      </div>

      <Section title="50/30/20 comparison" description="An optional reference: 50% needs, 30% wants, 20% savings. Useful as a mirror, not a rule.">
        <Toggle checked={show} onChange={(v) => setSettings({ showRule503020: v })} label="Show the 50/30/20 comparison" />
        {show && (
          <div className="mt-6 -mx-1 overflow-x-auto px-1">
            <table className="table-fin w-full min-w-[480px]">
              <thead>
                <tr>
                  <th scope="col">Bucket</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Yours</th>
                  <th scope="col">Share of income</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['Needs (essentials + EMIs)', 'needs', 0.5],
                  ['Wants (lifestyle)', 'wants', 0.3],
                  ['Savings & investing', 'save', 0.2],
                ] as const).map(([label, k, share]) => {
                  const actualShare = cf.income > 0 ? rule.actual[k] / cf.income : 0;
                  const better = k === 'save' ? actualShare >= share : actualShare <= share;
                  return (
                    <tr key={k}>
                      <td className="font-sans font-medium text-evergreen">{label}</td>
                      <td>{money(rule.target[k])}</td>
                      <td>{money(rule.actual[k])}</td>
                      <td className={better ? 'text-forest' : 'text-danger'}>
                        {formatPct(actualShare, 0)} <span className="text-grey">vs {formatPct(share, 0)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Disclaimer className="mt-4">High metro rents or support to family can push needs well above 50%. That isn’t a failure. What matters is that the savings line is deliberate.</Disclaimer>
          </div>
        )}
      </Section>
    </div>
  );
}
