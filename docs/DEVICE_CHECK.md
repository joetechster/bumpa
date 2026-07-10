# Device Check

One list, worst blast radius first. Each item: yes/no question, expected answer, the UNVERIFIED id
it tests, and the file/constant to change if it fails.

## Setup preamble (once)

```bash
git clone <repo> && cd bumpa
git checkout claude/new-session-atqnc2
npm install
cp .env.example .env   # paste your pk_test_ Paystack key
npx expo start         # scan QR with Expo Go
```

Paystack test cards (test mode only):
- Success: `4084 0840 8408 4081`, CVV `408`, any future expiry, PIN `0000`, OTP `123456`
- Declined: `4084 0840 8408 4040`

## Blocking

1. **[U1]** Does the app boot to the Home screen in Expo Go with no red screen? Expected: yes.
   If no: capture the red-screen text; first suspect is Reanimated/worklets babel wiring (U2) —
   fix by adding a `babel.config.js` with `presets: ['babel-preset-expo']` and rebuilding cache
   (`npx expo start -c`).
2. **[U5]** Does the Home list show real books with covers, and does scrolling to the bottom
   append page 2 (spinner in the footer, list grows, no duplicate rows)? Expected: yes.
   Files: `src/hooks/useBookSearch.ts`; page size constant in `src/api/books.ts`.
3. **[U8]** Full checkout: add 2+ books → Cart → Checkout → enter any email → "Pay with
   Paystack" → popup opens → success test card `4084 0840 8408 4081` (CVV 408, PIN 0000, OTP
   123456). Expected: popup closes, "Payment successful" screen with a `bn_…` reference, cart
   empty, badge gone. File: `src/screens/CheckoutScreen.tsx`.
4. **[U9]** In the Paystack test dashboard, does the transaction amount equal the cart total you
   saw on screen, to the kobo? Expected: yes, exactly. File: `src/domain/money.ts`
   (`koboToWholeNairaForPaystack` — the wrapper multiplies by 100; verified in its source).
5. **[U10]** Open the popup, then back out WITHOUT paying (Android back button / close). Expected:
   "Payment cancelled — your cart is untouched", cart still full, NO red "Payment failed" screen.
   Repeat on both platforms if you can — this is the known Android/iOS WebView divergence spot.
   File: `src/screens/CheckoutScreen.tsx`.
6. **[U10]** Same flow with the declined test card `4084 0840 8408 4040`. Expected: "Payment
   failed" with a working "Try again" that returns to the form, cart intact.
7. **[U7]** Add items, force-kill the app, relaunch. Expected: cart contents identical, badge
   correct, and no flash of "Your cart is empty" while it loads.
   File: `src/store/cartPersistence.ts`.
8. **[U3]** Navigate Home → book details → back, Home → cart (header icon) → back. Expected: no
   crash, back always returns where you came from. File: `src/navigation/RootNavigator.tsx`.

## Should fix

9. **[U11]** Kill the app while the Paystack popup is open, relaunch. Expected: app opens
   normally, cart intact, checkout form is back to its idle state (never stuck on
   "Opening Paystack…"). File: `src/screens/CheckoutScreen.tsx`.
10. **[U12]** Delete `.env`, restart with cache clear, open Checkout. Expected: a friendly
    "Checkout is not configured" message, not a crash. File: `src/screens/CheckoutScreen.tsx`.
11. **[U6]** Do most books show real covers (not the grey title placeholder)? Expected: yes for
    popular books. File: `src/domain/book.ts` (`coverUrlFromId` size suffix).

**Animation (all survivable: set `FEATURE_FLYING_CART = false` in `src/config/featureFlags.ts` and ship without them):**

14. **[U13]** Tap "Add to cart" on a book with a cover. Does a ghost cover lift off from THAT
    card's cover and land on the header cart icon? Expected: yes. If the rects look wrong, set
    `DEBUG_ANIM_RECTS = true` (same file as the flag) — red border = measured source, green =
    target — and send a screenshot.
15. **[U13]** Badge count increments when the ghost ARRIVES, not when you tap. Expected: yes
    (the cart screen itself is correct immediately either way — check by opening the cart fast).
16. **[U14]** Ten rapid adds in ~2 seconds: all ghosts fly and overlap, none freeze, count ends
    exactly 10, no crash. Expected: yes. Tuning: `FLIGHT_DURATION_MS` in
    `src/animation/animation.constants.ts`.
17. **[U13]** Tap add, then IMMEDIATELY navigate (tap the book, or back). Expected: ghost
    completes above the new screen or vanishes cleanly; no crash, no stuck overlay blocking taps,
    cart count correct.
18. **[U14]** With Dev Menu → Perf Monitor open, do items 14–16 on Android. Expected: UI thread
    stays ~60fps; JS thread dips don't stutter the ghost. One-line fix if not:
    `FLIGHT_DURATION_MS` down to ~400.
19. Enable "Reduce Motion" in OS accessibility settings (iOS: Settings → Accessibility → Motion;
    Android: Remove animations). Add a book. Expected: NO ghost, badge updates instantly.
20. **[U17]** Does the badge do a quick pop (scale bounce) as the ghost lands? Expected: yes.
    Tuning: `BADGE_POP_SCALE` / `BADGE_POP_LEG_MS`.
21. **[U15]** Does the flight path read as a natural arc rather than a straight line? Subjective —
    tune `GHOST_X_EASE_EXPONENT` / `GHOST_Y_EASE_EXPONENT` (2 = quadratic; higher = sharper).

## Cosmetic

12. **[U4]** On a notched device, is the header clear of the status bar? Expected: yes.
    File: `App.tsx` / `src/theme/theme.ts`.
13. Layout/visual hierarchy pass: card spacing, text truncation on long titles (BookCard clamps
    at 2 lines), price alignment. Files: `src/components/*.tsx` styles.
