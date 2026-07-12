import { cartItemCount, cartTotalKobo, useCartStore } from '../cartStore';
import type { Book } from '../../domain/book';

const book = (id: string, priceKobo: number): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Author'],
  coverUrl: null,
  firstPublishYear: 2000,
  priceKobo,
  rating: 4.0,
});

const ficciones = book('OL1W', 250_000);
const dune = book('OL2W', 199_900);

beforeEach(() => {
  useCartStore.setState({ lines: [], hydrated: true });
});

describe('cartStore', () => {
  it('adds a new book as a line with quantity 1', () => {
    useCartStore.getState().addBook(ficciones);

    expect(useCartStore.getState().lines).toEqual([{ book: ficciones, quantity: 1 }]);
  });

  it('adding a book already in the cart increments its quantity instead of duplicating', () => {
    useCartStore.getState().addBook(ficciones);
    useCartStore.getState().addBook(ficciones);

    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
  });

  it('preserves insertion order across adds', () => {
    useCartStore.getState().addBook(ficciones);
    useCartStore.getState().addBook(dune);
    useCartStore.getState().addBook(ficciones);

    expect(useCartStore.getState().lines.map((l) => l.book.id)).toEqual(['OL1W', 'OL2W']);
  });

  it('removes a line by book id', () => {
    useCartStore.getState().addBook(ficciones);
    useCartStore.getState().addBook(dune);

    useCartStore.getState().removeBook('OL1W');

    expect(useCartStore.getState().lines.map((l) => l.book.id)).toEqual(['OL2W']);
  });

  it('setQuantity updates the line', () => {
    useCartStore.getState().addBook(ficciones);

    useCartStore.getState().setQuantity('OL1W', 5);

    expect(useCartStore.getState().lines[0].quantity).toBe(5);
  });

  it('setQuantity to 0 removes the line (D21: decrement past 1 removes)', () => {
    useCartStore.getState().addBook(ficciones);

    useCartStore.getState().setQuantity('OL1W', 0);

    expect(useCartStore.getState().lines).toEqual([]);
  });

  it('clear empties the cart', () => {
    useCartStore.getState().addBook(ficciones);
    useCartStore.getState().addBook(dune);

    useCartStore.getState().clear();

    expect(useCartStore.getState().lines).toEqual([]);
  });
});

describe('derived totals (never stored)', () => {
  it('cartItemCount sums quantities across lines', () => {
    useCartStore.getState().addBook(ficciones);
    useCartStore.getState().addBook(dune);
    useCartStore.getState().setQuantity('OL2W', 3);

    expect(cartItemCount(useCartStore.getState().lines)).toBe(4);
  });

  it('cartTotalKobo is exact integer arithmetic: ₦1,999 × 3 + ₦2,500 = ₦8,497', () => {
    useCartStore.getState().addBook(dune); // 199_900
    useCartStore.getState().setQuantity('OL2W', 3);
    useCartStore.getState().addBook(ficciones); // 250_000

    expect(cartTotalKobo(useCartStore.getState().lines)).toBe(849_700);
  });

  it('an empty cart totals exactly 0 with 0 items', () => {
    expect(cartItemCount([])).toBe(0);
    expect(cartTotalKobo([])).toBe(0);
  });
});
