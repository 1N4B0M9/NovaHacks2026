# ADR 004 — Public product search when storefronts have no match

**Status:** Implemented pending owner review
**Date:** 2026-11-07
**Discussed in:** https://github.com/1N4B0M9/NovaHacks2026/issues/26
**Approved by:** Pending. The owner asked for web search when ingredient lookup finds nothing.

## Context / problem

Recognized recipe ingredients often end as `no_results` because research queries four fixed Shopify storefronts. The merchant sees no product to compare. A general web search was requested so an empty store check does not stop discovery.

## Options considered
- **A:** Query a general search engine and rank the pages. DuckDuckGo returned a human-check page, and Mojeek returned HTTP 403 for this client. Bypassing those checks is out of scope.
- **B:** Query the public Open Food Facts search index for the English ingredient name, keep the existing title rules, and leave price and delivery unknown.
- **C:** Loosen storefront title matching until something matches. That increases wrong-form substitutions without adding suppliers that stock the ingredient.

## Decision and rationale

Use option B only after storefront ranking has no compatible offer. One JSON request, eight hits, and a four-second limit stay inside the current ingredient budget. Product URLs are constructed from the numeric code. Observed pack text can be parsed. Missing price, stock, and delivery stay null, so these rows cannot become the verified delivered-cost winner or a simulated-order SKU.

## Negative consequences / risks

The index is global packaged-food evidence, not a Pittsburgh shelf or a price quote. Variety and brand still need confirmation. Fresh items may be missing or described in another language and are then excluded. The index can rate-limit or change its response shape. Coverage is still not the open web.

## Revisit trigger

Revisit if the owner supplies a search credential, or if a grocery source that allows automated access covers the same ingredients with observed prices.
