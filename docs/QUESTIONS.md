# Questions

Everything I would have asked mid-run, with the PROVISIONAL choice made instead.
(Phase 0 questions were asked and ruled live — see DECISIONS.md D1–D11.)

| # | Question | PROVISIONAL choice made | Where to change |
|---|---|---|---|
| Q1 | Open Library actually exposes a sparse real `ratings_average` on search docs — should we prefer it over the D2 hash rating where present? | Kept the D2 ruling (hash only): deterministic, always present, testable. | `src/domain/price.ts` `ratingForBook` — one-line change + normaliser passes `doc.ratings_average` through |
| Q2 | When quantity is 1 and the user taps minus: floor at 1, or remove the line? (Phase 0 didn't cover it) | Remove the line (D21, PROVISIONAL). | `src/store/cartStore.ts` `setQuantity` + `QuantityStepper` |
