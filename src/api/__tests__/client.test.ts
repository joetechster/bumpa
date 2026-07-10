import { DEFAULT_TIMEOUT_MS, fetchJson } from '../client';

type Payload = { value: number };
const isPayload = (x: unknown): x is Payload =>
  typeof x === 'object' && x !== null && typeof (x as Payload).value === 'number';

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
}

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('fetchJson', () => {
  it('returns ok with the validated payload on 200', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: 42 }));

    const result = await fetchJson('https://example.test/x', isPayload);

    expect(result).toEqual({ ok: true, data: { value: 42 } });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/x',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('maps a fetch rejection (offline) to a network/offline error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    const result = await fetchJson('https://example.test/x', isPayload);

    expect(result).toEqual({
      ok: false,
      error: { kind: 'network', cause: 'offline', message: 'Network request failed' },
    });
  });

  it('maps 429 to rate_limit and parses Retry-After', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({}, { status: 429, headers: { 'Retry-After': '30' } }),
    );

    const result = await fetchJson('https://example.test/x', isPayload);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ kind: 'rate_limit', retryAfterSeconds: 30 });
    }
  });

  it('maps 429 without a Retry-After header to retryAfterSeconds null', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 429 }));

    const result = await fetchJson('https://example.test/x', isPayload);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ kind: 'rate_limit', retryAfterSeconds: null });
    }
  });

  it('maps 404 to not_found', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'notfound' }, { status: 404 }));

    const result = await fetchJson('https://example.test/x', isPayload);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('not_found');
  });

  it('maps 500 to server with the status preserved', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 500 }));

    const result = await fetchJson('https://example.test/x', isPayload);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatchObject({ kind: 'server', status: 500 });
  });

  it('maps invalid JSON to malformed', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<html>gateway</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
    );

    const result = await fetchJson('https://example.test/x', isPayload);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('malformed');
  });

  it('maps a shape-validation failure to malformed', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: 'not-a-number' }));

    const result = await fetchJson('https://example.test/x', isPayload);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('malformed');
  });

  it('re-throws when the CALLER aborts (aborts are lifecycle, not UI errors)', async () => {
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const controller = new AbortController();

    const pending = fetchJson('https://example.test/x', isPayload, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toThrow('Aborted');
  });

  it('throws immediately when called with an already-aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchJson('https://example.test/x', isPayload, { signal: controller.signal }),
    ).rejects.toThrow('Aborted');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns network/timeout when the request outlives timeoutMs', async () => {
    jest.useFakeTimers();
    try {
      fetchMock.mockImplementationOnce(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      );

      const pending = fetchJson('https://example.test/x', isPayload, { timeoutMs: 5_000 });
      await jest.advanceTimersByTimeAsync(5_001);
      const result = await pending;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatchObject({ kind: 'network', cause: 'timeout' });
      }
    } finally {
      jest.useRealTimers();
    }
  });

  it('applies the default timeout when none is given', async () => {
    jest.useFakeTimers();
    try {
      fetchMock.mockImplementationOnce(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      );

      const pending = fetchJson('https://example.test/x', isPayload);
      await jest.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
      const result = await pending;

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatchObject({ kind: 'network', cause: 'timeout' });
    } finally {
      jest.useRealTimers();
    }
  });
});
