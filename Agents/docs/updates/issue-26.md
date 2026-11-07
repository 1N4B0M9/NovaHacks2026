# Public product search when stores have no match

Owner request implemented for [#26](https://github.com/1N4B0M9/NovaHacks2026/issues/26). Branch: `web-product-search`, based on main `c92c279`. No lead progress file was changed. Theme files for #22 and the supplier adapters for #24 were not edited.

## Delivered

- After the fixed storefronts produce no compatible offer, query the public Open Food Facts search for the English ingredient name.
- Keep at most eight parsed hits, then the existing five-offer ranking. Require the ingredient tokens and reject other product forms, including salsa when the line is the herb.
- Publish the product title, a code-derived product URL, the search URL, and the observation time. Parse an unambiguous pack size. Leave price, currency, stock, shipping, and delivery eligibility null.
- Skip the index when a storefront offer is already usable. An empty or failed index preserves no-result, timeout, and all-store failure behavior.

## Evidence

Node 24.14.1: `npm test` passed 42 tests and `npm run typecheck` passed. The new tests cover a 750 g onion listing, exclusion of onion powder, salsa, garlic bread, baguettes, and potato starch, no invented winner, and no index call when a store already matched.

Live `research()` on 2026-11-07, after the storefront check, observed Open Food Facts rows for garlic (`Fresh Garlic` first, price null) and chicken bouillon cubes (title matches, price null). Onion, whole chicken, potatoes, tomatoes, salt, and corn flour already had storefront listings, so the index was not called for them. These are timestamped observations, not a stock or price promise. DuckDuckGo returned a human-check page and Mojeek returned HTTP 403, so those engines are not used.

In the local app, a draft for `4 ajos` showed the new explanation, and Find supplier offers rendered Open Food Facts with Fresh Garlic first and an unconfirmed price. The supplier preview stayed empty, and approval stayed blocked.

## Limits / handoff

This is not a general web crawl and not a best-price claim. DuckDuckGo presented a human-check page and Mojeek returned HTTP 403, so those engines are not called. Humans review and merge.
