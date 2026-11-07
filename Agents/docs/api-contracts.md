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
