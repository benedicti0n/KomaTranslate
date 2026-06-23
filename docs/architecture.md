# Manga Translator — Architecture

## Extension contexts

Manga Translator is built as a Chrome Manifest V3 extension with these contexts:

1. **Popup** — small React UI shown when the user clicks the extension icon.
2. **Background service worker** — event-driven orchestrator; handles permissions,
   storage, and cross-context messaging.
3. **Content script** — injected into enabled manga-reader pages; discovers
   content, tracks the viewport, and renders overlays into a closed Shadow DOM.
4. **Offscreen document** — persistent page for local inference and image
   processing in later phases.
5. **Options page** — React page for managing enabled sites and settings.

## Message flow

All cross-context communication uses typed messages defined in
`@manga-translator/shared`. Messages carry a `namespace` field so background
handlers can safely ignore foreign runtime messages.

```text
popup / content / offscreen
         |
         v
  chrome.runtime.sendMessage
         |
         v
   background service worker
         |
         v
  chrome.runtime.onMessage / broadcastMessage
         |
         v
popup / content / offscreen
```

### Request/response messages

- `popup:getSiteStatus` — popup asks background for the active tab's site state.
- `popup:enableSite` / `popup:disableSite` — modify the enabled-sites list.
- `popup:requestSitePermission` — narrow optional host permission request.
- `content:ready` — content script announces itself and learns site state.
- `offscreen:init` / `offscreen:echo` — offscreen document lifecycle.

### Broadcast messages

- `broadcast:siteStatusChanged` — background notifies content scripts when a
  site's authorization changes.

## Reader discovery flow

The content script loads on an enabled site and creates a `ReaderSession` from
`@manga-translator/reader-core`:

```text
content script loads on enabled site
         |
         v
createReaderSession()
         |
         v
detectReaderAdapter() -> DOM image adapter (Phase 1)
         |
         v
adapter.discover() -> PageCandidate[] from visible <img> elements
         |
         v
assignReadingOrder() -> sorted candidates by vertical/LTR/RTL direction
         |
         v
createViewportTracker() -> IntersectionObserver on marked elements
         |
         v
compute current page (closest to viewport center)
compute next page (next in reading order)
compute next-next page
         |
         v
update page queue -> P0 / P1 / P2
```

The DOM image adapter marks each discovered `<img>` with
`data-manga-translator-id` so the viewport tracker can observe it without
holding direct DOM references. It also resolves common lazy-loading attributes
(`data-src`, `data-lazy-src`, `data-original`) before the image has loaded.

## Current-page and two-page prefetch queue

The queue is implemented in `packages/reader-core/src/pageQueue.ts` and is
bounded to three priorities:

- **P0** — current visible page.
- **P1** — next page in reading order.
- **P2** — following page.

All other pages are ignored until they enter the P0/P1/P2 window. This avoids
OCR/translation of an entire chapter and keeps the visible page responsive.

`ReaderSession` re-computes P0/P1/P2 on scroll, resize, and adapter mutations
and calls `queue.updatePriorities(...)`. The queue:

1. Cancels active jobs whose fingerprint is no longer in the window.
2. Skips fingerprints already completed this session.
3. Schedules the highest-priority runnable job first.

## Image pipeline

The image pipeline lives in `@manga-translator/inference-core`:

```text
source <img> / URL / Blob
         |
         v
    decodeImage()
         |
         v
   ImageBitmap or HTMLImageElement
         |
         v
   captureSourceImage() -> ImageData
         |
         v
   resizeNormalize() -> CHW Float32Array
```

The pipeline is designed to release resources eagerly:

- `withDecodedImage()` revokes object URLs and closes `ImageBitmap`s.
- `releaseDecodedImage()` is the explicit cleanup path.
- `estimateImageMemoryBytes()` is used to log memory-sensitive events.

## Overlay coordinate mapping

Overlays are rendered into a closed Shadow DOM host element that is fixed at the
viewport origin (`top: 0; left: 0`). Each overlay card is absolutely positioned
using the candidate's current rendered rect.

`computeSourceToViewportMapping()` in inference-core computes the transform from
source image pixels to rendered viewport pixels, accounting for CSS
`object-fit` (`fill`, `contain`, `cover`, `none`) and `object-position`. The
content script uses `sourceRectToViewportRect()` to map the full source image
rect to the current viewport rect so the overlay stays aligned during scroll,
zoom, and responsive layout changes.

## Cancellation behavior

Every queued page job carries its own `AbortController`. When the user scrolls,
jumps forward/backward, changes chapter, changes route, or disables the site,
the content script calls `queue.updatePriorities(...)` or `queue.destroy()`,
which aborts stale controllers. Jobs aborted before they start trigger the
`onJobCancelled` callback immediately and are removed from the active set.

## Caching strategy

- **Persistent**: enabled-sites list and user settings in `chrome.storage.sync`.
- **Session**: completed page fingerprints in `PageQueue` so the same page is
  never processed twice during the same browsing session.

Later phases may cache OCR/translation results locally, but no data leaves the
browser.

## Model-loading strategy

Models are not included in the extension package in Phase 0. A model-provider
abstraction will be introduced in Phase 3/4 so OCR and translation models can be
swapped, benchmarked, and lazily loaded from local assets or trusted local
sources. WebGPU is preferred with WASM SIMD/threaded fallback.
