// All money in this app is INTEGER KOBO from the moment it enters the domain
// model (prices are synthesised as integers - see price.ts). There is no float
// arithmetic to round anywhere; these helpers enforce that invariant loudly.

export function assertKobo(value: number, label = 'amount'): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative integer number of kobo, got ${value}`);
  }
  return value;
}

/** Price × quantity for one cart line. */
export function lineTotalKobo(priceKobo: number, quantity: number): number {
  assertKobo(priceKobo, 'priceKobo');
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new TypeError(`quantity must be a non-negative integer, got ${quantity}`);
  }
  return priceKobo * quantity;
}

export function sumKobo(amounts: readonly number[]): number {
  return amounts.reduce<number>((total, a) => total + assertKobo(a), 0);
}

/**
 * Conversion for the Paystack wrapper (react-native-paystack-webview v5),
 * whose `amount` is in MAJOR units - verified in its source, which multiplies
 * by 100 before handing to InlineJS (production/lib/utils.js). We only ever
 * pass whole-naira integers so that internal ×100 cannot drift; every price
 * this app synthesises is a multiple of ₦100, so the guard never fires in
 * practice - it exists to catch a future price source violating the invariant.
 */
export function koboToWholeNairaForPaystack(kobo: number): number {
  assertKobo(kobo, 'kobo');
  if (kobo % 100 !== 0) {
    throw new TypeError(
      `Paystack amount must be whole naira; got ${kobo} kobo which has a fractional naira part`,
    );
  }
  return kobo / 100;
}

/**
 * "₦2,500" for whole-naira amounts, "₦2,500.50" when kobo are present.
 * Manual formatting - Hermes Intl.NumberFormat support varies by platform and
 * a wrong symbol on device would be invisible from this sandbox.
 */
export function formatNaira(kobo: number): string {
  assertKobo(kobo, 'kobo');
  const naira = Math.floor(kobo / 100);
  const remainder = kobo % 100;
  const grouped = String(naira).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return remainder === 0 ? `₦${grouped}` : `₦${grouped}.${String(remainder).padStart(2, '0')}`;
}
