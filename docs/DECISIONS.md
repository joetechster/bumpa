# Decisions

Format: `ID | Decision | Options | Trade-off | Ruling | PROVISIONAL? | Date`

## Phase 0 — ruled by the user (do not re-litigate)

| ID | Decision | Options | Trade-off | Ruling | PROV? | Date |
|---|---|---|---|---|---|---|
| D1 | Book API | Open Library / Google Books (±key) | OL: no key, no quota, sandbox-verifiable; GB richer metadata but 429-dead from sandbox and quota-risky for reviewers | **Open Library** | No | 2026-07-10 |
| D2 | Price/rating synthesis | Deterministic hash / API price + fallback / overlay JSON | Hash: same book = same price, fully testable, single currency | **Deterministic hash of work ID → NGN kobo integers (₦2,500–₦12,000) + 3.0–5.0 rating; NGN everywhere** | No | 2026-07-10 |
| D3 | Language | TS strict / TS loose / JS | Strict TS machine-checks the discriminated unions; tsc is a sandbox-runnable gate | **TypeScript strict** | No | 2026-07-10 |
| D4 | State management | Zustand / Context+useReducer / RTK | Zustand: selector subscriptions avoid list re-renders; store testable without React | **Zustand + hand-rolled AsyncStorage persistence (visible rehydration guard)** | No | 2026-07-10 |
| D5 | Navigation | React Navigation / Expo Router | Explicit wiring, easy overlay-above-navigator mount, simpler Jest | **React Navigation (native-stack)** | No | 2026-07-10 |
| D6 | Styling | StyleSheet+tokens / NativeWind / component lib | Zero deps, no babel-transform risk, grader reads raw RN | **StyleSheet + theme.ts tokens** | No | 2026-07-10 |
| D7 | Animation library | Reanimated / core Animated / Moti | UI-thread worklets; bundled in Expo Go; project skill assumes it | **Reanimated** | No | 2026-07-10 |
| D8 | Pagination | Infinite scroll / load-more / pages | Mobile idiom; onEndReached testable by direct invocation | **Infinite scroll** | No | 2026-07-10 |
| D9 | Fetch hook shape | useReducer machine / one useState union / three useState | Reducer makes transitions exhaustive and separately testable | **useReducer + discriminated union (idle/loading/success/error)** | No | 2026-07-10 |
| D10 | Test mocking | jest.mock fetch boundary / MSW | MSW needs polyfills in RN Jest; fetch mock is zero-dep and deterministic | **jest.mock at the fetch boundary, typed fixtures** | No | 2026-07-10 |
| D11 | Error taxonomy | 3 / 5 / 6+ kinds | 429 must not render like 500; empty ≠ error | **5 kinds (network, rate_limit, not_found, server, malformed) / 4 UIs; empty = success state** | No | 2026-07-10 |

Pre-decided by brief/skills: Expo managed (Expo Go only); Paystack provider+hook API; unique
client-side reference; `EXPO_PUBLIC_PAYSTACK_KEY` via env; `FEATURE_FLYING_CART` default on;
animation constants in one file; checkout built before animation.

## Phase 1 — implementation decisions (agent, within ruled scope)

| ID | Decision | Options | Trade-off | Ruling | PROV? | Date |
|---|---|---|---|---|---|---|
| D12 | Reanimated Jest setup | `react-native-reanimated/mock` in setupFiles / official `setUpTests()` | Installed Reanimated is v4: the documented path is mocking `react-native-worklets` + `setUpTests()`; the legacy mock file predates the worklets split | **`jest.mock('react-native-worklets', …lib/module/mock)` + `setUpTests()` in jest.setup.ts** (deviation from planner prompt's literal wording, same intent) | No | 2026-07-10 |
| D13 | Reanimated babel plugin | manual babel.config.js / babel-preset-expo auto | babel-preset-expo auto-adds `react-native-worklets/plugin` when installed (verified in `build/configs/expo.js:109`) — a manual config risks double-adding | **No babel.config.js; rely on babel-preset-expo** | No | 2026-07-10 |
| D14 | App config source | app.json / app.config.ts | Two sources drift; TS config is typed | **app.config.ts only, app.json deleted** | No | 2026-07-10 |
| D15 | RNTL v14 async API | pin RNTL v13 (sync render) / adopt v14 (`await render`) | v14 is what a fresh clone installs; async render matches React 19 concurrent | **Adopt RNTL v14; every render/unmount/rerender awaited** | No | 2026-07-10 |
