/**
 * Creates a stable fingerprint for a page candidate.
 *
 * The fingerprint is used as the session-cache key so the same page is never
 * processed twice during a single browsing session. It intentionally avoids
 * DOM-specific identifiers that may change across route updates.
 */
export const createPageFingerprint = (source: string): string => {
  try {
    const url = new URL(source);
    const protocol = url.protocol.toLowerCase();
    // Blob and data URLs have opaque origins; use the full href as fingerprint.
    if (protocol === 'blob:' || protocol === 'data:') {
      return source.slice(0, 256);
    }
    // Strip query parameters and fragments that may be added by lazy loaders
    // or analytics, but keep the pathname which identifies the page asset.
    return `${url.origin}${url.pathname}`;
  } catch {
    // For invalid sources, fall back to a truncated value.
    return source.slice(0, 256);
  }
};
