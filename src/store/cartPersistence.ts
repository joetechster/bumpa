import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CartLine, CartState } from './cartStore';
import type { Book } from '../domain/book';

export const CART_STORAGE_KEY = 'booknook/cart/v1';

type BoundStore = {
  getState: () => CartState;
  subscribe: (listener: (state: CartState, prev: CartState) => void) => () => void;
};

function isBook(x: unknown): x is Book {
  if (typeof x !== 'object' || x === null) return false;
  const b = x as Book;
  return (
    typeof b.id === 'string' &&
    typeof b.title === 'string' &&
    Array.isArray(b.authors) &&
    (b.coverUrl === null || typeof b.coverUrl === 'string') &&
    Number.isSafeInteger(b.priceKobo) &&
    b.priceKobo >= 0
  );
}

function isCartLine(x: unknown): x is CartLine {
  if (typeof x !== 'object' || x === null) return false;
  const line = x as CartLine;
  return isBook(line.book) && Number.isSafeInteger(line.quantity) && line.quantity > 0;
}

export function parseStoredCart(raw: string | null): CartLine[] | null {
  if (raw === null) return null; // absent - first launch, not an error
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isCartLine)) return null;
    return parsed;
  } catch {
    return null; // corrupted - start empty rather than crash
  }
}

/**
 * Rehydrate once at startup. The UI treats `hydrated === false` as "don't
 * know yet" so a stored cart never flashes as empty on cold start. A
 * corrupted or absent value degrades to an empty cart, never a crash.
 */
export async function rehydrateCart(store: BoundStore): Promise<void> {
  let stored: CartLine[] | null = null;
  try {
    stored = parseStoredCart(await AsyncStorage.getItem(CART_STORAGE_KEY));
  } catch {
    stored = null; // storage itself failed - same degradation
  }
  if (stored !== null && stored.length > 0) {
    store.getState().replaceLines(stored);
  }
  store.getState().markHydrated();
}

/**
 * Persist every cart change AFTER hydration. Writing before hydration would
 * clobber the stored cart with the initial empty state - that ordering is the
 * bug the `hydrated` flag exists to prevent.
 */
export function startCartPersistence(store: BoundStore): () => void {
  return store.subscribe((state, prev) => {
    if (!state.hydrated) return;
    if (state.lines === prev.lines) return;
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.lines)).catch(() => {
      // A failed write means persistence degrades to in-memory; nothing to
      // surface mid-session, and the next change retries anyway.
    });
  });
}
