import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades content up 10px over 250ms the first time it scrolls into view. */
export function Reveal({ as = 'div', delay = 0, className = '', children, ...rest }: { as?: 'div' | 'li' | 'section'; delay?: number; className?: string; children: ReactNode; [k: string]: unknown }) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.25, delay: delay / 1000, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Number that tweens to its new value (a number ticker). Instant under reduced motion. */
export function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!Number.isFinite(value) || reduce || !inView) {
      from.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.6,
      ease: EASE,
      onUpdate: (v) => {
        from.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value, reduce, inView]);
  return (
    <span ref={ref} className="num">
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden>{format(display)}</span>
    </span>
  );
}

/** Route-level fade and lift when the page changes. */
export function PageTransition({ id, children }: { id: string; children: ReactNode }) {
  return (
    <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Faint grid that fades towards the edges, with a soft accent glow. Decorative. */
export function GridBackground() {
  return <div aria-hidden className="grid-bg" />;
}

/** Card whose border glows where the pointer is. */
export function Spotlight({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`spotlight ${className}`}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--x', `${e.clientX - r.left}px`);
        el.style.setProperty('--y', `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}
