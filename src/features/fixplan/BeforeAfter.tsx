import { ArrowRight } from 'lucide-react';
import type { PlanMetrics } from '@/finance/fixPlan';

/* The before → after strip and impact chips, kept free of engine imports so the landing page can use them. */

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

