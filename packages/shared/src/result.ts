/**
 * Lightweight Result type used for explicit error handling across contexts.
 *
 * Avoids throwing across extension boundaries and keeps failures observable.
 */
export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value,
});

export const Err = <E>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

export const resultMap = <T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> =>
  result.ok ? Ok(fn(result.value)) : result;

export const resultUnwrap = <T, E>(
  result: Result<T, E>,
  onError: (error: E) => T,
): T => (result.ok ? result.value : onError(result.error));
