# Spanish recipe regression · backend

**Branch:** spanish-recipe-matching · **Depends on:** PR #15 · [Issue #14](https://github.com/1N4B0M9/NovaHacks2026/issues/14)

The manual transcription is a repeatable fixture at server/fixtures/spanish-recipe.txt. No original recipe photo was uploaded. The matcher recognizes recipe headings, Spanish number words, fractions and mixed fractions; teaspoon/cup amounts retain their own units. Implicit counts apply only to whole chicken, potatoes, onion, tomato and green chili. “Picada” is preparation, never a requirement to buy pre-chopped stock. Garlic without a bulb/clove choice and “cubitos de pollo” require clarification; regional “dorado” remains visible. Count-to-weight and volume-to-mass conversions require external evidence and remain blocked.

Production verification: POST /api/drafts classified the heading separately and returned 11 lines. Ten ingredient identities were known, with eight sufficiently clear for research. One tomato counted as one each and could not silently become a 25 lb case. On the same text POST /api/research returned one heading, eight no-results from the checked suppliers, and three lines needing review. A second note, “dos cebollas picadas; 3 kg de lentejas verdes”, yielded two recognized lines, no onion listings and five observed green lentil listings. These are supplier coverage results for that run. Neither text test measured OCR accuracy. Thirty tests and the production build passed.

The partner owns frontend research wiring and UI distinctions. Backend wire examples and per-field semantics were posted to #14 before UI integration. The joint issue remains open for the partner’s browser evidence and human merge.
