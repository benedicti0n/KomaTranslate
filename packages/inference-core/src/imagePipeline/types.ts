/**
 * Decoded image ready for processing.
 *
 * The pipeline avoids retaining decoded images longer than necessary. Callers
 * should close or revoke disposable fields when done.
 */
export interface DecodedImage {
  /** Natural width of the source image in pixels. */
  readonly naturalWidth: number;
  /** Natural height of the source image in pixels. */
  readonly naturalHeight: number;
  /** Optional bitmap for efficient GPU/canvas operations. */
  readonly bitmap: ImageBitmap | null;
  /** Optional HTML element if decoded from the DOM. */
  readonly element: HTMLImageElement | null;
  /** URL that may need revocation if it was an object URL created by the pipeline. */
  readonly objectUrl: string | null;
}

/** A captured region of a page as ImageData. */
export interface CapturedRegion {
  readonly imageData: ImageData;
  /** Source rectangle in natural image pixels. */
  readonly sourceRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  /** Rendered rectangle in viewport pixels. */
  readonly viewportRect: DOMRectReadOnly;
}

/** Normalized tensor-like input for a model. */
export interface NormalizedImage {
  readonly data: Float32Array;
  readonly width: number;
  readonly height: number;
  readonly channels: number;
}

/** Performance metrics for a pipeline operation. */
export interface PipelineMetrics {
  readonly operation: string;
  readonly durationMs: number;
  readonly memoryEstimateBytes?: number;
}

/** Callback invoked with pipeline metrics. */
export type MetricsCallback = (metric: PipelineMetrics) => void;
