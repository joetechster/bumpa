# Progress

Re-orient here after a context clear. Build order: 0, 1, 2, 3, 4, **6, 5**, 7, 8, 9.

| Phase | Status | Gate | Notes |
|---|---|---|---|
| 0 Plan | ✅ done | n/a | All 11 decisions ruled by user (DECISIONS.md) |
| 1 Scaffold | ✅ done | test ✅ lint ✅ tsc ✅ doctor ✅ | Expo SDK 57 / RN 0.86 / React 19.2, RNTL v14 (async render!), Reanimated 4 (worklets mock in jest.setup.ts) |
| 2 API layer | ⬜ next | | Open Library client, error union, normalise, price hash |
| 3 Fetch hook | ⬜ | | |
| 4 Screens+cart | ⬜ | | |
| 6 Checkout | ⬜ | | before Phase 5 |
| 5 Animation | ⬜ | | |
| 7 Test sweep | ⬜ | | coverage: 85/80 global, 100% money+cart |
| 8 Perf | ⬜ | | safe-only items; first cut if short |
| 9 Docs | ⬜ | | |

## Standing facts (learned, don't re-derive)

- Sandbox: `openlibrary.org` reachable; `googleapis.com` Books quota-dead (429).
- **RNTL v14: `render` is async** — `await render(...)` in every test, `unmount`/`rerender` too.
- Reanimated 4: Jest needs `jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))` before `setUpTests()` (done in jest.setup.ts).
- babel-preset-expo auto-adds the worklets plugin; **do not** create babel.config.js.
- Console trap lives in jest.setup.ts — any console.error/warn fails the test.
- Machine gate: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npx expo-doctor` (needs network for doctor).
