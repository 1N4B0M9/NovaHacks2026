# Spanish recipe regression · frontend

Issue: [#14](https://github.com/1N4B0M9/NovaHacks2026/issues/14). Branch: `codex/fix-recipe-matching`, based on backend `eb7cec5` / PR #16. This note belongs to the frontend partner; the backend report stays in issue-14.md.

## Outcome

The UI displays recognized ingredients even when no local SKU exists, preserves headings outside purchase lines, exposes preparation and unresolved constraints, and shows clarification separately from purchase availability. Clear, non-skipped ingredients can query English storefronts with explanations in the selected language. Offers show source links, observation time, comparable known cost and uncertainty; they never enter the simulated order. Failed requests can be retried, and edits invalidate displayed research. The backend matcher is reused unchanged.

## Verification

- 30 backend tests passed, typecheck and production build passed.
- `tests/frontend/check-recipe.mjs`: real local draft/edit API with mocked OCR and controlled supplier responses. The manual recipe fixture produces 11 ingredient cards, one preserved heading, eight research actions and three clarification holds. Verified fractional onion quantity, preparation, original text after correction, no-results, failure/retry, result clearing after edit, 390px mobile layout, and no browser runtime errors.
- Second note: `dos cebollas picadas; 3 kg de lentejas verdes`. Verified recognized identities, English offer title, Spanish caveats, provisional costs and blocked approval. Offer data in this assertion is a clearly named fixture.
- A real browser request for `dos cebollas picadas` completed with no matching listings. Direct HTTP verification also returned 200/no_results and all three stores checked. An initial browser run timed out during concurrent production building; the completed rerun passed. No claim that suppliers stock this recipe.
- Existing frontend suite: nine live-backend checks passed with `LIVE_API=1 MOCK_OCR=1`, including $24 skip, $78 buy, skip-all, edit invalidation and receipt. OCR responses are mocked; these tests do not evaluate handwriting accuracy.
- Existing contract fixture suite: all 15 checks passed, including stale version recovery, network retry, finalized protection, invalid photo and manual OCR fallback.
- Local screenshots: `/tmp/novahacks-recipe-evidence/recipe-mobile.png`, `/tmp/novahacks-recipe-evidence/offers-mobile.png`, `/tmp/novahacks-recipe-live/`.

Run scripts with Node 24, `BASE_URL=http://localhost:3104`, and the host's `PLAYWRIGHT_MODULE` / `BROWSER_EXECUTABLE`. No package changes were required.

## Limits and next step

The original handwritten image was not sent externally. OCR accuracy, native camera and fluent Spanish review remain separate checks. Supplier coverage is limited to the backend's fixed storefronts and simulated ordering remains the four-item catalog. Garlic units, bouillon units and the regional flour modifier still require clarification as the backend specifies. Humans review/merge PR #16 and this dependent frontend PR. The preview remains running on port 3104.
