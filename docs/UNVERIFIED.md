# Unverified claims

Format: `ID | Claim | Why unverifiable | Risk if wrong | What falsifies it in <60s | Blast radius | File to fix`

| ID | Claim | Why unverifiable | Risk if wrong | Falsify in <60s | Blast radius | File to fix |
|---|---|---|---|---|---|---|
| U1 | App boots in Expo Go with no red screen | No device in sandbox | Total — nothing else matters | `npx expo start`, scan QR | Whole app | package.json / App.tsx |
| U2 | babel-preset-expo auto-configures the worklets/Reanimated babel plugin (source-verified, runtime-unverified) | Jest never exercises the babel plugin the way Metro does | Reanimated crashes at launch | Boot check (same as U1) | Whole app once animation lands | babel config (create babel.config.js if broken) |
| U3 | Navigation between screens works on device | No device | Navigation unusable | Tap "Open cart" on Home | All screens | src/navigation/RootNavigator.tsx |
| U4 | expo-status-bar / safe-area render correctly | Visual | Cosmetic overlap | Look at header on notched phone | Cosmetic | App.tsx |
