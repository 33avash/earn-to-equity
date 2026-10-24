import { motion, useReducedMotion } from 'motion/react';
import { Fragment, type ReactNode } from 'react';

type Part = string | { text: string; className: string };

/**
 * Headline that rises word by word out of a blur (21st.dev text-reveal pattern). Pass plain strings, or
 * `{ text, className }` for an accented phrase. The full sentence stays in the DOM as text, so screen
 * readers and search read it normally. Static under reduced motion.
 */
export function TextReveal({ parts, delay = 0, stagger = 0.06, className = '' }: { parts: Part[]; delay?: number; stagger?: number; className?: string }) {
  const reduce = useReducedMotion();
  const words: { w: string; cls: string }[] = parts.flatMap((p) => {
    const text = typeof p === 'string' ? p : p.text;
    const cls = typeof p === 'string' ? '' : p.className;
    return text.split(/\s+/).filter(Boolean).map((w) => ({ w, cls }));
  });
  if (reduce) return <span className={className}>{words.map((x, i) => <Word key={i} cls={x.cls}>{x.w}</Word>)}</span>;
  return (
    <span className={className}>
      {words.map((x, i) => (
        <Fragment key={i}>
          <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <motion.span
              className={`inline-block ${x.cls}`}
              initial={{ y: '100%', opacity: 0, filter: 'blur(8px)' }}
              animate={{ y: '0%', opacity: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
              transition={{ duration: 0.9, delay: delay + i * stagger, ease: [0.32, 0.72, 0, 1] }}
            >
              {x.w}
            </motion.span>
          </span>
          {i < words.length - 1 && ' '}
        </Fragment>
      ))}
    </span>
  );
}

function Word({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={cls}>{children} </span>;
}
