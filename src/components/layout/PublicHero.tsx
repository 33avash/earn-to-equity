import type { ReactNode } from 'react';
import { Reveal } from '@/components/motion/Motion';

/** Page opener for public pages: an oversized title and the intro beside it, over a soft glow. */
export function PublicHero({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <header className="container-x relative pb-20 pt-10 lg:pb-28 lg:pt-20">
      <div aria-hidden className="glow -top-24 right-0 h-[26rem] w-[26rem]" />
      <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <Reveal delay={80} className="lg:col-span-8">
          <h1 className="display text-[48px] leading-[0.95] sm:text-[72px] lg:text-[96px]">{title}</h1>
        </Reveal>
        {children && (
          <Reveal delay={160} className="text-[17px] leading-relaxed text-grey lg:col-span-4 lg:pb-3">
            {children}
          </Reveal>
        )}
      </div>
    </header>
  );
}
