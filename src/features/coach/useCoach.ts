import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlan } from '@/state/selectors';
import { useStore, type CoachEngineId, type CoachSettings } from '@/state/store';
import { uid } from '@/state/demo';
import { toast } from '@/components/ui/Misc';
import { answerWithRules, coachContext } from '@/services/coach/ruleCoach';
import { buildMessages } from '@/services/coach/prompt';
import { retrieve } from '@/services/coach/retrieve';
import { unverifiedFigures } from '@/services/coach/verify';
import type { Availability, CoachEngine } from '@/services/coach/engines/types';
import { engineChain, resolveEngine, shouldAutoDownload, type Statuses } from './resolve';
import { WEBLLM_MODELS, webllmEngine, webllmLoaded } from '@/services/coach/engines/webllm';
import { chromeEngine } from '@/services/coach/engines/chrome';
import { ollamaEngine } from '@/services/coach/engines/ollama';
import { geminiEngine } from '@/services/coach/engines/gemini';

function engines(s: CoachSettings): Record<CoachEngineId, CoachEngine> {
  return { webllm: webllmEngine(s.webllmModel), chrome: chromeEngine, ollama: ollamaEngine(s.ollamaModel), gemini: geminiEngine };
}

// Availability checks are shared by the coach page and the side panel, and run once per settings change.
const checks = new Map<string, Promise<Availability>>();
const checkKey = (id: CoachEngineId, s: CoachSettings) => (id === 'webllm' ? `webllm:${s.webllmModel}` : id === 'ollama' ? `ollama:${s.ollamaModel}` : id);

// Some browsers never settle a GPU or Prompt API query; treat a slow answer as "not available".
const CHECK_TIMEOUT_MS = 4000;
const settle = (p: Promise<Availability>): Promise<Availability> =>
  Promise.race([p.catch(() => 'unavailable' as const), new Promise<Availability>((r) => setTimeout(() => r('unavailable'), CHECK_TIMEOUT_MS))]);

/** Runs every availability check, reporting each result as it arrives (the slow GPU check doesn't hold up the rest). */
function checkAll(s: CoachSettings, onResult: (id: CoachEngineId, a: Availability) => void) {
  const all = engines(s);
  for (const id of (Object.keys(all) as CoachEngineId[]).filter((id) => id !== 'ollama' || s.ollamaEnabled)) {
    const key = checkKey(id, s);
    if (!checks.has(key)) checks.set(key, settle(all[id].availability()));
    checks.get(key)!.then((a) => onResult(id, a));
  }
}

export type Preparing = { id: CoachEngineId; progress: number; text: string };

// One download at a time, shared by every coach view so the panel and the page show the same progress.
let preparingNow: Preparing | null = null;
const preparingListeners = new Set<(p: Preparing | null) => void>();
const setPreparingShared = (p: Preparing | null) => {
  preparingNow = p;
  preparingListeners.forEach((l) => l(p));
};

export type CoachPhase = 'idle' | 'thinking' | 'writing';

export function useCoach() {
  const plan = usePlan();
  const messages = useStore((s) => s.coach);
  const push = useStore((s) => s.pushCoach);
  const settings = useStore((s) => s.coachSettings);
  const setSettings = useStore((s) => s.setCoachSettings);
  const [statuses, setStatuses] = useState<Statuses | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<CoachPhase>('idle');
  const [preparing, setPreparing] = useState<Preparing | null>(preparingNow);
  const abortRef = useRef<AbortController | null>(null);
  const all = useMemo(() => engines(settings), [settings]);

  useEffect(() => {
    let live = true;
    setStatuses(null);
    checkAll(settings, (id, a) => live && setStatuses((s) => ({ ...s, [id]: a })));
    return () => {
      live = false;
    };
  }, [settings]);

  useEffect(() => {
    preparingListeners.add(setPreparing);
    return () => void preparingListeners.delete(setPreparing);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const active = statuses ? resolveEngine(settings, statuses) : 'rules';

  /** Download or load a model. `select` makes it the chosen engine afterwards (an explicit choice in AI settings). */
  const prepare = useCallback(
    async (id: CoachEngineId, select = true) => {
      if (preparingNow) return;
      setPreparingShared({ id, progress: 0, text: 'Starting…' });
      const onProgress = (progress: number, text: string) => setPreparingShared({ id, progress, text });
      const done = (s: CoachSettings) => {
        checks.set(checkKey(id, s), Promise.resolve('ready'));
        setStatuses((st) => ({ ...st, [id]: 'ready' }));
        if (select) setSettings({ engine: id });
        else toast('The AI model is ready. It will answer your next question.');
      };
      try {
        await all[id].prepare?.(onProgress);
        done(settings);
      } catch {
        // Not enough GPU memory for the recommended model: try the smaller one before giving up.
        const smaller = WEBLLM_MODELS[WEBLLM_MODELS.length - 1].id;
        if (id === 'webllm' && settings.webllmModel !== smaller) {
          try {
            await webllmEngine(smaller).prepare!(onProgress);
            setSettings({ webllmModel: smaller });
            done({ ...settings, webllmModel: smaller });
            return;
          } catch {
            /* fall through */
          }
        }
        toast('The AI model couldn’t be set up on this device. The rule-based coach will keep answering.');
      } finally {
        setPreparingShared(null);
      }
    },
    [all, settings, setSettings],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const ask = useCallback(
    async (q: string) => {
      const question = q.trim().slice(0, 500);
      if (!question || busy) return;
      const history = useStore.getState().coach;
      push({ id: uid(), role: 'user', text: question });
      setBusy(true);
      const rules = answerWithRules(question, plan);
      const facts = rules.intent ? rules.text : null;
      const context = coachContext(plan, { brief: Boolean(facts) });
      const references = rules.intent ? [] : retrieve(question);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      // A question asked in the first moments waits for the in-browser model check (at most a few seconds).
      const st: Statuses = { ...statuses };
      if (st.webllm === undefined) st.webllm = await (checks.get(checkKey('webllm', settings)) ?? Promise.resolve('unavailable' as const));
      const chain = engineChain(settings, st);

      // No model can answer yet: start the in-browser one, and answer this question from the calculations.
      const startDownload = !preparingNow && shouldAutoDownload(settings, st);
      if (startDownload) void prepare('webllm', false);

      let answered = false;
      let failed = false;
      for (const id of chain) {
        if (ctrl.signal.aborted) break;
        let text = '';
        try {
          // A cached in-browser model still takes a few seconds to load into the GPU the first time.
          if (id === 'webllm' && !webllmLoaded(settings.webllmModel)) {
            setPreparingShared({ id: 'webllm', progress: 0, text: 'Loading the model…' });
            await all.webllm.prepare!((progress, t) => setPreparingShared({ id: 'webllm', progress, text: t })).finally(() => setPreparingShared(null));
          }
          setPhase('thinking');
          setDraft('');
          text = await all[id].ask({
            messages: buildMessages({ history, question, context, facts, references }),
            signal: ctrl.signal,
            onToken: (t) => {
              text = t;
              setPhase('writing');
              setDraft(t);
            },
          });
        } catch {
          if (!ctrl.signal.aborted) text = '';
        }
        if (text.trim()) {
          const grounding = [JSON.stringify(context), facts ?? '', ...references, question];
          push({
            id: uid(),
            role: 'coach',
            text: ctrl.signal.aborted ? `${text.trim()} …` : text.trim(),
            source: id,
            unverified: unverifiedFigures(text, grounding),
            engineText: rules.text,
            engineAnswered: Boolean(facts),
          });
          answered = true;
          break;
        }
        failed = true;
      }

      if (!answered && !ctrl.signal.aborted) {
        if (!chain.length) await new Promise((r) => setTimeout(r, 250));
        const size = (WEBLLM_MODELS.find((m) => m.id === settings.webllmModel) ?? WEBLLM_MODELS[0]).size;
        const note =
          startDownload || preparingNow?.id === 'webllm'
            ? `The AI model is downloading into your browser (${size}, one time only), so this answer comes straight from your plan’s calculations. The model answers once it’s ready.`
            : failed
              ? 'The AI model couldn’t answer, so this answer comes straight from your plan’s calculations.'
              : undefined;
        push({ id: uid(), role: 'coach', text: rules.text, source: 'rules', note });
      }
      abortRef.current = null;
      setDraft('');
      setPhase('idle');
      setBusy(false);
    },
    [busy, push, plan, statuses, settings, all, prepare],
  );

  return { messages, ask, stop, busy, draft, phase, active, statuses, settings, setSettings, prepare, preparing };
}
