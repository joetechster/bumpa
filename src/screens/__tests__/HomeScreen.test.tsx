import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { searchBooks } from '../../api/books';
import { err, ok } from '../../api/errors';
import { FlightProvider } from '../../animation/flightController';
import { HOME_SECTIONS, SEARCH_DEBOUNCE_MS } from '../../config/tuning';
import type { Book } from '../../domain/book';
import type { RootStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/cartStore';
import HomeScreen from '../HomeScreen';

jest.mock('../../api/books', () => ({
  ...jest.requireActual('../../api/books'),
  searchBooks: jest.fn(),
}));
const searchBooksMock = searchBooks as jest.MockedFunction<typeof searchBooks>;

const book = (id: string, title: string): Book => ({
  id,
  title,
  authors: ['Author'],
  coverUrl: null,
  firstPublishYear: null,
  priceKobo: 250_000,
  rating: 4.0,
});

const page = (books: Book[], hasMore = false) =>
  ok({ books, numFound: books.length, page: 1, hasMore });

const [FIRST_SHELF, SECOND_SHELF] = HOME_SECTIONS;

const Stack = createNativeStackNavigator<RootStackParamList>();

function DetailsProbe() {
  return <Text>details probe</Text>;
}

function Harness() {
  return (
    <FlightProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="BookDetails" component={DetailsProbe} />
        </Stack.Navigator>
      </NavigationContainer>
    </FlightProvider>
  );
}

/**
 * Home only shows the paged results list once the user has typed. Getting there
 * means crossing the search debounce, so these tests drive fake timers rather
 * than sleeping.
 */
async function search(term: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Search books'), term);
  await act(async () => {
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
  });
  return user;
}

beforeEach(() => {
  useCartStore.setState({ lines: [], hydrated: true });
});

describe('HomeScreen - browsing (no search term)', () => {
  it('renders a shelf per HOME_SECTIONS, each with its books', async () => {
    searchBooksMock.mockResolvedValue(page([book('OL1W', 'Ficciones')]));
    await render(<Harness />);

    expect(await screen.findByText(FIRST_SHELF.title)).toBeOnTheScreen();
    expect(await screen.findByText(SECOND_SHELF.title)).toBeOnTheScreen();
    // One cover per shelf, each fetched independently.
    expect(await screen.findAllByRole('button', { name: /ficciones, view details/i })).toHaveLength(
      HOME_SECTIONS.length,
    );
  });

  it('a failing shelf shows its own retry and leaves the other shelf standing', async () => {
    searchBooksMock.mockImplementation(async (query) =>
      query === FIRST_SHELF.query
        ? err({ kind: 'network', cause: 'offline', message: '' })
        : page([book('OL2W', 'Labyrinths')]),
    );
    await render(<Harness />);

    // The broken shelf degrades to an inline retry scoped to itself…
    expect(
      await screen.findByRole('button', { name: new RegExp(`retry ${FIRST_SHELF.title}`, 'i') }),
    ).toBeOnTheScreen();
    // …and the healthy one still rendered its books. Twice over: the title line
    // and the no-cover placeholder both show the title.
    expect(await screen.findAllByText('Labyrinths')).not.toHaveLength(0);
  });

  it('retrying a failed shelf refetches and shows its books', async () => {
    searchBooksMock
      .mockResolvedValueOnce(err({ kind: 'network', cause: 'offline', message: '' }))
      .mockResolvedValue(page([book('OL1W', 'Ficciones')]));
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(
      await screen.findByRole('button', { name: new RegExp(`retry ${FIRST_SHELF.title}`, 'i') }),
    );

    expect(await screen.findAllByRole('button', { name: /ficciones, view details/i })).toHaveLength(
      HOME_SECTIONS.length,
    );
  });

  it('adds to cart from a shelf cover: the store updates on tap', async () => {
    searchBooksMock.mockResolvedValue(page([book('OL1W', 'Ficciones')]));
    const user = userEvent.setup();
    await render(<Harness />);

    // Both shelves hold the same mocked book; tapping either must add it once.
    const [addButton] = await screen.findAllByRole('button', {
      name: /add ficciones to cart/i,
    });
    await user.press(addButton);

    expect(useCartStore.getState().lines).toEqual([
      { book: expect.objectContaining({ id: 'OL1W' }), quantity: 1 },
    ]);
  });

  it('opens the details screen when a shelf cover is pressed', async () => {
    searchBooksMock.mockResolvedValue(page([book('OL1W', 'Ficciones')]));
    const user = userEvent.setup();
    await render(<Harness />);

    const [cover] = await screen.findAllByRole('button', { name: /ficciones, view details/i });
    await user.press(cover);

    expect(await screen.findByText('details probe')).toBeOnTheScreen();
  });
});

describe('HomeScreen - searching', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('swaps the shelves for the paged results list once a term is typed', async () => {
    searchBooksMock.mockResolvedValue(page([book('OL1W', 'Ficciones')]));
    await render(<Harness />);
    await search('borges');

    // The shelf headings are gone - the list has taken over the body…
    expect(screen.queryByText(FIRST_SHELF.title)).not.toBeOnTheScreen();
    // …and the results render as BookCards (one add button, not one per shelf).
    expect(await screen.findAllByRole('button', { name: /add ficciones to cart/i })).toHaveLength(
      1,
    );
  });

  it('shows the EMPTY state for zero results - visibly distinct from an error', async () => {
    searchBooksMock.mockResolvedValue(page([]));
    await render(<Harness />);
    await search('nothing here');

    expect(await screen.findByText(/no books found/i)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeOnTheScreen();
  });

  it('shows the error state with retry when the first page fails', async () => {
    // Keyed by query, not call order: the shelves fetch too, and a bare
    // mockResolvedValueOnce would be eaten by whichever shelf fired first.
    let searchAttempts = 0;
    searchBooksMock.mockImplementation(async (q) => {
      if (q !== 'borges') return page([book('OLSW', 'Shelf book')]);
      searchAttempts += 1;
      return searchAttempts === 1
        ? err({ kind: 'network', cause: 'offline', message: '' })
        : page([book('OL1W', 'Ficciones')]);
    });
    await render(<Harness />);
    const user = await search('borges');

    expect(await screen.findByText(/you appear to be offline/i)).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findAllByText('Ficciones')).not.toHaveLength(0);
  });
});
