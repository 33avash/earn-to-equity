import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Copy rules (Phase 4). The interface says what things are and shows the numbers; it never claims a virtue.
 * This test fails if a retired line or a banned pattern comes back anywhere in src/ or index.html.
 */

const RETIRED = [
  'No bank logins',
  'Your salary is where your wealth story begins',
  'One model. Three honest questions.',
  'Three honest questions',
  'Goals that tell the truth',
  'Adding a goal doesn’t make it affordable',
  'Stress tests you can feel',
  'A coach that only quotes your numbers',
  'Small decisions, twenty years later',
  'A year-by-year engine, not a single number',
  'Make your next financial decision with a clearer picture of the future',
  'first-salary generation',
  'without a job',
  'Build My Wealth Plan',
  'Fourteen tools. One financial model.',
  'Financial confidence, one idea at a time',
  'From your first paycheck to your future wealth',
];

const PATTERNS: [string, RegExp][] = [
  ['honest', /\bhonest(ly)?\b/i],
  ['truth', /\btruth\b/i],
  ['feel', /\bfeel(s)?\b/i],
  ['not just', /\bnot just\b/i],
  ['isn’t just', /\bisn['’]t just\b/i],
  ['story', /\bstor(y|ies)\b/i],
  ['journey', /\bjourney\b/i],
  // Copy only: CSS colour values (bg-transparent, fill="transparent", 'transparent') are not claims.
  ['transparent', /(?<![-\w'"])transparent(?![-\w'"])/i],
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|html|json)$/.test(f) ? [p] : [];
  });
}

const sources = [...files('src'), 'index.html'].map((path) => ({ path, text: readFileSync(path, 'utf8') }));

describe('copy rules', () => {
  it.each(RETIRED)('“%s” is gone', (line) => {
    expect(sources.filter((s) => s.text.includes(line)).map((s) => s.path)).toEqual([]);
  });
  it.each(PATTERNS)('no “%s”', (_, re) => {
    expect(sources.filter((s) => re.test(s.text)).map((s) => s.path)).toEqual([]);
  });
});
