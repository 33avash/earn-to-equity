import { GEN, lines, type Availability, type CoachEngine } from './types';

/**
 * A model served by Ollama on the person's own computer. Opt-in only: the page never contacts localhost
 * unless this engine is switched on in the coach settings. A site served from another origin also needs
 * OLLAMA_ORIGINS to allow it.
 */

export const OLLAMA_URL = 'http://localhost:11434';
export const DEFAULT_OLLAMA_MODEL = 'gemma3:4b';

export function ollamaEngine(model: string): CoachEngine {
  return {
    id: 'ollama',
    label: 'Ollama on this computer',
    async availability(): Promise<Availability> {
      try {
        const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(1500) });
        if (!r.ok) return 'unavailable';
        const data = (await r.json()) as { models?: { name: string }[] };
        return data.models?.some((m) => m.name === model || m.name === `${model}:latest`) ? 'ready' : 'unavailable';
      } catch {
        return 'unavailable';
      }
    },
    async ask({ messages, signal, onToken }) {
      const r = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true, options: { temperature: GEN.temperature, num_predict: GEN.maxTokens } }),
        signal,
      });
      if (!r.ok || !r.body) throw new Error(`ollama ${r.status}`);
      let text = '';
      for await (const line of lines(r.body)) {
        const part = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
        text += part.message?.content ?? '';
        onToken?.(text);
        if (part.done) break;
      }
      return text.trim();
    },
  };
}
