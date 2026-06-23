import { describe, expect, it } from 'vitest';
import { cropImageData, resizeNormalize } from './resizeNormalize.js';

const createRedImageData = (width: number, height: number): ImageData => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255; // R
    data[i + 1] = 0; // G
    data[i + 2] = 0; // B
    data[i + 3] = 255; // A
  }
  return new ImageData(data, width, height);
};

describe('resizeNormalize', () => {
  it('resizes to the target dimensions', () => {
    const input = createRedImageData(100, 100);
    const output = resizeNormalize(input, { targetWidth: 10, targetHeight: 10 });
    expect(output.width).toBe(10);
    expect(output.height).toBe(10);
    expect(output.channels).toBe(3);
  });

  it('normalizes red to approximately 1.0 in the R channel', () => {
    const input = createRedImageData(100, 100);
    const output = resizeNormalize(input, {
      targetWidth: 10,
      targetHeight: 10,
      normalize: true,
    });
    // Top-left pixel R value should be 1.0 (or very close after interpolation).
    expect(output.data[0]).toBeGreaterThan(0.95);
  });

  it('produces the expected array length', () => {
    const input = createRedImageData(10, 10);
    const output = resizeNormalize(input, {
      targetWidth: 4,
      targetHeight: 4,
      channels: 3,
    });
    expect(output.data.length).toBe(4 * 4 * 3);
  });
});

describe('cropImageData', () => {
  it('crops to the requested rect', () => {
    const input = createRedImageData(10, 10);
    const cropped = cropImageData(input, { x: 0, y: 0, width: 4, height: 4 });
    expect(cropped.width).toBe(4);
    expect(cropped.height).toBe(4);
  });
});
