import type { ChatMessage } from '../prompt';

export type EngineId = 'webllm' | 'chrome' | 'ollama' | 'gemini';

/** ready: answers now · downloadable: works after a one-off download · unavailable: not on this device. */
export type Availability = 'ready' | 'downloadable' | 'unavailable';

export interface AskOptions {
  messages: ChatMessage[];
  signal?: AbortSignal;
  /** Called with the full text so far as it streams in. */
  onToken?: (textSoFar: string) => void;
  /** Called while a reasoning model is thinking, before any answer text arrives. */
  onThinking?: () => void;
}

export interface CoachEngine {
  id: EngineId;
  label: string;
  availability(): Promise<Availability>;
  /** Download or load the model. `progress` is 0–1. */
  prepare?(onProgress: (progress: number, text: string) => void): Promise<void>;
  ask(o: AskOptions): Promise<string>;
}

export const GEN = { temperature: 0.2, maxTokens: 400 };

/** Read a streaming body line by line (NDJSON or SSE). */
export async function* lines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) yield line;
    }
  }
  if (buf.trim()) yield buf.trim();
}
