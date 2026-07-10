import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, screen, userEvent } from '@testing-library/react-native';

import { getBookById } from '../../api/books';
import { err, ok } from '../../api/errors';
import { FlightProvider } from '../../animation/flightController';
import type { BookDetails } from '../../domain/book';
import type { RootStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/cartStore';
import BookDetailsScreen from '../BookDetailsScreen';

jest.mock('../../api/books', () => ({
  ...jest.requireActual('../../api/books'),
  getBookById: jest.fn(),
}));
const getBookByIdMock = getBookById as jest.MockedFunction<typeof getBookById>;

const details: BookDetails = {
  id: 'OL110971W',
  title: 'Ficciones',
  authors: ['Jorge Luis Borges'],
  coverUrl: 'https://covers.openlibrary.org/b/id/10832290-L.jpg',
  firstPublishYear: null,
  priceKobo: 250_000,
  rating: 4.3,
  description: 'Labyrinths all the way down.',
  subjects: ['Short stories'],
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Harness() {
  return (
    <FlightProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="BookDetails"
            component={BookDetailsScreen}
            initialParams={{ bookId: 'OL110971W', title: 'Ficciones' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </FlightProvider>
  );
}

beforeEach(() => {
  useCartStore.setState({ lines: [], hydrated: true });
});

describe('BookDetailsScreen', () => {
  it('shows a loading indicator, then the fetched book', async () => {
    let resolve!: (r: Awaited<ReturnType<typeof getBookById>>) => void;
    getBookByIdMock.mockReturnValue(new Promise((res) => (resolve = res)));

    await render(<Harness />);
    expect(screen.getByLabelText('Loading book details')).toBeOnTheScreen();

    resolve(ok(details));

    expect(await screen.findByText('Ficciones')).toBeOnTheScreen();
    expect(screen.getByText('Jorge Luis Borges')).toBeOnTheScreen();
    expect(screen.getByText('Labyrinths all the way down.')).toBeOnTheScreen();
    expect(screen.getByText('₦2,500')).toBeOnTheScreen();
    expect(screen.getByText('Short stories')).toBeOnTheScreen();
    expect(getBookByIdMock).toHaveBeenCalledWith('OL110971W', {
      signal: expect.any(AbortSignal),
    });
  });

  it('renders the error UI with a working retry that refetches', async () => {
    getBookByIdMock
      .mockResolvedValueOnce(err({ kind: 'server', status: 500, message: 'boom' }))
      .mockResolvedValueOnce(ok(details));
    const user = userEvent.setup();

    await render(<Harness />);
    expect(await screen.findByText(/went wrong on our side/i)).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Ficciones')).toBeOnTheScreen();
    expect(getBookByIdMock).toHaveBeenCalledTimes(2);
  });

  it('renders not_found distinctly (a 404 is not a 500)', async () => {
    getBookByIdMock.mockResolvedValue(err({ kind: 'not_found', message: 'gone' }));

    await render(<Harness />);

    expect(await screen.findByText(/book not found/i)).toBeOnTheScreen();
    expect(screen.queryByText(/went wrong on our side/i)).not.toBeOnTheScreen();
  });

  it('adds the book to the cart from the details screen', async () => {
    getBookByIdMock.mockResolvedValue(ok(details));
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(await screen.findByRole('button', { name: /add ficciones to cart/i }));

    expect(useCartStore.getState().lines).toEqual([
      { book: expect.objectContaining({ id: 'OL110971W' }), quantity: 1 },
    ]);
  });

  it('handles a book without a description or cover (defined fallbacks, no crash)', async () => {
    getBookByIdMock.mockResolvedValue(
      ok({ ...details, description: null, coverUrl: null, subjects: [], authors: [] }),
    );

    await render(<Harness />);

    expect(await screen.findAllByText('Ficciones')).not.toHaveLength(0);
    expect(screen.getByText('Unknown author')).toBeOnTheScreen();
  });
});
