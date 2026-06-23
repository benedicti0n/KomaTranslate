# Manga Translator — Privacy

## Local-first model

Manga Translator is designed to run entirely inside the browser. In Version 1:

- **No manga images are uploaded.**
- **No OCR text is uploaded.**
- **No translations are uploaded.**
- **No URLs, reading history, or page metadata are uploaded.**
- **No user account is required.**
- **No analytics, telemetry, ad SDKs, or remote logging are included.**

The only data that leaves the browser are normal Chrome Web Store updates and,
optionally, downloads of local models initiated by the user.

## Permissions requested and why

| Permission | Why it is needed |
|---|---|
| `activeTab` | Read the URL of the currently active tab so the popup can show the current site. |
| `storage` | Persist the list of sites enabled by the user and extension settings. |
| `offscreen` | Create an offscreen document for long-running local inference in later phases. |
| Optional host permissions (`*://*/*`) | Allow the content script to run on a specific manga-reader site only after the user explicitly enables it. These are requested per-site, never at install. |
| Optional CDN origin permissions | When a reader loads page images from a separate CDN that does not send CORS headers, the extension may request optional host permission for that CDN origin so the background service worker can fetch the image bytes locally. |

## What is stored

- **Enabled sites** — a list of origins (e.g. `https://example.com`) the user
  has chosen to enable. Stored in `chrome.storage.sync`.
- **Settings** — debug-overlay toggle and onboarding status. Stored in
  `chrome.storage.sync`.

No page content, images, or translations are stored except transient local
session caches used for performance, which are cleared when the extension or
browser restarts.

## Current limitations

- Phase 0 does not load or run any models, so there is no OCR or translation
  data to protect yet.
- Future translation models may need to be downloaded on first use. Download
  sources, sizes, and verification will be documented before they are enabled.
- The built-in Chrome Translator API may be offered as an optional acceleration
  path only after explicit user activation and only when available.
