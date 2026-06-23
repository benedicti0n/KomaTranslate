import type { OverlayRoot } from './types.js';

const OVERLAY_HOST_ID = 'manga-translator-overlay-host';

/**
 * Mounts a Shadow DOM overlay host into the current document.
 *
 * Uses closed Shadow DOM to isolate our styles and markup from the page.
 */
export const createOverlayRoot = (): OverlayRoot => {
  const existing = document.getElementById(OVERLAY_HOST_ID);
  if (existing) {
    existing.remove();
  }

  const hostElement = document.createElement('div');
  hostElement.id = OVERLAY_HOST_ID;
  hostElement.style.position = 'fixed';
  hostElement.style.top = '0';
  hostElement.style.left = '0';
  hostElement.style.width = '0';
  hostElement.style.height = '0';
  hostElement.style.zIndex = '2147483647';
  hostElement.style.pointerEvents = 'none';
  hostElement.setAttribute('aria-hidden', 'true');

  const shadowRoot = hostElement.attachShadow({ mode: 'closed' });
  document.documentElement.appendChild(hostElement);

  const destroy = (): void => {
    if (hostElement.isConnected) {
      hostElement.remove();
    }
  };

  return { shadowRoot, hostElement, destroy };
};

/** Removes the overlay host if it exists. */
export const removeOverlayRoot = (): void => {
  const existing = document.getElementById(OVERLAY_HOST_ID);
  if (existing) {
    existing.remove();
  }
};
