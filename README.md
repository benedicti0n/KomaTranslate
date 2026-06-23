# Manga Translator

A local-first Chrome extension that automatically translates Japanese manga text
into plain English overlays while you read.

> **Version 1 is Chrome-only.** There is no desktop app, backend server, user
> account, or cloud processing. All OCR, translation, and rendering happens
> locally in your browser.

## Development

This repository uses `pnpm` workspaces.

```sh
# Install dependencies
pnpm install

# Run unit tests
pnpm test

# Build the extension for production
pnpm build

# Develop the extension with hot reload
pnpm dev

# Create a Chrome Web Store zip
pnpm zip
```

## Loading the extension locally

1. Run `pnpm build`.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select `apps/extension/.output/chrome-mv3`.
5. Open a manga-reader website, click the extension icon, and enable translation.

## Project structure

```text
├── apps/extension/        # WXT Chrome extension
├── packages/shared/       # Cross-context types, messages, and helpers
├── packages/reader-core/  # Reader discovery and page queue (Phase 1+)
├── packages/overlay-core/ # Shadow DOM overlay rendering
├── docs/                  # Architecture, privacy, testing, decisions
├── Features.md            # Feature roadmap
└── todo.md                # Detailed task list
```

## Documentation

- [Architecture](docs/architecture.md)
- [Privacy](docs/privacy.md)
- [Testing](docs/testing.md)
- [Decisions](docs/decisions.md)
- [Features](Features.md)

## License

MIT
