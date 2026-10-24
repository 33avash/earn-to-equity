import { useId } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';

/*
 * "Stacked ascent" mark: three rounded, slanted bars that step up and to the right. They read as an E
 * and as a rising chart: the bottom bar is what you earn, the top bar the equity it compounds into.
 * Drawn on a 32 grid; bars are 6 units tall with a 2-unit gap so they stay crisp down to 16 px.
 */
const BARS = [
  { x: 10, y: 21, w: 16, o: 0.55 }, // earn
  { x: 13, y: 13, w: 12, o: 0.8 },
  { x: 15, y: 5, w: 15, o: 1 }, // equity
];

export function Mark({ size = 22, mono = false, animate = true }: { size?: number; mono?: boolean; animate?: boolean }) {
  const id = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const live = animate && !reduce;
  return (
    <motion.svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0 overflow-visible" initial="rest" whileHover={live ? 'hover' : undefined} animate="rest">
      {!mono && (
        <defs>
          <linearGradient id={`e2e-${id}`} x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: 'rgb(var(--chart-2))' }} />
            <stop offset="1" style={{ stopColor: 'rgb(var(--accent))' }} />
          </linearGradient>
        </defs>
      )}
      <g transform="skewX(-14)">
        {BARS.map((b, i) => (
          <motion.g key={i} variants={{ rest: { y: 0 }, hover: { y: [0, -2.5, 0] } }} transition={{ duration: 0.55, delay: (2 - i) * 0.07, ease: [0.32, 0.72, 0, 1] }}>
            <rect x={b.x} y={b.y} width={b.w} height={6} rx={3} fill={mono ? 'currentColor' : `url(#e2e-${id})`} fillOpacity={b.o} />
          </motion.g>
        ))}
      </g>
    </motion.svg>
  );
}

/** Lowercase geometric wordmark: "to" sits lighter and quieter between the two words that matter. */
export function Wordmark({ to = '/', compact = false }: { to?: string; inverse?: boolean; compact?: boolean }) {
  return (
    <Link to={to} className="hit group flex items-center gap-2 rounded-sm" aria-label="Earn to Equity home">
      <Mark />
      {!compact && (
        <span className="text-[16px] font-semibold leading-none tracking-[-0.045em] text-evergreen">
          earn<span className="mx-[0.18em] font-normal text-grey">to</span>equity
        </span>
      )}
    </Link>
  );
}
