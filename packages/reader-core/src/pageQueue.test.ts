import { describe, expect, it } from 'vitest';
import { createPageQueue, createSimulatedProcessor } from './pageQueue.js';
import type { PageCandidate } from './types.js';

const makeCandidate = (fingerprint: string, index: number): PageCandidate => ({
  id: `el-${fingerprint}`,
  fingerprint,
  source: `https://example.com/${fingerprint}.jpg`,
  readingOrderIndex: index,
  viewportRect: new DOMRectReadOnly(0, index * 1000, 800, 1000),
  naturalSize: { width: 800, height: 1000 },
});

describe('createPageQueue', () => {
  it('processes P0 before P1 and P2', async () => {
    const order: string[] = [];
    const queue = createPageQueue({
      processJob: async (job) => {
        order.push(job.candidate.fingerprint);
        return {
          candidate: job.candidate,
          priority: job.priority,
          durationMs: 0,
        };
      },
    });

    queue.updatePriorities(
      makeCandidate('p0', 0),
      makeCandidate('p1', 1),
      makeCandidate('p2', 2),
    );

    // Allow microtasks to drain.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(order).toEqual(['p0', 'p1', 'p2']);
    queue.destroy();
  });

  it('does not process the same fingerprint twice', async () => {
    const calls: string[] = [];
    const queue = createPageQueue({
      processJob: async (job) => {
        calls.push(job.candidate.fingerprint);
        return { candidate: job.candidate, priority: job.priority, durationMs: 0 };
      },
    });

    queue.updatePriorities(makeCandidate('p0', 0), null, null);
    await new Promise((resolve) => setTimeout(resolve, 0));

    queue.updatePriorities(null, makeCandidate('p0', 0), null);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toEqual(['p0']);
    queue.destroy();
  });

  it('cancels jobs that fall outside the P0/P1/P2 window', async () => {
    const cancelled: string[] = [];
    const queue = createPageQueue({
      processJob: createSimulatedProcessor(50),
      callbacks: {
        onJobCancelled: (job) => cancelled.push(job.candidate.fingerprint),
      },
    });

    queue.updatePriorities(makeCandidate('p0', 0), makeCandidate('p1', 1), null);
    // Immediately replace P1 with a different page.
    queue.updatePriorities(makeCandidate('p0', 0), makeCandidate('p1b', 2), null);

    // Wait long enough for P0 (50ms) and P1b (50ms) to complete sequentially.
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(cancelled).toContain('p1');
    expect(queue.getCompletedFingerprints().has('p0')).toBe(true);
    expect(queue.getCompletedFingerprints().has('p1b')).toBe(true);
    queue.destroy();
  });
});
