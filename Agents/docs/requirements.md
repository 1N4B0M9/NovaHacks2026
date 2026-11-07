# Merchant ordering MVP

**Approved MVP · [Issue #1](https://github.com/1N4B0M9/NovaHacks2026/issues/1)**

One merchant, one supplier and one demo language pair. Use English and illustrative Spanish for initial fixtures. Use fluent-reviewed translations when available and label unreviewed translations illustrative. Primary intake is a photograph of handwritten kitchen notes in another language. Capture or upload a photo, extract an editable list, and compare it with the original image before supplier matching. Direct pasted/prewritten lists are not the primary user journey; manual transcription is an explicit fallback after a failed scan. Preserve original words beside supplier-ready lines.

This photo-first amendment follows the frontend owner’s explicit instruction in chat on 2026-11-07, relayed in [issue #3](https://github.com/1N4B0M9/NovaHacks2026/issues/3#issuecomment-6710867168), and supersedes the earlier typed-first intake assumption.

## Acceptance examples

- A mixed-language list requesting two dozen eggs and one case of oat milk preserves each original line. The milk matches a catalog case. For the eggs, show 24 requested, 180 in the available case, 156 extra, and the actual fixture price in the chosen review language.
- Approval stays blocked until the owner accepts the full egg case or explicitly skips eggs. Buying includes one case of each product. Skipping retains the egg line in review while the final supplier preview and total include only the milk.
- Missing units, unknown items and illegible text prompt a correction or skip. A merchant can compare corrections with the original. Skipping every line leaves nothing to approve.
- Supplier preview uses the supplier's SKU, pack, quantity and price regardless of the review language. Approval creates one simulated order even if the button is tapped twice.
- Test two unfamiliar notes, including a mixed-language alias and a unit ambiguity. If photo extraction fails, show the failure and offer a new photo or explicit manual transcription of the photographed note. Successful extraction must remain editable before supplier matching.

## Boundaries

Changes to item, SKU or quantity invalidate the affected confirmation and recalculate the subtotal. Reject stale approval. Approving the same finalized version twice returns the same order. Changes after approval require a new draft.

Use synthetic notes or anonymized samples with permission. No real purchases, supplier messages, voice channel, multiple distributors or inventory forecasts in this draft. Primary success measure for the demo is whether a merchant can correctly state the purchased quantities and total before approving. Time savings need a measured baseline.
