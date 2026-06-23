/**
 * Per-site authorization state.
 *
 * The extension never activates automatically until the user explicitly
 * enables it for a specific origin.
 */
export type SiteAuthorization =
  | { status: 'enabled'; origin: string; enabledAt: number }
  | { status: 'disabled'; origin: string }
  | { status: 'unknown'; origin: string };

/** Normalized origin string, e.g. "https://example.com". */
export type Origin = string;

/** Settings persisted per extension installation. */
export interface ExtensionSettings {
  /** Whether debug overlays are shown in production builds. */
  readonly debugOverlays: boolean;
  /** Whether the user has completed onboarding. */
  readonly onboardingCompleted: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  debugOverlays: false,
  onboardingCompleted: false,
} as const;

/** Returns a normalized origin for a URL, or null if invalid. */
export const normalizeOrigin = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return parsed.origin.toLowerCase();
  } catch {
    return null;
  }
};

/** Returns a hostname label suitable for UI display. */
export const originLabel = (origin: string): string => {
  try {
    const parsed = new URL(origin);
    return parsed.hostname || origin;
  } catch {
    return origin;
  }
};

/**
 * Converts a normalized origin into a Chrome permission match pattern.
 *
 * Chrome's permission API requires origins to include a path, e.g.
 * "https://example.com/*". A bare origin such as "https://example.com" is
 * rejected with "Empty path".
 */
export const originToMatchPattern = (origin: string): string | null => {
  try {
    const parsed = new URL(origin);
    // Match pattern origin must not include username, password, or pathname.
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch {
    return null;
  }
};
