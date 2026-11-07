# Small recipe quantities and candidate discovery

Owner assigned implementation of [#20](https://github.com/1N4B0M9/NovaHacks2026/issues/20). Branch: `codex/ingredient-candidates`, based on main `b1d05dc` plus the #17 UI commit (PR #17 was merged into its dependent branch, so the UI was not yet on main). No lead progress file was changed.

## Delivered

- Accept explicit fractional each demand. Keep integer case/carton constraints and server approval protections.
- Browse known identities even with missing demand units; unknown conversions retain observed product price/pack and never imply recipe coverage.
- Replace all-token title rejection with compatible/confirmation-required candidates and hard exclusions for known incompatible forms, cuts and flour types. Return at most five deduplicated variants; unique verified delivered-cost winner only, null on ties/unknowns.
- Round up whole packs using observed minimums and increments; mark over-maximum offers uncomparable. Show surplus and small-pack options.
- Add the verified public Ginger Fresh grocery source. Existing supplier deadline, detail-read bounds and two-ingredient concurrency remain; four supplier workers per ingredient.
- Remove empty simulated-catalog product cards. Display candidate product details, up to three ingredient-interpretation buttons, and English titles with English/Spanish explanations. Interpretation selection opens a correction to save; original source persists. Unsaved edits block approval and clear displayed research.

## Evidence

39 backend tests passed, including new fractional demand, variety/brand recall, fresh-vs-processed negatives, null conversions, minimum/increment/maximum, tie/no-winner, dedup/limit, pack parsing, source adapter and versioned correction tests. Production build passed; typechecking runs as part of the build.

`check-candidates.mjs` passed against real local draft/edit/approval APIs and controlled supplier/OCR fixtures: three alternatives, half-onion surplus, salt price/size with no density guess, no order mutation, candidate choice/save, source preservation, approval blocked while editing and enabled after cancel, and zero browser runtime errors. `check-recipe.mjs` passed with the manual #14 recipe and another Spanish note: 11 ingredient lines, 10 research actions (garlic/bouillon browse without unit comparison), one unresolved flour identity, headings, failure/retry, result invalidation and mobile layout. Original photo was not uploaded. OCR remains unmeasured.

Existing browser suites also passed: nine real-backend order checks (`LIVE_API=1 MOCK_OCR=1`), including $24 skip/$78 buy and all-skipped protection, and all 15 controlled contract/error/fallback checks.

Live grocery checks on 2026-11-07 at approximately 19:22 UTC observed Ginger Fresh onion and tomato listings plus pantry salt options from existing stores. The 2 lb yellow onion search listing showed USD 2.49, and an earlier product-detail response independently confirmed its 2 lb variant. These are timestamped observations, not guaranteed current prices/delivery. Initial broad retrieval also exposed granulated onion, sundried tomato and paste; added hard-negative tests/exclusions before completion. Subsequent product-detail reads hit a local rate limit and were not bypassed. Source endpoints can leave pack evidence unknown rather than fabricate it. Local raw response: `/tmp/issue20-live-research.json`.

Browser screenshot: `/tmp/issue20-browser/small-quantity-candidates.png` (clearly named fixture grocery, not a live supplier claim). Scripts use Node 24, `BASE_URL=http://localhost:3104` and host `PLAYWRIGHT_MODULE`/`BROWSER_EXECUTABLE`. No new packages, keys or paid services.

## Limits / handoff

This is finite-vocabulary discovery across four fixed stores, not unrestricted internet search or live purchasing. Fresh produce may be sold by weight; no one-tomato-to-pound conversion is inferred. Brands/varieties can require confirmation. Provider availability, location and fluent Spanish review remain separate. Humans review and merge; local preview remains on port 3104.
