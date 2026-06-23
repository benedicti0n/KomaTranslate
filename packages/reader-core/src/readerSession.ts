import { createDomImageAdapter } from './adapters/domImageAdapter.js';
import { assignReadingOrder } from './readingOrder.js';
import type { PageCandidate, PageQueueCallbacks, ReadingDirection } from './types.js';
import { createViewportTracker } from './viewportTracker.js';
import { createPageQueue, type PageQueue, type PageQueueOptions } from './pageQueue.js';

export interface ReaderSessionOptions {
  /** Reading direction used to infer next-page order. */
  readonly direction?: ReadingDirection;
  /** Async work to perform for each queued page. */
  readonly processJob: PageQueueOptions['processJob'];
  /** Optional queue lifecycle callbacks. */
  readonly callbacks?: PageQueueCallbacks;
}

export interface ReaderSession {
  /** Current active page (closest to viewport center). */
  readonly getCurrentPage: () => PageCandidate | null;
  /** Next page in reading order, or null if none. */
  readonly getNextPage: () => PageCandidate | null;
  /** Next-next page in reading order, or null if none. */
  readonly getNextNextPage: () => PageCandidate | null;
  /** All discovered candidates in reading order. */
  readonly getCandidates: () => PageCandidate[];
  /** Force a refresh of candidates and viewport state. */
  readonly refresh: () => void;
  /** Stop observing and processing. */
  readonly destroy: () => void;
  /** Underlying page queue for inspection. */
  readonly queue: PageQueue;
}

/**
 * Orchestrates reader discovery, viewport tracking, and the P0/P1/P2 queue.
 *
 * The session:
 * 1. Discovers page candidates via the DOM image adapter.
 * 2. Sorts them into reading order.
 * 3. Tracks viewport intersection to identify the current page.
 * 4. Updates the page queue so only P0, P1, and P2 are processed.
 */
export const createReaderSession = (options: ReaderSessionOptions): ReaderSession => {
  const { direction = 'vertical', processJob, callbacks } = options;

  let candidates: PageCandidate[] = [];
  const adapter = createDomImageAdapter();

  const viewportTracker = createViewportTracker(
    () => candidates,
    { rootMargin: '50%' },
  );

  const queue = createPageQueue({ processJob, callbacks });

  const refresh = (): void => {
    const raw = adapter.discover();
    candidates = assignReadingOrder(raw, direction);
    viewportTracker.refresh();
    updateQueueFromViewport();
  };

  const getCurrentPage = (): PageCandidate | null =>
    viewportTracker.findClosestToViewportCenter();

  const getNextPage = (): PageCandidate | null => {
    const current = getCurrentPage();
    if (!current) return candidates[0] ?? null;
    return candidates[current.readingOrderIndex + 1] ?? null;
  };

  const getNextNextPage = (): PageCandidate | null => {
    const current = getCurrentPage();
    if (!current) return candidates[1] ?? null;
    return candidates[current.readingOrderIndex + 2] ?? null;
  };

  const updateQueueFromViewport = (): void => {
    queue.updatePriorities(getCurrentPage(), getNextPage(), getNextNextPage());
  };

  const unsubscribeAdapter = adapter.subscribe(() => {
    refresh();
  });

  const handleViewportChange = (): void => {
    updateQueueFromViewport();
  };

  window.addEventListener('scroll', handleViewportChange, { passive: true });
  window.addEventListener('resize', handleViewportChange);

  // Initial discovery.
  refresh();

  const destroy = (): void => {
    unsubscribeAdapter();
    window.removeEventListener('scroll', handleViewportChange);
    window.removeEventListener('resize', handleViewportChange);
    viewportTracker.destroy();
    queue.destroy();
  };

  return {
    getCurrentPage,
    getNextPage,
    getNextNextPage,
    getCandidates: () => candidates,
    refresh,
    destroy,
    queue,
  };
};
