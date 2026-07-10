# Progress

Re-orient here after a context clear. Build order: 0, 1, 2, 3, 4, **6, 5**, 7, 8, 9.

| Phase | Status | Gate | Notes |
|---|---|---|---|
| 0 Plan | ✅ done | n/a | All 11 decisions ruled by user (DECISIONS.md) |
| 1 Scaffold | ✅ done | test ✅ lint ✅ tsc ✅ doctor ✅ | Expo SDK 57 / RN 0.86 / React 19.2, RNTL v14 (async render!), Reanimated 4 (worklets mock in jest.setup.ts) |
| 2 API layer | ✅ done | test ✅ lint ✅ tsc ✅ doctor ✅ | Live-verified fixtures; redirect stubs handled (D16); Result<T> transport (D17) |
| 3 Fetch hook | ✅ done | test ✅ lint ✅ tsc ✅ doctor ✅ | useReducer machine; race + unmount cases tested; fetcher must be useCallback-stable |
| 4 Screens+cart | ✅ done | test ✅ lint ✅ tsc ✅ doctor ✅ | 101 tests; useBookSearch reducer owns query/page atomically; hydrated flag prevents empty-cart flash |
| 6 Checkout | ✅ done | test ✅ lint ✅ tsc ✅ doctor ✅ | amount unit VERIFIED major-units in wrapper source (D22); cancel≠error; cart clears on success only |
| 5 Animation | ✅ done | test ✅ (also with flag OFF: 124/124) lint ✅ tsc ✅ doctor ✅ | runOnJS exactly once (terminal cb); displayed-count lag; overlap by id |
| 7 Test sweep | ✅ done | test ✅ lint ✅ tsc ✅ doctor ✅ | 161 tests; thresholds wired 90/85/90/90 global, 100% money+price+cartStore; coverage ≈96/89/95/97 |
| 8 Perf | ✅ done | test ✅ lint ✅ tsc ✅ doctor ✅ (no code change) | safe items were already in Phase 4; hypotheses+script in docs/PERFORMANCE.md; nothing claimed measured |
| 9 Docs | ✅ done | test ✅ lint ✅ tsc ✅ doctor ✅ + fresh-clone 161/161 + history secret-scan clean | README complete; handoff written below |

## Standing facts (learned, don't re-derive)

- Sandbox: `openlibrary.org` reachable; `googleapis.com` Books quota-dead (429).
- **RNTL v14: `render` is async** — `await render(...)` in every test, `unmount`/`rerender` too.
- Reanimated 4: Jest needs `jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))` before `setUpTests()` (done in jest.setup.ts).
- babel-preset-expo auto-adds the worklets plugin; **do not** create babel.config.js.
- Console trap lives in jest.setup.ts — any console.error/warn fails the test.
- Machine gate: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npx expo-doctor` (needs network for doctor).

## Submission summary (Phase 9 handoff)

**Most confident in:** the money path (integer kobo end-to-end, wrapper unit verified against its
installed source, 100% coverage enforced) and the fetch/search lifecycle (abort, race guard,
debounce — each with a test that fails loudly if broken, console trap armed).

**Least confident in:** everything WebView — the Paystack popup has zero sandbox surface, and
Android/iOS cancel-vs-error divergence is a known wrapper quirk (DEVICE_CHECK #3–#6). Second:
the animation's *feel* — mechanics are UI-thread by construction, but feel needs eyes
(DEVICE_CHECK #14–#21, all flag-survivable).

**If something is broken, look first at:** a red screen on boot → Reanimated/worklets babel
wiring (U2, DEVICE_CHECK #1 has the fix). Checkout misbehaving → `CheckoutScreen.tsx` callbacks.
Ghost flying from/to the wrong place → flip `DEBUG_ANIM_RECTS` and read the borders.

