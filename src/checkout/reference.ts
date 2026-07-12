/**
 * Client-side transaction reference. Requirements (paystack-checkout skill):
 * unique across consecutive checkouts - NEVER derived from cart contents,
 * because buying the same cart twice must not collide. Timestamp + random
 * suffix; a fresh reference is generated per payment attempt (a failed
 * attempt's reference is spent on Paystack's side).
 */
export function makeTransactionReference(now: () => number = Date.now): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `bn_${now()}_${random}`;
}
