import {
  type Origin,
  type SiteAuthorization,
  normalizeOrigin,
} from '@manga-translator/shared';
import { readEnabledSites } from './storage.js';

export const getSiteAuthorization = async (
  origin: Origin,
): Promise<SiteAuthorization> => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) {
    return { status: 'unknown', origin };
  }

  const enabledSites = await readEnabledSites();
  if (enabledSites.has(normalized)) {
    return {
      status: 'enabled',
      origin: normalized,
      enabledAt: Date.now(), // Note: real timestamp should be stored in a future iteration.
    };
  }

  return { status: 'disabled', origin: normalized };
};

export const isEnabled = async (origin: Origin): Promise<boolean> => {
  const auth = await getSiteAuthorization(origin);
  return auth.status === 'enabled';
};
