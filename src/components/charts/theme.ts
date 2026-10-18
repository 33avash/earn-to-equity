import { useEffect, useMemo, useState } from 'react';
import type { AssetClass } from '@/types/profile';

/** Reads a theme token (an "r g b" triplet on :root or .dark) as a colour string SVG attributes accept. */
function token(name: string, alpha = 1): string {
  if (typeof document === 'undefined') return 'rgb(0,0,0)';
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return 'rgb(0,0,0)';
  return alpha === 1 ? `rgb(${parts.join(',')})` : `rgba(${parts.join(',')},${alpha})`;
}

export function useIsDark() {
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/**
 * Chart colours, all from CSS variables (src/index.css), so every chart follows the theme.
 * Asset classes use the categorical chart-1…7 palette; every allocation chart also shows labels and values.
 */
export function useChartTheme() {
  const dark = useIsDark();
  return useMemo(() => {
    const asset: Record<AssetClass, string> = {
      indianEquity: token('--chart-1'),
      intlEquity: token('--chart-2'),
      debt: token('--chart-5'),
      govtSchemes: token('--chart-3'),
      gold: token('--chart-6'),
      cash: token('--chart-7'),
      other: token('--chart-4'),
    };
    return {
      dark,
      primary: token('--chart-1'),
      primaryFill: token('--chart-1'),
      secondary: token('--chart-3'),
      muted: token('--chart-5'),
      grid: token('--chart-grid'),
      axis: token('--chart-axis'),
      surface: token('--card'),
      ink: token('--foreground'),
      danger: token('--danger'),
      asset,
      scenario: { conservative: token('--chart-4'), base: token('--chart-1'), high: token('--chart-2') },
      chart: [1, 2, 3, 4, 5, 6, 7].map((i) => token(`--chart-${i}`)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed when the theme class changes
  }, [dark]);
}
export type ChartTheme = ReturnType<typeof useChartTheme>;

export const axisProps = (t: ChartTheme) => ({
  stroke: t.axis,
  tick: { fill: t.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
});
