import { runPlanJob, type PlanJob } from './planCompute';

// Runs Monte Carlo and "Fix my plan" off the main thread so typing stays smooth.
self.onmessage = (e: MessageEvent<{ id: number; job: PlanJob }>) => {
  const { id, job } = e.data;
  try {
    (self as unknown as Worker).postMessage({ id, result: runPlanJob(job) });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
