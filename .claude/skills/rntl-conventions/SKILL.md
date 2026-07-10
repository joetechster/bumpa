---
name: rntl-conventions
description: Use when writing, reviewing, or fixing any test in this project — unit tests, component tests, hook tests, or API layer tests. Covers Jest, React Native Testing Library, renderHook, fake timers, mocking, coverage, and what makes a test meaningful. Trigger on test, spec, jest, RNTL, testing library, mock, coverage, assertion, testID, renderHook, fake timers, snapshot.
---

# Testing Conventions

The assessment grades testing explicitly. Reviewers read tests to find out whether the author
understands the code, not to check a coverage number. Write tests that would catch a real
regression.

## Hard rules

1. **No snapshot-only tests.** A snapshot asserts that the output has not changed, not that it is
   correct. It passes forever until someone runs `-u`. If a component has behaviour, assert on the
   behaviour. Snapshots are permitted only as a supplement, never as the sole assertion.
2. **Query by accessible role and text before reaching for `testID`.**
   `getByRole('button', { name: /add to cart/i })` over `getByTestId('add-btn')`. A test that
   passes when the button has no accessible name is testing the wrong thing. Reach for `testID`
   only when there is genuinely no accessible handle.
3. **Tests run offline and are deterministic.** No real network. No `setTimeout` sleeps. No
   `Date.now()` without a fixed clock. If a test can fail on a slow CI box, it is a broken test.
4. **The console must be silent.** Fail the suite on unexpected `console.error` / `console.warn`.
   This is the only automated way to catch React's "state update on unmounted component" warning,
   and that warning is exactly what the assessment's lifecycle criterion is about.
5. **Assert on behaviour a user or a caller can observe.** Never on internal state, never on
   implementation details like "the reducer was called."

## Async and timers

- `findBy*` for anything that appears after an await. Never `waitFor` wrapping a `getBy*` when
  `findBy*` will do.
- Fake timers for debounce. Advance them explicitly; do not sleep.
- Always `await` the assertion that the loading indicator disappeared before asserting on content.
  Otherwise the test passes against the loading state.

## Testing the fetch hook

Use `renderHook`. This hook is the most closely read file in the submission; test it like it is.

Required cases:

- `loading → success`, and the data is what the API layer returned.
- `loading → error → retry() → success`.
- **Unmount mid-flight**: assert `AbortController.abort` was called; assert no state update
  followed; assert the console stayed silent.
- **Id changes mid-flight**: fire request A, change the id to B, resolve A *after* B. Assert the
  stale response from A never lands. This is the race the graders are looking for.
- Impossible states are unrepresentable — there is no `loading: true, error: Error` combination.

## Testing the API layer

Pure functions, no React. Cover the happy path, network failure, non-200 responses, a malformed
payload (the upstream shape changed), and abort. Mock at the `fetch` boundary or with MSW,
whichever was ruled in Phase 0 — but be consistent across the whole suite.

Assert the normalisation: an upstream `volumeInfo.imageLinks.thumbnail` becomes an internal
`Book.coverUrl`, and a missing one becomes a defined fallback rather than `undefined`.

## Testing money

Give minor-unit arithmetic its own file. Prices like 19.99 × 3, accumulated across a cart, must
reach Paystack as an exact integer number of kobo. Prove no float drift: assert
`cartTotalKobo([{price: 19.99, qty: 3}]) === 5997`, not `≈`.

Never `Math.round(total * 100)` on an accumulated float. Test that you didn't.

## Testing checkout

Mock `usePaystack`. Assert the exact object handed to `popup.checkout`: the kobo integer, the
email, a reference that differs across two invocations. Then assert each of `onSuccess`,
`onCancel`, and `onError` drives the right transition — and that the cart clears **only** on
success.

Do not attempt to render or drive the WebView. It has no meaningful test surface in Jest.

## Testing the cart

Total is derived, never stored — so test the derivation, not a stored field. Cover: adding a book
already in the cart, decrementing to zero, removing, the empty state, and rehydrating from a
corrupted or absent AsyncStorage value.

## Coverage

Propose a threshold and wire it into `jest.config`. Justify the number in the README. Do not claim
100% — a reviewer reads that as either padding or a lie. Uncovered lines that are genuinely not
worth testing should be visible and explained, not hidden behind a passing gate.
