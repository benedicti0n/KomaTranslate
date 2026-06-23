# Manga Translator — Features

## Version 1 scope

Version 1 is a **Chrome extension only**. There is no desktop app, no Electron app,
no backend server, no user account, no subscription, and no cloud OCR or translation.
All processing happens locally in the browser.

## Completed

### Phase 0 — Extension Foundation

- pnpm workspace monorepo with TypeScript strict mode.
- WXT + Vite + React 19 extension build pipeline for Chrome Manifest V3.
- Background service worker, content script, popup, options page, and offscreen
  document scaffolding.
- Typed cross-context message contracts (`@manga-translator/shared`).
- Per-site enable/disable flow with optional host permissions.
- Popup UI showing current-site status and enable/disable actions.
- Options page listing enabled sites and debug-overlay toggle.
- Content script that activates only on enabled sites and injects a temporary
  Shadow DOM diagnostic overlay.
- Shadow DOM overlay root with isolated styles and cleanup.
- Vitest unit tests for shared contracts and overlay lifecycle.

### Phase 1 — Reader Discovery and Page Queue

- Reader page discovery abstraction with `ReaderAdapter` interface.
- DOM image-based reader adapter with `MutationObserver` subscription.
- `IntersectionObserver` viewport tracker with viewport-center current-page selection.
- Reading-order inference for vertical, LTR, and RTL layouts.
- Strict P0/P1/P2 priority queue with `AbortController` cancellation.
- Session cache keyed by page fingerprint to prevent duplicate work.
- Simulated decode/OCR/translation work per page.
- Mock translation bubble overlays rendered over P0/P1/P2 pages.
- Fixture reader pages (vertical, paged, lazy-loaded) and automated tests.

### Phase 2 — Image Pipeline and Page Capture

- New `@manga-translator/inference-core` package for image pipeline.
- Safe DOM image decoding with `decodeImage` and `withDecodedImage` lifecycle helpers.
- Source-to-overlay coordinate mapping that accounts for `object-fit`,
  `object-position`, and rendered size.
- Source image and region capture to `ImageData`.
- Resize, normalize, and crop utilities producing model-ready tensors.
- Image memory lifecycle management (`releaseDecodedImage`, memory estimation).
- Performance instrumentation with `createMetricsRecorder`.
- Additional fixtures for object-fit, scaled/zoomed, and responsive/DPR layouts.
- Unit tests for capture mapping, resize/normalize, crop, and memory utilities.

## In Progress

None.

## Planned

### Phase 3 — OCR Benchmark Spike

- OCR and text-detection provider interfaces.
- Reproducible browser benchmark harness.
- Synthetic and licensed fixtures.
- WebGPU / WASM fallback experiments.
- Model selection recommendation based on measured data.

### Phase 4 — Translation Spike

- Translation provider interface.
- Local model/language-pack loading and caching.
- Benchmark harness and latency tests.
- Optional Chrome built-in Translator API capability detection with explicit
  user-activation setup.
- Fully local fallback path.

### Phase 5 — End-to-End Automatic Translation

- Connected image pipeline → OCR → translation → overlay.
- Plain English overlay cards.
- Confidence-aware behavior.
- Site-level pause/disable controls.
- Error states and visual regression tests.

### Phase 6 — Hardening and Reader Adapters

- Reader adapter registry.
- Improved lazy-load, route-change, fullscreen, and zoom support.
- Performance tuning and accessibility.
- Privacy/security review and Chrome Web Store packaging.

## Explicitly Excluded from Version 1

- Desktop application (Electron, Tauri, native).
- Mobile app.
- Backend server, database, or cloud queue.
- User accounts, authentication, or subscriptions.
- Cloud OCR or translation APIs.
- Per-page or per-user inference costs.
- Uploading manga images, OCR text, URLs, reading history, or translations.
- AI inpainting or stylized manga font rendering in overlays.
- Broad host permissions at install time.

## User-Facing Behavior

1. Install the extension from Chrome Web Store or load it unpacked.
2. Open a manga-reader website.
3. Click the extension icon and choose **Enable automatic translation**.
4. Chrome asks for permission for that specific site.
5. The page reloads/injects the content script.
6. In Phase 2 the extension additionally decodes and captures the source
   image pixels for P0/P1/P2 pages, maps source coordinates to rendered
   viewport coordinates (including `object-fit`), and displays memory-aware
   "Capturing…" / "Captured" overlays. If the reader's image CDN does not
   send CORS headers, the extension can request optional permission for the
   CDN origin and fetch the image through the background service worker.
   Real OCR/translation begins in Phase 5.
7. The user can disable the site at any time from the popup or options page.

## Technical Notes

- Content script is declared with `matches: ["<all_urls>"]` but Chrome only
  injects it when the user grants optional host permission for the site.
- All storage uses `chrome.storage.sync` for small permission/settings data only.
- No page content, images, or URLs are uploaded anywhere.
