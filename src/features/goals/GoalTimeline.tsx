import type { GoalAnalysis, GoalStatus } from '@/finance/goals';
import { Badge, Progress, type BadgeTone } from '@/components/ui/Misc';
import { useMoney } from '@/state/selectors';

export const STATUS: Record<GoalStatus, { label: string; tone: BadgeTone }> = {
  funded: { label: 'Funded', tone: 'good' },
  'on-track': { label: 'On track', tone: 'good' },
  'at-risk': { label: 'At risk', tone: 'warn' },
  shortfall: { label: 'Shortfall', tone: 'bad' },
  overdue: { label: 'Overdue', tone: 'bad' },
};

/** Goals in date order with future cost, funding progress and an honest status. */
export function GoalTimeline({ goals, compact = false }: { goals: GoalAnalysis[]; compact?: boolean }) {
  const money = useMoney();
  const sorted = [...goals].sort((a, b) => a.goal.targetYear - b.goal.targetYear);
  return (
    <ol className="relative">
      {sorted.map((g) => (
        <li key={g.goal.id} className="grid grid-cols-[52px_1fr] gap-4 border-t border-line py-4 first:border-t-0 first:pt-0">
          <span className="num pt-0.5 text-sm font-semibold text-evergreen">{g.goal.targetYear}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="truncate text-[14px] font-semibold text-evergreen">{g.goal.name}</p>
              <Badge tone={STATUS[g.status].tone}>{STATUS[g.status].label}</Badge>
            </div>
            <div className="mt-2">
              <Progress value={g.fundedPct} label={`${g.goal.name} funded`} tone={g.status === 'shortfall' || g.status === 'overdue' ? 'danger' : g.status === 'at-risk' ? 'champagne' : 'forest'} />
            </div>
            <p className="num mt-1.5 text-xs text-grey">
              {money(g.futureCost)} needed · {Math.round(g.fundedPct * 100)}% covered by savings
              {!compact && Number.isFinite(g.requiredMonthly) && g.requiredMonthly > 0 && <> · needs {money(g.requiredMonthly)}/mo</>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
