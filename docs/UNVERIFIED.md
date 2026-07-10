# Unverified claims

Format: `ID | Claim | Why unverifiable | Risk if wrong | What falsifies it in <60s | Blast radius | File to fix`

| ID | Claim | Why unverifiable | Risk if wrong | Falsify in <60s | Blast radius | File to fix |
|---|---|---|---|---|---|---|
| U1 | App boots in Expo Go with no red screen | No device in sandbox | Total — nothing else matters | `npx expo start`, scan QR | Whole app | package.json / App.tsx |
| U2 | babel-preset-expo auto-configures the worklets/Reanimated babel plugin (source-verified, runtime-unverified) | Jest never exercises the babel plugin the way Metro does | Reanimated crashes at launch | Boot check (same as U1) | Whole app once animation lands | babel config (create babel.config.js if broken) |
| U3 | Navigation between screens works on device | No device | Navigation unusable | Tap "Open cart" on Home | All screens | src/navigation/RootNavigator.tsx |
| U4 | expo-status-bar / safe-area render correctly | Visual | Cosmetic overlap | Look at header on notched phone | Cosmetic | App.tsx |
| U5 | Home list renders, scrolls, paginates against LIVE Open Library | Sandbox can reach the API but not run the UI | Browse broken | Scroll Home, watch page 2 append | Whole browse flow | src/hooks/useBookSearch.ts, src/config/tuning.ts |
| U6 | Cover images load from covers.openlibrary.org | No device; covers CDN can be slow | Blank covers (fallback shows title) | Look at Home list | Cosmetic-to-medium | src/domain/book.ts (coverUrlFromId) |
| U7 | Cart survives a REAL cold start (AsyncStorage on device) | Jest mocks storage; rehydration path is tested but not device persistence | Cart lost between sessions | Add item, kill app, relaunch, open cart | Cart trust | src/store/cartPersistence.ts |
| U8 | Paystack popup renders and completes a test-card purchase in Expo Go | WebView has no Jest surface | **Checkout broken — no fallback** | Full test purchase (see DEVICE_CHECK setup) | Entire graded checkout | src/screens/CheckoutScreen.tsx |
| U9 | The wrapper's `amount × 100` lands as the exact kobo total in the Paystack dashboard | Can't execute a transaction | Wrong charge amount | Compare dashboard amount vs cart total | Money correctness | src/domain/money.ts (koboToWholeNairaForPaystack) |
| U10 | onCancel fires when the user closes the popup (vs onError) on BOTH platforms | Android/iOS WebView divergence is a known wrapper issue | Cancel renders error UI (reads as broken) | Open popup, back out without paying | Checkout UX | src/screens/CheckoutScreen.tsx |
| U11 | App killed mid-popup: no orphaned state, cart intact on relaunch | Cannot kill an app in Jest | Stuck 'paying' state or lost cart | Kill app while popup open, relaunch | Checkout UX | src/screens/CheckoutScreen.tsx (phase resets to form on mount) |
| U12 | PaystackProvider with empty publicKey doesn't crash at startup | Provider internals unexercised in Jest (mocked) | App unusable without .env | Launch without .env, open Checkout | Startup | App.tsx / src/screens/CheckoutScreen.tsx |
| U13 | The ghost flies from the tapped cover to the cart icon (correct rects) | Motion is invisible in Jest; Reanimated is mocked | Ghost flies from/to wrong place | Tap add; watch start and end points (enable DEBUG_ANIM_RECTS for coloured borders) | Animation polish (flag-safe) | src/animation/useFlyToCart.ts / CartBadge onLayout |
| U14 | The flight runs at 60fps on mid-range Android | Cannot profile; can only reason: single linear withTiming, all derivation in one worklet, runOnJS once at landing | Stutter | Dev Menu → Perf Monitor while adding | Animation polish (flag-safe) | src/animation/animation.constants.ts (shorten FLIGHT_DURATION_MS) |
| U15 | The arc reads naturally (x ease-out / y ease-in) | Aesthetic judgement needs eyes | Mechanical-looking motion | Watch one flight | Cosmetic | animation.constants.ts easing exponents |
| U16 | Ghost is never clipped by list/screen bounds | Overlay is a navigator sibling by construction, but only a device shows clipping | Ghost cut off at card edge | Add from a card near screen edge | Animation polish (flag-safe) | App.tsx overlay mount point |
| U17 | Badge pop triggers on landing on device timing | Jest mock timing ≠ device timing | Pop fires early/late | Watch badge as ghost lands | Cosmetic | animation.constants.ts BADGE_POP_* |
| U18 | Home list scrolls smoothly at 500+ items | Cannot profile in sandbox | Janky browse | PERFORMANCE.md script step 2 | Browse UX | src/components/BookCard.tsx (H1), src/hooks/useBookSearch.ts (H3) |
| U19 | Typing in search doesn't drop UI frames | Cannot profile | Janky search | PERFORMANCE.md script step 3 | Search UX | src/screens/HomeScreen.tsx (H2) |

