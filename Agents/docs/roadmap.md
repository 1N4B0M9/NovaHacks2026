# MVP implementation roadmap

Both agents maintain this checklist. Each owner updates their section in the same PR as the feature, links an issue or PR and records what they actually verified. A checked box means verified on the linked branch. Merge and integrated demo status are tracked separately. Add or revise rows when scope changes and update the [requirements](requirements.md), [architecture](architecture.md) or [API contract](api-contracts.md) accordingly.

## Backend · lead · issues [#2](https://github.com/1N4B0M9/NovaHacks2026/issues/2) and [#4](https://github.com/1N4B0M9/NovaHacks2026/issues/4)

- [x] Parse typed English/illustrative Spanish notes and retain source text. Hold unknown items, missing units and pack mismatches for review.
- [x] Resolve catalog SKUs and prices. Calculate included-line totals in cents. Verify the $24 skip and $78 buy examples.
- [x] Correct or skip lines; reject empty, unresolved and stale approvals. Save one immutable simulated order per draft, including after retry and restart.
- [x] Expose an optional photo-to-editable-text route. Verify invalid image and unavailable-provider responses.
- [ ] Verify successful transcription on unfamiliar handwriting with an authorized vision model.
- [x] Exercise service, parser and HTTP adapter behavior with the automated test command. See [backend evidence](updates/issue-2.md) and [extraction evidence](updates/issue-4.md).

## Frontend · partner · [#3](https://github.com/1N4B0M9/NovaHacks2026/issues/3)

Photo-first intake follows the frontend owner’s explicit correction on 2026-11-07 ([source relayed in #3](https://github.com/1N4B0M9/NovaHacks2026/issues/3#issuecomment-6710867168)); the requirements reflect that correction. No default pasted-list entry remains. Lead verification is separate from the partner's recorded checks below.

- [x] Capture/upload a handwritten-note photo and chosen review language on mobile; display editable transcription beside the source image. Explicit manual transcription is available after scan failure. Successful OCR handoff verified with fixtures only.
- [x] Show original words, interpretation, supplier item, pack, price and localized review reason. Support correction, buy and explicit skip.
- [x] Show provisional/final totals; block unresolved or empty orders; recover from stale version; render the simulated supplier receipt.
- [x] Verify loading/errors/retry with fixtures and both buying outcomes against the backend. Frontend app/test revision `1a873b2943e0782c42f0fc284818fae7207612b9` plus backend `58559d16783d3e74d619b4d476b566bbc19482da`: 15 fixture checks, 9 live-backend checks, typecheck, production build, 5 backend tests passed. [Evidence and screenshots](updates/issue-3.md). Frontend [PR #9](https://github.com/1N4B0M9/NovaHacks2026/pull/9), branch `frontend-review`. The updated backend at `24ee7f8` also passed all 11 regression tests; its runtime API source is unchanged from `58559d1`.
- [ ] Verify real handwriting transcription with the configured vision provider and native camera hardware. Live image requests returned 503 in the test environment; fallback was exercised. Fluent language review is still needed.

## Integration and release · lead + partner · [#5](https://github.com/1N4B0M9/NovaHacks2026/issues/5)

- [ ] Review the frontend PR at its latest revision and verify both branches together.
- [ ] Run the five-minute demo rehearsal, including unfamiliar input, fallback and one simulated receipt. Obtain fluent review or identify Spanish fixtures as illustrative.
- [ ] Record human merge status and the revision used for the demo.

**Scope boundary.** The simulated order uses one catalog. Issue #10 adds read-only research across multiple suppliers. Live purchasing, forecasting, voice and spend caps remain outside the MVP.

## Ingredient research · backend lead · [#10](https://github.com/1N4B0M9/NovaHacks2026/issues/10)

- [x] Normalize confirmed English/Spanish ingredient lines, hold ambiguities, and research public English storefronts with bounded workers.
- [x] Return timestamped supplier evidence, localized caveats, total required pack cost, alternatives and separate provisional vs verified landed-cost rankings.
- [x] Exercise fixture failures/timeouts and a real Spanish HTTP walkthrough. See [evidence](updates/issue-10.md).
- [ ] Partner may integrate research UI using the additive contract. Human review/merge remains pending.

## Multilingual ingredient matching · backend lead · [#11](https://github.com/1N4B0M9/NovaHacks2026/issues/11)

- [x] Share structured interpretation across drafts and research; preserve quantities, constraints, verified SKU identity and explicit correction.
- [x] Exercise Simplified/Traditional Chinese text, ES/EN, fuzzy suggestions and hard-negative substitutions on labeled fixtures.
- [x] Exercise the real OCR endpoint on a synthetic Chinese image: both ingredients and quantities survived; the model converted one character across scripts. [Evidence](updates/issue-11.md).
- [ ] Validate handwritten Chinese from multiple people and physical camera capture. Camera/file-picker bug tracked under [#13](https://github.com/1N4B0M9/NovaHacks2026/issues/13).
