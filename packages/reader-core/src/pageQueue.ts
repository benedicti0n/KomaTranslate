import type {
  PageCandidate,
  PageQueueCallbacks,
  PageQueueJob,
  PageQueueResult,
} from './types.js';

export interface PageQueueOptions {
  /** Async work to perform for each queued job. */
  readonly processJob: (job: PageQueueJob) => Promise<PageQueueResult>;
  /** Optional lifecycle callbacks. */
  readonly callbacks?: PageQueueCallbacks;
}

export interface PageQueue {
  /**
   * Updates the set of candidates that should be processed.
   *
   * The first candidate is P0 (current page), the second is P1 (next page),
   * the third is P2 (next-next page). Any candidate already processed in this
   * session is skipped. Stale jobs are cancelled.
   */
  readonly updatePriorities: (
    p0: PageCandidate | null,
    p1: PageCandidate | null,
    p2: PageCandidate | null,
  ) => void;
  /** Removes all jobs and cancels active work. */
  readonly destroy: () => void;
  /** Returns fingerprints that have been completed this session. */
  readonly getCompletedFingerprints: () => ReadonlySet<string>;
  /** Returns currently active jobs keyed by fingerprint. */
  readonly getActiveJobs: () => ReadonlyMap<string, PageQueueJob>;
}

interface InternalJob extends PageQueueJob {
  startedAt: number | null;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates a bounded page processing queue.
 *
 * The queue never processes more than one instance of the same page
 * fingerprint per session. It cancels jobs that fall outside the current
 * P0/P1/P2 window and always prefers the highest-priority runnable job.
 */
export const createPageQueue = (options: PageQueueOptions): PageQueue => {
  const { processJob, callbacks = {} } = options;
  const activeJobs = new Map<string, InternalJob>();
  const completedFingerprints = new Set<string>();
  let currentRun: Promise<void> | null = null;
  let schedulePending = false;
  let destroyed = false;

  const hasRunnableJob = (): boolean => {
    for (const job of activeJobs.values()) {
      if (job.abortController.signal.aborted) continue;
      if (completedFingerprints.has(job.candidate.fingerprint)) continue;
      if (job.startedAt !== null) continue;
      return true;
    }
    return false;
  };

  const pickHighestPriorityRunnableJob = (): InternalJob | null => {
    let best: InternalJob | null = null;
    for (const job of activeJobs.values()) {
      if (job.abortController.signal.aborted) continue;
      if (completedFingerprints.has(job.candidate.fingerprint)) continue;
      if (job.startedAt !== null) continue; // already running
      if (!best || job.priority < best.priority) {
        best = job;
      }
    }
    return best;
  };

  const cancelJob = (job: InternalJob, reason: string): void => {
    job.abortController.abort(reason);
    if (job.startedAt === null) {
      // Job never started; notify cancellation immediately and remove it.
      callbacks.onJobCancelled?.(job, reason);
      activeJobs.delete(job.candidate.fingerprint);
    }
  };

  const runNextJob = async (): Promise<void> => {
    const job = pickHighestPriorityRunnableJob();
    if (!job || destroyed) return;

    job.startedAt = performance.now();
    callbacks.onJobStarted?.(job);

    try {
      const result = await processJob(job);
      if (!job.abortController.signal.aborted) {
        completedFingerprints.add(job.candidate.fingerprint);
        callbacks.onJobCompleted?.(job, result);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      callbacks.onJobCancelled?.(job, reason);
    } finally {
      activeJobs.delete(job.candidate.fingerprint);
    }
  };

  const schedule = async (): Promise<void> => {
    if (currentRun) {
      schedulePending = true;
      return;
    }

    do {
      schedulePending = false;
      currentRun = runNextJob();
      await currentRun;
      currentRun = null;
    } while ((schedulePending || hasRunnableJob()) && !destroyed);
  };

  const updatePriorities = (
    p0: PageCandidate | null,
    p1: PageCandidate | null,
    p2: PageCandidate | null,
  ): void => {
    if (destroyed) return;

    const desired = new Map<string, 0 | 1 | 2>();
    if (p0) desired.set(p0.fingerprint, 0);
    if (p1) desired.set(p1.fingerprint, 1);
    if (p2) desired.set(p2.fingerprint, 2);

    // Cancel active jobs whose fingerprint is no longer desired.
    for (const [fingerprint, job] of activeJobs.entries()) {
      if (!desired.has(fingerprint)) {
        cancelJob(job, 'No longer in P0/P1/P2 window');
      }
    }

    // Create or update jobs for desired fingerprints.
    for (const [fingerprint, priority] of desired.entries()) {
      if (completedFingerprints.has(fingerprint)) continue;

      const existing = activeJobs.get(fingerprint);
      if (existing) {
        if (existing.priority !== priority) {
          cancelJob(existing, 'Priority changed');
        } else {
          // Same fingerprint and same priority: keep existing job.
          continue;
        }
      }

      const candidate = [p0, p1, p2].find((c) => c?.fingerprint === fingerprint);
      if (!candidate) continue;

      activeJobs.set(fingerprint, {
        candidate,
        priority,
        abortController: new AbortController(),
        startedAt: null,
      });
    }

    void schedule();
  };

  const destroy = (): void => {
    destroyed = true;
    for (const job of activeJobs.values()) {
      cancelJob(job, 'Queue destroyed');
    }
    activeJobs.clear();
    completedFingerprints.clear();
  };

  return {
    updatePriorities,
    destroy,
    getCompletedFingerprints: () => completedFingerprints,
    getActiveJobs: () => activeJobs,
  };
};

/** Utility for tests: simulate async work with frequent abort checks. */
export const createSimulatedProcessor =
  (durationMs: number) =>
  async (job: PageQueueJob): Promise<PageQueueResult> => {
    const startedAt = performance.now();
    const interval = 25;
    let elapsed = 0;

    while (elapsed < durationMs) {
      if (job.abortController.signal.aborted) {
        throw new Error('Aborted');
      }
      await sleep(interval);
      elapsed += interval;
    }

    return {
      candidate: job.candidate,
      priority: job.priority,
      durationMs: performance.now() - startedAt,
    };
  };
