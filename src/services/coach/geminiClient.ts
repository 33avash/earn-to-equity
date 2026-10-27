import type { ChatMessage } from './prompt';

/**
 * Client for the optional Gemini endpoint: /api/coach on the dev and preview servers, or the Cloudflare Worker
 * named by VITE_COACH_API_URL at build time. The API key never touches the browser; if the endpoint is absent
 * or not configured, callers fall back to another engine or the rule-based coach.
 */
const ENDPOINT = import.meta.env.VITE_COACH_API_URL || '/api/coach';

export async function coachStatus(): Promise<boolean> {
  try {
    const r = await fetch(ENDPOINT, { method: 'GET' });
    if (!r.ok) return false;
    const data = (await r.json()) as { configured?: boolean };
    return Boolean(data.configured);
  } catch {
    return false;
  }
}

/** Sends the conversation without the system turn; the server adds its own system prompt. */
export async function askGemini(messages: ChatMessage[], signal?: AbortSignal): Promise<string | null> {
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.filter((m) => m.role !== 'system') }),
      signal,
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}
