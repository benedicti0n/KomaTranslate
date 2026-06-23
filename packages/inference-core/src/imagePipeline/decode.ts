import { releaseDecodedImage } from './memory.js';
import { createMetricsRecorder } from './performance.js';
import type { DecodedImage, MetricsCallback } from './types.js';

export interface DecodeOptions {
  readonly metricsCallback?: MetricsCallback;
  /**
   * When decoding from a URL, request CORS-enabled loading. This is required
   * before the decoded image can be drawn to a canvas and read with
   * `getImageData`. Falls back to non-CORS if the server does not allow it.
   */
  readonly crossOrigin?: 'anonymous' | 'use-credentials';
}

const isCorsError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('tainted') ||
    message.includes('cross-origin') ||
    message.includes('cors')
  );
};

/**
 * Decodes an image source safely.
 *
 * Accepts an `<img>` element, an image URL, or a blob. Returns a decoded image
 * with an optional ImageBitmap for efficient canvas drawing. Created object URLs
 * are tracked so they can be revoked on cleanup.
 */
export const decodeImage = async (
  source: HTMLImageElement | string | Blob,
  options: DecodeOptions = {},
): Promise<DecodedImage> => {
  const { metricsCallback, crossOrigin } = options;
  const metrics = createMetricsRecorder(metricsCallback);

  if (source instanceof HTMLImageElement) {
    if (!source.complete || source.naturalWidth === 0) {
      await new Promise<void>((resolve, reject) => {
        const onLoad = (): void => {
          cleanup();
          resolve();
        };
        const onError = (): void => {
          cleanup();
          reject(new Error(`Failed to load image: ${source.src}`));
        };
        const cleanup = (): void => {
          source.removeEventListener('load', onLoad);
          source.removeEventListener('error', onError);
        };
        source.addEventListener('load', onLoad);
        source.addEventListener('error', onError);
      });
    }

    return metrics.record('decodeImage:dom', () => ({
      naturalWidth: source.naturalWidth,
      naturalHeight: source.naturalHeight,
      bitmap: null,
      element: source,
      objectUrl: null,
    }));
  }

  const url = source instanceof Blob ? URL.createObjectURL(source) : source;
  const objectUrl = source instanceof Blob ? url : null;

  try {
    const img = await metrics.recordAsync('decodeImage:load', async () => {
      const el = new Image();
      el.decoding = 'async';
      if (crossOrigin) {
        el.crossOrigin = crossOrigin;
      }
      el.src = url;

      // `HTMLImageElement.decode()` is not available in all test environments
      // (e.g. jsdom), so fall back to the classic load/error events.
      if (typeof el.decode === 'function') {
        await el.decode();
      } else {
        await new Promise<void>((resolve, reject) => {
          const onLoad = (): void => {
            cleanup();
            resolve();
          };
          const onError = (): void => {
            cleanup();
            reject(new Error(`Failed to load image: ${url}`));
          };
          const cleanup = (): void => {
            el.removeEventListener('load', onLoad);
            el.removeEventListener('error', onError);
          };
          el.addEventListener('load', onLoad);
          el.addEventListener('error', onError);
        });
      }
      return el;
    });

    const bitmap = await metrics.recordAsync('decodeImage:bitmap', async () => {
      try {
        return await createImageBitmap(img);
      } catch {
        return null;
      }
    });

    return {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      bitmap,
      element: img,
      objectUrl,
    };
  } catch (error) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw error;
  }
};

/**
 * Attempts to decode an image with CORS enabled.
 *
 * If the server does not permit cross-origin access, returns `null` instead of
 * throwing. The caller can then fall back to overlay-only rendering.
 */
export const decodeImageCorsAware = async (
  source: string,
  options: Omit<DecodeOptions, 'crossOrigin'> = {},
): Promise<DecodedImage | null> => {
  try {
    return await decodeImage(source, { ...options, crossOrigin: 'anonymous' });
  } catch (error) {
    if (isCorsError(error)) {
      return null;
    }
    throw error;
  }
};

/**
 * Decodes an image and automatically releases it after the callback completes.
 */
export const withDecodedImage = async <T>(
  source: HTMLImageElement | string | Blob,
  fn: (image: DecodedImage) => Promise<T> | T,
  options: DecodeOptions = {},
): Promise<T> => {
  const image = await decodeImage(source, options);
  try {
    return await fn(image);
  } finally {
    releaseDecodedImage(image);
  }
};
