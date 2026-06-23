import { describe, expect, it } from 'vitest';
import { Err, Ok, resultMap, resultUnwrap, type Result } from './result.js';

describe('Result', () => {
  it('represents success', () => {
    const result = Ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it('represents failure', () => {
    const result = Err('boom');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('boom');
    }
  });

  it('maps success values', () => {
    const result = resultMap(Ok(2), (n) => n * 3);
    expect(result.ok && result.value).toBe(6);
  });

  it('preserves errors through map', () => {
    const result: Result<number, string> = resultMap(Err('nope'), (n) => n * 3);
    expect(!result.ok && result.error).toBe('nope');
  });

  it('unwraps success values', () => {
    expect(resultUnwrap(Ok(5), () => 0)).toBe(5);
  });

  it('invokes error handler on unwrap', () => {
    expect(resultUnwrap(Err('x'), () => 99)).toBe(99);
  });
});
