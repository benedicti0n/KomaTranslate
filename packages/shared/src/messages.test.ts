import { describe, expect, it } from 'vitest';
import {
  buildBroadcast,
  buildMessage,
  isMangaTranslatorMessage,
} from './messages.js';

describe('message envelopes', () => {
  it('builds a namespaced request envelope', () => {
    const envelope = buildMessage('popup:getSiteStatus', {
      tabId: 1,
      origin: 'https://example.com',
    });
    expect(envelope.namespace).toBe('mangaTranslator');
    expect(envelope.kind).toBe('popup:getSiteStatus');
    expect(envelope.payload.origin).toBe('https://example.com');
    expect(typeof envelope.sentAt).toBe('string');
  });

  it('builds a namespaced broadcast envelope', () => {
    const envelope = buildBroadcast('broadcast:siteStatusChanged', {
      origin: 'https://example.com',
      authorization: { status: 'enabled', origin: 'https://example.com', enabledAt: 0 },
    });
    expect(envelope.namespace).toBe('mangaTranslator');
    expect(envelope.kind).toBe('broadcast:siteStatusChanged');
  });

  it('recognizes our messages', () => {
    const envelope = buildMessage('offscreen:echo', { message: 'hi' });
    expect(isMangaTranslatorMessage(envelope)).toBe(true);
  });

  it('rejects foreign messages', () => {
    expect(isMangaTranslatorMessage({ kind: 'foo' })).toBe(false);
    expect(isMangaTranslatorMessage(null)).toBe(false);
    expect(isMangaTranslatorMessage(undefined)).toBe(false);
  });
});
