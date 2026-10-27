import { Fragment, type ReactNode } from 'react';

/**
 * Renders coach answers: paragraphs, "- " / "• " bullets, numbered lists and **bold**. Builds React nodes
 * from plain text, so model output can never inject markup.
 */

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-semibold text-evergreen">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

type Block = { kind: 'p'; text: string } | { kind: 'ul' | 'ol'; items: string[] };

const BULLET = /^\s*(?:[-•*])\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.replace(/^#{1,6}\s+/, '').trimEnd();
    const last = blocks[blocks.length - 1];
    if (!line.trim()) {
      blocks.push({ kind: 'p', text: '' });
    } else if (BULLET.test(line) || NUMBER.test(line)) {
      const kind = BULLET.test(line) ? 'ul' : 'ol';
      const item = line.replace(kind === 'ul' ? BULLET : NUMBER, '');
      if (last && last.kind === kind) last.items.push(item);
      else blocks.push({ kind, items: [item] });
    } else if (last && last.kind === 'p' && last.text) {
      last.text += `\n${line}`;
    } else {
      blocks.push({ kind: 'p', text: line });
    }
  }
  return blocks.filter((b) => b.kind !== 'p' || b.text);
}

export function RichText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`space-y-3 text-[14.5px] leading-relaxed text-charcoal ${className}`}>
      {parseBlocks(text).map((b, i) =>
        b.kind === 'p' ? (
          <p key={i} className="whitespace-pre-line">
            {inline(b.text)}
          </p>
        ) : b.kind === 'ul' ? (
          <ul key={i} className="ml-1 space-y-1.5">
            {b.items.map((it, j) => (
              <li key={j} className="relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-sage">
                {inline(it)}
              </li>
            ))}
          </ul>
        ) : (
          <ol key={i} className="ml-5 list-decimal space-y-1.5 marker:text-grey">
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </ol>
        ),
      )}
    </div>
  );
}
