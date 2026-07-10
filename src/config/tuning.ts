// Every non-animation "guess" lives here as a named constant so it can be
// tuned on a device without reading logic. Animation constants live in
// src/animation/animation.constants.ts.

/** Pause after the last keystroke before a search fires. */
export const SEARCH_DEBOUNCE_MS = 400;

/** What the Home screen shows before the user types anything. */
export const DEFAULT_BROWSE_QUERY = 'bestseller';

/** FlatList: items rendered in the first paint of the Home list. */
export const LIST_INITIAL_NUM_TO_RENDER = 8;
