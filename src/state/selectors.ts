import { useMemo } from 'react';
import { formatMoney } from '@/finance/money';
import { computePlan, type Plan } from './plan';
import { useStore } from './store';

export * from './plan';

export function usePlan(): Plan {
  const profile = useStore((s) => s.profile);
  const assumptions = useStore((s) => s.assumptions);
  return useMemo(() => computePlan(profile, assumptions), [profile, assumptions]);
}

/** Currency formatter honouring the compact-notation display preference. */
export function useMoney() {
  const compact = useStore((s) => s.settings.compact);
  return useMemo(() => (v: number) => formatMoney(v, compact), [compact]);
}
