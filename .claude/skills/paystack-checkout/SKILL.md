---
name: paystack-checkout
description: Use when implementing, testing, or debugging checkout, payment, or the Paystack integration in this project. Covers react-native-paystack-webview, PaystackProvider, usePaystack, popup.checkout, kobo amounts, transaction references, test cards, and the absence of server-side verification. Trigger on checkout, payment, pay, Paystack, WebView, kobo, transaction, reference, test card, purchase.
---

# Paystack Checkout

## The library

`react-native-paystack-webview` renders Paystack's InlineJS checkout inside a `react-native-webview`.
Pure JavaScript, no native linking, runs in Expo Go. Install:

```bash
npx expo install react-native-webview
npm install react-native-paystack-webview
```

## The current API — provider plus hook

Do **not** use the old `<Paystack ref={...} />` with `startTransaction()`. That form is deprecated
and appears in most tutorials and Stack Overflow answers you will find. Use:

```jsx
<PaystackProvider publicKey={PAYSTACK_PUBLIC_KEY}>
  <App />
</PaystackProvider>
```

```jsx
const { popup } = usePaystack();

popup.checkout({
  email,
  amount,           // see below — this is a NUMBER of the major unit in this SDK; verify
  reference,
  onSuccess: (res) => {},
  onCancel: () => {},
  onError: (err) => {},
});
```

**Verify the `amount` unit against the installed version's types before writing the conversion.**
The Paystack HTTP API takes kobo (minor units); this wrapper's prop has changed shape across major
versions. Read `node_modules/react-native-paystack-webview` types. Do not guess, and do not trust
this file over the installed source.

## Money

Compute the cart total in **integer minor units throughout**. Never accumulate floats and round at
the end:

```ts
// WRONG — 19.99 * 3 = 59.97000000000001
Math.round(total * 100)

// RIGHT — prices stored as integer kobo from the moment they enter the domain model
const totalKobo = items.reduce((sum, i) => sum + i.priceKobo * i.qty, 0);
```

Give this its own test file. Assert exact equality, never `toBeCloseTo`.

## References

Every transaction needs a unique reference. Generate client-side (`uuid` or
`` `bn_${Date.now()}_${randomSuffix}` ``). Two consecutive checkouts must never collide — assert
this in a test. Do not derive it purely from cart contents; a customer buying the same book twice
would reuse the reference.

## Callbacks are three different things

- `onSuccess` — payment completed. Clear the cart. Show a receipt screen.
- `onCancel` — the user backed out. **Keep the cart intact.** Return them to it. This is not an
  error and must not render an error UI.
- `onError` — something broke. Keep the cart, show a retry affordance, surface enough detail to
  debug.

Conflating `onCancel` with `onError` is the most common mistake here and reads as carelessness.

## The security gap — state it, do not hide it

A correct integration **verifies the transaction server-side** with the secret key:

```
GET https://api.paystack.co/transaction/verify/:reference
Authorization: Bearer sk_...
```

This project has no backend, so `onSuccess` is trusted client-side. That is not production-safe:
a determined client can fabricate a success callback.

Say this plainly in the README under Known Limitations. Do not imply the flow is secure. A reviewer
who spots an unmentioned gap assumes you didn't know; a reviewer who reads you naming it assumes
you did.

## Keys

`pk_test_...` is publishable and safe to commit — but read it from
`process.env.EXPO_PUBLIC_PAYSTACK_KEY` via `app.config.js` anyway, and ship a `.env.example`.
A hardcoded key reads as sloppy even when it's harmless.

**A secret key (`sk_...`) must never appear anywhere in this codebase, in any file, in any
comment, in any test fixture, or in git history.** If one is needed, stop and ask.

## Testing

Mock `usePaystack`. Assert the exact payload passed to `popup.checkout`, then invoke each callback
and assert the resulting state transition. The cart clears on `onSuccess` and on nothing else.

Do not try to render the WebView in Jest. It has no useful test surface.

## What cannot be verified without a device

The popup rendering, the test-card flow, Android vs iOS WebView divergence, and behaviour when the
app is killed mid-popup. Log all four in `docs/UNVERIFIED.md` and put them in the Device Check.
