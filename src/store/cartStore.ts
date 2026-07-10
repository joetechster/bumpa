import { create } from 'zustand';

import type { Book } from '../domain/book';
import { lineTotalKobo, sumKobo } from '../domain/money';

export interface CartLine {
  book: Book;
  quantity: number;
}

export interface CartState {
  /** Insertion-ordered — the Cart screen renders this directly. */
  lines: CartLine[];
  /** False until AsyncStorage rehydration settles; the UI shows nothing
   *  cart-dependent as "empty" until this is true (no empty-cart flash). */
  hydrated: boolean;
  addBook: (book: Book) => void;
  removeBook: (bookId: string) => void;
  /** quantity <= 0 removes the line (D21, PROVISIONAL). */
  setQuantity: (bookId: string, quantity: number) => void;
  clear: () => void;
  /** Rehydration only — replaces the cart wholesale. See cartPersistence.ts. */
  replaceLines: (lines: CartLine[]) => void;
  markHydrated: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  hydrated: false,

  addBook: (book) =>
    set((state) => {
      const existing = state.lines.find((line) => line.book.id === book.id);
      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.book.id === book.id ? { ...line, quantity: line.quantity + 1 } : line,
          ),
        };
      }
      return { lines: [...state.lines, { book, quantity: 1 }] };
    }),

  removeBook: (bookId) =>
    set((state) => ({ lines: state.lines.filter((line) => line.book.id !== bookId) })),

  setQuantity: (bookId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return { lines: state.lines.filter((line) => line.book.id !== bookId) };
      }
      return {
        lines: state.lines.map((line) =>
          line.book.id === bookId ? { ...line, quantity } : line,
        ),
      };
    }),

  clear: () => set({ lines: [] }),

  replaceLines: (lines) => set({ lines }),
  markHydrated: () => set({ hydrated: true }),
}));

// Totals are DERIVED, never stored — these are the only two places in the app
// that compute them. Pure functions so the money tests hit them directly.
export function cartItemCount(lines: readonly CartLine[]): number {
  return lines.reduce((count, line) => count + line.quantity, 0);
}

export function cartTotalKobo(lines: readonly CartLine[]): number {
  return sumKobo(lines.map((line) => lineTotalKobo(line.book.priceKobo, line.quantity)));
}
