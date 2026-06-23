import { defineContentScript } from 'wxt/utils/define-content-script';
import {
  EXTENSION_NAME,
  type Origin,
  type SiteAuthorization,
  normalizeOrigin,
} from '@manga-translator/shared';
import {
  captureSourceImage,
  computeSourceToViewportMapping,
  decodeImageCorsAware,
  estimateImageMemoryBytes,
  sourceRectToViewportRect,
  releaseDecodedImage,
  resizeNormalize,
} from '@manga-translator/inference-core';
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
const corsBlockedFingerprints = new Set<string>();

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

const findElementForCandidate = (candidate: PageCandidate): HTMLImageElement | null => {
  const element = document.querySelector(
    `[data-manga-translator-id="${candidate.id}"]`,
  );
  return element instanceof HTMLImageElement ? element : null;
};

const computeCurrentViewportRect = (candidate: PageCandidate): DOMRectReadOnly => {
  const element = findElementForCandidate(candidate);
  if (element && element.naturalWidth > 0) {
    const mapping = computeSourceToViewportMapping(element);
    return sourceRectToViewportRect(mapping, {
      x: 0,
      y: 0,
      width: element.naturalWidth,
      height: element.naturalHeight,
    });
  }
  return candidate.viewportRect;
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
    const isCorsBlocked = corsBlockedFingerprints.has(candidate.fingerprint);

    let label: string;
    if (isCompleted) {
      label = isCorsBlocked ? `P${priority} · Overlay only` : `P${priority} · Captured`;
    } else {
      label = `P${priority} · Capturing…`;
    }

    bubbles.push({
      id: candidate.id,
      viewportRect: computeCurrentViewportRect(candidate),
      priority,
      label,
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
      const element = findElementForCandidate(job.candidate);
      if (!element) {
        throw new Error('Source element not found');
      }

      // Try a CORS-aware decode so we can read pixels. If the image CDN does not
      // send CORS headers, fall back to overlay-only rendering for this page.
      const decoded = await decodeImageCorsAware(job.candidate.source);
      if (!decoded) {
        corsBlockedFingerprints.add(job.candidate.fingerprint);
        log(
          `P${job.priority} CORS-blocked, overlay only`,
          job.candidate.fingerprint,
        );
        return {
          candidate: job.candidate,
          priority: job.priority,
          durationMs: 0,
        };
      }

      try {
        const imageData = captureSourceImage(decoded);
        const normalized = resizeNormalize(imageData, {
          targetWidth: 640,
          targetHeight: 640,
          channels: 3,
          normalize: true,
          preserveAspect: true,
        });

        // Phase 2: we capture and normalize the image. In Phase 3 the normalized
        // tensor will be passed to a text-detection / OCR model.
        const memoryEstimate = estimateImageMemoryBytes(
          decoded.naturalWidth,
          decoded.naturalHeight,
        );
        log(
          `P${job.priority} captured`,
          job.candidate.fingerprint,
          `${decoded.naturalWidth}x${decoded.naturalHeight}`,
          `~${Math.round(memoryEstimate / 1024 / 1024)}MB`,
        );

        // Prevent the unused variable from being tree-shaken / flagged.
        void normalized;

        return {
          candidate: job.candidate,
          priority: job.priority,
          durationMs: 0,
        };
      } finally {
        releaseDecodedImage(decoded);
      }
    },
    callbacks: {
      onJobStarted: (job) => {
        log(`Started P${job.priority} capture`, job.candidate.fingerprint);
        renderQueueOverlay();
      },
      onJobCompleted: (job) => {
        log(`Completed P${job.priority} capture`, job.candidate.fingerprint);
        renderQueueOverlay();
      },
      onJobCancelled: (job, reason) => {
        log(`Cancelled P${job.priority} capture: ${reason}`, job.candidate.fingerprint);
      },
    },
  });

  return session;
};

const activateReader = (): void => {
  if (readerSession) return;
  corsBlockedFingerprints.clear();
  readerSession = createSession();
  renderStatusOverlay('Discovering pages…');
  requestAnimationFrame(() => {
    renderQueueOverlay();
  });
};

const deactivateReader = (): void => {
  readerSession?.destroy();
  readerSession = null;
  corsBlockedFingerprints.clear();
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
