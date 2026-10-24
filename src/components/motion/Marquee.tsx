import type { ReactNode } from 'react';

/**
 * Infinite horizontal strip (21st.dev / Magic UI marquee pattern). The children are rendered twice and
 * the track slides by half its width, so the loop is seamless. Hover pauses; reduced motion stops it.
 * The second copy is hidden from assistive tech.
 */
export function Marquee({ children, duration = 40, className = '' }: { children: ReactNode; duration?: number; className?: string }) {
  return (
    <div className={`marquee overflow-hidden ${className}`} style={{ ['--marquee-duration' as string]: `${duration}s` }}>
      <div className="marquee-track flex w-max">
        <div className="flex shrink-0 items-center gap-3 pr-3">{children}</div>
        <div className="flex shrink-0 items-center gap-3 pr-3" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
