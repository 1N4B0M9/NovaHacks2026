# Issue 11 — Ingredient interpretation and Chinese input

**Worker:** backend lead · **Branch:** ingredient-matching · [Issue](https://github.com/1N4B0M9/NovaHacks2026/issues/11)

One parser serves catalog drafts and supplier research. It retains source words, parses purchase quantity and unit on either side of an ingredient, and returns canonical candidates, constraints, localized reasons and catalog-verified SKU references. The exact compatible identity is required for an automatic match. A curated spelling variant can match directly. Other Latin aliases with one insertion, deletion or substitution and at least five characters yield suggestions only. All ties, partial phrases and unreadable spans require review. This design uses deterministic local logic with zero additional model calls or similarity-score calibration.

Simplified and Traditional Chinese, Arabic/full-width digits, common Chinese numerals through 99 and supported written units are accepted in the covered vocabulary. For example, 雞蛋兩打 requests 24 eggs; 燕麦奶一箱 requests one case of oat milk. Regional 斤 and unknown modifiers are held for clarification. Research uses the matched English name; English and Spanish remain the supported review languages.

## Evaluation

The labeled text test uses 24 inputs: 14 correct automatic identities, zero incorrect automatic identities and 10 deferred. Coverage was 14/24. These are developer-authored regression examples covering near spellings, differing varieties, loose units, Simplified/Traditional forms, English/Spanish and mixed lines. They do not establish accuracy on unseen handwriting.

The production vision route sent a synthetic **printed** two-line Chinese PNG to the configured OpenRouter model. HTTP 200 returned 雞蛋兩打 and 燕麥奶一箱. The source second line used simplified 麦; the model changed it to traditional 麥 in two runs, including after strengthening the prompt. POST /api/drafts returned 201 with 24 each of E180 held for pack review and one case of M1 ready. Semantics survived this test; verbatim script preservation did not. Real handwritten Chinese samples, physical camera behavior and fluent human review remain unverified.

## Next handwriting experiment

Collect consented examples from multiple writers, including both scripts, mixed-language notes, uncertain digits, crossed-out text and glare. Record manually transcribed ground truth before running OCR. Score omitted lines, exact quantities and units, incorrect automatic purchases, script substitutions, and corrections per note. Compare full-frame input against a cropped/deskewed version on the same images. If the disagreement rate remains high, compare a dedicated OCR engine on the same set before adding another dependency. Google Cloud Vision lists Chinese handwriting as experimental. [Language table](https://docs.cloud.google.com/vision/docs/languages) · [Handwriting API](https://docs.cloud.google.com/vision/docs/handwriting).
