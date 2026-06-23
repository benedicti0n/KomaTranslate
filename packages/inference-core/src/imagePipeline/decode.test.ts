import { describe, expect, it } from 'vitest';
import { decodeImage, decodeImageCorsAware } from './decode.js';

describe('decodeImage', () => {
  it('decodes an already-complete HTMLImageElement', async () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    Object.defineProperty(img, 'naturalHeight', { value: 200 });

    const decoded = await decodeImage(img);
    expect(decoded.naturalWidth).toBe(100);
    expect(decoded.naturalHeight).toBe(200);
    expect(decoded.element).toBe(img);
  });
});

describe('decodeImageCorsAware', () => {
  it('is exported', () => {
    expect(typeof decodeImageCorsAware).toBe('function');
  });
});
