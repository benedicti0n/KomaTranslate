import { useEffect, useState, useCallback, type ReactElement } from 'react';
import {
  EXTENSION_NAME,
  type SiteAuthorization,
  type Origin,
  normalizeOrigin,
  originLabel,
} from '@manga-translator/shared';
import { sendMessage } from '../../utils/messaging.js';

interface PopupState {
  origin: Origin | null;
  authorization: SiteAuthorization | null;
  loading: boolean;
  error: string | null;
}

export default function App(): ReactElement {
  const [state, setState] = useState<PopupState>({
    origin: null,
    authorization: null,
    loading: true,
    error: null,
  });

  const refreshStatus = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'No active tab found',
        }));
        return;
      }

      const origin = normalizeOrigin(tab.url);
      if (!origin) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Cannot use this page',
        }));
        return;
      }

      const result = await sendMessage('popup:getSiteStatus', {
        tabId: tab.id ?? -1,
        origin,
      });

      if (!result.ok) {
        setState((prev) => ({
          ...prev,
          origin,
          loading: false,
          error: result.error,
        }));
        return;
      }

      setState({
        origin,
        authorization: result.value,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleEnable = async (): Promise<void> => {
    const { origin } = state;
    if (!origin) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    const result = await sendMessage('popup:enableSite', { origin });
    if (!result.ok) {
      setState((prev) => ({ ...prev, loading: false, error: result.error }));
      return;
    }
    setState((prev) => ({
      ...prev,
      authorization: result.value,
      loading: false,
    }));
  };

  const handleDisable = async (): Promise<void> => {
    const { origin } = state;
    if (!origin) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    const result = await sendMessage('popup:disableSite', { origin });
    if (!result.ok) {
      setState((prev) => ({ ...prev, loading: false, error: result.error }));
      return;
    }
    setState((prev) => ({
      ...prev,
      authorization: result.value,
      loading: false,
    }));
  };

  const handleOpenOptions = (): void => {
    void chrome.runtime.openOptionsPage();
  };

  const siteName = state.origin ? originLabel(state.origin) : 'this site';

  return (
    <main className="popup">
      <header className="popup__header">
        <img
          className="popup__icon"
          src="/icon/32.png"
          alt=""
          width={32}
          height={32}
        />
        <h1 className="popup__title">{EXTENSION_NAME}</h1>
      </header>

      {state.loading && <p className="popup__status">Loading…</p>}

      {state.error && !state.loading && (
        <p className="popup__error" role="alert">
          {state.error}
        </p>
      )}

      {!state.loading && state.authorization && (
        <section className="popup__section">
          <p className="popup__site">{siteName}</p>
          <p className="popup__status">
            Status:{' '}
            <strong>
              {state.authorization.status === 'enabled'
                ? 'Automatic translation on'
                : 'Automatic translation off'}
            </strong>
          </p>

          {state.authorization.status === 'enabled' ? (
            <button
              className="popup__button popup__button--danger"
              onClick={handleDisable}
              disabled={state.loading}
            >
              Disable on {siteName}
            </button>
          ) : (
            <button
              className="popup__button popup__button--primary"
              onClick={handleEnable}
              disabled={state.loading}
            >
              Enable automatic translation
            </button>
          )}
        </section>
      )}

      <footer className="popup__footer">
        <button
          className="popup__button popup__button--secondary"
          onClick={handleOpenOptions}
        >
          Options
        </button>
      </footer>
    </main>
  );
}
