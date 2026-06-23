import { defineContentScript } from 'wxt/utils/define-content-script';
import {
  EXTENSION_NAME,
  type Origin,
  type SiteAuthorization,
  normalizeOrigin,
} from '@manga-translator/shared';
import { showDiagnosticOverlay, removeDiagnosticOverlay } from '@manga-translator/overlay-core';
import { onBroadcast, sendMessage } from '../utils/messaging.js';

const log = (...args: unknown[]): void => {
  // eslint-disable-next-line no-console
  console.log(`[${EXTENSION_NAME} content]`, ...args);
};

let cleanupOverlay: (() => void) | null = null;
let unsubscribeBroadcast: (() => void) | null = null;
let currentOrigin: Origin | null = null;
let isActive = false;

const origin = (): Origin | null => {
  if (currentOrigin) return currentOrigin;
  currentOrigin = normalizeOrigin(location.href);
  return currentOrigin;
};

const injectDiagnosticOverlay = (reason: string): void => {
  removeOverlay();
  cleanupOverlay = showDiagnosticOverlay({
    label: `${EXTENSION_NAME} active — ${reason}`,
    backgroundColor: '#ffffff',
  });
  log('Diagnostic overlay injected', reason);
};

const removeOverlay = (): void => {
  if (cleanupOverlay) {
    cleanupOverlay();
    cleanupOverlay = null;
  } else {
    removeDiagnosticOverlay();
  }
};

const activateIfEnabled = async (): Promise<void> => {
  const siteOrigin = origin();
  if (!siteOrigin) return;

  const result = await sendMessage('content:ready', {
    tabId: -1, // Background resolves tab from sender, so this is ignored.
    origin: siteOrigin,
  });

  if (!result.ok) {
    log('Failed to retrieve site status', result.error);
    return;
  }

  const { siteStatus } = result.value;
  applyAuthorization(siteStatus);
};

const applyAuthorization = (authorization: SiteAuthorization): void => {
  if (authorization.status === 'enabled') {
    if (!isActive) {
      isActive = true;
      injectDiagnosticOverlay(authorization.origin);
    }
  } else {
    if (isActive) {
      isActive = false;
      removeOverlay();
    }
  }
};

const init = (): void => {
  log('Content script initialized for', location.href);

  // Listen for background authorization changes.
  unsubscribeBroadcast = onBroadcast('broadcast:siteStatusChanged', ({ origin: changedOrigin }) => {
    const siteOrigin = origin();
    if (siteOrigin && changedOrigin === siteOrigin) {
      void activateIfEnabled();
    }
  });

  // React to history/route changes in single-page readers.
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  const onRouteChanged = (): void => {
    currentOrigin = null;
    void activateIfEnabled();
  };

  history.pushState = (...args) => {
    originalPushState(...args);
    onRouteChanged();
  };

  history.replaceState = (...args) => {
    originalReplaceState(...args);
    onRouteChanged();
  };

  window.addEventListener('popstate', onRouteChanged);

  void activateIfEnabled();
};

/** Manual teardown for tests and diagnostic cleanup. */
export const teardownContentScript = (): void => {
  unsubscribeBroadcast?.();
  unsubscribeBroadcast = null;
  removeOverlay();
};

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main: init,
});
