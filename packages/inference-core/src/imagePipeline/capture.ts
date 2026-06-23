import type { DecodedImage } from './types.js';

/**
 * Computes the rendered rectangle of an image element in viewport coordinates.
 */
export const getRenderedImageRect = (element: HTMLElement): DOMRectReadOnly =>
  element.getBoundingClientRect();

export interface SourceToViewportMapping {
  readonly renderedRect: DOMRectReadOnly;
  readonly naturalSize: { readonly width: number; readonly height: number };
  readonly objectFit: string;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

/**
 * Computes the mapping from source image pixels to rendered viewport pixels.
 *
 * Accounts for CSS `object-fit` and `object-position`. This is essential for
 * placing overlays accurately over the detected text regions.
 */
export const computeSourceToViewportMapping = (
  element: HTMLImageElement,
): SourceToViewportMapping => {
  const renderedRect = getRenderedImageRect(element);
  const naturalSize = {
    width: element.naturalWidth,
    height: element.naturalHeight,
  };

  const style = window.getComputedStyle(element);
  const objectFit = style.objectFit || 'fill';

  let scaleX = renderedRect.width / naturalSize.width;
  let scaleY = renderedRect.height / naturalSize.height;
  let offsetX = 0;
  let offsetY = 0;

  if (objectFit === 'contain' || objectFit === 'scale-down') {
    const scale = Math.min(scaleX, scaleY);
    scaleX = scale;
    scaleY = scale;
    offsetX = (renderedRect.width - naturalSize.width * scale) / 2;
    offsetY = (renderedRect.height - naturalSize.height * scale) / 2;
  } else if (objectFit === 'cover') {
    const scale = Math.max(scaleX, scaleY);
    scaleX = scale;
    scaleY = scale;
    offsetX = (renderedRect.width - naturalSize.width * scale) / 2;
    offsetY = (renderedRect.height - naturalSize.height * scale) / 2;
  } else if (objectFit === 'none') {
    scaleX = 1;
    scaleY = 1;
    offsetX = (renderedRect.width - naturalSize.width) / 2;
    offsetY = (renderedRect.height - naturalSize.height) / 2;
  }

  return { renderedRect, naturalSize, objectFit, scaleX, scaleY, offsetX, offsetY };
};

/**
 * Maps a rectangle in source image pixels to viewport coordinates.
 */
export const sourceRectToViewportRect = (
  mapping: SourceToViewportMapping,
  sourceRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): DOMRectReadOnly => {
  const { renderedRect, scaleX, scaleY, offsetX, offsetY } = mapping;
  return new DOMRectReadOnly(
    renderedRect.left + offsetX + sourceRect.x * scaleX,
    renderedRect.top + offsetY + sourceRect.y * scaleY,
    sourceRect.width * scaleX,
    sourceRect.height * scaleY,
  );
};

/**
 * Maps a rectangle in viewport coordinates back to source image pixels.
 */
export const viewportRectToSourceRect = (
  mapping: SourceToViewportMapping,
  viewportRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): { x: number; y: number; width: number; height: number } => {
  const { renderedRect, scaleX, scaleY, offsetX, offsetY } = mapping;
  return {
    x: (viewportRect.x - renderedRect.left - offsetX) / scaleX,
    y: (viewportRect.y - renderedRect.top - offsetY) / scaleY,
    width: viewportRect.width / scaleX,
    height: viewportRect.height / scaleY,
  };
};

/**
 * Captures the full source image as ImageData.
 *
 * Uses an offscreen canvas so the source pixels can be passed to OCR and
 * detection models. The caller is responsible for the returned ImageData
 * memory.
 */
export const captureSourceImage = (
  decoded: DecodedImage,
): ImageData => {
  const { naturalWidth, naturalHeight } = decoded;
  const canvas = document.createElement('canvas');
  canvas.width = naturalWidth;
  canvas.height = naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to get 2D context for source capture');
  }

  if (decoded.bitmap) {
    ctx.drawImage(decoded.bitmap, 0, 0);
  } else if (decoded.element) {
    ctx.drawImage(decoded.element, 0, 0);
  } else {
    throw new Error('Decoded image has no drawable source');
  }

  return ctx.getImageData(0, 0, naturalWidth, naturalHeight);
};

/**
 * Captures a region of the source image as ImageData.
 */
export const captureSourceRegion = (
  decoded: DecodedImage,
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): ImageData => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to get 2D context for region capture');
  }

  const source = decoded.bitmap ?? decoded.element ?? null;
  if (!source) {
    throw new Error('Decoded image has no drawable source');
  }

  ctx.drawImage(
    source,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
};
