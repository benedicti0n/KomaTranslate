import { describe, expect, it } from 'vitest';
import { createLinearMapping, mapSourceRectToViewport } from './coordinateMapping.js';

describe('createLinearMapping', () => {
  it('maps source origin to viewport top-left', () => {
    const mapping = createLinearMapping(
      { width: 800, height: 1000 },
      new DOMRectReadOnly(100, 200, 400, 500),
    );
    expect(mapping.sourceToViewport({ x: 0, y: 0 })).toEqual({ x: 100, y: 200 });
  });

  it('maps source bottom-right to viewport bottom-right', () => {
    const mapping = createLinearMapping(
      { width: 800, height: 1000 },
      new DOMRectReadOnly(100, 200, 400, 500),
    );
    expect(mapping.sourceToViewport({ x: 800, y: 1000 })).toEqual({
      x: 500,
      y: 700,
    });
  });

  it('round-trips viewport coordinates back to source', () => {
    const mapping = createLinearMapping(
      { width: 800, height: 1000 },
      new DOMRectReadOnly(100, 200, 400, 500),
    );
    const viewportPoint = { x: 250, y: 350 };
    const sourcePoint = mapping.viewportToSource(viewportPoint);
    expect(mapping.sourceToViewport(sourcePoint)).toEqual(viewportPoint);
  });
});

describe('mapSourceRectToViewport', () => {
  it('maps a full-source rect to the viewport rect', () => {
    const mapping = createLinearMapping(
      { width: 800, height: 1000 },
      new DOMRectReadOnly(100, 200, 400, 500),
    );
    const rect = mapSourceRectToViewport(mapping, {
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
