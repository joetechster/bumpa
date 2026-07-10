import { assertKobo, formatNaira, lineTotalKobo, sumKobo } from '../money';

// Money is the one place the assessment explicitly fears float drift. Every
// assertion here is EXACT equality — never toBeCloseTo.

describe('assertKobo', () => {
  it('accepts non-negative integers', () => {
    expect(assertKobo(0)).toBe(0);
    expect(assertKobo(599_700)).toBe(599_700);
  });

  it.each([19.99, -1, NaN, Infinity, 0.1 + 0.2])('rejects %p', (value) => {
    expect(() => assertKobo(value)).toThrow(TypeError);
  });
});

describe('lineTotalKobo', () => {
  it('computes price × quantity exactly in integer kobo', () => {
    // ₦1,999 × 3 — the 19.99 × 3 float classic, done right in minor units.
    expect(lineTotalKobo(199_900, 3)).toBe(599_700);
  });

  it('rejects float prices — the drift can never reach Paystack', () => {
    expect(() => lineTotalKobo(19.99 * 100 * 3, 1)).toThrow(TypeError); // 5997.000000000001
  });

  it('rejects fractional quantities', () => {
    expect(() => lineTotalKobo(199_900, 1.5)).toThrow(TypeError);
  });

  it('returns 0 for quantity 0', () => {
    expect(lineTotalKobo(199_900, 0)).toBe(0);
  });
});

describe('sumKobo', () => {
  it('sums exactly', () => {
    expect(sumKobo([599_700, 250_000, 1])).toBe(849_701);
  });

  it('sums an empty cart to exactly 0', () => {
    expect(sumKobo([])).toBe(0);
  });

  it('rejects any float member', () => {
    expect(() => sumKobo([100, 0.5])).toThrow(TypeError);
  });
});

describe('formatNaira', () => {
  it.each([
    [0, '₦0'],
    [100, '₦1'],
    [250_000, '₦2,500'],
    [1_200_000, '₦12,000'],
    [123_456_789_00, '₦123,456,789'],
    [250_050, '₦2,500.50'],
    [101, '₦1.01'],
  ])('formats %i kobo as %s', (kobo, expected) => {
    expect(formatNaira(kobo)).toBe(expected);
  });

  it('refuses float input', () => {
    expect(() => formatNaira(2500.5)).toThrow(TypeError);
  });
});
