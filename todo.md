# Manga Translator — Todo

Legend:

- `[ ]` pending
- `[~]` in progress
- `[x]` completed

---

## Phase 0 — Repository Audit, Architecture, and Extension Foundation

### Repository audit

- [x] Inspect repository root.
- [x] Search for `SKILL.md`, `skills.md`, `AGENTS.md`, `CLAUDE.md`.
- [x] Read existing `README.md`.
  - Verification: repository only contains `.git/` and `README.md` with project name.

### Workspace and build setup

- [x] Create root `package.json` with pnpm workspaces and shared scripts.
  - Verification: `pnpm install` succeeds.
- [x] Create `pnpm-workspace.yaml` including `apps/*` and `packages/*`.
  - Verification: workspace projects are recognized.
- [x] Create root `tsconfig.json` with strict mode and workspace path aliases.
  - Verification: `tsc --noEmit` passes.
- [x] Add `.gitignore` for node_modules, build outputs, OS files, and test artifacts.
- [x] Add `.prettierrc` for consistent formatting.

### Shared packages

- [x] Create `@manga-translator/shared` package.
  - Verification: imports resolve in extension and other packages.
- [x] Implement `Result<T, E>` type and helpers (`Ok`, `Err`, `resultMap`, `resultUnwrap`).
  - Verification: unit tests pass.
- [x] Implement branding constants (name, namespace, storage keys).
  - Verification: constants used by background and popup.
- [x] Implement site-state types and helpers (`normalizeOrigin`, `originLabel`).
  - Verification: unit tests pass.
- [x] Implement typed cross-context message contracts.
  - Verification: unit tests pass for envelope building and validation.

### Reader and overlay scaffolding

- [x] Create `@manga-translator/reader-core` package with placeholder types and DOM adapter.
  - Verification: package builds without errors.
- [x] Create `@manga-translator/overlay-core` package with Shadow DOM root and diagnostic overlay.
  - Verification: unit tests pass for mount/destroy lifecycle.

### Extension entrypoints

- [x] Create `apps/extension/package.json` with WXT, Vite, React, and workspace deps.
- [x] Create `wxt.config.ts` with Manifest V3, narrow permissions, and icons.
  - Verification: build produces `manifest.json` with expected permissions.
- [x] Generate extension icons (16, 32, 48, 128).
  - Verification: icons exist in `apps/extension/public/icon/`.
- [x] Implement background service worker with message handlers.
  - Verification: builds and registers all popup/content/offscreen handlers.
- [x] Implement content script with Shadow DOM diagnostic overlay injection.
  - Verification: only activates on enabled sites; overlay can be removed.
- [x] Implement popup UI (status, enable, disable, options link).
  - Verification: builds and loads in extension popup.
- [x] Implement options page (enabled sites list, debug toggle).
  - Verification: builds and loads.
- [x] Implement offscreen document scaffolding.
  - Verification: bundled by WXT and referenced in manifest.

### Storage and messaging utilities

- [x] Implement extension storage helpers for enabled sites and settings.
  - Verification: background uses them; no direct `chrome.storage` calls elsewhere.
- [x] Implement typed message send/receive wrappers.
  - Verification: popup and content use typed `sendMessage`.

### Tests

- [x] Configure Vitest with happy-dom environment and workspace aliases.
  - Verification: `pnpm test` runs all tests.
- [x] Add unit tests for `Result`, messages, site-state helpers.
  - Verification: tests pass.
- [x] Add unit tests for overlay root lifecycle.
  - Verification: tests pass.

### Documentation

- [x] Update `README.md` with project overview and development commands.
- [x] Create `Features.md` with completed/in-progress/planned/excluded features.
- [x] Create `docs/architecture.md`.
- [x] Create `docs/privacy.md`.
- [x] Create `docs/testing.md`.
- [x] Create `docs/decisions.md` with Phase 0 decisions.

### Verification and delivery

- [x] Run `pnpm test`.
  - Result: 21 tests passed.
- [x] Run `pnpm build`.
  - Result: WXT build succeeded, 223.65 kB total output.
- [x] Commit Phase 0 changes.
- [x] Push to remote.

---

## Phase 1 — Reader Discovery and Current/Next-Two Page Queue

### Discovery

- [x] Define `ReaderAdapter` interface and detection heuristics.
  - Verification: `detectReaderAdapter` returns the DOM image adapter.
- [x] Implement DOM image-based reader adapter.
  - Verification: discovers visible images above minimum size; unit test passes.
- [x] Implement `MutationObserver` subscription for dynamically inserted pages.
  - Verification: new pages are discovered without manual refresh; unit test passes.
- [x] Implement page fingerprint helper that strips query parameters.
  - Verification: unit tests pass.

### Viewport tracking

- [x] Implement `IntersectionObserver` wrapper.
  - Verification: visible pages are reported with intersection ratios.
- [x] Implement viewport-center calculation and closest-page selection.
  - Verification: current page = element whose center is nearest viewport center.

### Reading order

- [x] Implement reading-order sorting for vertical, LTR, and RTL directions.
  - Verification: unit tests pass for all three directions.

### Priority queue

- [x] Implement bounded P0/P1/P2 queue.
  - Verification: exactly one P0, one P1, one P2 job at a time.
- [x] Implement job cancellation with `AbortController`.
  - Verification: stale jobs abort when user jumps ahead/back; unit test passes.
- [x] Implement session cache by page fingerprint to prevent duplicate work.
  - Verification: revisiting a cached page does not requeue it; unit test passes.
- [x] Implement simulated page processor for Phase 1 proof of concept.
  - Verification: queue tests use it successfully.

### Mock overlays

- [x] Render mock translation bubbles on detected pages using priority order.
  - Verification: content script renders P0/P1/P2 cards over source images.

### Fixtures and tests

- [x] Create vertical scrolling reader fixture.
- [x] Create paged reader fixture.
- [x] Create lazy-loaded reader fixture.
- [x] Add automated tests for queue, reading order, fingerprinting, and adapter.
  - Verification: 37 unit tests pass.

### Verification and delivery

- [x] Run `pnpm test`.
  - Result: 37 tests passed.
- [x] Run `pnpm typecheck`.
  - Result: no errors.
- [x] Run `pnpm build`.
  - Result: WXT build succeeded.
- [x] Update `Features.md`, `docs/architecture.md`, `docs/testing.md`, `docs/decisions.md`.
- [x] Commit and push Phase 1.

---

## Phase 2 — Image Pipeline and Real Page Capture

- [ ] Implement safe DOM image decoding.
- [ ] Implement coordinate mapping from source pixels to rendered pixels.
- [ ] Implement resize/normalize/crop utilities.
- [ ] Implement image memory lifecycle management.
- [ ] Define fallback capture architecture for canvas/WebGL/blob readers.
- [ ] Add fixtures for zoom, DPR, scaling, and responsive layouts.
- [ ] Add performance instrumentation.

---

## Phase 3 — Text Detection and OCR Benchmark Spike

- [ ] Define OCR provider interface.
- [ ] Define text-detection provider interface.
- [ ] Build benchmark harness.
- [ ] Create synthetic and licensed fixtures.
- [ ] Load and measure candidate models.
- [ ] Test WebGPU and WASM fallback.
- [ ] Document benchmark results and recommendation.

---

## Phase 4 — Local Translation Spike

- [ ] Define translation provider interface.
- [ ] Implement model/language-pack loading state.
- [ ] Implement local cache strategy.
- [ ] Build translation benchmark harness.
- [ ] Detect and gate Chrome built-in Translator API behind user activation.
- [ ] Implement fully local fallback.
- [ ] Document model size, download behavior, and device requirements.

---

## Phase 5 — End-to-End Automatic Translation

- [ ] Connect image pipeline → OCR → translation.
- [ ] Implement confidence scoring.
- [ ] Render plain English overlay cards.
- [ ] Auto-translate current page and prepare next two pages.
- [ ] Add site-level pause/disable controls.
- [ ] Add error states.
- [ ] Add end-to-end fixtures and visual regression tests.

---

## Phase 6 — Hardening and Popular Reader Adapters

- [ ] Create reader adapter registry.
- [ ] Add site-specific adapters where valuable.
- [ ] Improve lazy-load support.
- [ ] Improve route-change behavior.
- [ ] Robust fullscreen and zoom support.
- [ ] Performance tuning.
- [ ] Accessibility improvements.
- [ ] Privacy/security review.
- [ ] Chrome Web Store packaging readiness.
