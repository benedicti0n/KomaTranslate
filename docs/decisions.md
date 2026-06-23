# Manga Translator — Technical Decisions

## 2026-06-23 — Use WXT for the Chrome extension build

**Decision:** Use WXT as the extension framework on top of Vite and React.

**Reason:** WXT handles Manifest V3 generation, entrypoint discovery, HMR during
extension development, and multi-browser targeting. This lets the team focus on
product logic rather than extension packaging boilerplate.

**Alternatives considered:**

- Plasmo — opinionated and powerful, but adds its own runtime abstractions.
- Raw Vite + manual manifest — more control but more maintenance.
- CRXJS — primarily Vite plugin; less active than WXT.

**Consequences:** Build output lives in `apps/extension/.output/`. We must align
WXT's entrypoint conventions with our background/content/popup/options/offscreen
structure.

---

## 2026-06-23 — Declare content script for `<all_urls>` but rely on optional host permissions

**Decision:** The content script is declared with `matches: ["<all_urls>"]` in the
manifest, but the extension requests only narrow optional host permissions when
the user enables a site.

**Reason:** Chrome only injects a content script when the extension has host
permission for the matching origin. Declaring broad matches does not grant broad
permission; it only describes where the script *may* run after permission is
granted. This keeps the install-time permission surface minimal while allowing
per-site activation without dynamic content-script registration complexity in
Phase 0.

**Alternatives considered:**

- Dynamic `chrome.scripting.registerContentScripts` after each grant — more
  privacy-preserving but adds complexity; may be adopted later.
- Declare specific popular manga sites — violates the generic reader goal and
  requires frequent updates.

**Consequences:** The manifest contains `<all_urls>` content script matches.
Future phases may switch to dynamic registration if store policy or user feedback
requires it.

---

## 2026-06-23 — Closed Shadow DOM for overlays

**Decision:** Render all overlays into a closed Shadow DOM host fixed at the
viewport origin.

**Reason:** Closed Shadow DOM prevents the host page's CSS and JavaScript from
accidentally affecting overlays or reading overlay content. It also prevents our
styles from leaking into the reader page.

**Alternatives considered:**

- Open Shadow DOM — easier to debug but less isolated.
- Plain `<div>` overlays — risk of CSS conflicts and accidental mutation of the
  reader page.

**Consequences:** Tests cannot inspect shadow content via `element.shadowRoot`.
We return the `ShadowRoot` handle from creation functions for testability.

---

## 2026-06-23 — Separate shared package for cross-context contracts

**Decision:** Place all cross-context message types, result types, and site-state
helpers in a dedicated `@manga-translator/shared` workspace package.

**Reason:** Background, content script, popup, options, and offscreen document
all need the same message contracts. A shared package eliminates duplication and
keeps the type system consistent across extension boundaries.

**Alternatives considered:**

- Duplicate types in each context — error-prone.
- Put contracts inside `apps/extension` — makes it harder for future packages
  (e.g. benchmark tools) to import them.

**Consequences:** All workspace packages can import from `@manga-translator/shared`.
We must keep this package free of browser-only APIs so it remains testable in
Vitest.

---

## 2026-06-23 — Defer real OCR/translation to later phases

**Decision:** Phase 0 contains only the extension foundation, Shadow DOM
infrastructure, and a diagnostic overlay. No OCR, translation, or image capture
is implemented.

**Reason:** Building a reliable local-first extension requires a solid
architecture before introducing heavy models. Phase 0 verifies permissions,
messaging, storage, build pipeline, and overlay injection.

**Consequences:** Phase 0 is not a usable translation product yet. Phase 1 and
Phase 2 will add reader discovery and image pipeline; Phase 3 and Phase 4 will
benchmark and select models before integration in Phase 5.

---

## 2026-06-23 — Use element IDs for DOM tracking and fingerprints for session cache

**Decision:** `PageCandidate` carries both a unique `id` (DOM element instance)
and a stable `fingerprint` (page asset identity). The viewport tracker observes
elements by `id`, while the page queue caches results by `fingerprint`.

**Reason:** A single manga page asset may theoretically appear in the DOM more
than once during route changes, and DOM element references are not stable across
mutations. Separating identity from DOM tracking lets us cancel stale element
jobs while still deduplicating the same page asset in the session cache.

**Alternatives considered:**

- Use only fingerprints for both — would break if two elements shared a source.
- Use only DOM element references — unstable across mutations and hard to cache.

**Consequences:** The adapter must mark elements and the tracker must query by
`data-manga-translator-id`. Future adapters must produce unique element IDs and
stable fingerprints independently.
