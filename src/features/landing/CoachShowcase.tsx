import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowRight, Cpu, ShieldCheck, Calculator } from 'lucide-react';
import { btn } from '@/components/ui/Button';
import { Frame } from '@/components/ui/Misc';
import { Mark } from '@/components/layout/Wordmark';
import { RichText } from '@/features/coach/RichText';
import { answerWithRules } from '@/services/coach/ruleCoach';
import { useExploreDemo } from '@/state/useDemo';
import type { Plan } from '@/state/selectors';

const QUESTIONS = ['Can I afford a ₹75 L flat in 2038?', 'What if markets fall 30% in Year 4?', 'What happens if my salary grows by only 5%?'];

const POINTS = [
  { icon: Cpu, title: 'Free, with nothing to set up', text: 'An open model downloads into your browser on your first question and runs on your device. No account, no API key, no usage limit.' },
  { icon: Calculator, title: 'The engine does the maths', text: 'Each what-if is run through the same projection as your plan. The model explains the result.' },
  { icon: ShieldCheck, title: 'Figures are checked', text: 'Any rupee amount or percentage that doesn’t match your plan is flagged under the answer.' },
];

/** Typed-out answer, so the panel reads as a conversation. Shown in full when motion is reduced. */
function useTyped(text: string): string {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) return setN(text.length);
    setN(0);
    const step = Math.max(3, Math.ceil(text.length / 120));
    const id = window.setInterval(() => setN((v) => (v + step >= text.length ? (window.clearInterval(id), text.length) : v + step)), 16);
    return () => window.clearInterval(id);
  }, [text, reduce]);
  return text.slice(0, n);
}

export function CoachShowcase({ plan }: { plan: Plan }) {
  const explore = useExploreDemo();
  const [q, setQ] = useState(QUESTIONS[0]);
  const answer = useMemo(() => answerWithRules(q, plan).text.split('\n\n').slice(0, 2).join('\n\n'), [q, plan]);
  const typed = useTyped(answer);

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
      <div className="lg:col-span-5">
        <ul className="flex flex-col gap-7">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-forest" aria-hidden>
                <Icon size={18} />
              </span>
              <div>
                <p className="text-[16px] font-semibold tracking-[-0.01em] text-evergreen">{title}</p>
                <p className="mt-1 text-[14.5px] leading-relaxed text-grey">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => explore('/app/coach')} className={`${btn('primary', 'md')} mt-10`}>
          Ask the demo plan <ArrowRight size={15} aria-hidden />
        </button>
      </div>

      <Frame size="xl" className="lg:col-span-7">
        <div className="flex flex-wrap gap-2 border-b border-line px-5 py-4 sm:px-7" role="group" aria-label="Sample questions">
          {QUESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={q === s}
              onClick={() => setQ(s)}
              className={`tap rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${q === s ? 'bg-evergreen text-onbrand' : 'bg-muted/70 text-grey hover:bg-mint hover:text-evergreen'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex min-h-[340px] flex-col gap-5 p-5 sm:p-7">
          <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-forest px-4 py-2.5 text-[14px] text-onbrand">{q}</p>
          <div className="flex max-w-[94%] gap-3">
            <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted" aria-hidden>
              <Mark size={16} animate={false} />
            </span>
            <div className="min-w-0 rounded-2xl rounded-tl-md bg-muted/70 px-4 py-3">
              {/* The typing effect is visual only; screen readers get the whole answer at once. */}
              <div aria-hidden>
                <RichText text={typed || ' '} className="!text-[13.5px]" />
              </div>
              <div className="sr-only" aria-live="polite">
                <RichText text={answer} />
              </div>
            </div>
          </div>
          <p className="mt-auto text-[12px] text-grey">Answers calculated on the sample plan by the planner’s engine. In the planner, an AI model explains them in its own words and takes follow-up questions.</p>
        </div>
      </Frame>
    </div>
  );
}
