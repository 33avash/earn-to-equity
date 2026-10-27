import { SYSTEM_PROMPT } from '../src/services/coach/prompt';

/**
 * The Gemini coach endpoint as a plain function, shared by the Vite dev/preview middleware (server/coach.ts)
 * and the Cloudflare Worker (worker/coach.ts).
 *
 * The browser sends the conversation. Its last user turn carries a compact JSON summary of figures that the
 * financial engine has ALREADY calculated, plus any engine-computed facts for the question. Gemini is told to
 * explain those figures only; the system prompt is added here and can't be replaced by the client. The API
 * key stays on the server and is never sent to the client.
 */

export const MAX_BODY = 64 * 1024;

/**
 * Follows Google's newest Flash-Lite model, so the endpoint keeps working as models are retired. Lite has the
 * larger free quota and, on the free tier, answers when the full Flash model is overloaded; explaining
 * figures the engine already calculated doesn't need the bigger model.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-flash-lite-latest';

/** Tried when the main model is busy, out of free quota, retired or too slow; it has its own quota. */
export const FALLBACK_GEMINI_MODEL = 'gemini-flash-latest';

// Statuses worth retrying on the fallback model: busy, out of quota, retired, or a transient server error.
const RETRY_ON = new Set([404, 429, 500, 503]);

// An overloaded model can hold a request for a minute before failing; give up on it sooner and try the other.
const ATTEMPT_TIMEOUT_MS = 35_000;

export interface CoachReply {
  status: number;
  body: unknown;
}

type Content = { role: 'user' | 'model'; parts: { text: string }[] };

/**
 * Conversation → Gemini contents. Accepts { messages } (user/assistant turns, last one from the user) or the
 * older { question, context }. Turns are capped in number and size; system turns are ignored.
 */
export function toContents(payload: { messages?: unknown; question?: unknown; context?: unknown }): Content[] | null {
  if (Array.isArray(payload.messages)) {
    const turns = payload.messages
      .filter((m): m is { role: string; content: string } => typeof m?.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
      .slice(-8)
      .map<Content>((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content.slice(0, 24000) }] }));
    const last = turns.at(-1);
    return last && last.role === 'user' && last.parts[0].text.trim() ? turns : null;
  }
  const question = typeof payload.question === 'string' ? payload.question.slice(0, 600) : '';
  if (!question.trim()) return null;
  const context = JSON.stringify(payload.context ?? {}).slice(0, 20000);
  return [{ role: 'user', parts: [{ text: `CONTEXT:\n${context}\n\nQUESTION:\n${question}` }] }];
}

/** GET reports whether a key is set; POST answers a question. `rawBody` is the request body as text. */
export async function handleCoach(method: string, rawBody: string, apiKey: string | undefined, model = DEFAULT_GEMINI_MODEL): Promise<CoachReply> {
  if (method === 'GET') return { status: 200, body: { configured: Boolean(apiKey) } };
  if (method !== 'POST') return { status: 405, body: { error: 'method-not-allowed' } };
  if (!apiKey) return { status: 503, body: { error: 'not-configured' } };
  if (rawBody.length > MAX_BODY) return { status: 413, body: { error: 'payload-too-large' } };

  let payload: { messages?: unknown; question?: unknown; context?: unknown };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'invalid-request' } };
  }
  const contents = toContents(payload);
  if (!contents) return { status: 400, body: { error: 'empty-question' } };

  let last = 502;
  for (const m of [...new Set([model, FALLBACK_GEMINI_MODEL])]) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
        }),
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
      if (!r.ok) {
        last = r.status;
        if (RETRY_ON.has(r.status)) continue;
        break;
      }
      const data = (await r.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts
        ?.filter((x) => !x.thought)
        .map((x) => x.text ?? '')
        .join('')
        .trim();
      if (text) return { status: 200, body: { text, model: m } };
      last = 502;
    } catch {
      last = 502;
    }
  }
  // 429 means the key's free quota is used up; the browser then moves on to the next engine.
  return { status: last === 429 ? 429 : 502, body: { error: 'upstream-error', status: last } };
}
