import { describe, expect, it } from 'vitest';
import { sortByReadingOrder } from './readingOrder.js';
import type { PageCandidate } from './types.js';

const makeCandidate = (
  fingerprint: string,
  left: number,
  top: number,
): PageCandidate => ({
  id: fingerprint,
  fingerprint,
  source: `https://example.com/${fingerprint}.jpg`,
  readingOrderIndex: 0,
  viewportRect: new DOMRectReadOnly(left, top, 100, 100),
  naturalSize: { width: 100, height: 100 },
});

describe('sortByReadingOrder', () => {
  it('orders vertical readers top-to-bottom then left-to-right', () => {
    const candidates = [
      makeCandidate('b', 0, 200),
      makeCandidate('a', 0, 0),
      makeCandidate('c', 0, 400),
    ];
    const sorted = sortByReadingOrder(candidates, 'vertical');
    expect(sorted.map((c) => c.fingerprint)).toEqual(['a', 'b', 'c']);
  });

  it('orders horizontal LTR readers left-to-right then top-to-bottom', () => {
    const candidates = [
      makeCandidate('b', 200, 0),
      makeCandidate('a', 0, 0),
      makeCandidate('c', 400, 0),
    ];
    const sorted = sortByReadingOrder(candidates, 'horizontal-ltr');
    expect(sorted.map((c) => c.fingerprint)).toEqual(['a', 'b', 'c']);
  });

  it('orders horizontal RTL readers right-to-left then top-to-bottom', () => {
    const candidates = [
      makeCandidate('b', 200, 0),
      makeCandidate('a', 400, 0),
      makeCandidate('c', 0, 0),
    ];
    const sorted = sortByReadingOrder(candidates, 'horizontal-rtl');
    expect(sorted.map((c) => c.fingerprint)).toEqual(['a', 'b', 'c']);
  });
});
