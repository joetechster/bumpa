import {
  PRICE_MIN_KOBO,
  PRICE_STEP_KOBO,
  PRICE_STEPS,
  priceKoboForBook,
  ratingForBook,
} from '../price';

const SAMPLE_IDS = ['OL110971W', 'OL59681W', 'OL1960472W', 'OL45804W', 'OL999W', 'OLabcW'];

describe('priceKoboForBook', () => {
  it('is deterministic: same id, same price, every time', () => {
    for (const id of SAMPLE_IDS) {
      expect(priceKoboForBook(id)).toBe(priceKoboForBook(id));
    }
  });

  it('always returns an integer number of kobo inside the ruled band, on ₦100 steps', () => {
    for (const id of SAMPLE_IDS) {
      const price = priceKoboForBook(id);
      expect(Number.isSafeInteger(price)).toBe(true);
      expect(price).toBeGreaterThanOrEqual(PRICE_MIN_KOBO);
      expect(price).toBeLessThanOrEqual(PRICE_MIN_KOBO + (PRICE_STEPS - 1) * PRICE_STEP_KOBO);
      expect((price - PRICE_MIN_KOBO) % PRICE_STEP_KOBO).toBe(0);
    }
  });

  it('spreads prices across ids (not everything collapses to one value)', () => {
    const prices = new Set(SAMPLE_IDS.map(priceKoboForBook));
    expect(prices.size).toBeGreaterThan(1);
  });
});

describe('ratingForBook', () => {
  it('is deterministic and stays within 3.0–5.0 in 0.1 steps', () => {
    for (const id of SAMPLE_IDS) {
      const rating = ratingForBook(id);
      expect(rating).toBe(ratingForBook(id));
      expect(rating).toBeGreaterThanOrEqual(3.0);
      expect(rating).toBeLessThanOrEqual(5.0);
      expect(Math.round(rating * 10)).toBeCloseTo(rating * 10, 10);
    }
  });
});
