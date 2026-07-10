import { ApiError, Result, err, isAbortError, ok } from './errors';

export const DEFAULT_TIMEOUT_MS = 10_000;

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

function parseRetryAfter(header: string | null): number | null {
  if (header === null) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function statusToError(status: number, retryAfter: string | null): ApiError {
  if (status === 429) {
    return {
      kind: 'rate_limit',
      retryAfterSeconds: parseRetryAfter(retryAfter),
      message: `Rate limited (429)`,
    };
  }
  if (status === 404) {
    return { kind: 'not_found', message: 'Resource not found (404)' };
  }
  // Any other non-ok status (5xx, unexpected 4xx) is "their side / our request
  // broke" — one UI, status preserved for logging and tests.
  return { kind: 'server', status, message: `Request failed with status ${status}` };
}

/**
 * Fetch + parse + validate, returning a Result — never a thrown string.
 *
 * Cancellation contract:
 * - `options.signal` (the caller's, e.g. from a useEffect cleanup) is combined
 *   with an internal timeout controller.
 * - Caller abort re-throws the AbortError: aborts are lifecycle, not UI errors.
 * - Timeout maps to { kind:'network', cause:'timeout' }.
 */
export async function fetchJson<T>(
  url: string,
  validate: (x: unknown) => x is T,
  options: RequestOptions = {},
): Promise<Result<T>> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // Hand-rolled AbortSignal.any([signal, timeout]): portable across Hermes/Jest.
  const controller = new AbortController();
  let timedOut = false;
  const onCallerAbort = () => controller.abort();
  if (signal !== undefined) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    signal.addEventListener('abort', onCallerAbort);
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } catch (e) {
      if (isAbortError(e)) {
        if (timedOut) {
          return err({ kind: 'network', cause: 'timeout', message: `Timed out after ${timeoutMs}ms` });
        }
        throw e; // caller-initiated abort — propagate, never render
      }
      return err({
        kind: 'network',
        cause: 'offline',
        message: e instanceof Error ? e.message : 'Network request failed',
      });
    }

    if (!response.ok) {
      return err(statusToError(response.status, response.headers.get('Retry-After')));
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return err({ kind: 'malformed', message: 'Response was not valid JSON' });
    }

    if (!validate(payload)) {
      return err({ kind: 'malformed', message: 'Response did not match the expected shape' });
    }
    return ok(payload);
  } finally {
    clearTimeout(timer);
    if (signal !== undefined) signal.removeEventListener('abort', onCallerAbort);
  }
}
