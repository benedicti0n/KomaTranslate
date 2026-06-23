import type { PageCandidate, PageViewportState } from './types.js';

/** Options for the viewport tracker. */
export interface ViewportTrackerOptions {
  /** Margin around the viewport to observe (IntersectionObserver rootMargin). */
  readonly rootMargin?: string;
  /**
   * Thresholds at which to report intersection changes.
   * Default: [0, 0.25, 0.5, 0.75, 1].
   */
  readonly thresholds?: number[];
}

/** Tracks the viewport presence of page elements. */
export interface ViewportTracker {
  /** Current observed candidates. */
  readonly getStates: () => ReadonlyMap<string, PageViewportState>;
  /** Returns the candidate whose center is closest to the current viewport center. */
  readonly findClosestToViewportCenter: () => PageCandidate | null;
  /** Refresh all tracked elements. */
  readonly refresh: () => void;
  /** Stop tracking and disconnect observers. */
  readonly destroy: () => void;
}

const getViewportCenter = (): { x: number; y: number } => ({
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
});

const distanceToViewportCenter = (rect: DOMRectReadOnly): number => {
  const center = getViewportCenter();
  const elementCenterX = rect.left + rect.width / 2;
  const elementCenterY = rect.top + rect.height / 2;
  return Math.hypot(elementCenterX - center.x, elementCenterY - center.y);
};

/**
 * Creates a viewport tracker using IntersectionObserver.
 *
 * The tracker maintains a map of candidate IDs to their latest viewport state.
 * It is used by the page queue to identify the current page (closest to the
 * viewport center) and to detect when pages enter or leave the viewport.
 */
export const createViewportTracker = (
  getCandidates: () => PageCandidate[],
  options: ViewportTrackerOptions = {},
): ViewportTracker => {
  const { rootMargin = '0px', thresholds = [0, 0.25, 0.5, 0.75, 1] } = options;
  const states = new Map<string, PageViewportState>();
  const elementsById = new Map<string, HTMLElement>();

  const updateState = (candidate: PageCandidate, entry: IntersectionObserverEntry): void => {
    states.set(candidate.id, {
      candidate,
      isIntersecting: entry.isIntersecting,
      intersectionRatio: entry.intersectionRatio,
      boundingClientRect: entry.boundingClientRect,
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const candidates = getCandidates();
      const candidateByElement = new Map<Element, PageCandidate>(
        candidates.map((c) => [elementsById.get(c.id)!, c]),
      );

      for (const entry of entries) {
        const candidate = candidateByElement.get(entry.target);
        if (candidate) {
          updateState(candidate, entry);
        }
      }
    },
    { root: null, rootMargin, threshold: thresholds },
  );

  const refresh = (): void => {
    observer.disconnect();
    states.clear();
    elementsById.clear();

    const candidates = getCandidates();
    for (const candidate of candidates) {
      const element = document.querySelector(
        `[data-manga-translator-id="${candidate.id}"]`,
      ) as HTMLElement | null;
      if (element && !elementsById.has(candidate.id)) {
        elementsById.set(candidate.id, element);
        observer.observe(element);
      }
    }
  };

  const findClosestToViewportCenter = (): PageCandidate | null => {
    const candidates = getCandidates();
    if (candidates.length === 0) return null;

    let closest: PageCandidate | null = null;
    let closestDistance = Infinity;

    for (const candidate of candidates) {
      const state = states.get(candidate.id);
      if (!state || !state.isIntersecting) continue;

      const distance = distanceToViewportCenter(state.boundingClientRect);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = candidate;
      }
    }

    // If no intersecting element is found, fall back to the candidate nearest
    // the viewport center regardless of intersection state.
    if (!closest) {
      for (const candidate of candidates) {
        const distance = distanceToViewportCenter(candidate.viewportRect);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = candidate;
        }
      }
    }

    return closest;
  };

  const destroy = (): void => {
    observer.disconnect();
    states.clear();
    elementsById.clear();
  };

  return { getStates: () => states, findClosestToViewportCenter, refresh, destroy };
};
