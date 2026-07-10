import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CART_STORAGE_KEY,
  parseStoredCart,
  rehydrateCart,
  startCartPersistence,
} from '../cartPersistence';
import { CartLine, useCartStore } from '../cartStore';
import type { Book } from '../../domain/book';

const book: Book = {
  id: 'OL1W',
  title: 'Ficciones',
  authors: ['Borges'],
  coverUrl: null,
  firstPublishYear: 1945,
  priceKobo: 250_000,
  rating: 4.3,
};
const storedLines: CartLine[] = [{ book, quantity: 2 }];

beforeEach(async () => {
  useCartStore.setState({ lines: [], hydrated: false });
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('parseStoredCart', () => {
  it('parses a valid stored cart', () => {
    expect(parseStoredCart(JSON.stringify(storedLines))).toEqual(storedLines);
  });

  it('returns null for an ABSENT value (first launch)', () => {
    expect(parseStoredCart(null)).toBeNull();
  });

  it.each([
    ['not JSON at all', '{{{corrupted'],
    ['a JSON object, not an array', '{"lines": []}'],
    ['a line missing its book', JSON.stringify([{ quantity: 2 }])],
    ['a float quantity', JSON.stringify([{ book, quantity: 1.5 }])],
    ['a zero quantity', JSON.stringify([{ book, quantity: 0 }])],
    ['a float price (would poison checkout)', JSON.stringify([{ book: { ...book, priceKobo: 19.99 }, quantity: 1 }])],
  ])('returns null for a CORRUPTED value: %s', (_label, raw) => {
    expect(parseStoredCart(raw)).toBeNull();
  });
});

describe('rehydrateCart', () => {
  it('restores stored lines and marks the store hydrated', async () => {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(storedLines));

    await rehydrateCart(useCartStore);

    expect(useCartStore.getState().lines).toEqual(storedLines);
    expect(useCartStore.getState().hydrated).toBe(true);
  });

  it('marks hydrated with an empty cart when nothing is stored', async () => {
    await rehydrateCart(useCartStore);

    expect(useCartStore.getState().lines).toEqual([]);
    expect(useCartStore.getState().hydrated).toBe(true);
  });

  it('degrades a corrupted stored value to an empty cart, never a crash', async () => {
    await AsyncStorage.setItem(CART_STORAGE_KEY, '{{{corrupted');

    await rehydrateCart(useCartStore);

    expect(useCartStore.getState().lines).toEqual([]);
    expect(useCartStore.getState().hydrated).toBe(true);
  });

  it('still marks hydrated when AsyncStorage itself rejects', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk on fire'));

    await rehydrateCart(useCartStore);

    expect(useCartStore.getState().hydrated).toBe(true);
  });
});

describe('startCartPersistence', () => {
  it('does NOT write before hydration (would clobber the stored cart)', () => {
    const stop = startCartPersistence(useCartStore);

    useCartStore.getState().addBook(book); // hydrated is still false

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    stop();
  });

  it('writes every cart change after hydration', async () => {
    const stop = startCartPersistence(useCartStore);
    await rehydrateCart(useCartStore);

    useCartStore.getState().addBook(book);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      CART_STORAGE_KEY,
      JSON.stringify([{ book, quantity: 1 }]),
    );
    stop();
  });

  it('stops writing after unsubscribe', async () => {
    const stop = startCartPersistence(useCartStore);
    await rehydrateCart(useCartStore);
    stop();

    useCartStore.getState().addBook(book);

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('round-trips: what persistence writes, rehydration restores', async () => {
    const stop = startCartPersistence(useCartStore);
    await rehydrateCart(useCartStore);
    useCartStore.getState().addBook(book);
    useCartStore.getState().setQuantity(book.id, 3);
    stop();

    // Simulate a cold start.
    useCartStore.setState({ lines: [], hydrated: false });
    await rehydrateCart(useCartStore);

    expect(useCartStore.getState().lines).toEqual([{ book, quantity: 3 }]);
  });
});
