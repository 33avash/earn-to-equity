import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { usePlan } from '@/state/selectors';
import { useStore } from '@/state/store';
import { uid } from '@/state/demo';
import { PageHeader, Button, Disclaimer, Badge } from '@/components/ui';
import { answerWithRules, coachContext } from '@/services/coach/ruleCoach';
import { askGemini, coachStatus } from '@/services/coach/geminiClient';

const SUGGESTED = [
  'Can I afford a home in five years?',
  'Why am I behind my financial goal?',
  'What happens if my salary grows by only 5%?',
  'How much more should I save to reach my target?',
  'What if markets fall sharply in Year 4?',
  'Explain my projected wealth in simple terms.',
];

export default function Coach() {
  const plan = usePlan();
  const messages = useStore((s) => s.coach);
  const push = useStore((s) => s.pushCoach);
  const clear = useStore((s) => s.clearCoach);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    coachStatus().then(setAi);
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length, busy]);

  const ask = async (q: string) => {
    const question = q.trim().slice(0, 500);
    if (!question || busy) return;
    setInput('');
    push({ id: uid(), role: 'user', text: question });
    setBusy(true);
    let text: string | null = null;
    let source: 'rules' | 'gemini' = 'rules';
    if (ai) {
      text = await askGemini(question, coachContext(plan));
      if (text) source = 'gemini';
    }
    if (!text) {
      await new Promise((r) => setTimeout(r, 250));
      text = answerWithRules(question, plan).text;
    }
    push({ id: uid(), role: 'coach', text, source });
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="AI Wealth Coach"
        description="Ask about your plan in plain language. The financial engine produces the numbers. The coach explains them, states the assumptions and points out missing information."
        actions={messages.length > 0 && <Button variant="ghost" size="sm" onClick={clear}>Clear conversation</Button>}
      />

      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        {ai === null ? (
          <span className="text-grey">Checking coach mode…</span>
        ) : ai ? (
          <><Badge tone="good">Gemini</Badge><span className="text-grey">Explanations by Gemini via a secure server endpoint, using only figures calculated by your plan.</span></>
        ) : (
          <><Badge>Educational fallback</Badge><span className="text-grey">AI isn’t configured for this deployment. Answers come from a rule-based coach that uses your plan’s actual calculations.</span></>
        )}
      </div>

      <div className="panel flex min-h-[420px] flex-col">
        <div className="flex-1 space-y-6 p-5 sm:p-8" aria-live="polite">
          {messages.length === 0 && (
            <div>
              <p className="display text-2xl">What would you like to understand?</p>
              <p className="mt-2 text-sm text-grey">Pick a question or write your own.</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {SUGGESTED.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} className="rounded border border-line px-4 py-3 text-left text-sm text-charcoal transition-colors hover:border-forest hover:bg-mint/40">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] rounded bg-evergreen px-4 py-2.5 text-sm text-onbrand">{m.text}</p>
              </div>
            ) : (
              <div key={m.id} className="max-w-[92%]">
                <p className="eyebrow mb-2">{m.source === 'gemini' ? 'Coach · Gemini' : 'Coach · rule-based'}</p>
                <div className="whitespace-pre-line text-[14.5px] leading-relaxed text-charcoal">{m.text}</div>
              </div>
            ),
          )}
          {busy && (
            <p role="status" className="flex items-center gap-2 text-sm text-grey">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-forest" /> Working through your numbers…
            </p>
          )}
          <div ref={endRef} />
        </div>
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3 sm:px-8">
            {SUGGESTED.slice(0, 4).map((s) => (
              <button key={s} type="button" disabled={busy} onClick={() => ask(s)} className="tap rounded-sm border border-line px-2.5 py-1 text-xs text-grey hover:border-forest hover:text-evergreen">
                {s}
              </button>
            ))}
          </div>
        )}
        <form className="flex gap-2 border-t border-line p-3 sm:p-4" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
          <label htmlFor="coach-input" className="sr-only">Ask the coach</label>
          <input id="coach-input" className="input flex-1" placeholder="e.g. What if markets fall 30% in Year 6?" value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit" disabled={busy || !input.trim()} icon={<Send size={15} />}>Ask</Button>
        </form>
      </div>
      <Disclaimer>The coach provides general education based on your inputs and assumptions. It does not give personalised investment, tax or legal advice, guarantee returns, or recommend specific products.</Disclaimer>
    </div>
  );
}
