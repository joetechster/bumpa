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
2. **[U3]** Tap "Open cart" on Home. Does the Cart screen appear with a working back button?
   Expected: yes. File: `src/navigation/RootNavigator.tsx`.

## Should fix

*(animation items land here in Phase 5 — the feature flag makes them survivable)*

## Cosmetic

3. **[U4]** On a notched device, is the header clear of the status bar? Expected: yes.
   File: `App.tsx` / `src/theme/theme.ts`.
