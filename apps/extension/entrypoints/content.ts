import { defineContentScript } from 'wxt/utils/define-content-script';
import {
  EXTENSION_NAME,
  type Origin,
  type SiteAuthorization,
  normalizeOrigin,
} from '@manga-translator/shared';
import { createReaderSession, type PageCandidate } from '@manga-translator/reader-core';
import {
  renderMockBubbleOverlay,
  removeMockBubbleOverlay,
  showDiagnosticOverlay,
  removeDiagnosticOverlay,
} from '@manga-translator/overlay-core';
import { onBroadcast, sendMessage } from '../utils/messaging.js';

const log = (...args: unknown[]): void => {
  // eslint-disable-next-line no-console
  console.log(`[${EXTENSION_NAME} content]`, ...args);
};

let cleanupOverlay: (() => void) | null = null;
let unsubscribeBroadcast: (() => void) | null = null;
let currentOrigin: Origin | null = null;
let isActive = false;
let readerSession: ReturnType<typeof createReaderSession> | null = null;

const origin = (): Origin | null => {
  if (currentOrigin) return currentOrigin;
  currentOrigin = normalizeOrigin(location.href);
  return currentOrigin;
};

const removeOverlay = (): void => {
  if (cleanupOverlay) {
    cleanupOverlay();
    cleanupOverlay = null;
  } else {
    removeDiagnosticOverlay();
    removeMockBubbleOverlay();
  }
};

const renderStatusOverlay = (message: string): void => {
  removeOverlay();
  cleanupOverlay = showDiagnosticOverlay({
    label: `${EXTENSION_NAME} — ${message}`,
    backgroundColor: '#ffffff',
  });
};

const renderQueueOverlay = (): void => {
  if (!readerSession) return;

  const current = readerSession.getCurrentPage();
  const next = readerSession.getNextPage();
  const nextNext = readerSession.getNextNextPage();

  const bubbles: Array<{
    id: string;
    viewportRect: DOMRectReadOnly;
    priority: 0 | 1 | 2;
    label?: string;
  }> = [];

  const addBubble = (candidate: PageCandidate | null, priority: 0 | 1 | 2): void => {
    if (!candidate) return;
    const isCompleted = readerSession?.queue
      .getCompletedFingerprints()
      .has(candidate.fingerprint);
    bubbles.push({
      id: candidate.id,
      viewportRect: candidate.viewportRect,
      priority,
      label: isCompleted ? `P${priority} · Ready` : `P${priority} · Translating…`,
    });
  };

  addBubble(current, 0);
  addBubble(next, 1);
  addBubble(nextNext, 2);

  removeMockBubbleOverlay();
  cleanupOverlay = renderMockBubbleOverlay({ candidates: bubbles });
};

const createSession = (): ReturnType<typeof createReaderSession> => {
  const session = createReaderSession({
    direction: 'vertical',
    processJob: async (job) => {
      // Phase 1 simulation: pretend to decode, OCR, and translate the page.
      const duration = 500 + Math.random() * 1000;
      const startedAt = performance.now();
      const interval = 25;
      let elapsed = 0;

      while (elapsed < duration) {
        if (job.abortController.signal.aborted) {
          throw new Error('Aborted');
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
        elapsed += interval;
      }

      return {
        candidate: job.candidate,
        priority: job.priority,
        durationMs: performance.now() - startedAt,
      };
    },
    callbacks: {
      onJobStarted: (job) => {
        log(`Started P${job.priority} job`, job.candidate.fingerprint);
        renderQueueOverlay();
      },
      onJobCompleted: (job, result) => {
        log(
          `Completed P${job.priority} job in ${Math.round(result.durationMs)}ms`,
          job.candidate.fingerprint,
        );
        renderQueueOverlay();
      },
      onJobCancelled: (job, reason) => {
        log(`Cancelled P${job.priority} job: ${reason}`, job.candidate.fingerprint);
      },
    },
  });

  return session;
};

const activateReader = (): void => {
  if (readerSession) return;
  readerSession = createSession();
  renderStatusOverlay('Discovering pages…');
  // Give the adapter a moment to discover images before rendering the queue overlay.
  requestAnimationFrame(() => {
    renderQueueOverlay();
  });
};

const deactivateReader = (): void => {
  readerSession?.destroy();
  readerSession = null;
  removeOverlay();
};

const activateIfEnabled = async (): Promise<void> => {
  const siteOrigin = origin();
  if (!siteOrigin) return;

  const result = await sendMessage('content:ready', {
    tabId: -1,
    origin: siteOrigin,
  });

  if (!result.ok) {
    log('Failed to retrieve site status', result.error);
    return;
  }

  applyAuthorization(result.value.siteStatus);
};

const applyAuthorization = (authorization: SiteAuthorization): void => {
  if (authorization.status === 'enabled') {
    if (!isActive) {
      isActive = true;
      activateReader();
    }
  } else {
    if (isActive) {
      isActive = false;
      deactivateReader();
    }
  }
};

const init = (): void => {
  log('Content script initialized for', location.href);

  unsubscribeBroadcast = onBroadcast('broadcast:siteStatusChanged', ({ origin: changedOrigin }) => {
    const siteOrigin = origin();
    if (siteOrigin && changedOrigin === siteOrigin) {
      void activateIfEnabled();
    }
  });

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  const onRouteChanged = (): void => {
    currentOrigin = null;
    deactivateReader();
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
  deactivateReader();
};

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main: init,
});
