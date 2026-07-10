# Performance

**Honesty first: nothing here has been measured on a device.** This project was built in a
sandbox with no phone and no simulator. Everything below is either (a) an unconditionally safe,
standard optimisation that needs no measurement to justify, or (b) a hypothesis with a predicted
symptom and a measurement script. No speed-up numbers are claimed anywhere.

## Applied (safe-by-default, no measurement required)

| What | Where | Why it's safe |
|---|---|---|
| `keyExtractor` on every FlatList | HomeScreen, CartScreen | Stable identity; required for correct recycling anyway |
| `getItemLayout` on the Home list | HomeScreen (BOOK_CARD_HEIGHT is genuinely fixed at 116 + margins) | Removes layout measurement for offscreen rows; only valid because row height is constant by construction |
| `initialNumToRender = 8` | HomeScreen (`src/config/tuning.ts`) | Roughly one screenful; cuts first-render work with no UX change |
| `React.memo` on `BookCard` | src/components/BookCard.tsx | Every search keystroke re-renders HomeScreen; rows are pure functions of `book` + two stable callbacks. This is the one memo in the codebase, and it exists for a reasoned, structural cause — not sprinkled |
| Selector-based store subscriptions | CartBadge, screens | Zustand selectors mean a cart change re-renders the badge, not every mounted screen |
| Search debounce + in-flight abort | useBookSearch | Caps network chatter at one request per pause; cancelled requests do no state work |

## Deliberately NOT applied (would need numbers to defend)

- `removeClippedSubviews` — can cause blank cells and measurement bugs; only defensible with a
  before/after frame count.
- `windowSize` / `maxToRenderPerBatch` tuning — device-dependent; the defaults are fine until a
  profile says otherwise.
- More `React.memo` / `useMemo` — no measured re-render problem to point at.
- `expo-image` — worth adopting if cover scrolling stutters (it caches and downsamples), but it
  adds a dependency on a hypothesis. Logged as H3 below.

## Hypotheses (what a profile would probably show)

- **H1 — cover decode jank while scrolling.** Predicted symptom: UI-thread frame drops on fast
  scroll of the Home list, worst on mid-range Android. Likely fix: swap `Image` for `expo-image`
  (bundled in Expo Go) with `recyclingKey`. File: `src/components/BookCard.tsx`.
- **H2 — search keystroke re-renders.** Predicted symptom: JS-thread dips while typing fast; the
  memoised rows should keep the UI thread clean. If the profiler shows BookCard re-rendering on
  keystrokes anyway, a handler identity is unstable — check the `useCallback` deps in
  HomeScreen. Files: `src/screens/HomeScreen.tsx`.
- **H3 — long-session list growth.** Predicted symptom: after ~25 pages (500+ items), memory
  climbs and scroll-to-top stutters. FlatList virtualises render but the data array still grows;
  acceptable for this app's browsing pattern. If it bites: cap `books` at N pages in
  `bookSearchReducer` (one constant).

## Profiling script (run on a mid-range Android device)

1. `npx expo start`, open in Expo Go, shake → **Show Perf Monitor**. Note the two FPS numbers
   (UI / JS) at rest on Home.
2. **Scroll test:** search a broad term (e.g. "history"), scroll fast through ≥10 pages
   (200+ items), then keep scrolling to 500+. Record the lowest UI FPS and JS FPS you see, and
   whether it degrades as the list grows (H1/H3).
3. **Typing test:** type "the great gatsby" quickly, one keystroke per ~100ms. Record JS FPS
   during typing (H2). Expected: brief JS dips, UI steady, exactly one network request after the
   last keystroke (watch the Metro logs).
4. **Animation test:** ten rapid add-to-carts; record UI FPS during overlapping flights.
5. Report the four numbers + the resting baseline. Only then do we apply H1/H2/H3 fixes — the
   README records what was measured, or says plainly that nothing was.
