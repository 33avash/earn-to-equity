import { useEffect, useId, useState, type RefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * A curved line between two elements with a pulse of light running along it (Magic UI animated-beam
 * pattern). Positions are measured from the DOM and re-measured on resize, so it works in any layout.
 * Render it inside `container` (position: relative). Decorative: hidden from assistive tech.
 */
export function AnimatedBeam({
  container,
  from,
  to,
  curvature = 0,
  reverse = false,
  duration = 3.2,
  delay = 0,
}: {
  container: RefObject<HTMLElement | null>;
  from: RefObject<HTMLElement | null>;
  to: RefObject<HTMLElement | null>;
  curvature?: number;
  reverse?: boolean;
  duration?: number;
  delay?: number;
}) {
  const id = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const [d, setD] = useState('');
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const measure = () => {
      const c = container.current?.getBoundingClientRect();
      const a = from.current?.getBoundingClientRect();
      const b = to.current?.getBoundingClientRect();
      if (!c || !a || !b) return;
      const sx = a.left - c.left + a.width / 2;
      const sy = a.top - c.top + a.height / 2;
      const ex = b.left - c.left + b.width / 2;
      const ey = b.top - c.top + b.height / 2;
      const mx = (sx + ex) / 2;
      setBox({ w: c.width, h: c.height });
      setD(`M ${sx},${sy} Q ${mx},${(sy + ey) / 2 - curvature} ${ex},${ey}`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (container.current) ro.observe(container.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [container, from, to, curvature]);

  if (!d) return null;
  const [x0, x1] = reverse ? ['90%', '-10%'] : ['10%', '110%'];
  return (
    <svg aria-hidden className="pointer-events-none absolute left-0 top-0" width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} fill="none">
      <path d={d} stroke="rgb(var(--border))" strokeWidth={1.5} strokeLinecap="round" />
      {!reduce && (
        <>
          <path d={d} stroke={`url(#beam-${id})`} strokeWidth={2} strokeLinecap="round" />
          <defs>
            <motion.linearGradient
              id={`beam-${id}`}
              gradientUnits="userSpaceOnUse"
              initial={{ x1: x0, x2: x0, y1: '0%', y2: '0%' }}
              animate={{ x1: [x0, x1], x2: [reverse ? '100%' : '0%', reverse ? '-20%' : '120%'] }}
              transition={{ duration, delay, repeat: Infinity, ease: [0.16, 1, 0.3, 1], repeatDelay: 0.6 }}
            >
              <stop stopColor="rgb(var(--accent))" stopOpacity="0" />
              <stop offset="0.35" stopColor="rgb(var(--accent))" />
              <stop offset="0.65" stopColor="rgb(var(--accent))" />
              <stop offset="1" stopColor="rgb(var(--accent))" stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </>
      )}
    </svg>
  );
}
