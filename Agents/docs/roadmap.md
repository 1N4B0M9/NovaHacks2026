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

Partner reports a photo-first UI and nine passing browser checks on their local integration checkout. Lead verification awaits the published frontend revision. Direct typed intake is currently an open scope difference from the approved requirements.

- [ ] Capture typed/pasted notes and chosen review language on mobile. Optional photo input can fall back to editable text.
- [ ] Show original words, interpretation, supplier item, pack, price and localized review reason. Support correction, buy and explicit skip.
- [ ] Show provisional/final totals; block unresolved or empty orders; recover from stale version; render the simulated supplier receipt.
- [ ] Verify loading, errors, retry and both buying outcomes against the backend. Link frontend PR, tested revision and evidence.

## Integration and release · lead + partner · [#5](https://github.com/1N4B0M9/NovaHacks2026/issues/5)

- [ ] Review the frontend PR at its latest revision and verify both branches together.
- [ ] Run the five-minute demo rehearsal, including unfamiliar input, fallback and one simulated receipt. Obtain fluent review or identify Spanish fixtures as illustrative.
- [ ] Record human merge status and the revision used for the demo.

**Scope boundary.** Live purchasing, multiple suppliers, forecasting, voice and spend caps are outside the approved MVP. Merchant benefits remain hypotheses until validated.
