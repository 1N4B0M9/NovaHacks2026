# Merchant ordering MVP

**Draft for discussion · [Issue #1](https://github.com/1N4B0M9/NovaHacks2026/issues/1)**

One merchant, one supplier, one verified demo language pair, and a small catalog with fixed SKUs, pack sizes and prices. A merchant can photograph a closing list or paste text, choose their review language and compare their original words with supplier-ready lines.

## Acceptance examples

- A mixed-language list requesting two dozen eggs and one case of oat milk preserves each original line. The milk matches a catalog case. For the eggs, show 24 requested, 180 in the available case, 156 extra, and the actual fixture price in the chosen review language.
- Approval stays blocked until the owner accepts the full egg case or explicitly skips eggs. Buying includes one case of each product. Skipping retains the egg line in review while the final supplier preview and total include only the milk.
- Missing units, unknown items and illegible text prompt a correction or skip. A merchant can compare corrections with the original. Skipping every line leaves nothing to approve.
- Supplier preview uses the supplier's SKU, pack, quantity and price regardless of the review language. Approval creates one simulated order even if the button is tapped twice.
- Test two unfamiliar notes, including a mixed-language alias and a unit ambiguity. If photo extraction fails, the user can paste or correct text and complete the same workflow.

## Boundaries

Use synthetic notes or anonymized samples with permission. No real purchases, supplier messages, voice channel, multiple distributors or inventory forecasts in this draft. Primary success measure for the demo is whether a merchant can correctly state the purchased quantities and total before approving. Time savings need a measured baseline.
