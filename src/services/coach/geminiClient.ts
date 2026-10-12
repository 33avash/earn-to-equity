/**
 * Client for the optional server-side Gemini proxy at /api/coach.
 * The API key never touches the browser; if the endpoint is absent or not
 * configured, callers fall back to the rule-based coach.
 */
export async function coachStatus(): Promise<boolean> {
  try {
    const r = await fetch('/api/coach', { method: 'GET' });
    if (!r.ok) return false;
    const data = (await r.json()) as { configured?: boolean };
    return Boolean(data.configured);
  } catch {
    return false;
  }
}

export async function askGemini(question: string, context: unknown, signal?: AbortSignal): Promise<string | null> {
  try {
    const r = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context }),
      signal,
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}
