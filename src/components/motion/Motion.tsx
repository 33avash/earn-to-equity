import { createElement, useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Fades content up once when it first scrolls into view. CSS-only transition. */
export function Reveal({ as = 'div', delay = 0, className = '', children, ...rest }: { as?: ElementType; delay?: number; className?: string; children: ReactNode; [k: string]: unknown }) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced() || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return createElement(as, { ref, className: `reveal ${inView ? 'is-in' : ''} ${className}`, style: { ['--reveal-delay' as string]: `${delay}ms` }, ...rest }, children);
}

/** Smoothly tweens a number towards its new value (eased, ~600ms). Instant under reduced motion. */
export function useTweened(value: number, duration = 650) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);
  useEffect(() => {
    if (!Number.isFinite(value) || prefersReduced()) {
      setDisplay(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const a = from.current;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 4);
      const v = a + (value - a) * eased;
      setDisplay(v);
      from.current = v;
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return display;
}

/** A formatted figure that eases between values when the underlying number changes. */
export function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const v = useTweened(value);
  return (
    <span className="num" aria-label={format(value)}>
      <span aria-hidden>{format(v)}</span>
    </span>
  );
}

/** Slowly drifting, low-saturation colour fields with optional grain. Decorative. */
export function Aurora({ dark = false, grain = true }: { dark?: boolean; grain?: boolean }) {
  return (
    <div aria-hidden className={`aurora ${dark ? 'aurora-dark' : ''} ${grain ? 'grain' : ''}`}>
      <div className="aurora-mid" />
    </div>
  );
}
