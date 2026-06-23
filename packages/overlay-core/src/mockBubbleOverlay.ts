import { createOverlayRoot, removeOverlayRoot } from './overlayRoot.js';

export interface MockBubbleCandidate {
  readonly id: string;
  /** Bounding rectangle in viewport coordinates. */
  readonly viewportRect: DOMRectReadOnly;
  /** Optional label to show inside the bubble. */
  readonly label?: string;
}

export interface MockBubbleOverlayOptions {
  readonly candidates: ReadonlyArray<MockBubbleCandidate & { priority: 0 | 1 | 2 }>;
}

const BUBBLE_CLASS = 'manga-translator-mock-bubble';

const priorityLabel = (priority: 0 | 1 | 2): string => {
  switch (priority) {
    case 0:
      return 'P0 · Current page';
    case 1:
      return 'P1 · Next page';
    case 2:
      return 'P2 · Next-next page';
  }
};

const priorityColor = (priority: 0 | 1 | 2): string => {
  switch (priority) {
    case 0:
      return '#ffffff';
    case 1:
      return '#f3f4f6';
    case 2:
      return '#e5e7eb';
  }
};

/**
 * Renders mock translation bubbles over detected page regions.
 *
 * This is a Phase 1 diagnostic tool: it proves that the page queue discovers
 * pages in the right order and that overlay positioning stays aligned with the
 * source elements.
 */
export const renderMockBubbleOverlay = (
  options: MockBubbleOverlayOptions,
): (() => void) => {
  removeOverlayRoot();
  const { shadowRoot, destroy } = createOverlayRoot();

  const style = document.createElement('style');
  style.textContent = `
    .${BUBBLE_CLASS} {
      position: fixed;
      padding: 12px 16px;
      border: 2px solid #1f2937;
      border-radius: 8px;
      color: #111827;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      pointer-events: none;
      z-index: 2147483647;
      max-width: 240px;
      text-align: center;
    }
  `;
  shadowRoot.appendChild(style);

  for (const candidate of options.candidates) {
    const bubble = document.createElement('div');
    bubble.className = BUBBLE_CLASS;
    bubble.textContent = candidate.label ?? priorityLabel(candidate.priority);
    bubble.style.left = `${candidate.viewportRect.left}px`;
    bubble.style.top = `${candidate.viewportRect.top}px`;
    bubble.style.width = `${candidate.viewportRect.width}px`;
    bubble.style.height = `${candidate.viewportRect.height}px`;
    bubble.style.backgroundColor = priorityColor(candidate.priority);
    bubble.style.display = 'flex';
    bubble.style.alignItems = 'center';
    bubble.style.justifyContent = 'center';
    bubble.setAttribute('role', 'img');
    bubble.setAttribute('aria-label', `Translation preview ${candidate.id}`);
    shadowRoot.appendChild(bubble);
  }

  return destroy;
};

/** Removes any mock bubble overlay from the page. */
export const removeMockBubbleOverlay = (): void => {
  removeOverlayRoot();
};
