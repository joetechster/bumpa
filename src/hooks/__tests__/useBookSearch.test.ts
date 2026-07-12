import { act, renderHook } from '@testing-library/react-native';

import { searchBooks } from '../../api/books';
import type { ApiError } from '../../api/errors';
import { SEARCH_DEBOUNCE_MS } from '../../config/tuning';
import type { Book } from '../../domain/book';
import { bookSearchReducer, initialSearchState, useBookSearch } from '../useBookSearch';

jest.mock('../../api/books', () => ({
  ...jest.requireActual('../../api/books'),
  searchBooks: jest.fn(),
}));

const searchBooksMock = searchBooks as jest.MockedFunction<typeof searchBooks>;

const book = (id: string): Book => ({
  id,
  title: `Book ${id}`,
  authors: [],
  coverUrl: null,
  firstPublishYear: null,
  priceKobo: 250_000,
  rating: 4.0,
});

const page = (books: Book[], { hasMore = false, numFound = books.length, pageNo = 1 } = {}) => ({
  ok: true as const,
  data: { books, numFound, page: pageNo, hasMore },
});

const serverError: ApiError = { kind: 'server', status: 500, message: 'boom' };

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('bookSearchReducer', () => {
  const base = { ...initialSearchState('fiction'), status: 'success' as const };

  it('query change resets paging atomically', () => {
    const state = bookSearchReducer(
      { ...base, books: [book('A')], page: 4, hasMore: true },
      { type: 'query_changed', query: 'dune' },
    );
    expect(state).toMatchObject({ query: 'dune', books: [], page: 1, status: 'loading' });
  });

  it('same-query change is a no-op (no refetch loop)', () => {
    const state = { ...base, books: [book('A')] };
    expect(bookSearchReducer(state, { type: 'query_changed', query: 'fiction' })).toBe(state);
  });

  it('load_more advances the page only from a settled success with more pages', () => {
    const canLoad = { ...base, hasMore: true };
    expect(bookSearchReducer(canLoad, { type: 'load_more' })).toMatchObject({
      page: 2,
      status: 'loading-more',
    });

    // Ignored on the last page and while already loading - double-fired
    // onEndReached must be harmless.
    expect(bookSearchReducer({ ...base, hasMore: false }, { type: 'load_more' })).toEqual({
      ...base,
      hasMore: false,
    });
    const loading = { ...base, status: 'loading' as const, hasMore: true };
    expect(bookSearchReducer(loading, { type: 'load_more' })).toBe(loading);
  });

  it('appends later pages and dedupes ids (FlatList keys must be unique)', () => {
    const state = bookSearchReducer(
      { ...base, books: [book('A'), book('B')], page: 2, status: 'loading-more' },
      { type: 'page_succeeded', books: [book('B'), book('C')], hasMore: false, numFound: 3 },
    );
    expect(state.books.map((b) => b.id)).toEqual(['A', 'B', 'C']);
    expect(state.status).toBe('success');
  });

  it('page 1 success REPLACES results (fresh query), not appends', () => {
    const state = bookSearchReducer(
      { ...base, books: [book('OLD')], page: 1, status: 'loading' },
      { type: 'page_succeeded', books: [book('NEW')], hasMore: false, numFound: 1 },
    );
    expect(state.books.map((b) => b.id)).toEqual(['NEW']);
  });
});

describe('useBookSearch', () => {
  it('debounces: no request until SEARCH_DEBOUNCE_MS after the last keystroke', async () => {
    searchBooksMock.mockResolvedValue(page([book('A')]));
    const { rerender } = await renderHook(({ q }: { q: string }) => useBookSearch(q), {
      initialProps: { q: 'fic' },
    });

    // Mount fetches the initial query immediately (debounce starts at it).
    expect(searchBooksMock).toHaveBeenCalledTimes(1);

    await rerender({ q: 'fict' });
    await rerender({ q: 'fictio' });
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    });
    expect(searchBooksMock).toHaveBeenCalledTimes(1); // still only the mount fetch

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(searchBooksMock).toHaveBeenCalledTimes(2);
    expect(searchBooksMock).toHaveBeenLastCalledWith('fictio', 1, expect.anything());
  });

  it('aborts the in-flight request when the query changes', async () => {
    const signals: AbortSignal[] = [];
    searchBooksMock.mockImplementation((_q, _page, opts) => {
      signals.push(opts!.signal!);
      return new Promise(() => {}); // never settles - stays in flight
    });

    const { rerender } = await renderHook(({ q }: { q: string }) => useBookSearch(q), {
      initialProps: { q: 'first' },
    });
    expect(signals).toHaveLength(1);

    await rerender({ q: 'second' });
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true); // first request cancelled
    expect(signals[1].aborted).toBe(false);
  });

  it('loadMore fetches the next page and appends', async () => {
    searchBooksMock
      .mockResolvedValueOnce(page([book('A')], { hasMore: true, numFound: 40 }))
      .mockResolvedValueOnce(page([book('B')], { hasMore: false, numFound: 40, pageNo: 2 }));

    const { result } = await renderHook(() => useBookSearch('fiction'));
    await act(async () => {}); // let the first page settle

    expect(result.current.state.books.map((b) => b.id)).toEqual(['A']);

    await act(async () => result.current.loadMore());

    expect(searchBooksMock).toHaveBeenLastCalledWith('fiction', 2, expect.anything());
    expect(result.current.state.books.map((b) => b.id)).toEqual(['A', 'B']);
    expect(result.current.state.hasMore).toBe(false);
  });

  it('exposes errors with retry() that refetches', async () => {
    searchBooksMock
      .mockResolvedValueOnce({ ok: false, error: serverError })
      .mockResolvedValueOnce(page([book('A')]));

    const { result } = await renderHook(() => useBookSearch('fiction'));
    await act(async () => {});

    expect(result.current.state).toMatchObject({ status: 'error', error: serverError });

    await act(async () => result.current.retry());

    expect(result.current.state.status).toBe('success');
    expect(result.current.state.books.map((b) => b.id)).toEqual(['A']);
  });

  it('reports empty results as success with zero books (distinct from error)', async () => {
    searchBooksMock.mockResolvedValue(page([]));

    const { result } = await renderHook(() => useBookSearch('zzz'));
    await act(async () => {});

    expect(result.current.state.status).toBe('success');
    expect(result.current.state.books).toEqual([]);
  });

  it('unmount mid-flight aborts and never updates state (silent console)', async () => {
    let resolveLate: ((r: Awaited<ReturnType<typeof searchBooks>>) => void) | undefined;
    const signals: AbortSignal[] = [];
    searchBooksMock.mockImplementation((_q, _p, opts) => {
      signals.push(opts!.signal!);
      return new Promise((resolve) => {
        resolveLate = resolve;
      });
    });

    const { unmount } = await renderHook(() => useBookSearch('fiction'));
    await unmount();

    expect(signals[0].aborted).toBe(true);
    await act(async () => resolveLate!(page([book('A')])));
    // Console trap fails this test if a post-unmount setState warning fires.
  });
});
