# Proposed technical architecture

**Approved for build · [Issue #1](https://github.com/1N4B0M9/NovaHacks2026/issues/1)**

## One deployable demo

Selected stack: one TypeScript Next.js app with a mobile browser UI and server routes, a small checked-in JSON catalog, and SQLite for drafts and the simulated outbox on one local demo host. A local presentation avoids a dependency on deployment credentials. The lead owns the root package and app/api. The partner owns the page, layout, styles and UI components.

1. The browser accepts a handwritten-note photo plus an explicit review language, with editable extraction and an explicit manual transcription fallback after scan failure. Show the original locally. Use human-reviewed UI strings for the selected demo languages.
2. A server-side extraction adapter returns source text, candidate item, quantity and unit per line. An optional vision/language model receives only the submitted content using an application credential. If unavailable, accept typed text and use the curated bilingual aliases and units for the demo.
3. The order service resolves aliases to catalog SKUs. It calculates pack conversions and totals using catalog data and integer currency amounts. Uncertain readings, missing units, ambiguous catalog matches and pack mismatches require review. Never let model output determine price or authorize a purchase.
4. The browser renders the supplier label and the merchant's words together with localized explanations. Merchant edits trigger server-side validation. The approval transaction rechecks all lines, requires a nonempty order and stores one immutable supplier preview per draft. Duplicate approval returns that same order.
5. Keep credentials on the server. Use a local single-merchant demo with synthetic inputs. Do not retain raw photos or log notes or credentials.

## Work split and six-hour schedule

Check the expected draft version transactionally on edits and approval. Invalidate affected confirmations on edits. Use a unique order per draft and return the existing order for a retry of the finalized version. Local single-host SQLite is the proposed deployment default.

| Time from start | Order logic owner | Merchant UI/demo owner |
|---|---|---|
| 0–30 min | Agree on catalog and sample responses; try unseen notes and typed fallback | Verify language pair, action labels and supplier preview with the same examples |
| 30–120 min | Implement catalog resolution, review flags and totals | Build intake and review using the agreed responses |
| 120–210 min | Connect photo/text extraction and approval | Connect real routes and exercise both approval outcomes |
| 210–300 min | Run ambiguity, empty order, error and repeat approval checks | Try an unfamiliar note, review translation and rehearse fallback |
| 300–360 min | Fix integration defects and freeze demo data | Rehearse five-minute presentation and prepare submission |

After owner approval, create separate build issues for catalog and order service, merchant review UI, extraction adapter, and integration/demo verification. Both owners share the contract before parallel work. Integration follows the first two components; photo intake can be cut if the text flow demonstrates the full purchasing decision.

## English storefront research · issue #10

Independent of the purchase catalog, POST /api/research starts a per-ingredient worker after scan review. At most two ingredients run concurrently per request. Each queries three fixed English US storefronts with a 6.5-second deadline per ingredient. Each supplier receives one search and one currency lookup, plus at most two product-detail reads; search limits to six candidates. Each redirect is restricted to the same supplier and capped. No model calls or paid search service. Technical references: [Shopify predictive search](https://shopify.dev/docs/api/ajax/reference/predictive-search) and [product data](https://shopify.dev/docs/api/ajax/reference/product).

The normalizer matches explicit English/Spanish aliases and units, or accepts a merchant-confirmed English correction. The provider preserves authoritative listing fields, filters incompatible product titles, and attaches a source URL and observation time. Deterministic ranking converts compatible units, rounds up to whole packs, and reports excess. Unavailable, geographically ineligible, incompatible and unpriced offers cannot win. Unknown costs stay provisional; known landed offers have their own tier. No durable research job, browser checkout, external SKU import, or automatic ordering.

## Post-transcription matching · issue #11

server/match.ts reads the domain vocabulary and verified catalog, parses a quantity plus explicit unit before or after the ingredient and normalizes common Chinese numerals/classifiers. Exact aliases are eligible for automatic matching. One-edit Latin candidates and partial or ambiguous phrases remain blocked. No paid inference is added to either draft edits or research. The order service alone computes packs, prices and approval. The OCR route supports an optional input-language hint and requests preservation of mixed scripts and uncertain spans. See the [evaluation and live Chinese test](updates/issue-11.md).

## Recipe inputs
The shared matcher separates kitchen preparation from retail constraints and stores recognized supplier-independent identities. Titles are kept as draft metadata; research reports them without searching. Fractions and recipe units can be used for research. No mass/count or density conversion is inferred. Up to 16 lines remain bounded by two active ingredient workers and individual deadlines.

## Recipe discovery interface · issue #14

The client consumes optional matching metadata with type-only imports; server matcher and research implementations are not imported into the client runtime. Each eligible line has an explicit research action with a 15-second client deadline, failure/retry state and cancellation on unmount. One line is sent per request, preserving the corrected text and review language. Draft version changes remount line views and clear research evidence. Results display source links, observation timestamps, known costs and caveats without mutating purchase state. Recipe headings remain visible outside purchasable lines. Evidence links permit only HTTP(S).
