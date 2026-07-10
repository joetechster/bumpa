# The Book Nook

React Native bookstore app. Technical assessment for a Mobile Engineer role at Bumpa.
Graded by human reviewers on correctness, code quality, performance, and testing.

## Project skills

Skills live in `.claude/skills/` and load automatically. Four are project-critical:

| Skill | Consult before |
|---|---|
| `expo-go-constraints` | adding **any** dependency, ever |
| `reanimated-flying-cart` | touching the add-to-cart animation |
| `rntl-conventions` | writing any test |
| `paystack-checkout` | touching checkout or payment |

If you are about to `npm install` something, you have already skipped `expo-go-constraints`.
Go back.

## Non-negotiable constraints

- **Must run in Expo Go.** No native modules, no prebuild, no dev client, no EAS Build.
- **Data fetching is hand-rolled `useEffect`.** No TanStack Query, no SWR. The brief explicitly
  grades lifecycle handling; the mechanics must be visible in the source.
- **Checkout is Paystack test mode**, not Stripe.
- **No secret keys anywhere**, in any file or commit.

## You cannot run this app

This is a cloud sandbox. No phone, no simulator, no Expo Go.

- Never claim something works that you have not executed. Say "unverified — requires device check."
- Never claim an animation is smooth. You cannot know.
- Log every unexecutable claim in `docs/UNVERIFIED.md` as you make it.
- Never let an unverified claim become load-bearing. The cart updates whether or not the animation
  runs.

## Machine gate — blocking, run at every phase boundary

```bash
npm test          # green, offline, silent console
npm run lint      # clean; react-hooks/exhaustive-deps is an ERROR, not a warning
npx tsc --noEmit  # clean
npx expo-doctor   # clean — this is the only automated check on the Expo Go constraint
```

Red means stop. Not "fix it next phase."

## Living documents

- `docs/DECISIONS.md` — every judgement call, with the ruling and who made it
- `docs/UNVERIFIED.md` — every claim that needs a device to confirm
- `docs/DEVICE_CHECK.md` — one growing list, worst-blast-radius first
- `docs/PROGRESS.md` — phase status, re-orient from here after a context clear

## Working style

The user makes all judgement calls. At any fork with more than one reasonable answer, stop and
ask: 2–4 options, a one-sentence trade-off each, your recommendation, and the cost of reversing.

If you catch yourself typing "I'll assume" or "for simplicity" — that is a decision gate. Stop.

If the user does not answer within your working window, do not guess. Pick the most reversible
option, mark it `PROVISIONAL` in `docs/DECISIONS.md` with the alternative written out, and continue.

## Commands

```bash
npx expo start        # user runs this, not you
npm test -- --watch
npm run lint -- --fix
```
