import { ArrowRight } from 'lucide-react';
import { MODULES } from '@/features/learn/modules';
import { Button } from '@/components/ui/Button';
import { PublicHero } from '@/components/layout/PublicHero';
import { Reveal } from '@/components/motion/Motion';
import { MicroLessons } from '@/features/landing/MicroLessons';
import { SectionHead } from '@/components/ui/Misc';
import { useStore } from '@/state/store';
import { useExploreDemo } from '@/state/useDemo';
import { useMemo } from 'react';
import { computePlan } from '@/state/selectors';
import { DEFAULT_ASSUMPTIONS, demoProfile } from '@/state/demo';
import { Frame } from '@/components/ui/Misc';
import { SipPreview } from '@/features/sip/SipPreview';
import { LifeScenarios } from '@/features/landing/LifeScenarios';

export default function LearnPublic() {
  const hasPlan = useStore((s) => s.hasPlan);
  const explore = useExploreDemo();
  const open = (id: string) => explore(`/app/learn/${id}`, true);
  const sample = useMemo(() => computePlan(demoProfile(), DEFAULT_ASSUMPTIONS), []);
  return (
    <>
      <PublicHero
        title={
          <>
            Eleven short <span className="serif-accent">lessons</span>
          </>
        }
      >
        <p>Each lesson takes 4 to 8 minutes and has a worked example from the planner’s own engine, the key points and a three-question check.</p>
      </PublicHero>

      <section aria-labelledby="quick-h" className="container-x pb-24 lg:pb-32">
        <SectionHead id="quick-h" title={<>Six lessons in a <span className="serif-accent">minute</span> each</>}>
          <p>Live widgets on the planner’s own engine, each with a one-question check. The full lessons follow below.</p>
        </SectionHead>
        <MicroLessons />
      </section>

      <section aria-labelledby="sip-h" className="container-x pb-24 lg:pb-32">
        <SectionHead id="sip-h" title={<>What could ₹10,000 a month <span className="serif-accent">become?</span></>}>
          <p>Drag the sliders. The chart splits what you put in from what compounding adds.</p>
        </SectionHead>
        <Frame size="xl" className="p-6 sm:p-10 lg:p-12">
          <SipPreview />
        </Frame>
      </section>

      <section aria-labelledby="scen-h" className="container-x pb-24 lg:pb-32">
        <SectionHead id="scen-h" title={<>What-if, <span className="serif-accent">in rupees</span></>}>
          <p>Three changes to the sample plan, each measured in {sample.headline.year} net worth in today’s rupees.</p>
        </SectionHead>
        <Frame size="xl" className="p-6 sm:p-10 lg:p-12">
          <LifeScenarios plan={sample} />
        </Frame>
      </section>

      <div className="container-x">
        <ol className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {MODULES.map((m, i) => (
            <Reveal as="li" key={m.id} id={m.id} delay={(i % 2) * 80} className={`scroll-mt-32 ${i === 0 ? 'md:col-span-2' : ''}`}>
              <div className={`bezel flex h-full flex-col p-7 sm:p-10 ${i === 0 ? 'lg:grid lg:grid-cols-12 lg:gap-10' : ''}`}>
                <div className={i === 0 ? 'lg:col-span-7' : ''}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="num text-[40px] font-light leading-none tracking-[-0.06em] text-forest/80">{String(i + 1).padStart(2, '0')}</span>
                    <span className="num rounded-full bg-muted px-3 py-1 text-xs text-grey">{m.minutes} min</span>
                  </div>
                  <h2 className={`mt-8 font-semibold leading-snug tracking-[-0.02em] ${i === 0 ? 'text-[28px] sm:text-[34px]' : 'text-[22px]'}`}>{m.title}</h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-grey">{m.summary}</p>
                </div>
                <div className={`mt-8 flex flex-1 flex-col justify-between gap-8 ${i === 0 ? 'lg:col-span-5 lg:mt-0' : ''}`}>
                  <ul className="well space-y-2 p-5 text-sm text-charcoal">
                    {m.takeaways.map((t) => (
                      <li key={t} className="flex gap-3">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-champagne" aria-hidden />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <Button variant="secondary" size="sm" className="self-start" onClick={() => open(m.id)}>
                    Open lesson <ArrowRight size={14} aria-hidden />
                  </Button>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
        {!hasPlan && <p className="mt-10 text-xs text-grey">Opening a lesson loads the demo plan so its examples can link to the tools.</p>}
      </div>
    </>
  );
}
