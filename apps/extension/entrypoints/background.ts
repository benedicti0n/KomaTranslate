import { defineBackground } from 'wxt/utils/define-background';
import {
  Err,
  Ok,
  type SiteAuthorization,
  normalizeOrigin,
  EXTENSION_NAME,
} from '@manga-translator/shared';
import {
  disableSite,
  enableSite,
  readSettings,
  updateSettings,
} from '../utils/storage.js';
import { getSiteAuthorization } from '../utils/siteState.js';
import {
  broadcastMessage,
  registerBackgroundHandlers,
  type BackgroundHandlerMap,
} from '../utils/messaging.js';

const log = (...args: unknown[]): void => {
  // eslint-disable-next-line no-console
  console.log(`[${EXTENSION_NAME} background]`, ...args);
};

const warn = (...args: unknown[]): void => {
  // eslint-disable-next-line no-console
  console.warn(`[${EXTENSION_NAME} background]`, ...args);
};

const handlers: BackgroundHandlerMap = {
  'popup:getSiteStatus': async ({ origin }) => {
    const normalized = normalizeOrigin(origin);
    if (!normalized) {
      return Err('Invalid origin');
    }
    return Ok(await getSiteAuthorization(normalized));
  },

  'popup:requestSitePermission': async ({ origin }) => {
    const normalized = normalizeOrigin(origin);
    if (!normalized) {
      return Err('Invalid origin');
    }

    try {
      const granted = await chrome.permissions.request({ origins: [normalized] });
      return Ok({ granted });
    } catch (error) {
      warn('Permission request failed', error);
      return Err(error instanceof Error ? error.message : String(error));
    }
  },

  'popup:enableSite': async ({ origin }) => {
    const normalized = normalizeOrigin(origin);
    if (!normalized) {
      return Err('Invalid origin');
    }

    try {
      // Optional host permission is requested first so the content script can run.
      const granted = await chrome.permissions.request({ origins: [normalized] });
      if (!granted) {
        return Err('Permission denied by user');
      }

      await enableSite(normalized);
      const authorization: SiteAuthorization = {
        status: 'enabled',
        origin: normalized,
        enabledAt: Date.now(),
      };

      await broadcastMessage('broadcast:siteStatusChanged', {
        origin: normalized,
        authorization,
      });

      return Ok(authorization);
    } catch (error) {
      warn('Enable site failed', error);
      return Err(error instanceof Error ? error.message : String(error));
    }
  },

  'popup:disableSite': async ({ origin }) => {
    const normalized = normalizeOrigin(origin);
    if (!normalized) {
      return Err('Invalid origin');
    }

    try {
      await disableSite(normalized);
      const authorization: SiteAuthorization = {
        status: 'disabled',
        origin: normalized,
      };

      await broadcastMessage('broadcast:siteStatusChanged', {
        origin: normalized,
        authorization,
      });

      return Ok(authorization);
    } catch (error) {
      warn('Disable site failed', error);
      return Err(error instanceof Error ? error.message : String(error));
    }
  },

  'popup:getSettings': async () => {
    try {
      return Ok(await readSettings());
    } catch (error) {
      return Err(error instanceof Error ? error.message : String(error));
    }
  },

  'popup:updateSettings': async ({ settings }) => {
    try {
      return Ok(await updateSettings(settings));
    } catch (error) {
      return Err(error instanceof Error ? error.message : String(error));
    }
  },

  'content:ready': async ({ origin }) => {
    const normalized = normalizeOrigin(origin);
    if (!normalized) {
      return Err('Invalid origin');
    }
    return Ok({ siteStatus: await getSiteAuthorization(normalized) });
  },

  'content:requestStatus': async ({ origin }) => {
    const normalized = normalizeOrigin(origin);
    if (!normalized) {
      return Err('Invalid origin');
    }
    return Ok(await getSiteAuthorization(normalized));
  },

  'offscreen:init': async () => {
    return Ok({ initialized: true });
  },

  'offscreen:echo': async ({ message }) => {
    return Ok({ echoed: message });
  },
};

const init = (): void => {
  log('Service worker started');
  registerBackgroundHandlers(handlers);

  chrome.permissions.onAdded.addListener((permissions) => {
    log('Permissions added', permissions);
  });

  chrome.permissions.onRemoved.addListener((permissions) => {
    log('Permissions removed', permissions);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.enabledSites?.newValue !== undefined) {
      log('Enabled sites changed');
    }
  });
};

export default defineBackground({
  main: init,
  type: 'module',
});
