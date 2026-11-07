# Merchant ordering MVP

**Approved MVP · [Issue #1](https://github.com/1N4B0M9/NovaHacks2026/issues/1)**

One merchant, one supplier and one demo language pair. Use English and illustrative Spanish for initial fixtures. Use fluent-reviewed translations when available and label unreviewed translations illustrative. Photo intake is the primary flow, following the owner’s explicit correction in #3. Review editable extraction before matching; manual transcription is an explicit fallback after scan failure. Preserve original words beside supplier-ready lines.

## Acceptance examples

- A mixed-language list requesting two dozen eggs and one case of oat milk preserves each original line. The milk matches a catalog case. For the eggs, show 24 requested, 180 in the available case, 156 extra, and the actual fixture price in the chosen review language.
- Approval stays blocked until the owner accepts the full egg case or explicitly skips eggs. Buying includes one case of each product. Skipping retains the egg line in review while the final supplier preview and total include only the milk.
- Missing units, unknown items and illegible text prompt a correction or skip. A merchant can compare corrections with the original. Skipping every line leaves nothing to approve.
- Supplier preview uses the supplier's SKU, pack, quantity and price regardless of the review language. Approval creates one simulated order even if the button is tapped twice.
- Test two unfamiliar notes, including a mixed-language alias and a unit ambiguity. If photo extraction fails, show the failure and offer a new photo or explicit manual transcription of the photographed note. Successful extraction must remain editable before supplier matching.

## Boundaries

Changes to item, SKU or quantity invalidate the affected confirmation and recalculate the subtotal. Reject stale approval. Approving the same finalized version twice returns the same order. Changes after approval require a new draft.

Use synthetic notes or anonymized samples with permission. No real purchases, supplier messages, voice channel, multiple distributors or inventory forecasts in this draft. Primary success measure for the demo is whether a merchant can correctly state the purchased quantities and total before approving. Time savings need a measured baseline.

## Approved extension · issue #10

Multi-store research is available after merchant review. Preserve source lines and quantities; use English searches and English product titles with localized explanations in English or Spanish. Research must return bounded partial results, uncertainty, compatible-unit cost comparisons and links to the observed evidence. Incomplete shipping/fees, destination and minimum order must remain visible. An ambiguous ingredient requires correction. A product recommendation is informational; the existing simulated purchase flow remains limited to its own catalog.

## Matching extension · issue #11

Accept supported English, Spanish, Simplified and Traditional Chinese ingredient text from the verified transcription. Draft and research share canonical ingredient matching. Preserve modifiers, source words, quantity and unit. Automatically resolve only exact compatible identities; show fuzzy or ambiguous candidates for correction. The merchant still chooses English or Spanish for review. Chinese input support is separate from translated interface copy.

## Spanish recipe regression
The manually transcribed sample in issue #14 must distinguish a recipe title, recognized ingredients, unresolved readings, no verified supplier SKU and no research results. Test fractions, mixed fractions, preparation words, regional modifiers and unsupported conversions without fabricating prices or stock.

## Recipe review and discovery UI · issue #14

Display ingredient identity independently of local catalog availability. Preserve recipe headings outside the purchase lines, preparation words and unresolved constraints. Only research clear, non-skipped lines after the user requests it; show English product titles and explanations in the chosen review language. Show no results, supplier failure and clarification distinctly. Research cannot add a supplier SKU or change the simulated order. Edits clear prior displayed research so stale results cannot be mistaken for evidence about the corrected ingredient.
