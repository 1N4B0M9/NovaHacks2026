## Backend interface for #2, #3 and #4
Typed JSON input first. Illustrative demo locales `en` and `es`. Prices in USD cents.
- POST /api/drafts: {text, reviewLanguage}. Returns 201 Draft.
- PATCH /api/drafts/{id}/lines/{lineId}: {version, action:"skip"} or {version, action:"accept_pack", sku, cases} (explicit positive whole cases for the offered SKU) or {version, action:"edit", text} (reinterprets this line while preserving original source). Returns 200 Draft.
- POST /api/drafts/{id}/approve: {version}. Returns 200 Order.
- Draft = {id, version, reviewLanguage, currency:"USD", totalMinor, canApprove, lines}. Line = {id, source, text, sku, label, requestedQuantity, requestedUnit, packSize, packUnit, priceMinor, cases, status, reason}. Unavailable values are null. status = ready|needs_review|skipped. reason = unknown_item|ambiguous_item|missing_quantity|missing_unit|pack_mismatch|unrecognized_input|null. requestedQuantity uses normalized units (24 each for 2 dozen). A held line has null cases and contributes zero to the provisional subtotal.
- Order = {orderId,draftId,version,simulated:true,currency:"USD",totalMinor,lines:[{sku,cases,priceMinor}]}. Error = {error, draft?}; 400 malformed input, 404 missing resource, 409 for stale_version (current draft included), draft_finalized or review_required.
- Sample: “2 doz eggs, 1 case oat milk”. E180 pack 180 each/$54, M1 pack 6 cartons/$24. Skip → 2400. Accept E180/cases:1 → 7800. Approval retries of the finalized version return the same order.
Frontend can use this contract on fixtures now. Backend branch codex/backend-ordering owns tooling. Use Node 24+ and npm ci once the lockfile is available.
Optional POST /api/transcribe takes {image: dataURL} for JPEG, PNG or WebP (up to 4 million encoded characters). Returns {text} for human editing before draft creation, 400 invalid_image, or 503 transcription_unavailable. Offer typed input on failure.

## Ingredient research · issue #10

POST /api/research accepts {text, reviewLanguage, deliveryLocation?, corrections?}. Invoke only after transcription review. The request can contain 1–6 lines, up to 2,000 characters, separated by newlines, semicolons or list commas. Languages: en/es. For an unrecognized line, the merchant can supply corrections such as {lineIndex:0,englishName:"sorghum",displayName:"sorgo",quantity:2,unit:"kg"}. Indexes refer to nonblank split lines. Supported normalized units: g, kg, oz, lb, ml, l, fl oz, each, carton and case. Do not infer carton, case or each conversions without an explicit corresponding pack.

Example request:
```json
{"text":"2 kg de lentejas verdes; huevos?","reviewLanguage":"es","deliveryLocation":"Pittsburgh, PA"}
```

UI shows pending while awaiting the single HTTP response. HTTP 400 means invalid input. HTTP 200 includes status (completed, partial or failed), reviewLanguage, deliveryLocation, localized coverage and items in input order. Item status: completed, partial, no_results, needs_review, timeout or failed. A resolved search without matches counts as completed work. If every line needs correction, status is partial. Per-store statuses identify failures without discarding other evidence.

Illustrative excerpt of a live item (full data includes alternatives and store statuses):
```json
{"source":"2 kg de lentejas verdes","description":"lentejas verdes","query":"green lentils","quantity":2,"unit":"kg","status":"completed","bestComparableUrl":null,"lowestProvisionalUrl":"https://www.palousebrand.com/products/montana-grown-green-lentils","offers":[{"supplier":"Palouse Brand","title":"Green Lentils - 4 lb","productId":"montana-grown-green-lentils","priceMinor":1895,"currency":"USD","packQuantity":4,"packUnit":"lb","packs":2,"merchandiseMinor":3790,"excess":1.628739,"excessUnit":"kg","landedMinor":null,"evidenceKind":"supplier_search"}]}
```

Full offers include source and evidence URLs, retrieval timestamp, availability, shippingMinor, feesMinor, minimumPacks, minimumSpendMinor, locationEligible, knownCostMinor and localized caveats. Unknowns are null. The URL for the lowest verified delivered cost is distinct from a provisional known-cost ranking. The location is user context, never proof of delivery. Ask for the destination and supplier terms before claiming eligibility. Do not convert a research result into a draft line automatically. Existing acceptance, versioning and simulated-approval checks still apply to catalog items. See [live walkthrough](updates/issue-10.md).

## Structured match and Chinese transcription · issue #11

POST /api/transcribe accepts {image,sourceLanguage?}. Omit the hint for automatic reading or choose auto, en, es, zh, zh-Hans or zh-Hant. The response remains {text}; malformed hints return 400 invalid_source_language. Manual correction remains available after 503. The hint concerns text in the photograph, independent of the UI language.

Newly interpreted draft lines include match = {source,phrase,quantity,unit,canonical,constraints,candidates,reason}. Older stored drafts can omit match. Each candidate supplies canonical English name, en/es/zh display labels, verified supplier SKU or null, modifiers, reason (exact_alias, partial_phrase or one_edit) and a localized explanation. A suggested identity does not make the order line ready. No extra request/pending state is needed. Example: POST /api/drafts {"text":"雞蛋兩打，燕麦奶一箱","reviewLanguage":"en"} returns a held E180 line requesting 24 each and a ready M1 line for one case. POST /api/research {"text":"新鲜罗勒 2公斤","reviewLanguage":"es"} searches for “fresh basil”; it creates no local SKU. Edit and approval version semantics remain as specified.
