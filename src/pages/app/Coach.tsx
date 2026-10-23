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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Coach"
        description="Ask about your plan. Answers quote figures from your own projection and name the assumptions behind them."
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

      <div className="bezel flex min-h-[520px] flex-col overflow-hidden">
        <div className="flex-1 space-y-8 p-6 sm:p-10" aria-live="polite">
          {messages.length === 0 && (
            <div>
              <p className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-evergreen">What would you like to understand?</p>
              <p className="mt-2 text-sm text-grey">Pick a question or write your own.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {SUGGESTED.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} className="well group px-5 py-4 text-left text-sm text-charcoal transition-colors duration-500 hover:bg-mint/60">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-[1.25rem] rounded-br-md bg-evergreen px-5 py-3 text-sm text-onbrand">{m.text}</p>
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
          <div className="flex flex-wrap gap-2 border-t border-line/70 px-6 py-4 sm:px-10">
            {SUGGESTED.slice(0, 4).map((s) => (
              <button key={s} type="button" disabled={busy} onClick={() => ask(s)} className="tap rounded-full bg-muted/70 px-3.5 py-1.5 text-xs text-grey transition-colors hover:bg-mint hover:text-evergreen">
                {s}
              </button>
            ))}
          </div>
        )}
        <form className="m-2 flex gap-2 rounded-full bg-muted/60 p-1.5 sm:m-3" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
          <label htmlFor="coach-input" className="sr-only">Ask the coach</label>
          <input id="coach-input" className="input flex-1 rounded-full bg-surface px-5" placeholder="e.g. What if markets fall 30% in Year 6?" value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit" disabled={busy || !input.trim()} icon={<Send size={15} />}>Ask</Button>
        </form>
      </div>
      <Disclaimer>The coach provides general education based on your inputs and assumptions. It does not give personalised investment, tax or legal advice, guarantee returns, or recommend specific products.</Disclaimer>
    </div>
  );
}
