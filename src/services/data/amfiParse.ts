/**
 * AMFI's daily NAV file (NAVAll.txt): semicolon-separated rows under "Open Ended Schemes(<category>)" headings
 * and fund-house names. Two layouts exist: the current one with Plan and Option columns (8 fields) and the older
 * one without (6 fields). Shared by the Worker, the dev server and the tests.
 */

export interface AmfiScheme {
  code: number;
  name: string;
  category: string; // e.g. "Equity Scheme - Large Cap Fund"
  plan: 'Direct' | 'Regular' | null;
  option: string | null; // e.g. "Growth Option"
  nav: number;
  date: string; // as written by AMFI, e.g. "26-Oct-2026"
}

/** "Direct" or "Regular" from AMFI's plan column or, failing that, the scheme name. */
export function planType(name: string, planColumn?: string | null): 'Direct' | 'Regular' | null {
  const s = `${planColumn ?? ''} ${name}`.toLowerCase();
  if (/\bdirect\b/.test(s)) return 'Direct';
  if (/\bregular\b|\bretail\b|\bstandard\b/.test(s)) return 'Regular';
  return null;
}

export function parseNavAll(text: string): Map<number, AmfiScheme> {
  const out = new Map<number, AmfiScheme>();
  let category = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.match(/^(?:Open|Close|Interval) Ended Schemes\s*\((.*)\)\s*$/i);
    if (head) {
      category = head[1].trim();
      continue;
    }
    const c = line.split(';');
    if (c.length < 6 || !/^\d+$/.test(c[0])) continue;
    const eight = c.length >= 8;
    const name = c[3].trim();
    const nav = Number(eight ? c[6] : c[4]);
    if (!Number.isFinite(nav) || nav <= 0) continue;
    out.set(Number(c[0]), {
      code: Number(c[0]),
      name,
      category,
      plan: planType(name, eight ? c[4] : null),
      option: eight ? c[5].trim() || null : null,
      nav,
      date: (eight ? c[7] : c[5]).trim(),
    });
  }
  return out;
}
