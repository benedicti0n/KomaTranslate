/**
 * Overlay rendering, coordinate mapping, and Shadow DOM management.
 *
 * Phase 0 exposes a small diagnostic overlay used to prove injection works.
 * Translation cards and coordinate mapping will be added in later phases.
 */

export type { OverlayRoot, DiagnosticOverlayOptions } from './types.js';
export { createOverlayRoot, removeOverlayRoot } from './overlayRoot.js';
export { showDiagnosticOverlay, removeDiagnosticOverlay } from './diagnosticOverlay.js';
export {
  renderMockBubbleOverlay,
  removeMockBubbleOverlay,
  type MockBubbleCandidate,
  type MockBubbleOverlayOptions,
} from './mockBubbleOverlay.js';
export {
  createLinearMapping,
  mapSourceRectToViewport,
  type CoordinateMapping,
} from './coordinateMapping.js';
