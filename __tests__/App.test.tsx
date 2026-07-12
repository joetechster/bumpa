import { render, screen, userEvent } from '@testing-library/react-native';

import App from '../App';
import { ok } from '../src/api/errors';
import type { Book } from '../src/domain/book';
import { useCartStore } from '../src/store/cartStore';

jest.mock('../src/api/books', () => ({
  ...jest.requireActual('../src/api/books'),
  searchBooks: jest.fn(),
  getBookById: jest.fn(),
}));

const { searchBooks } = jest.requireMock('../src/api/books') as {
  searchBooks: jest.Mock;
};

const ficciones: Book = {
  id: 'OL110971W',
  title: 'Ficciones',
  authors: ['Jorge Luis Borges'],
  coverUrl: null,
  firstPublishYear: 1945,
  priceKobo: 250_000,
  rating: 4.3,
};

beforeEach(() => {
  useCartStore.setState({ lines: [], hydrated: false });
  searchBooks.mockResolvedValue(
    ok({ books: [ficciones], numFound: 1, page: 1, hasMore: false }),
  );
});

describe('App', () => {
  it('boots to the Home screen and shows the default shelves', async () => {
    await render(<App />);

    expect(await screen.findByLabelText('Search books')).toBeOnTheScreen();
    // Several times over: every shelf holds the same mocked book, and each
    // no-cover placeholder shows the title alongside its title line.
    expect(await screen.findAllByText('Ficciones')).not.toHaveLength(0);
  });

  it('adds a book to the cart and navigates to the Cart screen via the header badge', async () => {
    const user = userEvent.setup();
    await render(<App />);

    // Every shelf holds the same mocked book, so there is an add button per
    // shelf. Tapping one must add exactly one copy.
    const [addButton] = await screen.findAllByRole('button', { name: /add ficciones to cart/i });
    await user.press(addButton);
    expect(useCartStore.getState().lines).toEqual([{ book: ficciones, quantity: 1 }]);

    await user.press(await screen.findByRole('button', { name: /open cart, 1 item/i }));

    expect(await screen.findByRole('button', { name: /proceed to checkout/i })).toBeOnTheScreen();
  });
});
