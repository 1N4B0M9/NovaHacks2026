# ADR 003 — Candidate discovery separate from purchase readiness

**Status:** Implemented under the owner's issue #20 assignment; PR review/merge pending.
**Date:** 2026-11-07
**Source:** https://github.com/1N4B0M9/NovaHacks2026/issues/20

The four-item order catalog and strict title allowlist caused readable recipe ingredients to dead-end. Fractional demand, uncertain variety and unknown quantity conversion need different treatment from an invalid ingredient.

Use deterministic canonical identities and explicit product-form rules to generate a bounded shortlist. Known identity permits discovery without known demand. Supplier listings preserve observed evidence; uncertain variety/brand remains a candidate for the merchant, not an automatic substitution. Compare cost only with compatible quantities and expose required whole packs and surplus. Retain a null best candidate for uncertain evidence or ties. Original note, constraints and correction remain visible.

Alternatives: keep exact-only matching (poor recall); relax all title checks (wrong forms/substitutions); use an embedding/LLM reranker (additional cost, latency and evaluation burden without fixing supply coverage). Deterministic candidates plus merchant review directly address current failures without new paid services.

Add Ginger Fresh through the existing public Shopify adapter. Verified [grocery catalog](https://gingerfresh.com/collections/all-products), [onion listing](https://gingerfresh.com/products/yellow-onion), search JSON, cart currency and product variants. Access to Farmbox Arizona, DoorDash grocery pages and FreshDirect returned 403 during probes; those providers are not integrated. Shopify APIs may rate-limit or change; later detail reads were locally rate-limited, so missing detail remains unknown. No bypass or purchase attempt was made.

Tradeoffs: a finite vocabulary and product-form rules cannot classify every food; merchant confirmation and evaluation remain necessary. Four fixed stores are limited coverage, not an internet-wide best-deal claim. Delivery/stock/minimums require verification. Count-to-mass and recipe-volume-to-mass remain unresolved without reliable evidence. Revisit providers if merchant location or ingredient coverage is inadequate, and evaluate any learned ranker on labeled mistakes before trusting it.
