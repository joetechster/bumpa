---
name: reanimated-flying-cart
description: Use when implementing, debugging, or reviewing the add-to-cart flying animation, or any React Native Reanimated work — shared values, worklets, runOnJS, useAnimatedStyle, measure, layout animations, animated refs, overlays, or gesture-driven motion. Trigger on animation, animate, Reanimated, worklet, shared value, fly to cart, ghost image, transition, easing, spring, 60fps, dropped frames, UI thread.
---

# The Flying Add-to-Cart Animation

## What we are building

When a book is added to the cart, a ghost copy of its cover flies from the tapped card to the cart
icon in the header, shrinking and fading. On arrival, the cart badge pops and the count increments.

## You cannot see this animation

You are in a sandbox with no device and no simulator. You will never watch this run. Therefore
every rule below exists to make the implementation **auditable by reading** and **cheap to correct
by someone who can see it.**

Never claim the animation is smooth, correct, or working. You can only claim it runs on the UI
thread, and only if you can point at the code that makes that true.

## Non-negotiable properties

1. **The cart updates on tap, always.** The animation is decorative. Call the store action first,
   synchronously, before starting any motion. If the animation throws, the cart is still right.
2. **Everything runs on the UI thread.** No `setState` in a frame callback. No `useState` driving
   position. `runOnJS` appears exactly once — in the terminal `withTiming` callback.
3. **Feature-flagged.** `FEATURE_FLYING_CART` defaults on. When off, the badge increments instantly
   with no overlay. The full test suite must pass with the flag off.
4. **Interruptible.** Ten taps in two seconds must not crash, leak overlays, or lose a count.
5. **Reduced motion respected.** `AccessibilityInfo.isReduceMotionEnabled()` → skip to the
   instant path.
6. **Every magic number lives in `animation.constants.ts`.** Durations, easings, arc height, ghost
   scale. The person who can see it will tune these; do not make them read your logic to find them.

## Build order

### 1. Measurement

Get the source rect (the tapped cover) and the target rect (the cart icon).

- Use `useAnimatedRef` + `measure()` inside a worklet. `measure()` **only works in a worklet** and
  returns `null` off the UI thread. Guard for null.
- `measure()` returns `pageX` / `pageY` in window coordinates — already scroll-adjusted. Do not
  add scroll offset manually; that's a classic double-count bug.
- The cart icon lives in the header. Register its rect once via a layout-registry context rather
  than measuring it on every tap.

### 2. The overlay

The ghost renders in an absolutely-positioned overlay **above the navigator**, not inside the
`FlatList` cell.

Why: a `FlatList` clips its children, and a screen's container clips at the navigator boundary. A
ghost animated inside the cell will be cut off the moment it crosses the card's bounds. This is the
single most common way this feature ships broken.

Mount `<FlyingCartOverlay />` as a sibling of the navigator at the app root, driven by a context.
`pointerEvents="none"` on the overlay container.

### 3. The motion

Translate, scale, and opacity, composed in one `useAnimatedStyle`.

A straight linear interpolation looks mechanical. Prefer decoupled axes:

```ts
// x eases out, y eases in — produces a natural arc without Bézier math
translateX: withTiming(dx, { duration: D, easing: Easing.out(Easing.quad) })
translateY: withTiming(dy, { duration: D, easing: Easing.in(Easing.quad) })
```

Scale from 1 → ~0.2. Opacity holds at 1 for most of the flight, then drops in the last ~20%; a
ghost that fades from the start looks like a bug.

### 4. The landing

The badge increments **on arrival**, not on tap — the count is the payoff of the motion.

The store already updated on tap (rule 1). So the badge reads from a *displayed count* that lags
the true count, catching up in the `runOnJS` terminal callback. Under rapid taps the displayed
count must converge to the true count and never exceed it.

Badge pop: `withSequence(withTiming(1.3, {duration: 100}), withTiming(1, {duration: 100}))`.

Unmount the ghost in the same terminal callback. A leaked overlay is invisible but blocks nothing
(`pointerEvents="none"`) — which means nobody notices until memory grows.

## Concurrency

Rapid taps must overlap, not queue. Model the overlay as a list of in-flight ghosts, each with its
own id and shared values. Removing a ghost by id in the terminal callback is safe under overlap;
removing "the current ghost" is not.

## Debug overlay

Behind `__DEV__ && DEBUG_ANIM_RECTS`, render the measured source and target rects as coloured
borders. This turns "the ghost lands in the wrong place" from a paragraph of prose into a screenshot
the user can send back. Build this **before** the motion, not after.

## What you can test in Jest

Reanimated is mocked in tests (`react-native-reanimated/mock`), so you cannot assert on motion.
You can and must assert on:

- The controller state machine: `idle → flying → landed → idle`.
- The store action fires on tap, before any animation starts, and fires even when the flag is off.
- Ten synchronous taps produce ten ghosts and a final displayed count of ten.
- `isReduceMotionEnabled() === true` takes the instant path and mounts no ghost.
- Unmounting the screen mid-flight cancels cleanly with no state update afterward.
- With `FEATURE_FLYING_CART` off, the whole suite still passes.

## Pitfalls, in the order they usually bite

- Ghost clipped by the `FlatList` → it never leaves the card. (Overlay at root.)
- `measure()` returns null → ghost starts at `(0,0)`, flies from the top-left corner.
- `runOnJS` called every frame → the JS thread saturates, animation stutters, unrelated taps lag.
- Reading a `SharedValue` with `.value` during render → stale value, no re-render, silent wrongness.
- Badge incremented on tap *and* on landing → double count.
- `useAnimatedStyle` capturing a stale closure over `dx`/`dy` → every ghost flies to the first
  book's destination.
