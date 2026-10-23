import type { ReactNode } from 'react';
import { Tag } from '@/components/ui/Misc';
import { Reveal } from '@/components/motion/Motion';

/** Editorial page opener for public pages: a tag, an oversized title, and the intro set beside it. */
export function PublicHero({ tag, title, children }: { tag: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="container-x pb-20 pt-10 lg:pb-28 lg:pt-20">
      <Reveal>
        <Tag>{tag}</Tag>
      </Reveal>
      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end">
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
