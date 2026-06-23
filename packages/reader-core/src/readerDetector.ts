import { createDomImageAdapter } from './adapters/domImageAdapter.js';
import type { ReaderAdapter, ReaderDetectionResult } from './types.js';

/**
 * Detects a suitable reader adapter for the current document.
 *
 * In Phase 1 the detector always falls back to the DOM image adapter. Future
 * phases will add heuristics for canvas readers, WebGL readers, and known
 * site-specific adapters.
 */
export const detectReaderAdapter = (): ReaderDetectionResult => {
  const adapter: ReaderAdapter = createDomImageAdapter();
  return { ok: true, value: adapter };
};
