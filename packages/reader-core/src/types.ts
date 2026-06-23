import type { Result } from '@manga-translator/shared';

/** A candidate manga page discovered in the DOM. */
export interface PageCandidate {
  /** Stable identifier derived from the image source or DOM fingerprint. */
  readonly id: string;
  /** Source URL, blob URL, or data URI of the page image. */
  readonly source: string;
  /** Reading order index inferred from DOM position. */
  readonly readingOrderIndex: number;
  /** Bounding rectangle of the element in viewport coordinates. */
  readonly viewportRect: DOMRectReadOnly;
}

/** A queued processing job for a manga page. */
export interface PageQueueJob {
  readonly candidate: PageCandidate;
  readonly priority: 0 | 1 | 2;
  readonly abortController: AbortController;
}

/** Adapter interface for discovering manga pages in a reader. */
export interface ReaderAdapter {
  readonly name: string;
  /** Returns all candidate pages currently present in the document. */
  discover(): PageCandidate[];
  /** Subscribes to reader mutations and invokes the callback. Returns an unsubscribe function. */
  subscribe(callback: (candidates: PageCandidate[]) => void): () => void;
}

/** Result of attempting to detect a reader adapter for the current document. */
export type ReaderDetectionResult = Result<ReaderAdapter, string>;
