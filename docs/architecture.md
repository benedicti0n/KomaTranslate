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

Phase 0 does not perform real reader detection. The content script activates on
enabled sites only and shows a diagnostic overlay.

In Phase 1 the planned flow is:

```text
content script loads on enabled site
         |
         v
select a ReaderAdapter based on DOM heuristics
         |
         v
discover PageCandidate[] from DOM images
         |
         v
subscribe to DOM mutations and viewport intersections
         |
         v
compute current page (closest to viewport center)
compute next page (next in reading order)
compute next-next page
```

## Current-page and two-page prefetch queue

The queue is bounded to three priorities:

- **P0** — current visible page.
- **P1** — next page in reading order.
- **P2** — following page.

All other pages are ignored until they enter the P0/P1/P2 window. This avoids
OCR/translation of an entire chapter and keeps the visible page responsive.

## Overlay coordinate mapping

Overlays are rendered into a closed Shadow DOM host element that is fixed at the
viewport origin (`top: 0; left: 0`). Each overlay card is absolutely positioned
using coordinates mapped from the source image/page to viewport pixels. In Phase
0 only a fixed diagnostic card is shown; coordinate mapping will be implemented
in Phase 2.

## Cancellation behavior

Every queued page job carries its own `AbortController`. When the user scrolls,
jumps, changes chapter, or disables the site, the background or content script
aborts stale controllers and removes their overlays. Background message handlers
also use try/catch so failures do not crash the service worker.

## Caching strategy

Phase 0 caches only the enabled-sites list and user settings in
`chrome.storage.sync`.

Phase 1 will add an in-memory session cache keyed by page fingerprint so the
same page is never processed twice during the same browsing session. Later
phases may cache OCR/translation results locally, but no data leaves the browser.

## Model-loading strategy

Models are not included in the extension package in Phase 0. A model-provider
abstraction will be introduced in Phase 3/4 so OCR and translation models can be
swapped, benchmarked, and lazily loaded from local assets or trusted local
sources. WebGPU is preferred with WASM SIMD/threaded fallback.
