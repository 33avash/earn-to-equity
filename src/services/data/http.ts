/**
 * Every live figure goes through here: a timeout, an in-memory and localStorage cache with a timestamp, and a
 * committed snapshot to fall back on offline or when a source is down. Only scheme codes or the text someone typed
 * are ever sent to these sources; nothing from the plan.
 */

export type DataOrigin = 'live' | 'cache' | 'snapshot';

export interface DataResult<T> {
  data: T;
  /** When this copy was fetched (ms since epoch); for a snapshot, when the snapshot was taken. */
  fetchedAt: number;
  origin: DataOrigin;
}

export interface FetchOptions<T> {
  key: string;
  url: string;
  ttlMs: number;
  timeoutMs?: number;
  parse: (raw: unknown) => T;
  /** Committed fallback and the time it was taken; loaded only when needed. */
  snapshot?: () => Promise<{ data: T; takenAt: string }>;
  /** For tests. */
  fetchImpl?: typeof fetch;
  now?: () => number;
}

const memory = new Map<string, { data: unknown; fetchedAt: number }>();
const PREFIX = 'e2e:data:';

function readStored(key: string): { data: unknown; fetchedAt: number } | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const v = JSON.parse(raw) as { data: unknown; fetchedAt: number };
    if (typeof v?.fetchedAt !== 'number') return null;
    memory.set(key, v);
    return v;
  } catch {
    return null;
  }
}

function store(key: string, v: { data: unknown; fetchedAt: number }) {
  memory.set(key, v);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(v));
  } catch {
    // Storage full or blocked: the memory copy still serves this visit.
  }
}

/** Clears cached copies (all, or one key). For tests and Settings. */
export function clearDataCache(key?: string) {
  if (key) memory.delete(key);
  else memory.clear();
  try {
    if (key) localStorage.removeItem(PREFIX + key);
    else
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
      }
  } catch {
    /* storage unavailable */
  }
}

/** Fresh cache, else the network (with a timeout), else a stale cache, else the snapshot. Throws only if all fail. */
export async function fetchCached<T>(o: FetchOptions<T>): Promise<DataResult<T>> {
  const now = o.now ?? Date.now;
  const cached = readStored(o.key);
  if (cached && now() - cached.fetchedAt < o.ttlMs) return { data: cached.data as T, fetchedAt: cached.fetchedAt, origin: 'cache' };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), o.timeoutMs ?? 8000);
  try {
    const r = await (o.fetchImpl ?? fetch)(o.url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`http-${r.status}`);
    const data = o.parse(await r.json());
    const v = { data, fetchedAt: now() };
    store(o.key, v);
    return { ...v, origin: 'live' };
  } catch (e) {
    if (cached) return { data: cached.data as T, fetchedAt: cached.fetchedAt, origin: 'cache' };
    if (o.snapshot) {
      const snap = await o.snapshot();
      return { data: snap.data, fetchedAt: Date.parse(snap.takenAt), origin: 'snapshot' };
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** "27 Oct 2026, 4:05 pm IST" for any timestamp, always in Indian time. */
export function istStamp(ms: number, withTime = true): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) })}${withTime ? ' IST' : ''}`;
}
