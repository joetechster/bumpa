import { RequestOptions, fetchJson } from './client';
import { Result, err, ok } from './errors';
import { OLAuthor, isOLAuthor, isOLSearchResponse, isOLWork, isRedirect } from './upstream';
import { Book, BookDetails, bookDetailsFromWork, bookFromSearchDoc } from '../domain/book';

export const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org';
export const SEARCH_PAGE_SIZE = 20;
// Fields we actually consume - keeps Open Library search payloads small.
const SEARCH_FIELDS = 'key,title,author_name,cover_i,first_publish_year';
const MAX_AUTHOR_LOOKUPS = 3;

export interface BookSearchPage {
  books: Book[];
  numFound: number;
  page: number; // 1-based
  hasMore: boolean;
}

export async function searchBooks(
  query: string,
  page: number,
  options: RequestOptions = {},
): Promise<Result<BookSearchPage>> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(SEARCH_PAGE_SIZE),
    fields: SEARCH_FIELDS,
  });
  const result = await fetchJson(
    `${OPEN_LIBRARY_BASE_URL}/search.json?${params.toString()}`,
    isOLSearchResponse,
    options,
  );
  if (!result.ok) return result;

  const { numFound, docs } = result.data;
  return ok({
    books: docs.map(bookFromSearchDoc),
    numFound,
    page,
    hasMore: page * SEARCH_PAGE_SIZE < numFound,
  });
}

async function fetchAuthorNames(
  authorKeys: string[],
  options: RequestOptions,
): Promise<string[]> {
  const results = await Promise.all(
    authorKeys.slice(0, MAX_AUTHOR_LOOKUPS).map(async (key) => {
      const result = await fetchJson<OLAuthor>(
        `${OPEN_LIBRARY_BASE_URL}${key}.json`,
        isOLAuthor,
        options,
      );
      return result.ok && typeof result.data.name === 'string' ? result.data.name : null;
    }),
  );
  return results.filter((name): name is string => name !== null);
}

/**
 * Fetch a work by id ("OL45804W"). Follows at most ONE redirect hop - live
 * Open Library data contains redirect stubs (see docs/DECISIONS.md D16).
 * Author names are resolved best-effort: a failed author lookup degrades to
 * fewer names, never to a failed page.
 */
export async function getBookById(
  bookId: string,
  options: RequestOptions = {},
): Promise<Result<BookDetails>> {
  const fetchWork = (id: string) =>
    fetchJson(`${OPEN_LIBRARY_BASE_URL}/works/${id}.json`, isOLWork, options);

  let result = await fetchWork(bookId);
  if (result.ok && isRedirect(result.data)) {
    const target = result.data.location ?? '';
    const targetId = target.replace(/^\/works\//, '');
    if (targetId === '' || targetId === bookId) {
      return err({ kind: 'malformed', message: `Unresolvable redirect for work ${bookId}` });
    }
    result = await fetchWork(targetId);
    if (result.ok && isRedirect(result.data)) {
      return err({ kind: 'malformed', message: `Redirect chain for work ${bookId}` });
    }
  }
  if (!result.ok) return result;

  const authorKeys = (result.data.authors ?? [])
    .map((ref) => ref.author?.key)
    .filter((key): key is string => typeof key === 'string');
  const authorNames = await fetchAuthorNames(authorKeys, options);

  return ok(bookDetailsFromWork(result.data, authorNames));
}
