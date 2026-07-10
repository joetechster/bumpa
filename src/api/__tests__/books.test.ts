import { getBookById, searchBooks, SEARCH_PAGE_SIZE } from '../books';
import {
  authorFixture,
  redirectWorkFixture,
  searchResponseFixture,
  workFixture,
  workStringDescriptionFixture,
} from '../__fixtures__/openLibrary';

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('searchBooks', () => {
  it('normalises docs into the domain Book model', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(searchResponseFixture));

    const result = await searchBooks('fiction', 1);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [ficciones, noCover] = result.data.books;

    expect(ficciones).toMatchObject({
      id: 'OL110971W',
      title: 'Ficciones',
      authors: ['Jorge Luis Borges'],
      coverUrl: 'https://covers.openlibrary.org/b/id/10832290-M.jpg',
      firstPublishYear: 1945,
    });
    // Synthesised fields: integers in the ruled band, deterministic.
    expect(Number.isSafeInteger(ficciones.priceKobo)).toBe(true);
    expect(ficciones.priceKobo).toBeGreaterThanOrEqual(250_000);
    expect(ficciones.priceKobo).toBeLessThanOrEqual(1_200_000);
    expect(ficciones.rating).toBeGreaterThanOrEqual(3);
    expect(ficciones.rating).toBeLessThanOrEqual(5);

    // Missing upstream fields become DEFINED fallbacks, never undefined.
    expect(noCover.coverUrl).toBeNull();
    expect(noCover.authors).toEqual([]);
  });

  it('requests the given page and reports hasMore from numFound', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(searchResponseFixture));

    const result = await searchBooks('fiction', 3);

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('page')).toBe('3');
    expect(url.searchParams.get('limit')).toBe(String(SEARCH_PAGE_SIZE));
    expect(result.ok && result.data.hasMore).toBe(true);
    expect(result.ok && result.data.page).toBe(3);
  });

  it('reports hasMore=false on the last page', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...searchResponseFixture, numFound: 25 }));

    const result = await searchBooks('fiction', 2); // 2 * 20 >= 25

    expect(result.ok && result.data.hasMore).toBe(false);
  });

  it('returns zero books as a SUCCESS, not an error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ numFound: 0, start: 0, docs: [] }));

    const result = await searchBooks('zzzznope', 1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.books).toEqual([]);
      expect(result.data.hasMore).toBe(false);
    }
  });

  it('propagates transport errors from the client', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    const result = await searchBooks('fiction', 1);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('network');
  });

  it('flags a shape drift (docs not an array) as malformed', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ numFound: 10, start: 0, docs: 'surprise' }));

    const result = await searchBooks('fiction', 1);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('malformed');
  });
});

describe('getBookById', () => {
  it('normalises a work with an object description and resolves author names', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes('/works/OL110971W')) return Promise.resolve(jsonResponse(workFixture));
      if (url.includes('/authors/OL4327046A')) return Promise.resolve(jsonResponse(authorFixture));
      return Promise.resolve(jsonResponse({ error: 'notfound' }, 404));
    });

    const result = await getBookById('OL110971W');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      id: 'OL110971W',
      title: 'Ficciones',
      authors: ['Jorge Luis Borges'],
      coverUrl: 'https://covers.openlibrary.org/b/id/10832290-L.jpg',
      description: expect.stringContaining('labyrinth'),
      subjects: ['Argentine Short stories', 'Translations into English'],
    });
  });

  it('handles a plain-string description', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(workStringDescriptionFixture));

    const result = await getBookById('OL999W');

    expect(result.ok && result.data.description).toBe('Just a string, straight from the wire.');
  });

  it('defaults a missing description to null (defined, not undefined)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ key: '/works/OL1W', title: 'No Desc' }));

    const result = await getBookById('OL1W');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.description).toBeNull();
  });

  it('follows exactly one redirect hop (live data contains redirect stubs)', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes('/works/OL45883W')) return Promise.resolve(jsonResponse(redirectWorkFixture));
      if (url.includes('/works/OL45804W'))
        return Promise.resolve(jsonResponse({ key: '/works/OL45804W', title: 'Fantastic Mr Fox' }));
      return Promise.resolve(jsonResponse({ error: 'notfound' }, 404));
    });

    const result = await getBookById('OL45883W');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.title).toBe('Fantastic Mr Fox');
  });

  it('refuses a redirect chain rather than looping', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(redirectWorkFixture)));

    const result = await getBookById('OL45883W');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('malformed');
  });

  it('degrades to fewer author names when an author lookup fails, never failing the page', async () => {
    fetchMock.mockImplementation((url) => {
      if (url.includes('/works/')) return Promise.resolve(jsonResponse(workFixture));
      return Promise.resolve(jsonResponse({}, 500)); // author endpoint down
    });

    const result = await getBookById('OL110971W');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.authors).toEqual([]);
  });

  it('maps an unknown id to not_found', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'notfound' }, 404));

    const result = await getBookById('OL0W');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('not_found');
  });

  it('threads the abort signal through to fetch and re-throws on abort', async () => {
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const controller = new AbortController();

    const pending = getBookById('OL110971W', { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toThrow('Aborted');
  });
});
