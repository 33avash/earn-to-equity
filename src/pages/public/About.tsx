import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Bezel } from '@/components/ui/Misc';
import { Reveal } from '@/components/motion/Motion';

const TEAM = ['Atulya Singh', 'Avash Srivastava', 'Aayushi Paul', 'Agustyae Gupta'];

export default function About() {
  return (
    <div className="container-x pt-10 lg:pt-20">
      <Reveal>
        <h1 className="display max-w-5xl text-[48px] leading-[0.95] sm:text-[72px] lg:text-[96px]">
          About Earn to <span className="serif-accent">Equity</span>
        </h1>
      </Reveal>

      <div className="mt-20 grid gap-16 lg:mt-28 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <p className="text-[24px] font-medium leading-[1.3] tracking-[-0.02em] text-evergreen sm:text-[30px]">
            Most young earners in India get their first salary with little guidance on what to do with it. Advice is either generic ("save 20%") or product-led ("buy this fund"). Neither connects today’s paycheck to the life someone actually wants in ten or twenty years.
          </p>
          <div className="mt-12 space-y-6 text-[16px] leading-relaxed text-grey">
            <p>
              Earn to Equity puts your current position, your goals and the long-term effect of each decision in one model. You can see how a promotion, a flat, a career break or a market fall changes your net worth in 2046.
            </p>
            <p>Every screen helps with one question: what could you change this month to reach the goals you have set?</p>
          </div>
        </Reveal>
        <Reveal delay={120} className="lg:col-span-4 lg:col-start-9">
          <Bezel className="p-7 sm:p-8 lg:sticky lg:top-36">
            <p className="eyebrow">Project team</p>
            <ul className="mt-6 flex flex-col gap-3">
              {TEAM.map((n) => (
                <li key={n} className="flex items-center gap-4">
                  <span className="well flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-forest" aria-hidden>
                    {n
                      .split(' ')
                      .map((w) => w[0])
                      .join('')}
                  </span>
                  <span className="text-[17px] font-medium text-evergreen">{n}</span>
                </li>
              ))}
            </ul>
            <ButtonLink to="/start" className="mt-10 w-full">
              Build your plan <ArrowRight size={15} aria-hidden />
            </ButtonLink>
          </Bezel>
        </Reveal>
      </div>
    </div>
  );
}
