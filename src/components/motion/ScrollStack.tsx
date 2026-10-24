import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';

/**
 * Cards that pin one after another and stack as you scroll; each card sinks back and dims slightly as
 * the next lands on top of it (21st.dev stacking-cards pattern). On small screens and under reduced
 * motion the cards are a plain vertical list.
 */
export function ScrollStack({ items }: { items: ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  return (
    <div ref={ref} className="relative flex flex-col gap-6 lg:gap-0">
      {items.map((item, i) => (
        <StackCard key={i} i={i} n={items.length} progress={scrollYProgress} still={!!reduce} last={i === items.length - 1}>
          {item}
        </StackCard>
      ))}
    </div>
  );
}

function StackCard({ i, n, progress, still, last, children }: { i: number; n: number; progress: MotionValue<number>; still: boolean; last: boolean; children: ReactNode }) {
  const start = i / n;
  const scale = useTransform(progress, [start, 1], [1, 1 - (n - 1 - i) * 0.05]);
  const opacity = useTransform(progress, [start, 1], [1, 1 - (n - 1 - i) * 0.25]);
  return (
    <div className={last ? 'lg:sticky' : 'lg:sticky lg:h-[62vh] lg:min-h-[420px]'} style={{ top: `calc(7rem + ${i * 28}px)` }}>
      <motion.div style={still ? undefined : { scale, opacity }} className="origin-top">
        {children}
      </motion.div>
    </div>
  );
}
