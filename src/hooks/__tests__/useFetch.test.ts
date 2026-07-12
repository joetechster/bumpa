import { act, renderHook } from '@testing-library/react-native';

import type { ApiError, Result } from '../../api/errors';
import { Fetcher, useFetch } from '../useFetch';

// A controllable fetcher: each call hands back the promise's strings so the
// test decides exactly when each request settles - that is how the race cases
// are driven deterministically.
function controllableFetcher<T>() {
  const calls: {
    signal: AbortSignal;
    resolve: (r: Result<T>) => void;
    reject: (e: unknown) => void;
  }[] = [];
  const fetcher: Fetcher<T> = (signal) =>
    new Promise<Result<T>>((resolve, reject) => {
      calls.push({ signal, resolve, reject });
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
  return { fetcher, calls };
}

const serverError: ApiError = { kind: 'server', status: 500, message: 'boom' };

describe('useFetch', () => {
  it('goes loading → success and exposes the fetched data', async () => {
    const { fetcher, calls } = controllableFetcher<string>();
    const { result } = await renderHook(() => useFetch(fetcher));

    expect(result.current.state.status).toBe('loading');

    await act(async () => calls[0].resolve({ ok: true, data: 'ficciones' }));

    expect(result.current.state).toMatchObject({ status: 'success', data: 'ficciones' });
  });

  it('goes loading → error → retry() → success', async () => {
    const { fetcher, calls } = controllableFetcher<string>();
    const { result } = await renderHook(() => useFetch(fetcher));

    await act(async () => calls[0].resolve({ ok: false, error: serverError }));
    expect(result.current.state).toMatchObject({ status: 'error', error: serverError });

    await act(async () => result.current.retry());
    expect(result.current.state.status).toBe('loading');
    expect(calls).toHaveLength(2);

    await act(async () => calls[1].resolve({ ok: true, data: 'second time lucky' }));
    expect(result.current.state).toMatchObject({ status: 'success', data: 'second time lucky' });
  });

  it('aborts the in-flight request on unmount and never updates state after', async () => {
    const { fetcher, calls } = controllableFetcher<string>();
    const { result, unmount } = await renderHook(() => useFetch(fetcher));

    expect(calls[0].signal.aborted).toBe(false);
    await unmount();
    expect(calls[0].signal.aborted).toBe(true);

    // Resolve late anyway - nothing may happen. The console trap in
    // jest.setup.ts fails this test if React warns about a post-unmount
    // state update.
    await act(async () => calls[0].resolve({ ok: true, data: 'too late' }));
    expect(result.current.state.status).toBe('loading');
  });

  it('discards a stale response when the fetcher changes mid-flight (the id race)', async () => {
    const bookA = controllableFetcher<string>();
    const bookB = controllableFetcher<string>();
    const { result, rerender } = await renderHook(
      ({ fetcher }: { fetcher: Fetcher<string> }) => useFetch(fetcher),
      { initialProps: { fetcher: bookA.fetcher } },
    );

    // Switch to book B while A is still in flight…
    await rerender({ fetcher: bookB.fetcher });
    expect(bookA.calls[0].signal.aborted).toBe(true);

    // …then let B succeed and A resolve LATE. A must never land.
    await act(async () => bookB.calls[0].resolve({ ok: true, data: 'book B' }));
    await act(async () => bookA.calls[0].resolve({ ok: true, data: 'book A - stale' }));

    expect(result.current.state).toMatchObject({ status: 'success', data: 'book B' });
  });

  it('also discards a stale ERROR from the old request', async () => {
    const bookA = controllableFetcher<string>();
    const bookB = controllableFetcher<string>();
    const { result, rerender } = await renderHook(
      ({ fetcher }: { fetcher: Fetcher<string> }) => useFetch(fetcher),
      { initialProps: { fetcher: bookA.fetcher } },
    );

    await rerender({ fetcher: bookB.fetcher });
    await act(async () => bookA.calls[0].resolve({ ok: false, error: serverError }));

    expect(result.current.state.status).toBe('loading'); // B still in flight

    await act(async () => bookB.calls[0].resolve({ ok: true, data: 'book B' }));
    expect(result.current.state).toMatchObject({ status: 'success', data: 'book B' });
  });

  it('maps an unexpected (non-abort) throw from the fetcher to an error state', async () => {
    // Stable identity - an inline fetcher would re-trigger the effect every
    // render, which is the exact footgun the hook's contract documents.
    const throwingFetcher: Fetcher<string> = async () => {
      throw new Error('fetcher bug');
    };
    const { result } = await renderHook(() => useFetch(throwingFetcher));

    // The fetcher rejected synchronously on mount; state settles via act.
    await act(async () => {});

    expect(result.current.state).toMatchObject({
      status: 'error',
      error: { kind: 'malformed', message: 'fetcher bug' },
    });
  });

  it('never represents impossible states: exactly one of data/error, only in its status', async () => {
    const { fetcher, calls } = controllableFetcher<string>();
    const { result } = await renderHook(() => useFetch(fetcher));

    const seen: object[] = [result.current.state];
    await act(async () => calls[0].resolve({ ok: false, error: serverError }));
    seen.push(result.current.state);
    await act(async () => result.current.retry());
    seen.push(result.current.state);
    await act(async () => calls[1].resolve({ ok: true, data: 'ok' }));
    seen.push(result.current.state);

    for (const state of seen) {
      const keys = Object.keys(state).sort();
      const status = (state as { status: string }).status;
      if (status === 'success') expect(keys).toEqual(['attempt', 'data', 'status']);
      else if (status === 'error') expect(keys).toEqual(['attempt', 'error', 'status']);
      else expect(keys).toEqual(['attempt', 'status']);
    }
  });
});
