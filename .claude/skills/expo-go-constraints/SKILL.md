---
name: expo-go-constraints
description: Consult before adding, installing, or importing any npm package, dependency, library, or native module in this React Native project. Covers Expo Go compatibility, prebuild, dev clients, EAS Build, config plugins, and how to verify a package is safe to add. Trigger on install, npm i, yarn add, expo install, package, dependency, library, native module, prebuild, pod install, autolinking.
---

# Expo Go Constraints

## The rule

This project **must run in Expo Go**. A reviewer will run `npx expo start`, scan the QR code
with the Expo Go app, and expect the whole application — including checkout — to work.

Therefore: **no native modules.** No `expo prebuild`. No custom dev client. No EAS Build. No
`ios/` or `android/` directory. No config plugins that require a native rebuild.

This constraint outranks code quality, developer ergonomics, and your preferences. An app the
reviewer cannot launch scores zero regardless of how well it is written.

## Decision procedure before adding any package

Run this every time. Do not skip it because a package "feels" like pure JavaScript.

1. **Is it already bundled in Expo Go?** Expo Go ships a fixed set of native modules. If the
   package is one of them, it works. Check the Expo docs for the current SDK.
2. **Is it pure JavaScript?** No native code, no `podspec`, no `android/` folder in the published
   package. Check the package's repository, not its README's marketing copy.
3. **Does it have a config plugin?** If yes, it needs a rebuild. **Rejected.**
4. **If unsure, reject it and ask the user.** A wrong yes here costs the entire submission.

Then verify:

```bash
npx expo install <package>   # not npm install — expo install pins SDK-compatible versions
npx expo-doctor              # catches native-module and version violations
```

`expo-doctor` must be clean at every phase gate. Treat its output as a hard failure, not advice.

## Known-good for this project

- `react-native-webview` — bundled in Expo Go. Required by Paystack.
- `react-native-paystack-webview` — pure JS, wraps the WebView.
- `react-native-reanimated` — bundled in Expo Go.
- `react-native-gesture-handler` — bundled in Expo Go.
- `@react-native-async-storage/async-storage` — bundled in Expo Go.
- `expo-image` — an Expo module, works in Expo Go.
- `zustand`, `lodash`, date libraries, anything with zero native surface.

## Known-bad — do not reach for these

| Package | Why it's rejected | What to use instead |
|---|---|---|
| `@stripe/stripe-react-native` | Native module. Needs prebuild. | `react-native-paystack-webview` |
| `react-native-fast-image` | Native module. | `expo-image` |
| `react-native-mmkv` | Native (JSI). | `@react-native-async-storage/async-storage` |
| `react-native-vector-icons` | Needs font linking. | `@expo/vector-icons` |
| `react-native-firebase` | Native module. | Not needed here. |
| `react-native-skia` | Native module in most setups. Verify before use. | Reanimated |

## The failure mode to avoid

You add a package, it installs cleanly, `npm test` passes, TypeScript compiles, and everything
looks green — because **Jest does not load native code**. The failure appears only when a human
scans the QR code and gets a red screen reading `Native module cannot be null`.

You cannot see this. `expo-doctor` is your only warning. Run it.

## If you believe a native module is genuinely required

Do not add it. Stop, state the requirement, state why no pure-JS alternative works, and ask the
user. This is a decision gate, not a judgement call.
