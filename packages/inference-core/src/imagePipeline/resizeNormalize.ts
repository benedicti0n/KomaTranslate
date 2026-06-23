import type { NormalizedImage } from './types.js';

export interface ResizeNormalizeOptions {
  /** Target width in pixels. */
  readonly targetWidth: number;
  /** Target height in pixels. */
  readonly targetHeight: number;
  /** Number of channels in the output. Default: 3 (RGB). */
  readonly channels?: number;
  /** Whether to normalize pixel values to [0, 1]. Default: true. */
  readonly normalize?: boolean;
  /** Whether to maintain aspect ratio and letterbox. Default: false. */
  readonly preserveAspect?: boolean;
}

/**
 * Resizes and normalizes ImageData for model input.
 *
 * Produces a Float32Array in planar CHW order (channels first), which is the
 * common layout for ONNX vision models. For RGB the order is R plane, then G,
 * then B.
 */
export const resizeNormalize = (
  imageData: ImageData,
  options: ResizeNormalizeOptions,
): NormalizedImage => {
  const {
    targetWidth,
    targetHeight,
    channels = 3,
    normalize = true,
    preserveAspect = false,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to get 2D context for resize');
  }

  if (preserveAspect) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    const scale = Math.min(
      targetWidth / imageData.width,
      targetHeight / imageData.height,
    );
    const drawWidth = imageData.width * scale;
    const drawHeight = imageData.height * scale;
    const offsetX = (targetWidth - drawWidth) / 2;
    const offsetY = (targetHeight - drawHeight) / 2;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) throw new Error('Failed to get temp context');
    tempCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, offsetX, offsetY, drawWidth, drawHeight);
  } else {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) throw new Error('Failed to get temp context');
    tempCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
  }

  const resized = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const output = new Float32Array(targetWidth * targetHeight * channels);
  const divisor = normalize ? 255 : 1;

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const srcIdx = (y * targetWidth + x) * 4;
      const destIdx = y * targetWidth + x;
      for (let c = 0; c < channels; c += 1) {
        output[c * targetWidth * targetHeight + destIdx] =
          resized.data[srcIdx + c] / divisor;
      }
    }
  }

  return { data: output, width: targetWidth, height: targetHeight, channels };
};

/**
 * Crops an ImageData to the requested rect.
 */
export const cropImageData = (
  imageData: ImageData,
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): ImageData => {
  const canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get 2D context for crop');

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) throw new Error('Failed to get temp context');
  tempCtx.putImageData(imageData, 0, 0);

  ctx.drawImage(tempCanvas, -rect.x, -rect.y);
  return ctx.getImageData(0, 0, rect.width, rect.height);
};
