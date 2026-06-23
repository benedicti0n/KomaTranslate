/**
 * Polyfills for browser APIs that are not available in jsdom but are needed by
 * the image pipeline tests. The `canvas` package provides a working 2D context
 * and a compatible ImageData implementation.
 */

import { ImageData as CanvasImageData } from 'canvas';

if (typeof globalThis.ImageData === 'undefined' || !(globalThis.ImageData.prototype instanceof CanvasImageData)) {
  globalThis.ImageData = CanvasImageData as unknown as typeof ImageData;
}

if (typeof globalThis.URL.createObjectURL !== 'function') {
  const objectUrlStore = new Map<string, Blob>();
  let objectUrlCounter = 0;

  globalThis.URL.createObjectURL = (blob: Blob): string => {
    const id = `blob:test-${(objectUrlCounter += 1)}`;
    objectUrlStore.set(id, blob);
    return id;
  };

  globalThis.URL.revokeObjectURL = (url: string): void => {
    objectUrlStore.delete(url);
  };
}
