import { useEffect, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Send, SlidersHorizontal, Square } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { WEBLLM_MODELS } from '@/services/coach/engines/webllm';
import type { CoachMessage } from '@/state/store';
import { useCoach } from './useCoach';
import { RichText } from './RichText';
import { ENGINE_LABEL, ENGINE_NOTE, EngineSettings } from './EngineSettings';

type Coach = ReturnType<typeof useCoach>;

/** Which model answers, with a settings popover. */
function EngineBar({ coach }: { coach: Coach }) {
  const { active, statuses, settings, preparing } = coach;
  const model = WEBLLM_MODELS.find((m) => m.id === settings.webllmModel) ?? WEBLLM_MODELS[0];
  // Before the first question: say plainly that the model will download, and how big it is.
  const willDownload = active === 'rules' && !preparing && statuses?.webllm === 'downloadable' && (settings.engine === 'auto' || settings.engine === 'webllm');
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
      {statuses === null || statuses.webllm === undefined ? (
        <span className="text-grey">Checking which models this browser can run…</span>
      ) : willDownload ? (
        <>
          <Badge tone="good">AI coach</Badge>
          <span className="min-w-0 flex-1 text-grey">A free AI model downloads into this browser when you ask your first question ({model.size}, one time only). It runs on your device, with no account and no usage limit.</span>
        </>
      ) : (
        <>
          <Badge tone={active === 'rules' ? 'neutral' : 'good'}>{ENGINE_LABEL[active]}</Badge>
          <span className="min-w-0 flex-1 text-grey">
            {active === 'rules' && settings.engine !== 'rules' && statuses.webllm === 'unavailable'
              ? 'This browser can’t run the AI model (it needs WebGPU: a recent Chrome, Edge or Safari), so answers come from your plan’s calculations.'
              : ENGINE_NOTE[active]}
          </span>
        </>
      )}
      <Popover.Root>
        <Popover.Trigger className="tap inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] text-grey shadow-[0_0_0_1px_var(--frame-line)] transition-colors hover:bg-muted hover:text-evergreen">
          <SlidersHorizontal size={13} aria-hidden /> AI settings
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="end" sideOffset={8} collisionPadding={12} className="frame-glass z-[60] max-h-[min(80vh,640px)] w-[min(92vw,420px)] overflow-y-auto p-5 outline-none data-[state=open]:animate-[pop_0.35s_var(--ease-spring)]">
            <EngineSettings coach={coach} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

/** Download progress while a model is being set up. */
function SetupProgress({ coach }: { coach: Coach }) {
  const { preparing } = coach;
  if (!preparing) return null;
  const pct = Math.round(preparing.progress * 100);
  return (
    <div className="well px-5 py-4" role="status">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="font-medium text-evergreen">{preparing.id === 'chrome' ? 'Preparing Chrome’s built-in model' : 'Setting up the AI model in your browser'}</span>
        <span className="num text-grey">{pct}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-forest transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-grey">One-time download, then it loads from this browser. You can keep asking meanwhile; answers come from your plan’s calculations until it’s ready.</p>
    </div>
  );
}

function CoachReply({ m }: { m: CoachMessage }) {
  const [showOther, setShowOther] = useState(false);
  const label = m.source === 'rules' || !m.source ? 'rule-based' : ENGINE_LABEL[m.source];
  const flagged = (m.unverified?.length ?? 0) > 0;
  // When the model quoted figures the plan never produced and the engine has its own answer, lead with the
  // engine's answer: only checked figures are shown by default.
  const swapped = flagged && Boolean(m.engineText) && Boolean(m.engineAnswered);
  const main = swapped ? m.engineText! : m.text;
  const other = swapped ? m.text : m.engineText;
  return (
    <div className="max-w-[94%]">
      <p className="eyebrow mb-2">Coach · {swapped ? 'calculated' : label}</p>
      <RichText text={main} />
      {m.note && <p className="mt-3 text-[12.5px] leading-relaxed text-grey">{m.note}</p>}
      {(flagged || other) && (
        <div className="mt-3 flex flex-col gap-2">
          {flagged && (
            <p className="rounded-lg bg-champagne/10 px-3 py-2 text-[12.5px] leading-relaxed text-charcoal">
              {swapped ? (
                <>
                  The AI’s explanation quoted {m.unverified!.length === 1 ? 'a figure' : 'figures'} your plan didn’t produce (<span className="num font-medium">{m.unverified!.join(', ')}</span>), so this is the calculated answer.
                </>
              ) : (
                <>
                  Check {m.unverified!.length === 1 ? 'this figure' : 'these figures'}: <span className="num font-medium">{m.unverified!.join(', ')}</span>. {m.unverified!.length === 1 ? 'It doesn’t' : 'They don’t'} match the numbers your plan calculated.
                </>
              )}
            </p>
          )}
          {other && (
            <button type="button" className="self-start text-[12.5px] text-forest underline-offset-2 hover:underline" aria-expanded={showOther} onClick={() => setShowOther((v) => !v)}>
              {swapped ? (showOther ? 'Hide the AI’s explanation' : 'Show the AI’s explanation anyway') : showOther ? 'Hide the calculated answer' : 'Show the calculated answer'}
            </button>
          )}
          {showOther && other && (
            <div className="well px-4 py-3">
              <RichText text={other} className="!text-[13px]" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** The coach conversation. Used full-page at /app/coach and in the side panel on every planner screen. */
export function CoachChat({ suggestions, compact = false }: { suggestions: string[]; compact?: boolean }) {
  const coach = useCoach();
  const { messages, ask, stop, busy, draft, preparing, phase } = coach;
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length, busy, draft.length > 0]);

  const submit = (q: string) => {
    setInput('');
    ask(q);
  };
  const pad = compact ? 'px-5' : 'px-6 sm:px-10';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <EngineBar coach={coach} />
      <SetupProgress coach={coach} />
      <div className={`bezel flex min-h-0 flex-1 flex-col overflow-hidden ${compact ? '' : 'min-h-[520px]'}`}>
        <div className={`min-h-0 flex-1 space-y-8 overflow-y-auto py-6 ${pad} ${compact ? '' : 'sm:py-10'}`} aria-live="polite">
          {messages.length === 0 && (
            <div>
              <p className={`${compact ? 'text-[18px]' : 'text-[22px]'} font-semibold leading-tight tracking-[-0.02em] text-evergreen`}>What would you like to understand?</p>
              <p className="mt-2 text-sm text-grey">Pick a question or write your own. Answers use the numbers your plan calculated.</p>
              <div className={`mt-6 grid gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => submit(s)} className="well group px-5 py-4 text-left text-sm text-charcoal transition-colors duration-500 hover:bg-mint/60">
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
              <CoachReply key={m.id} m={m} />
            ),
          )}
          {busy && draft && (
            <div className="max-w-[94%]">
              <p className="eyebrow mb-2">Coach · writing…</p>
              <RichText text={draft} />
            </div>
          )}
          {busy && !draft && (
            <p role="status" className="flex items-center gap-2 text-sm text-grey">
              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-line border-t-forest" />
              {preparing
                ? 'Loading the model…'
                : phase === 'thinking'
                  ? 'Thinking about your numbers…'
                  : 'Working through your numbers…'}
            </p>
          )}
          <div ref={endRef} />
        </div>
        {messages.length > 0 && (
          <div className={`flex gap-2 overflow-x-auto border-t border-line/70 py-3 ${pad} ${compact ? '' : 'flex-wrap'}`}>
            {suggestions.slice(0, 4).map((s) => (
              <button key={s} type="button" disabled={busy} onClick={() => submit(s)} className="tap shrink-0 rounded-full bg-muted/70 px-3.5 py-1.5 text-xs text-grey transition-colors hover:bg-mint hover:text-evergreen">
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          className="m-2 flex gap-2 rounded-full bg-muted/60 p-1.5 sm:m-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <label htmlFor={compact ? 'coach-input-panel' : 'coach-input'} className="sr-only">
            Ask the coach
          </label>
          <input id={compact ? 'coach-input-panel' : 'coach-input'} className="input min-w-0 flex-1 rounded-full bg-surface px-5" placeholder="e.g. What if markets fall 30% in Year 6?" value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} />
          {busy ? (
            <Button type="button" variant="secondary" onClick={stop} icon={<Square size={13} aria-hidden />}>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={busy || !input.trim()} icon={<Send size={15} aria-hidden />}>
              Ask
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
