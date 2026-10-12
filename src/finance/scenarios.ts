import type { Assumptions, FinancialProfile, ScenarioDeltas, ScenarioKey } from '@/types/profile';
import type { SimOverrides, SimResult } from '@/types/sim';
import { simulate } from './simulate';

export const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  conservative: 'Conservative',
  base: 'Base case',
  high: 'High growth',
};

/** Default deltas applied on top of the user's own assumptions. Editable in the Wealth Simulator. */
export const DEFAULT_SCENARIO_DELTAS: Record<ScenarioKey, ScenarioDeltas> = {
  conservative: { salaryGrowth: -0.03, returns: -0.02, inflation: 0.01, sipStepUp: -0.05 },
  base: { salaryGrowth: 0, returns: 0, inflation: 0, sipStepUp: 0 },
  high: { salaryGrowth: 0.03, returns: 0.015, inflation: -0.005, sipStepUp: 0.05 },
};

export function scenarioOverrides(p: FinancialProfile, a: Assumptions, d: ScenarioDeltas): SimOverrides {
  return {
    salaryGrowth: Math.max(-0.5, p.income.salaryGrowth + d.salaryGrowth),
    inflation: Math.max(0, a.inflation + d.inflation),
    returnShift: d.returns,
    sipStepUp: Math.max(0, a.sipStepUp + d.sipStepUp),
  };
}

export function runScenario(p: FinancialProfile, a: Assumptions, d: ScenarioDeltas): SimResult {
  return simulate(p, a, scenarioOverrides(p, a, d));
}

export type DriverKey = keyof ScenarioDeltas;
export const DRIVER_LABELS: Record<DriverKey, string> = {
  salaryGrowth: 'Salary growth',
  returns: 'Investment returns',
  inflation: 'Inflation',
  sipStepUp: 'Annual SIP step-up',
};

/**
 * One-at-a-time attribution: how much of the scenario's change in final net worth
 * comes from each assumption when only that assumption differs from the base case.
 * Interactions mean the parts need not sum exactly to the total; the remainder is reported.
 */
export function attributeScenario(p: FinancialProfile, a: Assumptions, d: ScenarioDeltas) {
  const base = simulate(p, a).rows.at(-1)!.netWorth;
  const full = runScenario(p, a, d).rows.at(-1)!.netWorth;
  const zero: ScenarioDeltas = { salaryGrowth: 0, returns: 0, inflation: 0, sipStepUp: 0 };
  const parts = (Object.keys(DRIVER_LABELS) as DriverKey[]).map((k) => {
    const only = { ...zero, [k]: d[k] };
    const v = runScenario(p, a, only).rows.at(-1)!.netWorth;
    return { driver: k, label: DRIVER_LABELS[k], impact: v - base };
  });
  const explained = parts.reduce((s, x) => s + x.impact, 0);
  return { base, scenario: full, total: full - base, parts, interaction: full - base - explained };
}
