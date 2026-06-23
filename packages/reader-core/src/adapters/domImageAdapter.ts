import { createPageFingerprint } from '../pageFingerprint.js';
import type { PageCandidate, ReaderAdapter } from '../types.js';

export interface DomImageAdapterOptions {
  /** Minimum width/height in pixels for an image to be considered a page. */
  readonly minSize?: number;
  /** Container to observe; defaults to document.body. */
  readonly root?: HTMLElement;
}

const DATA_ATTR = 'data-manga-translator-id';

const generateElementId = (): string => {
  // Use a simple counter + random suffix to avoid collisions across reloads.
  return `mt-${Math.random().toString(36).slice(2, 9)}`;
};

const isValidImage = (img: HTMLImageElement, minSize: number): boolean => {
  const rect = img.getBoundingClientRect();
  return rect.width >= minSize && rect.height >= minSize;
};

const LAZY_SOURCE_ATTRIBUTES = ['data-src', 'data-lazy-src', 'data-original'];

const resolveImageSource = (img: HTMLImageElement): string => {
  for (const attr of LAZY_SOURCE_ATTRIBUTES) {
    const value = img.getAttribute(attr);
    if (value && value.startsWith('http')) {
      return value;
    }
  }
  return img.currentSrc || img.src || '';
};

const createCandidate = (img: HTMLImageElement, elementId: string, index: number): PageCandidate => {
  const source = resolveImageSource(img);
  return {
    id: elementId,
    fingerprint: createPageFingerprint(source),
    source,
    readingOrderIndex: index,
    viewportRect: img.getBoundingClientRect(),
    naturalSize:
      img.naturalWidth > 0 && img.naturalHeight > 0
        ? { width: img.naturalWidth, height: img.naturalHeight }
        : null,
  };
};

/**
 * Discovers manga pages from visible `<img>` elements in the DOM.
 *
 * The adapter marks each discovered image with a stable data attribute so that
 * the viewport tracker can observe it. It ignores tiny images, icons, and
 * elements that are likely UI chrome.
 */
export const createDomImageAdapter = (
  options: DomImageAdapterOptions = {},
): ReaderAdapter => {
  const { minSize = 128, root = document.body } = options;

  const markElement = (img: HTMLImageElement): string => {
    let id = img.getAttribute(DATA_ATTR);
    if (!id) {
      id = generateElementId();
      img.setAttribute(DATA_ATTR, id);
    }
    return id;
  };

  const discover = (): PageCandidate[] => {
    const images = Array.from(root.querySelectorAll('img'));
    let index = 0;
    const candidates: PageCandidate[] = [];

    for (const img of images) {
      if (!isValidImage(img, minSize)) continue;

      const elementId = markElement(img);
      candidates.push(createCandidate(img, elementId, index));
      index += 1;
    }

    return candidates;
  };

  const subscribe = (callback: (candidates: PageCandidate[]) => void): (() => void) => {
    callback(discover());

    const observer = new MutationObserver(() => {
      callback(discover());
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  };

  return { name: 'dom-image', discover, subscribe };
};
