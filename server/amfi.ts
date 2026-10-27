import { parseNavAll, type AmfiScheme } from '../src/services/data/amfiParse';

/**
 * AMFI's official daily NAV file, for the scheme codes a page asks about. Browsers on other sites can't read the
 * file (no CORS) and it is 1.5 MB, so the dev server and the Worker fetch it, parse it once and cache it for 12
 * hours. Only the requested scheme codes are returned. No plan data is ever sent here, only scheme codes.
 */

export const NAVALL_URL = 'https://portal.amfiindia.com/spages/NAVAll.txt';
const CACHE_MS = 12 * 60 * 60 * 1000;
const TIMEOUT_MS = 15_000;
const MAX_CODES = 40;

let cache: { at: number; schemes: Map<number, AmfiScheme> } | null = null;

async function load(): Promise<Map<number, AmfiScheme>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.schemes;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(NAVALL_URL, { signal: ctl.signal, headers: { 'User-Agent': 'earn-to-equity (education)' } });
    if (!r.ok) throw new Error(`amfi-${r.status}`);
    const schemes = parseNavAll(await r.text());
    if (!schemes.size) throw new Error('amfi-empty');
    cache = { at: Date.now(), schemes };
    return schemes;
  } finally {
    clearTimeout(t);
  }
}

/** GET with ?codes=120716,119132 → the matching schemes and the time the file was read. */
export async function handleAmfi(method: string, url: string): Promise<{ status: number; body: unknown }> {
  if (method !== 'GET') return { status: 405, body: { error: 'method-not-allowed' } };
  const codes = (new URL(url, 'http://local').searchParams.get('codes') ?? '')
    .split(',')
    .map((c) => Number(c.trim()))
    .filter((c) => Number.isInteger(c) && c > 0)
    .slice(0, MAX_CODES);
  if (!codes.length) return { status: 400, body: { error: 'no-codes' } };
  try {
    const all = await load();
    return { status: 200, body: { source: NAVALL_URL, fetchedAt: new Date(cache!.at).toISOString(), schemes: codes.map((c) => all.get(c)).filter(Boolean) } };
  } catch (e) {
    return { status: 502, body: { error: e instanceof Error ? e.message : 'amfi-failed' } };
  }
}
