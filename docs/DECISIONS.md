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

## Phase 2–4 — implementation decisions

| ID | Decision | Options | Trade-off | Ruling | PROV? | Date |
|---|---|---|---|---|---|---|
| D16 | Open Library redirect stubs | ignore / follow one hop / follow chains | Live data contains works whose payload is `type:/type/redirect` + `location` (found while sampling; e.g. OL45883W→OL45804W). Chains risk loops | **Follow exactly one hop; a second redirect → `malformed`** | No | 2026-07-10 |
| D17 | API error transport | throw ApiError objects / return `Result<T>` | Throwing non-Error values fights TS and stack traces; Result makes every branch typed and testable | **`Result<T>` returns; caller-initiated aborts re-throw AbortError (lifecycle, not UI error)** | No | 2026-07-10 |
| D18 | Timeout mechanism | `AbortSignal.any`+`AbortSignal.timeout` / hand-rolled controller | `AbortSignal.any` support on Hermes is uncertain and unverifiable here | **Hand-rolled: internal controller + setTimeout, caller signal forwarded** | No | 2026-07-10 |
| D19 | Runtime payload validation | zod / hand-rolled type guards | zod is pure JS (allowed) but hides the mechanics; guards are ~20 lines | **Hand-rolled `isOLSearchResponse` / `isOLWork` guards** | No | 2026-07-10 |
| D20 | Author names on details | route-param passthrough / resolve via /authors/*.json | Works endpoint returns refs only. Param passthrough breaks deep-linking; author fetches are parallel and degrade gracefully | **Resolve up to 3 author names in `getBookById`, best-effort** | No | 2026-07-10 |
| D21 | Decrement at quantity 1 | floor at 1 / remove the line | Removal is the common cart idiom and keeps the stepper self-sufficient; floor-at-1 forces a separate delete affordance | **Decrementing at 1 removes the line; `setQuantity(id, 0)` removes** | **PROVISIONAL** (user was offline; reversal = one branch in cartStore + stepper) | 2026-07-10 |

## Phase 6 — checkout decisions

| ID | Decision | Options | Trade-off | Ruling | PROV? | Date |
|---|---|---|---|---|---|---|
| D22 | Paystack `amount` unit | trust docs/skill / read installed source | The wrapper's unit changed across majors; guessing risks a ×100 charge error | **Verified in installed v5.1.0 source: amount is MAJOR units (it multiplies ×100 in `production/lib/utils.js`). We pass whole naira via `koboToWholeNairaForPaystack`, which rejects non-whole-naira kobo so the wrapper's ×100 can never touch a float** | No | 2026-07-10 |
| D23 | Reference generation | client UUID / timestamp+random / derived from cart | Derived collides on repeat purchases (skill forbids); uuid lib adds a dep for no gain | **`bn_<Date.now()>_<random36>`, fresh per payment attempt** | No | 2026-07-10 |
| D24 | onCancel UX | share the error screen / distinct neutral note | Cancel is a user decision, not a failure; conflating reads as careless (skill) | **Cancel returns to the form with a neutral 'cart untouched' note; error gets a distinct retry screen** | No | 2026-07-10 |
| D25 | Checkout email | require sign-in / ask at checkout | No auth in scope; Paystack requires an email for receipts | **Single validated email field on the checkout form** | No | 2026-07-10 |

## Phase 5 — animation decisions

| ID | Decision | Options | Trade-off | Ruling | PROV? | Date |
|---|---|---|---|---|---|---|
| D26 | Source-rect measurement | worklet measure() / onLayout capture / measureInWindow / layout-registry | One-shot pre-flight measurement doesn't need the UI thread; measureInWindow returns window coords (scroll-adjusted, same space as the target registry) with no worklet plumbing. Per-frame work stays 100% in worklets | **measureInWindow for the tapped cover; layout-registry (context ref) for the cart icon, registered on the badge's onLayout** | No | 2026-07-10 |
| D27 | Motion driver | two withTimings (x,y) / one linear progress + in-worklet easing | Two timings need two terminal callbacks and can desync under interruption; one driver gives exactly one runOnJS and derives x/y/scale/opacity per-frame in the worklet | **Single linear withTiming 0→1; decoupled axis easings computed in-worklet (x ease-out, y ease-in → arc)** | No | 2026-07-10 |
| D28 | Badge lag semantics | badge tracks store / displayed = store − inFlight | The brief wants the count to be the payoff of the landing; the store must still be instantly correct | **displayedCount(true, inFlight) with floor at 0; store NEVER waits for animation** | No | 2026-07-10 |
| D29 | Rapid taps | queue flights / overlap | Skill mandates overlap; queueing lags the badge unboundedly | **Overlap: each flight has its own id + shared value; landing removes by id (idempotent)** | No | 2026-07-10 |

