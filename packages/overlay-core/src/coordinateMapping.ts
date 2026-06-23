/**
 * Maps a point from source image pixels to viewport coordinates.
 *
 * This is the overlay-side counterpart to inference-core's mapping. It is used
 * to position translation cards over the exact region of the rendered image.
 */
export interface CoordinateMapping {
  readonly sourceToViewport: (point: { x: number; y: number }) => {
    x: number;
    y: number;
  };
  readonly viewportToSource: (point: { x: number; y: number }) => {
    x: number;
    y: number;
  };
}

/**
 * Creates a simple linear mapping assuming the source image fills the viewport
 * rect (object-fit: fill). For more complex fits, use the mapping computed by
 * inference-core.
 */
export const createLinearMapping = (
  sourceSize: { readonly width: number; readonly height: number },
  viewportRect: DOMRectReadOnly,
): CoordinateMapping => {
  const scaleX = viewportRect.width / sourceSize.width;
  const scaleY = viewportRect.height / sourceSize.height;

  return {
    sourceToViewport: (point) => ({
      x: viewportRect.left + point.x * scaleX,
      y: viewportRect.top + point.y * scaleY,
    }),
    viewportToSource: (point) => ({
      x: (point.x - viewportRect.left) / scaleX,
      y: (point.y - viewportRect.top) / scaleY,
    }),
  };
};

/**
 * Maps a source rectangle to a viewport rectangle using a coordinate mapping.
 */
export const mapSourceRectToViewport = (
  mapping: CoordinateMapping,
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): DOMRectReadOnly => {
  const topLeft = mapping.sourceToViewport({ x: rect.x, y: rect.y });
  const bottomRight = mapping.sourceToViewport({
    x: rect.x + rect.width,
    y: rect.y + rect.height,
  });
  return new DOMRectReadOnly(
    topLeft.x,
    topLeft.y,
    bottomRight.x - topLeft.x,
    bottomRight.y - topLeft.y,
  );
};
