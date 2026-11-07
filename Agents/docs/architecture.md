# Proposed technical architecture

**Planning draft · [Issue #1](https://github.com/1N4B0M9/NovaHacks2026/issues/1)**

## One deployable demo

Proposed stack: one TypeScript Next.js app with a mobile browser UI and server routes, a small checked-in JSON catalog, and SQLite for drafts and the simulated outbox on one local demo host. A local presentation avoids a dependency on deployment credentials. Confirm stack with both collaborators before building.

1. The browser accepts a photo or pasted text plus an explicit review language. Show the original locally. Use human-reviewed UI strings for the selected demo languages.
2. A server-side extraction adapter returns source text, candidate item, quantity and unit per line. An optional vision/language model receives only the submitted content using an application credential. If unavailable, accept typed text and use the curated bilingual aliases and units for the demo.
3. The order service resolves aliases to catalog SKUs. It calculates pack conversions and totals using catalog data and integer currency amounts. Uncertain readings, missing units, ambiguous catalog matches and pack mismatches require review. Never let model output determine price or authorize a purchase.
4. The browser renders the supplier label and the merchant's words together with localized explanations. Merchant edits trigger server-side validation. The approval transaction rechecks all lines, requires a nonempty order and stores one immutable supplier preview per draft. Duplicate approval returns that same order.
5. Keep credentials on the server. Use a local single-merchant demo with synthetic inputs. Do not retain raw photos or log notes or credentials.

## Proposed work split and six-hour schedule

| Time from start | Order logic owner | Merchant UI/demo owner |
|---|---|---|
| 0–30 min | Agree on catalog and sample responses; try unseen notes and typed fallback | Verify language pair, action labels and supplier preview with the same examples |
| 30–120 min | Implement catalog resolution, review flags and totals | Build intake and review using the agreed responses |
| 120–210 min | Connect photo/text extraction and approval | Connect real routes and exercise both approval outcomes |
| 210–300 min | Run ambiguity, empty order, error and repeat approval checks | Try an unfamiliar note, review translation and rehearse fallback |
| 300–360 min | Fix integration defects and freeze demo data | Rehearse five-minute presentation and prepare submission |

After owner approval, create separate build issues for catalog and order service, merchant review UI, extraction adapter, and integration/demo verification. Both owners share the contract before parallel work. Integration follows the first two components; photo intake can be cut if the text flow demonstrates the full purchasing decision.
