import type { Availability } from '@/services/coach/engines/types';
import type { CoachEngineId, CoachSettings } from '@/state/store';

export type Statuses = Partial<Record<CoachEngineId, Availability>>;

/**
 * Order used by "auto": a deployment's own Gemini endpoint, then models on the device (Chrome's, Ollama,
 * the in-browser WebLLM model). Pure so it can be tested.
 */
export const AUTO_ORDER: CoachEngineId[] = ['gemini', 'chrome', 'ollama', 'webllm'];

const usable = (id: CoachEngineId, settings: CoachSettings, statuses: Statuses) => statuses[id] === 'ready' && (id !== 'ollama' || settings.ollamaEnabled);

/** Engines to try for the next question, best first. Empty means the rule-based coach answers. */
export function engineChain(settings: CoachSettings, statuses: Statuses): CoachEngineId[] {
  if (settings.engine === 'rules') return [];
  const preferred = settings.engine === 'auto' ? [] : [settings.engine];
  return [...new Set([...preferred, ...AUTO_ORDER])].filter((id) => usable(id, settings, statuses));
}

/** The engine that will answer the next question, or 'rules'. */
export function resolveEngine(settings: CoachSettings, statuses: Statuses): CoachEngineId | 'rules' {
  return engineChain(settings, statuses)[0] ?? 'rules';
}

/**
 * Whether the next question should start downloading the in-browser model: nothing else can answer, the
 * browser can run it, and the person hasn't chosen the rule-based coach or another specific engine.
 */
export function shouldAutoDownload(settings: CoachSettings, statuses: Statuses): boolean {
  return (settings.engine === 'auto' || settings.engine === 'webllm') && statuses.webllm === 'downloadable' && engineChain(settings, statuses).length === 0;
}
