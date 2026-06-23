import { useEffect, useState, useCallback, type ReactElement } from 'react';
import {
  EXTENSION_NAME,
  type ExtensionSettings,
  ENABLED_SITES_STORAGE_KEY,
  type Origin,
} from '@manga-translator/shared';
import { sendMessage } from '../../utils/messaging.js';

export default function App(): ReactElement {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [enabledSites, setEnabledSites] = useState<Origin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const settingsResult = await sendMessage('popup:getSettings', {});
      if (!settingsResult.ok) {
        setError(settingsResult.error);
        return;
      }

      const stored = await chrome.storage.sync.get(ENABLED_SITES_STORAGE_KEY);
      const sites: unknown = stored[ENABLED_SITES_STORAGE_KEY];

      setSettings(settingsResult.value);
      setEnabledSites(Array.isArray(sites) ? sites.filter((s): s is string => typeof s === 'string') : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggleDebug = async (): Promise<void> => {
    if (!settings) return;
    const next = { ...settings, debugOverlays: !settings.debugOverlays };
    const result = await sendMessage('popup:updateSettings', { settings: next });
    if (result.ok) {
      setSettings(result.value);
    }
  };

  const handleRemoveSite = async (origin: Origin): Promise<void> => {
    const result = await sendMessage('popup:disableSite', { origin });
    if (result.ok) {
      setEnabledSites((prev) => prev.filter((site) => site !== origin));
    }
  };

  return (
    <main className="options">
      <header className="options__header">
        <img
          className="options__icon"
          src="/icon/48.png"
          alt=""
          width={48}
          height={48}
        />
        <h1 className="options__title">{EXTENSION_NAME} Options</h1>
      </header>

      {loading && <p>Loading…</p>}

      {error && (
        <p className="options__error" role="alert">
          {error}
        </p>
      )}

      {!loading && settings && (
        <section className="options__section">
          <h2>Settings</h2>
          <label className="options__row">
            <input
              type="checkbox"
              checked={settings.debugOverlays}
              onChange={handleToggleDebug}
            />
            Show diagnostic overlays
          </label>
        </section>
      )}

      <section className="options__section">
        <h2>Sites with automatic translation</h2>
        {enabledSites.length === 0 ? (
          <p>No sites enabled yet.</p>
        ) : (
          <ul className="options__site-list">
            {enabledSites.map((site) => (
              <li key={site} className="options__site-item">
                <span className="options__site-name">{site}</span>
                <button
                  className="options__button options__button--danger"
                  onClick={() => void handleRemoveSite(site)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
