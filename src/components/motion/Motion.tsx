import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;
/** Heavy spring-like curve used for entry motion. */
export const SPRING = [0.32, 0.72, 0, 1] as const;

/** Fades content up and out of a soft blur the first time it scrolls into view. Static under reduced motion. */
export function Reveal({ as = 'div', delay = 0, className = '', children, ...rest }: { as?: 'div' | 'li' | 'section'; delay?: number; className?: string; children: ReactNode; [k: string]: unknown }) {
  const Tag = motion[as];
  const reduce = useReducedMotion();
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y: 48, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.9, delay: delay / 1000, ease: SPRING }}
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
    <motion.div key={id} initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }} transition={{ duration: 0.7, ease: SPRING }}>
      {children}
    </motion.div>
  );
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

/** Fixed ambient light orbs and film grain. Decorative, painted once, never repaints on scroll. */
export function Atmosphere() {
  return (
    <>
      <div aria-hidden className="ambient" />
      <div aria-hidden className="grain" />
    </>
  );
}
