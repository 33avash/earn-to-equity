import { HRA_RULES, type CityTier, type StateCode } from './assumptions';

/**
 * Cities the planner knows by name. A city sets the state (professional tax, stamp duty), the city tier
 * (health-cover benchmark) and whether the 50% HRA rule applies. Anywhere else, pick a state and tier.
 */
export type CityKey = 'mumbai' | 'pune' | 'delhi' | 'gurugram' | 'noida' | 'bengaluru' | 'hyderabad' | 'chennai' | 'kolkata' | 'ahmedabad' | 'other';

export interface CityInfo {
  label: string;
  state: StateCode;
  tier: CityTier;
  /** Name as it appears in the HRA city list, if it is on it. */
  hraName?: string;
}

export const CITIES: Record<CityKey, CityInfo> = {
  mumbai: { label: 'Mumbai', state: 'MH', tier: 1, hraName: 'Mumbai' },
  pune: { label: 'Pune', state: 'MH', tier: 1, hraName: 'Pune' },
  delhi: { label: 'Delhi', state: 'DL', tier: 1, hraName: 'Delhi' },
  gurugram: { label: 'Gurugram', state: 'HR', tier: 1 },
  noida: { label: 'Noida', state: 'UP', tier: 1 },
  bengaluru: { label: 'Bengaluru', state: 'KA', tier: 1, hraName: 'Bengaluru' },
  hyderabad: { label: 'Hyderabad', state: 'TS', tier: 1, hraName: 'Hyderabad' },
  chennai: { label: 'Chennai', state: 'TN', tier: 1, hraName: 'Chennai' },
  kolkata: { label: 'Kolkata', state: 'WB', tier: 1, hraName: 'Kolkata' },
  ahmedabad: { label: 'Ahmedabad', state: 'GJ', tier: 2, hraName: 'Ahmedabad' },
  other: { label: 'Somewhere else', state: 'OTHER', tier: 2 },
};

/** True when HRA can be exempt up to 50% of basic (the eight listed cities), not 40%. */
export function isHraMetro(city: CityKey | undefined): boolean {
  const name = city ? CITIES[city].hraName : undefined;
  return !!name && HRA_RULES.value.metroCities.includes(name);
}
