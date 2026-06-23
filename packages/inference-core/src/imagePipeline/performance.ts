import type { MetricsCallback, PipelineMetrics } from './types.js';

/** Creates a metrics recorder that reports to the supplied callback. */
export const createMetricsRecorder = (
  onMetric?: MetricsCallback,
): {
  readonly record: <T>(operation: string, fn: () => T) => T;
  readonly recordAsync: <T>(operation: string, fn: () => Promise<T>) => Promise<T>;
} => {
  const report = (metric: PipelineMetrics): void => {
    onMetric?.(metric);
  };

  const record = <T>(operation: string, fn: () => T): T => {
    const start = performance.now();
    try {
      return fn();
    } finally {
      report({ operation, durationMs: performance.now() - start });
    }
  };

  const recordAsync = async <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      report({ operation, durationMs: performance.now() - start });
    }
  };

  return { record, recordAsync };
};
