import {
  ENABLED_SITES_STORAGE_KEY,
  EXTENSION_NAME,
  SETTINGS_STORAGE_KEY,
  type ExtensionSettings,
  type Origin,
  DEFAULT_SETTINGS,
} from '@manga-translator/shared';

const log = (...args: unknown[]): void => {
  // eslint-disable-next-line no-console
  console.log(`[${EXTENSION_NAME} storage]`, ...args);
};

const warn = (...args: unknown[]): void => {
  // eslint-disable-next-line no-console
  console.warn(`[${EXTENSION_NAME} storage]`, ...args);
};

/** Reads the set of enabled origins from extension storage. */
export const readEnabledSites = async (): Promise<ReadonlySet<Origin>> => {
  try {
    const result = await chrome.storage.sync.get(ENABLED_SITES_STORAGE_KEY);
    const list: unknown = result[ENABLED_SITES_STORAGE_KEY];
    if (!Array.isArray(list)) {
      return new Set();
    }
    return new Set(list.filter((item): item is string => typeof item === 'string'));
  } catch (error) {
    warn('Failed to read enabled sites', error);
    return new Set();
  }
};

/** Writes the set of enabled origins to extension storage. */
export const writeEnabledSites = async (sites: ReadonlySet<Origin>): Promise<void> => {
  try {
    await chrome.storage.sync.set({
      [ENABLED_SITES_STORAGE_KEY]: Array.from(sites),
    });
  } catch (error) {
    warn('Failed to write enabled sites', error);
    throw error;
  }
};

/** Adds an origin to the enabled set. */
export const enableSite = async (origin: Origin): Promise<void> => {
  const sites = new Set(await readEnabledSites());
  sites.add(origin);
  await writeEnabledSites(sites);
  log('Enabled site', origin);
};

/** Removes an origin from the enabled set. */
export const disableSite = async (origin: Origin): Promise<void> => {
  const sites = new Set(await readEnabledSites());
  sites.delete(origin);
  await writeEnabledSites(sites);
  log('Disabled site', origin);
};

/** Checks whether an origin is enabled. */
export const isSiteEnabled = async (origin: Origin): Promise<boolean> => {
  const sites = await readEnabledSites();
  return sites.has(origin);
};

/** Reads persisted extension settings with defaults applied. */
export const readSettings = async (): Promise<ExtensionSettings> => {
  try {
    const result = await chrome.storage.sync.get(SETTINGS_STORAGE_KEY);
    const stored: unknown = result[SETTINGS_STORAGE_KEY];
    if (stored === null || typeof stored !== 'object') {
      return DEFAULT_SETTINGS;
    }
    const partial = stored as Partial<ExtensionSettings>;
    return {
      debugOverlays:
        typeof partial.debugOverlays === 'boolean'
          ? partial.debugOverlays
          : DEFAULT_SETTINGS.debugOverlays,
      onboardingCompleted:
        typeof partial.onboardingCompleted === 'boolean'
          ? partial.onboardingCompleted
          : DEFAULT_SETTINGS.onboardingCompleted,
    };
  } catch (error) {
    warn('Failed to read settings', error);
    return DEFAULT_SETTINGS;
  }
};

/** Writes extension settings to storage. */
export const writeSettings = async (settings: ExtensionSettings): Promise<void> => {
  try {
    await chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: settings });
  } catch (error) {
    warn('Failed to write settings', error);
    throw error;
  }
};

/** Updates a subset of settings and returns the merged result. */
export const updateSettings = async (
  partial: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> => {
  const current = await readSettings();
  const next: ExtensionSettings = { ...current, ...partial };
  await writeSettings(next);
  return next;
};
