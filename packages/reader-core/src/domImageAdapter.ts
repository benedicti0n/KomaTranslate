import type { PageCandidate, ReaderAdapter } from './types.js';

/**
 * Placeholder DOM image adapter for Phase 0.
 *
 * Performs a safe discovery pass over visible `<img>` elements. Full reading
 * order inference, lazy-load handling, and robust adapter matching are
 * deferred to Phase 1.
 */
export const createDomImageAdapter = (): ReaderAdapter => {
  const discover = (): PageCandidate[] => {
    const images = Array.from(document.querySelectorAll('img'));
    const visibleImages = images.filter((img) => {
      const rect = img.getBoundingClientRect();
      return rect.width > 64 && rect.height > 64;
    });

    return visibleImages.map((img, index) => {
      const rect = img.getBoundingClientRect();
      return {
        id: `${img.src ?? img.currentSrc ?? ''}|${index}`,
        source: img.currentSrc || img.src,
        readingOrderIndex: index,
        viewportRect: rect,
      };
    });
  };

  const subscribe = (_callback: (candidates: PageCandidate[]) => void): (() => void) => {
    // Phase 1: implement MutationObserver and IntersectionObserver subscription.
    return () => {};
  };

  return { name: 'dom-image-placeholder', discover, subscribe };
};
