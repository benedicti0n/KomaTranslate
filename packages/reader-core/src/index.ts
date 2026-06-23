/**
 * Reader discovery, page queue, prefetch, and viewport tracking.
 *
 * Phase 0 contains only shared contracts and placeholder scaffolding.
 * Real adapters and queue logic will be implemented in Phase 1.
 */

export type { ReaderAdapter, PageCandidate, PageQueueJob } from './types.js';
export { createDomImageAdapter } from './domImageAdapter.js';
