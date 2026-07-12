// Every non-animation "guess" lives here as a named constant so it can be
// tuned on a device without reading logic. Animation constants live in
// src/animation/animation.constants.ts.

/** Pause after the last keystroke before a search fires. */
export const SEARCH_DEBOUNCE_MS = 400;

/** What the Home screen shows before the user types anything. */
export const DEFAULT_BROWSE_QUERY = 'bestseller';

/** FlatList: items rendered in the first paint of the Home list. */
export const LIST_INITIAL_NUM_TO_RENDER = 8;

/**
 * The shelves on the browsing (not-searching) Home screen. Each is an
 * independent Open Library query with its own loading/error/retry state - one
 * shelf failing must not take the other down, which matters because two cold-
 * start requests make a 429 from Open Library more likely, not less.
 *
 * Data-driven so a shelf can be added or renamed without touching HomeScreen.
 */
export const HOME_SECTIONS: readonly { title: string; query: string }[] = [
  { title: 'Bestsellers', query: DEFAULT_BROWSE_QUERY },
  { title: 'Modern classics', query: 'modern classics' },
];

/** Books shown per shelf. A rail is a taste, not a catalogue - the search list is the catalogue. */
export const RAIL_SIZE = 10;
