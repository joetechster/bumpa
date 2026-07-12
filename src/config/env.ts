// EXPO_PUBLIC_* vars are statically inlined by Expo at bundle time.
// Missing key is tolerated everywhere except checkout, which surfaces it
// explicitly (Phase 6) rather than failing silently.
export const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_KEY ?? '';
