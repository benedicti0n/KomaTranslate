# Manga Translator — Testing

## Test strategy

The project uses a layered test approach:

1. **Unit tests** — pure domain logic, message contracts, and overlay lifecycle.
2. **Extension build verification** — every build must produce a valid
   Chrome MV3 bundle.
3. **End-to-end extension tests** — Playwright loads the unpacked extension and
   exercises popup/content flows (planned for Phase 1+).
4. **Visual regression tests** — Playwright screenshots of overlays against
   fixture readers (planned for Phase 5).

## Running tests

```sh
# Run all unit tests
pnpm test

# Watch mode
pnpm test:watch

# Type check the entire workspace
pnpm typecheck

# Build the extension
pnpm build

# Create a distributable zip
pnpm zip
```

## Unit tests

Unit tests live next to the source files they test:

```text
packages/shared/src/*.test.ts
packages/overlay-core/src/*.test.ts
```

They are run with Vitest and happy-dom for DOM-dependent tests.

## Fixture readers

Fixture reader pages will be added under `tests/fixtures/` starting in Phase 1:

- `verticalReader.html` — long vertical scrolling reader.
- `pagedReader.html` — click/tap paged reader.
- `lazyLoadedReader.html` — images loaded lazily as the user scrolls.
- `canvasReader.html` — custom canvas/WebGL reader fallback.
- `syntheticPages/` — programmatically generated manga-like pages.

## End-to-end tests

Playwright will be configured to:

1. Build the extension.
2. Launch Chrome with the unpacked extension loaded.
3. Open a fixture reader page.
4. Enable the site through the popup.
5. Verify the overlay appears and updates correctly.

Visual regression tests will compare overlay screenshots against baselines.

## Current coverage

Phase 0 covers:

- `Result<T, E>` helpers.
- Cross-context message envelope building and validation.
- `normalizeOrigin` and `originLabel` helpers.
- Shadow DOM overlay root mount/destroy lifecycle.
