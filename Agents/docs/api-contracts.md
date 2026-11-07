# Draft order interface

**Proposed handoff · [Issue #1](https://github.com/1N4B0M9/NovaHacks2026/issues/1)**

| Operation | Input | Result |
|---|---|---|
| POST /api/drafts | Text or photo, chosen review language | Draft ID, lines and current total |
| PATCH /api/drafts/{id}/lines/{lineId} | Correct source interpretation, accept a specific offered pack, or skip | Revalidated draft and recalculated total |
| POST /api/drafts/{id}/approve | Draft ID in path | Immutable simulated supplier order; repeated approval returns the existing order |

Each line exposes original words, requested quantity/unit when known, supplier SKU and label when matched, sellable pack, case price, line status and a review reason the UI can localize. Return amounts in integer minor units plus currency. Use ready, needs_review and skipped as line states. A held line stays outside the ready subtotal; label that subtotal as provisional while review is open.

**Shared fixture:** “2 doz eggs, 1 case oat milk.” Eggs request 24, available pack 180, reason pack_mismatch. Milk is ready for one case. Approval returns a conflict while eggs need review. Accepting the offered case includes 180 eggs and one case of milk. Skipping eggs includes only milk. An empty draft cannot be approved. Once approved, edits are rejected. Partner review of this behavior is pending.
