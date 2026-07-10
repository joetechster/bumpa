# Questions

Everything I would have asked mid-run, with the PROVISIONAL choice made instead.
(Phase 0 questions were asked and ruled live — see DECISIONS.md D1–D11.)

| # | Question | PROVISIONAL choice made | Where to change |
|---|---|---|---|
| Q1 | Open Library actually exposes a sparse real `ratings_average` on search docs — should we prefer it over the D2 hash rating where present? | Kept the D2 ruling (hash only): deterministic, always present, testable. | `src/domain/price.ts` `ratingForBook` — one-line change + normaliser passes `doc.ratings_average` through |
| Q2 | When quantity is 1 and the user taps minus: floor at 1, or remove the line? (Phase 0 didn't cover it) | Remove the line (D21, PROVISIONAL). | `src/store/cartStore.ts` `setQuantity` + `QuantityStepper` |
| Q3 | What should the Home shelf show before any search? | `DEFAULT_BROWSE_QUERY = 'bestseller'` in `src/config/tuning.ts` — decent variety against the live API, but it's taste. | One constant |
| Q4 | Should adding from the DETAILS screen also fly, or only list cards? | Both animate (consistency); details uses its cover as the source. | Remove the useFlyToCart call in BookDetailsScreen.tsx if unwanted |
| Q5 | Cart survives checkout cancel — should it also survive app-kill DURING the popup? | Yes by construction (phase state is component-local and resets to the form on mount; cart only clears in onSuccess). Verify as DEVICE_CHECK #9. | src/screens/CheckoutScreen.tsx |

