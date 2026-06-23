import type { Result } from '@manga-translator/shared';

/** A candidate manga page discovered in the DOM. */
export interface PageCandidate {
  /** Unique identifier for this DOM element instance. */
  readonly id: string;
  /** Stable fingerprint used for session-cache deduplication. */
  readonly fingerprint: string;
  /** Source URL, blob URL, or data URI of the page image. */
  readonly source: string;
  /** Reading order index inferred from DOM position. */
  readonly readingOrderIndex: number;
  /** Bounding rectangle of the element in viewport coordinates. */
  readonly viewportRect: DOMRectReadOnly;
  /** Natural image dimensions if available. */
  readonly naturalSize: { readonly width: number; readonly height: number } | null;
}

/** Snapshot of a page's viewport presence. */
export interface PageViewportState {
  readonly candidate: PageCandidate;
  /** Whether the element currently has a non-zero intersection with the viewport. */
  readonly isIntersecting: boolean;
  /** Ratio of the element's area that is visible. */
  readonly intersectionRatio: number;
  /** Bounding rectangle from the last observation. */
  readonly boundingClientRect: DOMRectReadOnly;
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

/** Reading direction used to infer next-page order. */
export type ReadingDirection = 'vertical' | 'horizontal-ltr' | 'horizontal-rtl';

/** Callback invoked by the page queue when a job's state changes. */
export interface PageQueueCallbacks {
  readonly onJobStarted?: (job: PageQueueJob) => void;
  readonly onJobCompleted?: (job: PageQueueJob, result: PageQueueResult) => void;
  readonly onJobCancelled?: (job: PageQueueJob, reason: string) => void;
}

/** Result of a completed page queue job. */
export interface PageQueueResult {
  readonly candidate: PageCandidate;
  readonly priority: 0 | 1 | 2;
  readonly durationMs: number;
}
