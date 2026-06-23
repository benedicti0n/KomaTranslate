import { describe, expect, it } from 'vitest';
import { createPageFingerprint } from './pageFingerprint.js';

describe('createPageFingerprint', () => {
  it('strips query parameters and fragments from URLs', () => {
    expect(
      createPageFingerprint('https://example.com/page1.jpg?ts=123#top'),
    ).toBe('https://example.com/page1.jpg');
  });

  it('keeps the pathname for cache identity', () => {
    expect(createPageFingerprint('https://reader.test/chapter/5/page/2.png')).toBe(
      'https://reader.test/chapter/5/page/2.png',
    );
  });

  it('falls back to a truncated source for invalid URLs', () => {
    expect(createPageFingerprint('blob:invalid')).toBe('blob:invalid');
  });
});
