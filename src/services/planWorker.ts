import { useEffect, useState } from 'react';
import type { Assumptions, FinancialProfile } from '@/types/profile';
import type { PlanJob, PlanJobResult } from './planCompute';

/*
 * Client for the plan worker. Results are cached by a hash of the job, so reopening a sheet or returning to
 * Overview doesn't recompute. Where workers aren't available (tests, very old browsers) the job runs on the
 * main thread after a tick.
 */

let worker: Worker | null | undefined;
let nextId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
const cache = new Map<string, unknown>();
const CACHE_LIMIT = 24;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker === 'undefined' ? null : new Worker(new URL('./plan.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    worker = null;
  }
  if (worker) {
    worker.onmessage = (e: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.error) p.reject(new Error(e.data.error));
      else p.resolve(e.data.result);
    };
    worker.onerror = () => {
      for (const p of pending.values()) p.reject(new Error('The plan worker stopped.'));
      pending.clear();
      worker = null;
    };
  }
  return worker;
}

/** A stable short hash of a job, for the cache. */
export function jobKey(job: PlanJob): string {
  const s = JSON.stringify(job);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${job.kind}:${(h >>> 0).toString(36)}:${s.length}`;
}

export function runJob<K extends PlanJob['kind']>(job: Extract<PlanJob, { kind: K }>): Promise<PlanJobResult<K>> {
  const key = jobKey(job);
  if (cache.has(key)) return Promise.resolve(cache.get(key) as PlanJobResult<K>);
  const remember = (v: unknown) => {
    cache.set(key, v);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    return v as PlanJobResult<K>;
  };
  const w = getWorker();
  if (!w)
    return new Promise((resolve, reject) =>
      setTimeout(() => {
        import('./planCompute')
          .then((m) => resolve(remember(m.runPlanJob(job))))
          .catch(reject);
      }, 0),
    );
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: (v) => resolve(remember(v)), reject });
    w.postMessage({ id, job });
  });
}

/** Cached result for a job, if it has already run. */
export function cachedJob<K extends PlanJob['kind']>(job: Extract<PlanJob, { kind: K }>): PlanJobResult<K> | undefined {
  return cache.get(jobKey(job)) as PlanJobResult<K> | undefined;
}

/**
 * Runs a job for this profile, debounced, and returns its latest result (null while the first run is going).
 * `enabled: false` skips the work entirely.
 */
export function usePlanJob<K extends PlanJob['kind']>(kind: K, profile: FinancialProfile, assumptions: Assumptions, enabled = true, delay = 350): { data: PlanJobResult<K> | null; loading: boolean } {
  const job = { kind, profile, assumptions } as Extract<PlanJob, { kind: K }>;
  const [state, setState] = useState<{ data: PlanJobResult<K> | null; loading: boolean }>(() => ({ data: enabled ? cachedJob(job) ?? null : null, loading: enabled && !cachedJob(job) }));
  useEffect(() => {
    if (!enabled) return;
    const hit = cachedJob(job);
    if (hit) {
      setState({ data: hit, loading: false });
      return;
    }
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      runJob(job)
        .then((data) => live && setState({ data, loading: false }))
        .catch(() => live && setState((s) => ({ ...s, loading: false })));
    }, delay);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // The job is rebuilt from these each render; its identity doesn't matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, profile, assumptions, enabled, delay]);
  return state;
}
