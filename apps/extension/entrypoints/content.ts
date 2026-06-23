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
  decodeImage,
  decodeImageCorsAware,
  estimateImageMemoryBytes,
  sourceRectToViewportRect,
  releaseDecodedImage,
  resizeNormalize,
  type DecodedImage,
} from '@manga-translator/inference-core';
import { createReaderSession, type PageCandidate } from '@manga-translator/reader-core';
import {
  renderMockBubbleOverlay,
  removeMockBubbleOverlay,
  showDiagnosticOverlay,
  removeDiagnosticOverlay,
} from '@manga-translator/overlay-core';
import { onBroadcast, sendMessage } from '../utils/messaging.js';

const pendingImagePermissionRequests = new Set<string>();

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

const getImageOrigin = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/**
 * Attempts to fetch a cross-origin image through the background service worker,
 * which can read the response when the extension has host permission for the
 * image origin even if the CDN does not send CORS headers.
 */
const fetchImageThroughBackground = async (
  source: string,
  abortSignal: AbortSignal,
): Promise<Blob | null> => {
  const imageOrigin = getImageOrigin(source);
  if (!imageOrigin) return null;

  if (!pendingImagePermissionRequests.has(imageOrigin)) {
    pendingImagePermissionRequests.add(imageOrigin);
    const permissionResult = await sendMessage('content:requestImageOriginPermission', {
      imageOrigin,
    });
    pendingImagePermissionRequests.delete(imageOrigin);

    if (!permissionResult.ok || !permissionResult.value.granted) {
      log('Image origin permission denied or failed', imageOrigin);
      return null;
    }
  }

  if (abortSignal.aborted) return null;

  const fetchResult = await sendMessage('content:fetchImageBlob', { url: source });
  if (!fetchResult.ok) {
    log('Background image fetch failed', source, fetchResult.error);
    return null;
  }

  return new Blob([fetchResult.value.buffer]);
};

const createSession = (): ReturnType<typeof createReaderSession> => {
  const session = createReaderSession({
    direction: 'vertical',
    processJob: async (job) => {
      const element = findElementForCandidate(job.candidate);
      if (!element) {
        throw new Error('Source element not found');
      }

      const captureDecoded = async (
        decoded: DecodedImage,
      ): Promise<{ candidate: PageCandidate; priority: 0 | 1 | 2; durationMs: number }> => {
        try {
          const imageData = captureSourceImage(decoded);
          const normalized = resizeNormalize(imageData, {
            targetWidth: 640,
            targetHeight: 640,
            channels: 3,
            normalize: true,
            preserveAspect: true,
          });

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

          void normalized;

          return {
            candidate: job.candidate,
            priority: job.priority,
            durationMs: 0,
          };
        } finally {
          releaseDecodedImage(decoded);
        }
      };

      // Try a CORS-aware decode so we can read pixels. This works when the CDN
      // sends CORS headers.
      const corsDecoded = await decodeImageCorsAware(job.candidate.source);
      if (corsDecoded) {
        return await captureDecoded(corsDecoded);
      }

      // CORS failed. Try fetching the image through the background service
      // worker, which can read cross-origin responses when granted host
      // permission even without CDN CORS headers.
      log(
        `P${job.priority} trying background fetch`,
        job.candidate.fingerprint,
      );
      const blob = await fetchImageThroughBackground(
        job.candidate.source,
        job.abortController.signal,
      );
      if (blob) {
        const decoded = await decodeImage(blob);
        return await captureDecoded(decoded);
      }

      // If both paths fail, fall back to overlay-only rendering.
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
