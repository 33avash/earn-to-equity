import { Badge, type BadgeTone } from '@/components/ui/Misc';
import { goalStatusLabel, useMoney, type GoalPlanStatus, type GoalView } from '@/state/selectors';

export const PLAN_STATUS: Record<GoalPlanStatus, { label: string; tone: BadgeTone }> = {
  funded: { label: 'Paid', tone: 'good' },
  financed: { label: 'Loan needed', tone: 'warn' },
  unfunded: { label: 'Unpaid', tone: 'bad' },
  corpus: { label: 'FI corpus', tone: 'neutral' },
  beyond: { label: 'Beyond plan', tone: 'neutral' },
};

/** Savings, loan and unpaid shares of a goal's cost in its target year. */
export function FundingBar({ view }: { view: GoalView }) {
  const { savings, loan, gap } = view.split;
  if (savings + loan + gap === 0) return <div className="h-1.5 w-full rounded-full bg-line" aria-hidden />;
  return (
    <div
      role="img"
      aria-label={
        view.status === 'unfunded'
          ? `${view.goal.name}: savings would cover ${Math.round(savings * 100)}%, ${Math.round(gap * 100)}% short, so it is not paid`
          : `${view.goal.name}: ${Math.round(savings * 100)}% from savings, ${Math.round(loan * 100)}% by loan`
      }
      className="flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full bg-line"
    >
      {savings > 0 && <div className="h-full bg-forest" style={{ width: `${savings * 100}%` }} />}
      {loan > 0 && <div className="h-full bg-champagne" style={{ width: `${loan * 100}%` }} />}
      {gap > 0 && <div className="h-full bg-danger" style={{ width: `${gap * 100}%` }} />}
    </div>
  );
}

/** Goals in date order, each with the whole-plan status: paid, paid with a loan, or unpaid. */
export function GoalTimeline({ goals }: { goals: GoalView[] }) {
  const money = useMoney();
  const sorted = [...goals].sort((a, b) => a.goal.targetYear - b.goal.targetYear);
  return (
    <ol className="relative">
      {sorted.map((v) => (
        <li key={v.goal.id} className="grid grid-cols-[52px_1fr] gap-4 border-t border-line py-4 first:border-t-0 first:pt-0">
          <span className="num pt-0.5 text-sm font-semibold text-evergreen">{v.goal.targetYear}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="truncate text-[14px] font-semibold text-evergreen">{v.goal.name}</p>
              <Badge tone={PLAN_STATUS[v.status].tone}>{PLAN_STATUS[v.status].label}</Badge>
            </div>
            <div className="mt-2">
              <FundingBar view={v} />
            </div>
            <p className="num mt-1.5 text-xs text-grey">
              {money(v.outcome?.cost ?? v.analysis.futureCost)} then · {goalStatusLabel(v, money)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
