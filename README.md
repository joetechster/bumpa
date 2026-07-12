# The Book Nook 📚

A React Native bookstore app built for the Bumpa Mobile Engineer assessment. Browse and search
real books from Open Library, add them to a cart with a flying-cover animation, and check out
with Paystack (test mode)



## Features

- **Browse & search** - debounced search over the Open Library catalogue with infinite-scroll
  pagination; in-flight requests are aborted the moment the query changes.
- **Book details** - cover, authors, description, subjects; fetched by a hand-rolled lifecycle
  hook (see below).
- **Cart** - add/remove/quantity-step, insertion-ordered, totals always derived (never stored),
  persisted to AsyncStorage with a rehydration guard so a cold start never flashes an empty cart.
- **Flying add-to-cart animation** - the tapped cover lifts off, arcs to the cart icon on the
  UI thread, and the badge increments on landing. Feature-flagged (`FEATURE_FLYING_CART`),
  interruption-safe under rapid taps, and respects OS reduced-motion.
- **Paystack checkout (test mode)** - order summary → email → Paystack popup → distinct
  success / cancelled / failed outcomes. The cart clears **only** on success.
- **Typed error taxonomy** - network, rate-limit (429), not-found, server, malformed; a 429
  renders different UI from a 500, and empty search results are a success state, never an error.

## Setup

```bash
npm install
cp .env.example .env    
npx expo start    
```

Paystack **test cards** (test mode only - no real money):

| Outcome | Card | Extras |
|---|---|---|
| Success | `4084 0840 8408 4081` | CVV `408`, any future expiry, PIN `0000`, OTP `123456` |
| Declined | `4084 0840 8408 4040` | - |

Prices and ratings are synthesised deterministically from each book's Open Library ID (the API
has no price data): same book, same price, every time - integer kobo from birth.

## Tests

```bash
npm test               
npm test -- --coverage
```

Coverage gates are wired into `jest.config.js`: **90% statements / 85% branches globally**, and
**100% pinned on `domain/money`, `domain/price`, and `store/cartStore`** 

Suite conventions: no snapshot tests; queries by accessible role/label first; fake timers for all
debounce/animation timing; **any unexpected `console.error`/`console.warn` fails the test**,
which is what catches lifecycle leaks like state-updates-after-unmount. The full suite also
passes with `FEATURE_FLYING_CART = false`.

## Technical choices

**State management - Zustand.** The cart is small but hot: every list row can add to it and the
header badge subscribes to it. Zustand's selector subscriptions mean a cart change re-renders the
badge, not every mounted screen, and the store is a plain object testable without rendering
anything. Redux Toolkit would be ceremony at this scale; bare Context re-renders every consumer
on every change unless you split and memoise by hand. Persistence is deliberately hand-rolled
(~60 lines, `src/store/cartPersistence.ts`) instead of `zustand/persist`, so the graded
mechanics - the rehydration guard, the corrupted-value fallback, the don't-write-before-hydration
ordering - are visible and individually tested.

**Navigation - React Navigation (native-stack).** Three-and-a-half screens don't need file-based
routing. Explicit stack wiring keeps the navigator in one readable file, types the route params
(`RootStackParamList`), and - decisive here - makes it trivial to mount the animation overlay as
a *sibling* of the navigator so flying covers are never clipped by a screen or list boundary.

**Animation - Reanimated 4.** The brief demands 60fps on mid-range Android, which means no JS
thread in the frame loop. Each ghost is driven by a single linear `withTiming` progress value;
translate/scale/opacity are derived per-frame inside one worklet (x eases out, y eases in - that
asymmetry is the arc). `runOnJS` appears exactly once, in the terminal callback, to unmount the
landed ghost. Every tunable lives in `src/animation/animation.constants.ts`.

**Pagination - infinite scroll.** `onEndReached` is the native idiom for a mobile catalogue. One
reducer owns query + page + results so a query change resets paging atomically; pages append with
id-dedup (Open Library rankings shift between fetches, and FlatList keys must be unique);
double-fired `onEndReached` is a no-op by construction. The safe FlatList settings are applied
(`keyExtractor`, `getItemLayout` on genuinely fixed-height rows, `initialNumToRender`); anything
that would need a device profile to defend was withheld. **Measured on device: not yet.**

