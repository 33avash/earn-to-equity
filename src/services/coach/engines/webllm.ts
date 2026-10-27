import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { GEN, type Availability, type CoachEngine } from './types';

/**
 * On-device model through WebLLM (WebGPU). The library and the worker are loaded only when this engine is
 * first used, and the weights are downloaded once into the browser's cache, the first time a question needs them.
 * No question or figure leaves the device.
 */

/**
 * Chosen by running the same grounded prompts through five WebLLM models and checking every figure they quoted:
 * Gemma 2 2B quoted all of them correctly, at the same speed as the 1.5B models. Qwen 2.5 1.5B is the fallback
 * for devices without enough GPU memory for Gemma.
 */
export const WEBLLM_MODELS = [
  { id: 'gemma-2-2b-it-q4f16_1-MLC', label: 'Recommended', size: 'about 1.5 GB', note: 'Gemma 2, 2B' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Smaller', size: 'about 0.9 GB', note: 'Qwen 2.5, 1.5B, for devices with less memory' },
] as const;

export type WebLlmModelId = (typeof WEBLLM_MODELS)[number]['id'];
export const DEFAULT_WEBLLM_MODEL: WebLlmModelId = WEBLLM_MODELS[0].id;

type Gpu = { requestAdapter(): Promise<unknown | null> };

export async function hasWebGpu(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: Gpu }).gpu;
    return Boolean(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}

let loaded: { model: string; engine: Promise<MLCEngineInterface> } | null = null;

export const webllmLoaded = (model: string) => loaded?.model === model;

let generating: Promise<void> = Promise.resolve();

async function load(model: string, onProgress?: (p: number, text: string) => void): Promise<MLCEngineInterface> {
  if (loaded?.model === model) return loaded.engine;
  // Switching models: free the previous one's GPU memory first.
  const previous = loaded?.engine;
  const engine = (async () => {
    await previous?.then((e) => e.unload()).catch(() => undefined);
    const webllm = await import('@mlc-ai/web-llm');
    const worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' });
    return webllm.CreateWebWorkerMLCEngine(worker, model, {
      initProgressCallback: (r) => onProgress?.(r.progress, r.text),
    });
  })();
  loaded = { model, engine };
  engine.catch(() => {
    if (loaded?.engine === engine) loaded = null;
  });
  return engine;
}

export function webllmEngine(model: string): CoachEngine {
  return {
    id: 'webllm',
    label: 'On-device model',
    async availability(): Promise<Availability> {
      if (!(await hasWebGpu())) return 'unavailable';
      if (loaded?.model === model) return 'ready';
      try {
        const { hasModelInCache } = await import('@mlc-ai/web-llm');
        return (await hasModelInCache(model)) ? 'ready' : 'downloadable';
      } catch {
        return 'downloadable';
      }
    },
    async prepare(onProgress) {
      await load(model, onProgress);
    },
    async ask({ messages, signal, onToken }) {
      const engine = await load(model);
      // One generation at a time: a new question waits for the previous one to wind down.
      const previous = generating;
      let done!: () => void;
      generating = new Promise<void>((r) => (done = r));
      await previous;
      let text = '';
      const stop = () => engine.interruptGenerate();
      try {
        if (signal?.aborted) return '';
        const stream = await engine.chat.completions.create({
          messages,
          stream: true,
          temperature: GEN.temperature,
          max_tokens: GEN.maxTokens,
        });
        signal?.addEventListener('abort', stop, { once: true });
        // Always read the stream to its end. After a stop, interruptGenerate() ends it within a token or two;
        // leaving it unread would hold up the worker, and the next question would never start.
        for await (const chunk of stream) {
          if (signal?.aborted) continue;
          text += chunk.choices[0]?.delta?.content ?? '';
          onToken?.(text);
        }
      } finally {
        signal?.removeEventListener('abort', stop);
        done();
      }
      return text.trim();
    },
  };
}
