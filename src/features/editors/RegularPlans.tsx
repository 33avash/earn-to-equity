import { useMemo } from 'react';
import { Toggle } from '@/components/ui/Form';
import { usePlan, useMoney } from '@/state/selectors';
import { useStore } from '@/state/store';
import { regularPlanCost } from '@/finance/costs';
import { REGULAR_PLAN_DRAG } from '@/finance/assumptions';
import { formatPct } from '@/finance/money';

/**
 * "My funds are regular plans": adds the regular-plan cost to every equity and debt fund and shows what that
 * costs over the plan, from rerunning the projection with direct plans.
 */
export function RegularPlansToggle() {
  const plan = usePlan();
  const money = useMoney();
  const update = useStore((s) => s.updateProfile);
  const share = plan.profile.preferences.regularPlanShare ?? 0;
  const drag = plan.assumptions.regularPlanDrag ?? REGULAR_PLAN_DRAG.value;
  const cost = useMemo(() => (share > 0 ? regularPlanCost(plan.profile, plan.assumptions) : null), [plan.profile, plan.assumptions, share]);
  const partial = share > 0 && share < 1;
  return (
    <div className="flex flex-col gap-2">
      <Toggle
        checked={share > 0}
        onChange={(on) => update((x) => void (x.preferences.regularPlanShare = on ? 1 : 0))}
        label={partial ? `${formatPct(share, 0)} of my funds are regular plans` : 'My funds are regular plans'}
        description={`Regular plans pay a distributor from the fund, about ${formatPct(drag.equity, 2)} a year more on equity funds and ${formatPct(drag.debt, 1)} on debt funds than the direct plan of the same scheme (approximate; check each fund’s TER on AMFI).`}
      />
      {cost && (
        <p className="text-[13px] text-charcoal">
          Over {cost.years} years, regular plans cost you about <strong className="num text-evergreen">{money(cost.nominal)}</strong> ({money(cost.real)} in today’s rupees) on this plan.
        </p>
      )}
    </div>
  );
}
