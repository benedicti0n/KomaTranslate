import type { DecodedImage } from './types.js';

/**
 * Releases resources held by a decoded image.
 *
 * This is the central cleanup path for bitmaps and object URLs created during
 * decoding. DOM elements are not removed because they belong to the page.
 */
export const releaseDecodedImage = (image: DecodedImage): void => {
  if (image.bitmap) {
    image.bitmap.close();
  }
  if (image.objectUrl) {
    URL.revokeObjectURL(image.objectUrl);
  }
};

/** Releases an array of decoded images. */
export const releaseDecodedImages = (images: ReadonlyArray<DecodedImage>): void => {
  for (const image of images) {
    releaseDecodedImage(image);
  }
};

/** Estimates the byte size of an ImageBitmap or ImageData. */
export const estimateImageMemoryBytes = (
  width: number,
  height: number,
  bytesPerPixel = 4,
): number => width * height * bytesPerPixel;
