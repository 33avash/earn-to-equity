import { handleCoach, MAX_BODY } from '../server/handler';

/**
 * The Gemini coach endpoint as a Cloudflare Worker, so the static GitHub Pages site can use Gemini without
 * exposing the key. Set the key with `npx wrangler secret put GEMINI_API_KEY`; see worker/README.md.
 */

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  /** Comma-separated origins allowed to call the worker. */
  ALLOWED_ORIGINS?: string;
}

function cors(origin: string | null, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = cors(request.headers.get('Origin'), env);
    if (request.method === 'OPTIONS') return new Response(null, { status: headers['Access-Control-Allow-Origin'] ? 204 : 403, headers });
    // Only the planner's own pages may spend the key's quota.
    if (!headers['Access-Control-Allow-Origin']) return Response.json({ error: 'origin-not-allowed' }, { status: 403 });
    const raw = request.method === 'POST' ? (await request.text()).slice(0, MAX_BODY + 1) : '';
    const { status, body } = await handleCoach(request.method, raw, env.GEMINI_API_KEY, env.GEMINI_MODEL || undefined);
    return Response.json(body, { status, headers: { ...headers, 'Cache-Control': 'no-store' } });
  },
};
