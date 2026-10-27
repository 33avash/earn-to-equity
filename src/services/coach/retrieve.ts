import { GLOSSARY } from '@/components/ui/definitions';
import { MODULES } from '@/features/learn/modules';

/**
 * Keyword retrieval over the glossary and the learning centre, so concept questions ("what is ELSS?",
 * "why does inflation matter?") are answered from the app's own lessons rather than the model's memory.
 */

interface Note {
  title: string;
  text: string;
  tokens: Set<string>;
  titleTokens: Set<string>;
}

const STOP = new Set(
  'a an and are as at be by can do does for from how i if in is it its me my of on or should so than that the this to was what when where which who why will with would you your about into more less get am'.split(' '),
);

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));
}

let index: Note[] | null = null;

function build(): Note[] {
  const notes: { title: string; text: string }[] = [
    ...GLOSSARY.map((g) => ({ title: g.term, text: `${g.term}: ${g.def}` })),
    ...MODULES.flatMap((m) => [
      { title: m.title, text: `${m.title}: ${m.summary} Key points: ${m.takeaways.join(' ')}` },
      ...m.body.map((b) => ({ title: m.title, text: b })),
    ]),
  ];
  return notes.map((n) => ({ ...n, tokens: new Set(tokens(n.text)), titleTokens: new Set(tokens(n.title)) }));
}

/** Up to `k` notes that share meaningful words with the question, best first. */
export function retrieve(question: string, k = 3): string[] {
  index ??= build();
  const q = [...new Set(tokens(question))];
  if (!q.length) return [];
  return index
    .map((n) => ({ n, score: q.reduce((s, w) => s + (n.tokens.has(w) ? 1 : 0) + (n.titleTokens.has(w) ? 1.5 : 0), 0) }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.n.text);
}
