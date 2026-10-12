import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Optional server-side proxy for the AI Wealth Coach.
 *
 * The browser sends a question plus a compact JSON summary of figures that the
 * financial engine has ALREADY calculated. Gemini is instructed to explain those
 * figures only. The API key stays on the server (read from GEMINI_API_KEY) and is never
 * sent to the client.
 *
 * Mounted at /api/coach by the Vite dev and preview servers (see vite.config.ts).
 * The same handler can be wrapped as a serverless function for deployment.
 */

const SYSTEM_PROMPT = `You are the Earn to Equity Wealth Coach, an educational assistant for young Indian earners.
Rules:
- Use ONLY the figures provided in the CONTEXT JSON. Never invent, estimate or recompute numbers that are not there.
- Quote rupee figures exactly as they appear in the context (they are pre-formatted).
- State the relevant assumptions (inflation, returns, salary growth) that the figures depend on.
- If the context lacks something needed to answer, say what information is missing.
- Projections are illustrative estimates, not guarantees. Do not recommend specific securities, funds or insurers.
- This is general education, not personalised financial, tax or legal advice.
- Be concise: at most about 180 words, plain language, short paragraphs or a short list.`;

const MAX_BODY = 64 * 1024;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function coachMiddleware(apiKey: string | undefined, model = process.env.GEMINI_MODEL || 'gemini-2.5-flash') {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET') return send(res, 200, { configured: Boolean(apiKey) });
    if (req.method !== 'POST') return send(res, 405, { error: 'method-not-allowed' });
    if (!apiKey) return send(res, 503, { error: 'not-configured' });

    let payload: { question?: unknown; context?: unknown };
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      return send(res, 400, { error: 'invalid-request' });
    }
    const question = typeof payload.question === 'string' ? payload.question.slice(0, 600) : '';
    if (!question.trim()) return send(res, 400, { error: 'empty-question' });
    const context = JSON.stringify(payload.context ?? {}).slice(0, 20000);

    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: `CONTEXT:\n${context}\n\nQUESTION:\n${question}` }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
        }),
      });
      if (!r.ok) return send(res, 502, { error: 'upstream-error', status: r.status });
      const data = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.map((x) => x.text ?? '').join('').trim();
      if (!text) return send(res, 502, { error: 'empty-response' });
      return send(res, 200, { text, model });
    } catch {
      return send(res, 502, { error: 'network-error' });
    }
  };
}
