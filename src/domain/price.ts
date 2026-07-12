// D2: neither book API returns reliable prices or ratings, so both are
// synthesised deterministically from the stable Open Library work ID. The same
// book always gets the same price and rating, on every device, with no network.
//
// Note (QUESTIONS.md Q1): Open Library exposes a sparse real `ratings_average`;
// switching to "real rating where present, hash fallback" is a one-line change
// here if the user prefers it.

export const PRICE_MIN_KOBO = 250_000; // ₦2,500
export const PRICE_STEP_KOBO = 10_000; // ₦100 steps
export const PRICE_STEPS = 96; // → max ₦12,000
export const RATING_MIN = 3.0;
export const RATING_STEPS = 21; // 3.0..5.0 in 0.1 steps

// FNV-1a: tiny, dependency-free, stable across platforms.
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Integer kobo, always. ₦2,500–₦12,000 in ₦100 steps. */
export function priceKoboForBook(bookId: string): number {
  return PRICE_MIN_KOBO + (fnv1a(bookId) % PRICE_STEPS) * PRICE_STEP_KOBO;
}

/** 3.0–5.0 in 0.1 steps. Uses different hash bits than the price. */
export function ratingForBook(bookId: string): number {
  const bits = fnv1a(bookId) >>> 8;
  return Math.round((RATING_MIN + (bits % RATING_STEPS) / 10) * 10) / 10;
}
