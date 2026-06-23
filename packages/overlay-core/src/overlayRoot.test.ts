import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createOverlayRoot, removeOverlayRoot } from './overlayRoot.js';
import { showDiagnosticOverlay, removeDiagnosticOverlay } from './diagnosticOverlay.js';

describe('overlayRoot', () => {
  beforeEach(() => {
    removeOverlayRoot();
  });

  afterEach(() => {
    removeOverlayRoot();
  });

  it('mounts a closed shadow root host', () => {
    const { hostElement, shadowRoot } = createOverlayRoot();
    expect(hostElement.isConnected).toBe(true);
    expect(shadowRoot.mode).toBe('closed');
    expect(document.getElementById('manga-translator-overlay-host')).toBe(hostElement);
  });

  it('removes an existing host before mounting a new one', () => {
    createOverlayRoot();
    const firstHost = document.getElementById('manga-translator-overlay-host');
    createOverlayRoot();
    const secondHost = document.getElementById('manga-translator-overlay-host');
    expect(firstHost).not.toBe(secondHost);
    expect(firstHost?.isConnected).toBe(false);
    expect(secondHost?.isConnected).toBe(true);
  });

  it('cleans up the host on destroy', () => {
    const { destroy } = createOverlayRoot();
    destroy();
    expect(document.getElementById('manga-translator-overlay-host')).toBeNull();
  });
});

describe('diagnosticOverlay', () => {
  afterEach(() => {
    removeDiagnosticOverlay();
  });

  it('mounts an overlay host and removes it on destroy', () => {
    const destroy = showDiagnosticOverlay({ label: 'Test overlay' });
    const host = document.getElementById('manga-translator-overlay-host');
    expect(host).not.toBeNull();

    destroy();
    expect(document.getElementById('manga-translator-overlay-host')).toBeNull();
  });

  it('exposes the rendered card through the returned shadow root handle', () => {
    const { shadowRoot, destroy } = createOverlayRoot();
    const card = document.createElement('div');
    card.className = 'manga-translator-diagnostic-card';
    card.textContent = 'Direct test';
    shadowRoot.appendChild(card);

    expect(shadowRoot.querySelector('.manga-translator-diagnostic-card')?.textContent).toBe(
      'Direct test',
    );

    destroy();
  });
});
