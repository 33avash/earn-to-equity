/**
 * Figure check for model answers. Every rupee amount and percentage in the answer must appear somewhere in
 * the grounding text (plan context, engine facts, reference notes). Anything else is reported so the UI can
 * flag it. Amounts are compared by value, so "₹12.4 L", "₹12.4 lakh" and "₹12,40,000" all match.
 */

const UNIT: Record<string, number> = { k: 1e3, l: 1e5, lac: 1e5, lakh: 1e5, lakhs: 1e5, cr: 1e7, crore: 1e7, crores: 1e7 };

export interface Figure {
  raw: string;
  value: number;
  kind: 'inr' | 'pct';
}

const INR = /(?:₹|rs\.?\s*|inr\s*)\s*(-?\d[\d,]*\d(?:\.\d+)?|-?\d(?:\.\d+)?)\s*(k|l|lac|lakhs?|cr|crores?)?\b/gi;
const BARE_UNIT = /(?<![\w.₹])(-?\d+(?:\.\d+)?)\s*(lakhs?|lac|crores?|cr)\b/gi;
const PCT = /(-?\d+(?:\.\d+)?)\s*%/g;

export function extractFigures(text: string): Figure[] {
  const out: Figure[] = [];
  const taken: [number, number][] = [];
  for (const m of text.matchAll(INR)) {
    const n = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    out.push({ raw: m[0].trim(), value: n * (m[2] ? UNIT[m[2].toLowerCase()] : 1), kind: 'inr' });
    taken.push([m.index!, m.index! + m[0].length]);
  }
  for (const m of text.matchAll(BARE_UNIT)) {
    if (taken.some(([a, b]) => m.index! >= a && m.index! < b)) continue;
    out.push({ raw: m[0].trim(), value: Number(m[1]) * UNIT[m[2].toLowerCase()], kind: 'inr' });
  }
  for (const m of text.matchAll(PCT)) out.push({ raw: m[0].trim(), value: Number(m[1]), kind: 'pct' });
  return out;
}

/** Same figure, allowing for the rounding a compact format introduces (₹12.4 L covers ₹12,35,000–₹12,45,000). */
function close(a: number, b: number, kind: Figure['kind']): boolean {
  if (kind === 'pct') return Math.abs(a - b) <= 0.051;
  const tol = Math.max(1, Math.abs(b) * 0.006);
  return Math.abs(a - b) <= tol;
}

/** Figures in `answer` that don't appear in any of the grounding texts. */
export function unverifiedFigures(answer: string, grounding: string[]): string[] {
  const known = grounding.flatMap(extractFigures);
  const seen = new Set<string>();
  return extractFigures(answer)
    .filter((f) => !known.some((k) => k.kind === f.kind && close(f.value, k.value, f.kind)))
    .filter((f) => !seen.has(f.raw) && Boolean(seen.add(f.raw)))
    .map((f) => f.raw);
}
