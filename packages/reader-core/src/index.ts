/**
 * Reader discovery, page queue, prefetch, and viewport tracking.
 *
 * Phase 0 contains only shared contracts and placeholder scaffolding.
 * Real adapters and queue logic will be implemented in Phase 1.
 */

export type { ReaderAdapter, PageCandidate, PageQueueJob } from './types.js';
export { createDomImageAdapter } from './adapters/domImageAdapter.js';
export { createReaderSession } from './readerSession.js';
export { createPageQueue, createSimulatedProcessor } from './pageQueue.js';
export { createViewportTracker } from './viewportTracker.js';
export { assignReadingOrder, sortByReadingOrder } from './readingOrder.js';
export { createPageFingerprint } from './pageFingerprint.js';
