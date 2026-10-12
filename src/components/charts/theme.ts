import { useEffect, useState } from 'react';
import type { AssetClass } from '@/types/profile';

/**
 * Categorical palette for asset classes — fixed order, validated with the dataviz
 * palette checker (lightness band, chroma, CVD and normal-vision separation) for each mode.
 * Gold and light-green fall below 3:1 against the surface in light mode, so every
 * allocation chart is paired with visible labels and values.
 */
const ASSET_LIGHT: Record<AssetClass, string> = {
  indianEquity: '#138A5F',
  intlEquity: '#C08A2E',
  debt: '#3F6FA8',
  govtSchemes: '#C0573E',
  gold: '#8B5FB0',
  cash: '#6FA85E',
  other: '#A8507E',
};
const ASSET_DARK: Record<AssetClass, string> = {
  indianEquity: '#2FA578',
  intlEquity: '#B88428',
  debt: '#5A8BD0',
  govtSchemes: '#D0674C',
  gold: '#A07ACB',
  cash: '#6AA35A',
  other: '#B8608C',
};

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

export function useChartTheme() {
  const dark = useIsDark();
  return dark
    ? {
        dark,
        primary: '#86B298',
        primaryFill: '#86B298',
        secondary: '#D4B88A',
        muted: '#6E7A72',
        grid: '#2C3A33',
        axis: '#A0A59C',
        surface: '#151F1B',
        ink: '#E8EAE4',
        danger: '#E8806C',
        asset: ASSET_DARK,
        scenario: { conservative: '#D0674C', base: '#86B298', high: '#5A8BD0' },
      }
    : {
        dark,
        primary: '#183D32',
        primaryFill: '#183D32',
        secondary: '#B08A4E',
        muted: '#A8B9A0',
        grid: '#E9E7DF',
        axis: '#696C65',
        surface: '#FFFFFF',
        ink: '#252A27',
        danger: '#A03C2D',
        asset: ASSET_LIGHT,
        scenario: { conservative: '#C0573E', base: '#183D32', high: '#3F6FA8' },
      };
}
export type ChartTheme = ReturnType<typeof useChartTheme>;

export const axisProps = (t: ChartTheme) => ({
  stroke: t.axis,
  tick: { fill: t.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
});
