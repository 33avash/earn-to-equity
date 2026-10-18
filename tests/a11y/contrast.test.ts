import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * Colour contrast for both themes, computed from the tokens in src/index.css (WCAG 2.x relative luminance).
 * axe can't measure contrast in jsdom, so this test is the contrast check.
 */

const css = readFileSync('src/index.css', 'utf8');

function tokens(selector: ':root' | '.dark'): Record<string, [number, number, number]> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf('\n}', start));
  const out: Record<string, [number, number, number]> = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g)) out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return out;
}

const lum = ([r, g, b]: [number, number, number]) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: [number, number, number], b: [number, number, number]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const TEXT = ['foreground', 'body', 'muted-foreground', 'accent', 'success', 'warning', 'danger'];
const SURFACES = ['background', 'card', 'muted'];

describe.each([':root', '.dark'] as const)('contrast in %s', (theme) => {
  const t = tokens(theme);
  const light = tokens(':root');
  const get = (k: string) => t[k] ?? light[k];

  it.each(TEXT.flatMap((fg) => SURFACES.map((bg) => [fg, bg])))('%s text on %s is at least 4.5:1', (fg, bg) => {
    expect(ratio(get(fg), get(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('primary buttons (background-coloured text on foreground) are at least 4.5:1', () => {
    expect(ratio(get('background'), get('foreground'))).toBeGreaterThanOrEqual(4.5);
  });

  it('accent buttons are at least 4.5:1', () => {
    expect(ratio(get('accent-foreground'), get('accent'))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['border-strong', 'accent', 'ring'])('%s (controls, focus rings) is at least 3:1 on background and card', (ui) => {
    expect(ratio(get(ui), get('background'))).toBeGreaterThanOrEqual(3);
    expect(ratio(get(ui), get('card'))).toBeGreaterThanOrEqual(3);
  });

  it.each(['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-6'])('%s chart colour is at least 3:1 on card', (c) => {
    expect(ratio(get(c), get('card'))).toBeGreaterThanOrEqual(3);
  });
});
