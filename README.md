# NOVA restaurant supply ordering

Start with the [implementation and OpenRouter setup guide](Agents/docs/implementation-guide.md), [API test walkthrough](Agents/docs/test-api.md) and [shared feature roadmap](Agents/docs/roadmap.md).

Use Node.js 24 or newer. Run `npm ci`, then `npm run dev`. Backend routes live under `/api`; the partner supplies the merchant-facing page. Run `npm test`, `npm run typecheck`, and `npm run build` for verification.

The local demo saves drafts to `data/orders.sqlite`. Override with `NOVA_DB_PATH` if needed. All prices and catalog entries are illustrative. Orders remain simulated.

The merchant starts by photographing or uploading a note. Configure the server-only OpenRouter settings in the setup guide for live transcription. After a scan, the merchant checks the text and can correct it before creating a draft. When transcription fails, the UI offers manual entry of the pictured note. The HTTP contract is in [Agents/docs/api-contracts.md](Agents/docs/api-contracts.md).
