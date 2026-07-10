# The Book Nook 📚

A React Native bookstore app built for the Bumpa Mobile Engineer assessment. Browse and search
real books from Open Library, add them to a cart with a flying-cover animation, and check out
with Paystack (test mode) — all running in stock **Expo Go**.

> **A note on process:** this app was built in a cloud sandbox with no device or simulator, so
> every claim in this README is scoped to what was machine-verifiable (tests, types, lint,
> `expo-doctor`). Anything that needs eyes or a device is catalogued in
> [`docs/DEVICE_CHECK.md`](docs/DEVICE_CHECK.md) — worst blast radius first — and
> [`docs/UNVERIFIED.md`](docs/UNVERIFIED.md). An add-to-cart GIF belongs here and is pending the
> first device run.

## Features

- **Browse & search** — debounced search over the Open Library catalogue with infinite-scroll
  pagination; in-flight requests are aborted the moment the query changes.
- **Book details** — cover, authors, description, subjects; fetched by a hand-rolled lifecycle
  hook (see below).
- **Cart** — add/remove/quantity-step, insertion-ordered, totals always derived (never stored),
  persisted to AsyncStorage with a rehydration guard so a cold start never flashes an empty cart.
- **Flying add-to-cart animation** — the tapped cover lifts off, arcs to the cart icon on the
  UI thread, and the badge increments on landing. Feature-flagged (`FEATURE_FLYING_CART`),
  interruption-safe under rapid taps, and respects OS reduced-motion.
- **Paystack checkout (test mode)** — order summary → email → Paystack popup → distinct
  success / cancelled / failed outcomes. The cart clears **only** on success.
- **Typed error taxonomy** — network, rate-limit (429), not-found, server, malformed; a 429
  renders different UI from a 500, and empty search results are a success state, never an error.

## Setup

```bash
npm install
cp .env.example .env        # paste your pk_test_… key from the Paystack dashboard
npx expo start              # scan the QR with Expo Go
```

Paystack **test cards** (test mode only — no real money):

| Outcome | Card | Extras |
|---|---|---|
| Success | `4084 0840 8408 4081` | CVV `408`, any future expiry, PIN `0000`, OTP `123456` |
| Declined | `4084 0840 8408 4040` | — |

Prices and ratings are synthesised deterministically from each book's Open Library ID (the API
has no price data): same book, same price, every time — integer kobo from birth.

## Tests

```bash
npm test                # 161 tests, fully offline, deterministic
npm test -- --coverage
```

Coverage gates are wired into `jest.config.js`: **90% statements / 85% branches globally**, and
**100% pinned on `domain/money`, `domain/price`, and `store/cartStore`** — the modules where a
silent gap becomes a wrong charge. Actual coverage at submission is ≈96/89/95/97. It is not 100%
globally on purpose: the remainder is visual glue whose failure modes only exist on a device, and
tests written to chase a number assert nothing.

Suite conventions: no snapshot tests; queries by accessible role/label first; fake timers for all
debounce/animation timing; **any unexpected `console.error`/`console.warn` fails the test** —
which is what catches lifecycle leaks like state-updates-after-unmount. The full suite also
passes with `FEATURE_FLYING_CART = false`.

## Technical choices

**State management — Zustand.** The cart is small but hot: every list row can add to it and the
header badge subscribes to it. Zustand's selector subscriptions mean a cart change re-renders the
badge, not every mounted screen, and the store is a plain object testable without rendering
anything. Redux Toolkit would be ceremony at this scale; bare Context re-renders every consumer
on every change unless you split and memoise by hand. Persistence is deliberately hand-rolled
(~60 lines, `src/store/cartPersistence.ts`) instead of `zustand/persist`, so the graded
mechanics — the rehydration guard, the corrupted-value fallback, the don't-write-before-hydration
ordering — are visible and individually tested.

**Navigation — React Navigation (native-stack).** Three-and-a-half screens don't need file-based
routing. Explicit stack wiring keeps the navigator in one readable file, types the route params
(`RootStackParamList`), and — decisive here — makes it trivial to mount the animation overlay as
a *sibling* of the navigator so flying covers are never clipped by a screen or list boundary.

**Animation — Reanimated 4.** The brief demands 60fps on mid-range Android, which means no JS
thread in the frame loop. Each ghost is driven by a single linear `withTiming` progress value;
translate/scale/opacity are derived per-frame inside one worklet (x eases out, y eases in — that
asymmetry is the arc). `runOnJS` appears exactly once, in the terminal callback, to unmount the
landed ghost. Every tunable lives in `src/animation/animation.constants.ts`.

**Pagination — infinite scroll.** `onEndReached` is the native idiom for a mobile catalogue. One
reducer owns query + page + results so a query change resets paging atomically; pages append with
id-dedup (Open Library rankings shift between fetches, and FlatList keys must be unique);
double-fired `onEndReached` is a no-op by construction. The safe FlatList settings are applied
(`keyExtractor`, `getItemLayout` on genuinely fixed-height rows, `initialNumToRender`); anything
that would need a device profile to defend was withheld — see `docs/PERFORMANCE.md`, which
includes the profiling script and says plainly: **measured on device: not yet.**

## Data fetching is hand-rolled, deliberately

The brief grades `useEffect` lifecycle handling, so the mechanics are in the source, not a
library: `src/hooks/useFetch.ts` is a `useReducer` state machine (`idle | loading | success |
error` — impossible states unrepresentable) with an `AbortController` created per effect run and
aborted in cleanup, a race guard that drops stale responses when the book id changes mid-flight,
and a `retry()` that re-runs the effect. In production I would reach for TanStack Query instead,
and it's worth naming exactly what that buys: request caching and deduplication, background
refetch and stale-while-revalidate, retries with backoff, mutation invalidation, and offline
awareness. None of that is reimplemented here — the point of this codebase is to show the
lifecycle plumbing TanStack Query would otherwise hide.

## Known limitations

1. **No server-side payment verification — the big one.** A correct Paystack integration
   verifies every transaction from a backend (`GET /transaction/verify/:reference` with the
   secret key). This app has no backend, so it trusts the client-side `onSuccess` callback. That
   is fine for a test-mode assessment and **not production-safe**: a modified client could fake
   a success. The fix is a small server endpoint and is the first thing I'd add.
2. **Synthetic prices/ratings.** Open Library has no commerce data; values are deterministic
   hashes of the work ID (`src/domain/price.ts`). Real ratings exist sparsely upstream
   (`ratings_average`) and could replace the hash where present — one-line change, noted in
   `docs/QUESTIONS.md`.
3. **Client-trusted amounts.** The charge amount comes from the client for the same
   no-backend reason. The wrapper's `amount` unit was verified against its installed source
   (v5.1.0 multiplies by ×100), and the app refuses to hand it anything but whole-naira integers.
4. **Device-dependent behaviour is unverified.** Animation feel, WebView behaviour (including
   Android/iOS divergence on cancel), cold-start persistence, and frame rates are catalogued in
   `docs/DEVICE_CHECK.md` with expected answers and per-item fix locations.
5. **Search relevance is Open Library's.** No client-side ranking; occasional odd results for
   short queries are upstream behaviour.

## With more time

Server-side verification endpoint (removes limitation #1); `expo-image` for cover caching if the
device profile confirms hypothesis H1; order history on top of the existing persistence layer;
real ratings where upstream has them; e2e smoke tests via Maestro on a device farm; and a proper
app icon/splash instead of the template assets.

## Repo guide

```
src/api          typed Open Library client, error taxonomy, abort/timeout plumbing
src/domain       Book model + normalisers, price synthesis, integer-kobo money
src/hooks        useFetch (the graded one), useBookSearch, useDebouncedValue
src/store        zustand cart + hand-rolled persistence
src/animation    flight controller, overlay, constants — all tunables in one file
src/screens      Home, BookDetails, Cart, Checkout
docs/            DECISIONS, UNVERIFIED, DEVICE_CHECK, QUESTIONS, PROGRESS, PERFORMANCE
```
