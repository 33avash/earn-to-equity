import type { SimResult } from '@/types/sim';
import { sectionLabel } from './sections';

export interface RegimeYear {
  year: number;
  age: number;
  regime: 'new' | 'old';
  taxNew: number;
  taxOld: number;
  reason: string;
}

/**
 * The cheaper regime for each salaried year of the projection and why, read from the engine's own tax figures.
 * No new maths: the projection already works out both regimes every year.
 */
export function regimeTimeline(sim: SimResult, money: (n: number) => string): RegimeYear[] {
  return sim.rows
    .filter((r) => r.regime && r.tax)
    .map((r) => {
      const t = r.tax!;
      const diff = Math.abs(t.new - t.old);
      let reason: string;
      if (r.regime === 'old') {
        const parts = [t.homeLoanInterest > 0 && `home-loan interest ${money(t.homeLoanInterest)}`, t.hraExemption > 0 && `HRA ${money(t.hraExemption)}`, t.sec123 > 0 && `${sectionLabel('80C')} ${money(t.sec123)}`].filter(Boolean);
        reason = `Old regime saves ${money(diff)}: ${parts.length ? parts.join(' + ') : 'your deductions'} outweigh the new-regime slabs.`;
      } else if (t.new === 0) reason = `New regime: income is within the ₹12 L rebate (${sectionLabel('87A')}), so no tax.`;
      else if (diff < 1) reason = 'Both regimes cost the same; the new regime is the default.';
      else reason = `New regime saves ${money(diff)}: its lower slabs beat your old-regime deductions.`;
      return { year: r.year, age: r.age, regime: r.regime!, taxNew: t.new, taxOld: t.old, reason };
    });
}

/** "Old regime from 2039: …" for each change of regime, so the caption can say when and why it switches. */
export function regimeSwitches(years: RegimeYear[]): { from: number; regime: 'new' | 'old'; reason: string }[] {
  return years.filter((y, i) => i === 0 || y.regime !== years[i - 1].regime).map((y) => ({ from: y.year, regime: y.regime, reason: y.reason }));
}
