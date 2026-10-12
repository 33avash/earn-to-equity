import { Plus, Trash2 } from 'lucide-react';
import type { LineItem } from '@/types/profile';
import { MoneyInput } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { uid } from '@/state/demo';
import { useMoney } from '@/state/selectors';

/** Editable list of monthly amounts (expense categories). */
export function LineItemsEditor({ items, onChange, addLabel, title }: { items: LineItem[]; onChange: (items: LineItem[]) => void; addLabel: string; title: string }) {
  const money = useMoney();
  const total = items.reduce((s, i) => s + Math.max(0, i.amount), 0);
  const set = (id: string, patch: Partial<LineItem>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  return (
    <div>
      <table className="table-fin w-full">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col" className="w-[44%] sm:w-48">
              Monthly
            </th>
            <th scope="col" className="w-10">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>
                <input aria-label="Category name" className="input h-9 border-transparent bg-transparent px-1 hover:border-line" value={i.label} onChange={(e) => set(i.id, { label: e.target.value })} />
              </td>
              <td>
                <MoneyInput size="sm" ariaLabel={`${i.label || 'Item'} per month`} value={i.amount} onChange={(v) => set(i.id, { amount: v })} max={1e8} />
              </td>
              <td className="text-right">
                <button type="button" onClick={() => onChange(items.filter((x) => x.id !== i.id))} aria-label={`Remove ${i.label || 'item'}`} className="rounded p-1.5 text-grey hover:bg-danger/10 hover:text-danger">
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="!border-t-2 !border-evergreen/20 font-semibold text-evergreen">Total</td>
            <td className="!border-t-2 !border-evergreen/20 num font-semibold text-evergreen">{money(total)}</td>
            <td className="!border-t-2 !border-evergreen/20" />
          </tr>
        </tfoot>
      </table>
      <Button variant="ghost" size="sm" className="mt-2" icon={<Plus size={14} />} onClick={() => onChange([...items, { id: uid(), label: '', amount: 0 }])}>
        {addLabel}
      </Button>
    </div>
  );
}
