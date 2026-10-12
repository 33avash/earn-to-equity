/** Display-only formatting. Calculations never round; only these helpers do. */

const inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr1 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** ₹12,34,567 */
export function formatINR(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '−' : '';
  return `${sign}₹${inr0.format(Math.round(Math.abs(value)))}`;
}

/** ₹12.3 L / ₹1.24 Cr / ₹45,000 — Indian compact notation. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${inr2.format(abs / 1e7)} Cr`;
  if (abs >= 1e5) return `${sign}₹${inr1.format(abs / 1e5)} L`;
  return `${sign}₹${inr0.format(Math.round(abs))}`;
}

export function formatMoney(value: number, compact: boolean): string {
  return compact ? formatCompact(value) : formatINR(value);
}

/** 0.0725 → "7.3%" */
export function formatPct(rate: number, digits = 1): string {
  if (!Number.isFinite(rate)) return '—';
  return `${(rate * 100).toFixed(digits).replace(/\.0+$/, '')}%`;
}

export function formatMonths(months: number | null): string {
  if (months === null || !Number.isFinite(months)) return 'Not reached';
  if (months <= 0) return 'Already there';
  const m = Math.ceil(months);
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (y === 0) return `${r} month${r === 1 ? '' : 's'}`;
  if (r === 0) return `${y} year${y === 1 ? '' : 's'}`;
  return `${y} yr ${r} mo`;
}

/** Axis tick: 12L, 1.2Cr */
export function formatAxis(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}${+(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}${+(abs / 1e5).toFixed(0)}L`;
  if (abs >= 1e3) return `${sign}${+(abs / 1e3).toFixed(0)}k`;
  return `${sign}${abs}`;
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
