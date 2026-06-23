import type { PageCandidate, ReadingDirection } from './types.js';

/**
 * Sorts candidates into reading order based on direction.
 *
 * - vertical: top-to-bottom, then left-to-right.
 * - horizontal-ltr: left-to-right, then top-to-bottom.
 * - horizontal-rtl: right-to-left, then top-to-bottom.
 */
export const sortByReadingOrder = (
  candidates: PageCandidate[],
  direction: ReadingDirection,
): PageCandidate[] => {
  const sorted = [...candidates];

  switch (direction) {
    case 'vertical':
      sorted.sort((a, b) => {
        const topDiff = a.viewportRect.top - b.viewportRect.top;
        if (Math.abs(topDiff) > 1) return topDiff;
        return a.viewportRect.left - b.viewportRect.left;
      });
      break;
    case 'horizontal-ltr':
      sorted.sort((a, b) => {
        const leftDiff = a.viewportRect.left - b.viewportRect.left;
        if (Math.abs(leftDiff) > 1) return leftDiff;
        return a.viewportRect.top - b.viewportRect.top;
      });
      break;
    case 'horizontal-rtl':
      sorted.sort((a, b) => {
        const rightDiff = b.viewportRect.right - a.viewportRect.right;
        if (Math.abs(rightDiff) > 1) return rightDiff;
        return a.viewportRect.top - b.viewportRect.top;
      });
      break;
  }

  return sorted;
};

/**
 * Assigns reading-order indices to candidates in place.
 */
export const assignReadingOrder = (
  candidates: PageCandidate[],
  direction: ReadingDirection,
): PageCandidate[] =>
  sortByReadingOrder(candidates, direction).map((candidate, index) => ({
    ...candidate,
    readingOrderIndex: index,
  }));
