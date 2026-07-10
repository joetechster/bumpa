import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { searchBooks } from '../../api/books';
import { err, ok } from '../../api/errors';
import { FlightProvider } from '../../animation/flightController';
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

beforeEach(() => {
  useCartStore.setState({ lines: [], hydrated: true });
});

describe('HomeScreen', () => {
  it('renders the default shelf on mount', async () => {
    searchBooksMock.mockResolvedValue(page([book('OL1W', 'Ficciones')]));
    await render(<Harness />);

    expect(await screen.findAllByText('Ficciones')).not.toHaveLength(0);
  });

  it('shows the EMPTY state for zero results — visibly distinct from an error', async () => {
    searchBooksMock.mockResolvedValue(page([]));
    await render(<Harness />);

    expect(await screen.findByText(/no books found/i)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeOnTheScreen();
  });

  it('shows the error state with retry when the first page fails', async () => {
    searchBooksMock
      .mockResolvedValueOnce(err({ kind: 'network', cause: 'offline', message: '' }))
      .mockResolvedValueOnce(page([book('OL1W', 'Ficciones')]));
    const user = userEvent.setup();
    await render(<Harness />);

    expect(await screen.findByText(/you appear to be offline/i)).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findAllByText('Ficciones')).not.toHaveLength(0);
  });

  it('adds to cart from a card: the store updates on tap', async () => {
    searchBooksMock.mockResolvedValue(page([book('OL1W', 'Ficciones')]));
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(await screen.findByRole('button', { name: /add ficciones to cart/i }));

    expect(useCartStore.getState().lines).toEqual([
      { book: expect.objectContaining({ id: 'OL1W' }), quantity: 1 },
    ]);
  });

  it('opens the details screen when a card is pressed', async () => {
    searchBooksMock.mockResolvedValue(page([book('OL1W', 'Ficciones')]));
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(await screen.findByRole('button', { name: /ficciones, view details/i }));

    expect(await screen.findByText('details probe')).toBeOnTheScreen();
  });
});
