import { useEffect, useReducer } from 'react';

import { useDebouncedValue } from './useDebouncedValue';
import { searchBooks } from '../api/books';
import { ApiError, isAbortError } from '../api/errors';
import { SEARCH_DEBOUNCE_MS } from '../config/tuning';
import type { Book } from '../domain/book';

// Paged search with the same lifecycle guarantees as useFetch (abort on
// cleanup, stale results dropped), plus append semantics for infinite scroll.
// One reducer owns query/page/results so "query changed" atomically resets
// paging — there is no render where a new query pairs with an old page.

type SearchPhase =
  | { status: 'loading' } // first page of the current query
  | { status: 'loading-more' } // appending page > 1
  | { status: 'success' }
  | { status: 'error'; error: ApiError };

export type BookSearchState = {
  query: string;
  books: Book[];
  page: number;
  hasMore: boolean;
  numFound: number;
  attempt: number; // bumped by retry() to re-run the effect
} & SearchPhase;

export type BookSearchAction =
  | { type: 'query_changed'; query: string }
  | { type: 'load_more' }
  | { type: 'retry' }
  | { type: 'page_succeeded'; books: Book[]; hasMore: boolean; numFound: number }
  | { type: 'page_failed'; error: ApiError };

function dedupeById(books: Book[]): Book[] {
  const seen = new Set<string>();
  return books.filter((book) => {
    if (seen.has(book.id)) return false;
    seen.add(book.id);
    return true;
  });
}

export function bookSearchReducer(
  state: BookSearchState,
  action: BookSearchAction,
): BookSearchState {
  switch (action.type) {
    case 'query_changed':
      if (action.query === state.query) return state;
      return {
        query: action.query,
        books: [],
        page: 1,
        hasMore: false,
        numFound: 0,
        attempt: state.attempt,
        status: 'loading',
      };
    case 'load_more':
      // Only meaningful from a settled success with more pages; ignoring the
      // rest makes double-fired onEndReached calls harmless.
      if (state.status !== 'success' || !state.hasMore) return state;
      return { ...state, page: state.page + 1, status: 'loading-more' };
    case 'retry':
      if (state.status !== 'error') return state;
      return {
        ...state,
        attempt: state.attempt + 1,
        status: state.page > 1 ? 'loading-more' : 'loading',
      };
    case 'page_succeeded':
      return {
        ...state,
        // Page 1 replaces; later pages append. Dedupe by id — Open Library
        // rankings can shift between page fetches and FlatList keys must be
        // unique.
        books:
          state.page === 1 ? action.books : dedupeById([...state.books, ...action.books]),
        hasMore: action.hasMore,
        numFound: action.numFound,
        status: 'success',
      };
    case 'page_failed':
      return { ...state, status: 'error', error: action.error };
  }
}

export function initialSearchState(query: string): BookSearchState {
  return {
    query,
    books: [],
    page: 1,
    hasMore: false,
    numFound: 0,
    attempt: 0,
    status: 'loading',
  };
}

export interface UseBookSearchResult {
  state: BookSearchState;
  loadMore: () => void;
  retry: () => void;
}

/**
 * @param rawQuery live TextInput value; debounced here (SEARCH_DEBOUNCE_MS).
 *                 Changing it cancels any in-flight request via the effect
 *                 cleanup and resets paging atomically in the reducer.
 */
export function useBookSearch(rawQuery: string): UseBookSearchResult {
  const debouncedQuery = useDebouncedValue(rawQuery, SEARCH_DEBOUNCE_MS);
  const [state, dispatch] = useReducer(bookSearchReducer, debouncedQuery, initialSearchState);

  useEffect(() => {
    dispatch({ type: 'query_changed', query: debouncedQuery });
  }, [debouncedQuery]);

  const { query, page, attempt } = state;

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      let outcome: Awaited<ReturnType<typeof searchBooks>>;
      try {
        outcome = await searchBooks(query, page, { signal: controller.signal });
      } catch (e) {
        if (isAbortError(e)) return; // our own cleanup — query changed or unmounted
        outcome = {
          ok: false,
          error: { kind: 'malformed', message: e instanceof Error ? e.message : 'Unexpected error' },
        };
      }
      if (controller.signal.aborted) return; // stale response — never lands

      if (outcome.ok) {
        dispatch({
          type: 'page_succeeded',
          books: outcome.data.books,
          hasMore: outcome.data.hasMore,
          numFound: outcome.data.numFound,
        });
      } else {
        dispatch({ type: 'page_failed', error: outcome.error });
      }
    })();

    return () => controller.abort();
  }, [query, page, attempt]);

  return {
    state,
    loadMore: () => dispatch({ type: 'load_more' }),
    retry: () => dispatch({ type: 'retry' }),
  };
}
