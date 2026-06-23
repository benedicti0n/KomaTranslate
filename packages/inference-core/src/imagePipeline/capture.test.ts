import { describe, expect, it, vi } from 'vitest';
import {
  computeSourceToViewportMapping,
  sourceRectToViewportRect,
  viewportRectToSourceRect,
} from './capture.js';

const createFakeImage = (
  naturalWidth: number,
  naturalHeight: number,
  renderedRect: DOMRectReadOnly,
  objectFit = 'fill',
): HTMLImageElement => {
  const img = document.createElement('img');
  Object.defineProperty(img, 'naturalWidth', { value: naturalWidth });
  Object.defineProperty(img, 'naturalHeight', { value: naturalHeight });
  vi.spyOn(img, 'getBoundingClientRect').mockReturnValue(renderedRect);
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    objectFit,
  } as CSSStyleDeclaration);
  return img;
};

describe('computeSourceToViewportMapping', () => {
  it('scales uniformly for object-fit: fill', () => {
    const img = createFakeImage(
      800,
      1000,
      new DOMRectReadOnly(0, 0, 400, 500),
      'fill',
    );
    const mapping = computeSourceToViewportMapping(img);
    expect(mapping.scaleX).toBe(0.5);
    expect(mapping.scaleY).toBe(0.5);
    expect(mapping.offsetX).toBe(0);
    expect(mapping.offsetY).toBe(0);
  });

  it('centers for object-fit: contain', () => {
    const img = createFakeImage(
      800,
      1000,
      new DOMRectReadOnly(0, 0, 400, 400),
      'contain',
    );
    const mapping = computeSourceToViewportMapping(img);
    // Smaller scale is 400/800 = 0.5 (width), 400/1000 = 0.4 (height).
    expect(mapping.scaleX).toBe(0.4);
    expect(mapping.scaleY).toBe(0.4);
    expect(mapping.offsetX).toBe(40); // (400 - 800*0.4) / 2
    expect(mapping.offsetY).toBe(0);  // (400 - 1000*0.4) / 2
  });
});

describe('sourceRectToViewportRect', () => {
  it('maps a source rect to viewport coordinates', () => {
    const img = createFakeImage(
      800,
      1000,
      new DOMRectReadOnly(100, 200, 400, 500),
      'fill',
    );
    const mapping = computeSourceToViewportMapping(img);
    const rect = sourceRectToViewportRect(mapping, {
      x: 0,
      y: 0,
      width: 800,
      height: 1000,
    });
    expect(rect.left).toBe(100);
    expect(rect.top).toBe(200);
    expect(rect.width).toBe(400);
    expect(rect.height).toBe(500);
  });
});

describe('viewportRectToSourceRect', () => {
  it('round-trips a viewport rect through source and back', () => {
    const img = createFakeImage(
      800,
      1000,
      new DOMRectReadOnly(100, 200, 400, 500),
      'fill',
    );
    const mapping = computeSourceToViewportMapping(img);
    const sourceRect = viewportRectToSourceRect(mapping, {
      x: 150,
      y: 250,
      width: 200,
      height: 250,
    });
    expect(sourceRect.x).toBe(100);
    expect(sourceRect.y).toBe(100);
    expect(sourceRect.width).toBe(400);
    expect(sourceRect.height).toBe(500);
  });
});
