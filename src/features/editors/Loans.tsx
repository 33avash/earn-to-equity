import { Plus, Trash2 } from 'lucide-react';
import type { Liability, LiabilityKind } from '@/types/profile';
import { MoneyInput, PercentInput, Select } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Misc';
import { uid } from '@/state/demo';
import { HOME_LOAN_RATE } from '@/finance/assumptions';
import { DEFAULT_LOAN_TERMS } from '@/finance/goalFunding';

export const LOAN_KINDS: Record<LiabilityKind, { label: string; rate: number }> = {
  personal: { label: 'Personal loan', rate: 0.14 },
  education: { label: 'Education loan', rate: DEFAULT_LOAN_TERMS.education.rate },
  car: { label: 'Car loan', rate: DEFAULT_LOAN_TERMS.car.rate },
  creditCard: { label: 'Credit card', rate: 0.36 },
  home: { label: 'Home loan', rate: HOME_LOAN_RATE.value },
  other: { label: 'Other loan', rate: 0.12 },
};

type Col = 'kind' | 'label' | 'balance' | 'rate' | 'emi';

/** Loan table. `columns` lets onboarding split repayments (step 3) from balances (step 4). */
export function LoansEditor({ loans, onChange, columns = ['kind', 'label', 'balance', 'rate', 'emi'], allowAdd = true }: { loans: Liability[]; onChange: (l: Liability[]) => void; columns?: Col[]; allowAdd?: boolean }) {
  const set = (id: string, patch: Partial<Liability>) => onChange(loans.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const has = (c: Col) => columns.includes(c);
  const add = () => onChange([...loans, { id: uid(), kind: 'personal', label: 'Personal loan', balance: 0, rate: LOAN_KINDS.personal.rate, emi: 0 }]);
  return (
    <div>
      {loans.length === 0 ? (
        <EmptyState art="loans" title="No loans or card balances" action={allowAdd ? <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={add}>Add a loan</Button> : undefined}>
          If you have none, you can skip this. Revolving credit-card balances count as loans.
        </EmptyState>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="table-fin w-full min-w-[560px]">
            <caption className="sr-only">Loans and credit cards</caption>
            <thead>
              <tr>
                {has('kind') && <th scope="col">Type</th>}
                {has('label') && <th scope="col">Name</th>}
                {has('balance') && <th scope="col">Outstanding</th>}
                {has('rate') && <th scope="col">Interest (APR)</th>}
                {has('emi') && <th scope="col">Monthly payment</th>}
                <th scope="col" className="w-10"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id}>
                  {has('kind') && (
                    <td className="w-40">
                      <Select
                        aria-label="Loan type"
                        className="h-8 text-[13px]"
                        value={l.kind}
                        onChange={(e) => {
                          const kind = e.target.value as LiabilityKind;
                          set(l.id, { kind, rate: LOAN_KINDS[kind].rate, label: Object.values(LOAN_KINDS).some((k) => k.label === l.label) || !l.label ? LOAN_KINDS[kind].label : l.label });
                        }}
                      >
                        {Object.entries(LOAN_KINDS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                  )}
                  {has('label') && (
                    <td>
                      <input aria-label="Loan name" className="input h-8 min-w-[8rem] text-[13px]" value={l.label} onChange={(e) => set(l.id, { label: e.target.value })} />
                    </td>
                  )}
                  {has('balance') && (
                    <td className="w-40">
                      <MoneyInput size="sm" ariaLabel={`${l.label} outstanding balance`} value={l.balance} onChange={(v) => set(l.id, { balance: v })} max={1e9} />
                    </td>
                  )}
                  {has('rate') && (
                    <td className="w-32">
                      <PercentInput size="sm" ariaLabel={`${l.label} interest rate`} value={l.rate} onChange={(v) => set(l.id, { rate: v })} max={60} />
                    </td>
                  )}
                  {has('emi') && (
                    <td className="w-40">
                      <MoneyInput size="sm" ariaLabel={`${l.label} monthly payment`} value={l.emi} onChange={(v) => set(l.id, { emi: v })} max={1e8} />
                    </td>
                  )}
                  <td className="text-right">
                    <button type="button" onClick={() => onChange(loans.filter((x) => x.id !== l.id))} aria-label={`Remove ${l.label}`} className="hit rounded-full p-2 text-grey hover:bg-danger/10 hover:text-danger">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {allowAdd && (
            <Button variant="ghost" size="sm" className="mt-2" icon={<Plus size={14} />} onClick={add}>
              Add a loan
            </Button>
          )}
        </div>
      )}
      {loans.some((l) => l.balance > 0 && l.emi > 0 && l.emi <= (l.balance * l.rate) / 12) && (
        <p role="alert" className="mt-3 text-xs text-danger">
          At least one monthly payment does not cover its interest, so that balance would keep growing.
        </p>
      )}
    </div>
  );
}
