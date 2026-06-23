import { createOverlayRoot, removeOverlayRoot } from './overlayRoot.js';
import type { DiagnosticOverlayOptions } from './types.js';

const DIAGNOSTIC_CARD_CLASS = 'manga-translator-diagnostic-card';

/**
 * Injects a temporary diagnostic card into the Shadow DOM overlay.
 *
 * This proves that the content script can inject, isolate styles, and clean up
 * without affecting the host page. It is only a development/Phase 0 tool.
 */
export const showDiagnosticOverlay = (
  options: DiagnosticOverlayOptions = {},
): (() => void) => {
  const { label = 'Manga Translator active', backgroundColor = '#ffffff' } = options;

  removeOverlayRoot();
  const { shadowRoot, destroy } = createOverlayRoot();

  const style = document.createElement('style');
  style.textContent = `
    .${DIAGNOSTIC_CARD_CLASS} {
      position: fixed;
      top: 16px;
      right: 16px;
      max-width: 320px;
      padding: 12px 16px;
      background: ${backgroundColor};
      color: #111111;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      border: 1px solid #222222;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      pointer-events: none;
      z-index: 2147483647;
    }
  `;
  shadowRoot.appendChild(style);

  const card = document.createElement('div');
  card.className = DIAGNOSTIC_CARD_CLASS;
  card.textContent = label;
  card.setAttribute('role', 'status');
  card.setAttribute('aria-live', 'polite');
  shadowRoot.appendChild(card);

  return destroy;
};

/** Removes the diagnostic overlay from the page. */
export const removeDiagnosticOverlay = (): void => {
  removeOverlayRoot();
};
