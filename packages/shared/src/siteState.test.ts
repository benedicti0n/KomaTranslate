import { describe, expect, it } from 'vitest';
import { normalizeOrigin, originLabel } from './siteState.js';

describe('normalizeOrigin', () => {
  it('returns the origin for a valid HTTPS URL', () => {
    expect(normalizeOrigin('https://example.com/chapter/1')).toBe(
      'https://example.com',
    );
  });

  it('returns the origin for a valid HTTP URL', () => {
    expect(normalizeOrigin('http://reader.test/page')).toBe('http://reader.test');
  });

  it('returns null for an invalid URL', () => {
    expect(normalizeOrigin('not a url')).toBeNull();
  });

  it('lowercases the origin', () => {
    expect(normalizeOrigin('https://EXAMPLE.COM')).toBe('https://example.com');
  });
});

describe('originLabel', () => {
  it('returns the hostname for a valid origin', () => {
    expect(originLabel('https://example.com')).toBe('example.com');
  });

  it('falls back to the raw input for an invalid origin', () => {
    expect(originLabel('invalid')).toBe('invalid');
  });
});
