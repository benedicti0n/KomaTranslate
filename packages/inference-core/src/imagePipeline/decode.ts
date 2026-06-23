import { releaseDecodedImage } from './memory.js';
import { createMetricsRecorder } from './performance.js';
import type { DecodedImage, MetricsCallback } from './types.js';

export interface DecodeOptions {
  readonly metricsCallback?: MetricsCallback;
}

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
  const { metricsCallback } = options;
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
      el.src = url;
      await el.decode();
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
