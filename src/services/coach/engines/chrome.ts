import type { Availability, CoachEngine } from './types';

/**
 * Chrome's built-in model (Gemini Nano) through the Prompt API. It runs on the device and is managed by the
 * browser, so there is nothing to host and no usage limit. Every call is guarded: the API differs between
 * Chrome versions and is absent in other browsers.
 */

interface PromptSession {
  promptStreaming(input: string, o?: { signal?: AbortSignal }): ReadableStream<string> | AsyncIterable<string>;
  destroy(): void;
}

interface LanguageModelApi {
  availability(o?: object): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available' | 'readily' | 'after-download' | 'no'>;
  create(o?: object): Promise<PromptSession>;
}

const LANG = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };

const api = (): LanguageModelApi | null => (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel ?? null;

async function* chunks(s: ReadableStream<string> | AsyncIterable<string>): AsyncGenerator<string> {
  if (Symbol.asyncIterator in s) {
    yield* s as AsyncIterable<string>;
    return;
  }
  const reader = (s as ReadableStream<string>).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    yield value;
  }
}

export const chromeEngine: CoachEngine = {
  id: 'chrome',
  label: 'Chrome built-in AI',
  async availability(): Promise<Availability> {
    const lm = api();
    if (!lm) return 'unavailable';
    try {
      const a = await lm.availability(LANG);
      if (a === 'available' || a === 'readily') return 'ready';
      if (a === 'downloadable' || a === 'downloading' || a === 'after-download') return 'downloadable';
      return 'unavailable';
    } catch {
      return 'unavailable';
    }
  },
  async prepare(onProgress) {
    const lm = api();
    if (!lm) throw new Error('unavailable');
    const s = await lm.create({
      ...LANG,
      monitor(m: EventTarget) {
        m.addEventListener('downloadprogress', (e) => onProgress((e as Event & { loaded: number }).loaded, 'Downloading Chrome’s built-in model'));
      },
    });
    s.destroy();
  },
  async ask({ messages, signal, onToken }) {
    const lm = api();
    if (!lm) throw new Error('unavailable');
    const last = messages[messages.length - 1];
    const session = await lm.create({ ...LANG, initialPrompts: messages.slice(0, -1), signal });
    let text = '';
    try {
      for await (const c of chunks(session.promptStreaming(last.content, { signal }))) {
        // Older Chrome versions stream the whole text so far; newer ones stream only the new part.
        text = c.startsWith(text) && text ? c : text + c;
        onToken?.(text);
      }
    } finally {
      session.destroy();
    }
    return text.trim();
  },
};
