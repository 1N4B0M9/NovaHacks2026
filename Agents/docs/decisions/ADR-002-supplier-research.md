# ADR 002 — Bounded supplier research

**Status:** Proposed for owner review in issue #10.

Start research after the merchant reviews the transcription. Use independent server-side workers and direct public Shopify supplier APIs with no paid model/search calls. This delivers first-party price and pack evidence from a bounded set of English-language US retailers. It also makes a timeout on one ingredient independent of other results. A general search engine plus an LLM would broaden discovery, introduce credentials/costs, and still require supplier verification.

The suggested order is read-only. External listings have no authority to mutate an approved draft. The fixed-catalog endpoint continues to own simulated orders; adding live supplier SKUs to that contract requires a separate accepted change. For local delivery, verify stock, destination, fees and minimums with the seller. Without them, show provisional known costs. Revisit provider selection if the tested stores rarely stock the merchant's ingredients.
