# NOVA restaurant supply ordering

Use Node.js 24 or newer. Run `npm ci`, then `npm run dev`. Backend routes live under `/api`; the partner supplies the merchant-facing page. Run `npm test`, `npm run typecheck`, and `npm run build` for verification.

The local demo saves drafts to `data/orders.sqlite`. Override with `NOVA_DB_PATH` if needed. All prices and catalog entries are illustrative. Orders remain simulated.

Typed input runs offline. For optional photo transcription, set server-only `OPENROUTER_API_KEY` and `OPENROUTER_VISION_MODEL` to an authorized application key and image-capable model. The transcription is editable before draft creation. The HTTP contract is in [Agents/docs/api-contracts.md](Agents/docs/api-contracts.md).
