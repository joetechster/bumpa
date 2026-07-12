// Error taxonomy (D11): five kinds, four UIs. `malformed` shares the server UI
// but stays distinct in the model so tests and logging can tell "upstream broke
// its contract" from "upstream is down". Empty search results are NOT an error:
// they are a success state with zero items.
export type ApiError =
  | { kind: 'network'; cause: 'offline' | 'timeout'; message: string }
  | { kind: 'rate_limit'; retryAfterSeconds: number | null; message: string }
  | { kind: 'not_found'; message: string }
  | { kind: 'server'; status: number; message: string }
  | { kind: 'malformed'; message: string };

// Every API function returns a Result instead of throwing strings. The single
// exception: a caller-initiated abort re-throws the DOMException 'AbortError',
// because an abort is a lifecycle event the caller triggered, not an error state
// the UI should ever render.
export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = <T>(error: ApiError): Result<T> => ({ ok: false, error });

export function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}
