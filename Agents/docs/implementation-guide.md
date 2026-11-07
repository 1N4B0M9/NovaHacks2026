# From handwritten note to simulated supplier receipt

## How implementation started

The planning council narrowed the project to one restaurant, one supplier and a purchasing decision the merchant can verify. The lead built the order backend on backend-ordering (PR #7). The partner built the browser workflow on frontend-review (PR #9). Both PRs were merged. The original backend could accept typed lists directly; the partner's owner clarified that the merchant experience starts with a photograph. The draft API still takes text because that is the output of the photo transcription step.

## Connect a vision model on Windows

The vision model is a hosted program that takes an image and returns text. OpenRouter routes the request to the model named in the server environment. The code has no hard-coded model. For the first test, use Google Gemini 2.5 Flash, model ID `google/gemini-2.5-flash`. OpenRouter lists image input and text output for this ID. Its performance on this project's notes is unverified.

1. From the project root, open `.env.local` beside package.json. Supply the event-issued application key locally. This file is ignored by Git. Use these two settings:

   ```dotenv
   OPENROUTER_API_KEY=replace_with_your_event_key
   OPENROUTER_VISION_MODEL=google/gemini-2.5-flash
   ```

2. Check `node --version`. The project requires Node 24+. Install dependencies with `npm ci`, run `npm test`, and start the app with `npm run dev`. If the server was running, stop and restart it after changing the settings.
3. Visit the local URL printed by Next.js. Upload a real JPEG photo of a two-line kitchen note. Compare the first returned text with the photo before making any corrections. Record omissions and incorrect digits or units.
4. To test the model call independently of the browser, run this in a second PowerShell window. Replace the path and port as needed. The example sends a JPEG to the running app; the app sends that photo to OpenRouter using the configured key.

   ```powershell
   $photoPath = 'C:\path\to\note.jpg'
   $image = 'data:image/jpeg;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes($photoPath))
   $body = @{ image = $image } | ConvertTo-Json -Compress
   Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/transcribe' -ContentType 'application/json' -Body $body
   ```

   A successful response has a text field containing the transcription. HTTP 400 means the image payload failed validation. Use JPEG, PNG or WebP with the matching data URL type and at most 4 million encoded characters. The browser automatically resizes; the PowerShell example does not. HTTP 503 covers a missing setting, upstream rejection, timeout or unusable output. Check the model ID, account/key access and credits, restart the server, then inspect OpenRouter activity. The app currently cannot distinguish these causes in its response.

## Who owns each step

| Step | Code and behavior |
|---|---|
| Capture | Partner: app/components/photo-intake.tsx reads camera/file input, scales the longest side to at most 2,200 pixels, encodes JPEG and sends it to POST /api/transcribe. |
| Transcribe | Lead: app/api/transcribe/route.ts sends a prompt and the image to OpenRouter's chat completions API. It requests one item per line in the original language, retaining units and using [?] for unreadable text. Timeout is 15 seconds. The browser displays the photo and editable text, or offers manual transcription after failure. |
| Interpret | Lead: POST /api/drafts splits the confirmed text into lines. server/interpret.ts recognizes curated English and Spanish aliases and unit expressions against server/catalog.json. The four synthetic products are eggs, oat milk, tomatoes and romaine. Unknown items and unrecognized quantities require review. |
| Review | Partner: app/page.tsx and app/components/review-line.tsx display requested quantity, available pack, price and order total. The merchant can correct a line, skip it or explicitly accept an offered number of cases. PATCH /api/drafts/{id}/lines/{lineId} revalidates edits and increments the draft version. |
| Approve | Lead: server/orders.ts checks the submitted version, requires at least one ready line and no unresolved lines, and writes one immutable simulated receipt. POST /api/drafts/{id}/approve returns the same receipt on repeat approval. No order is sent to a supplier. |

## Why these decisions were made

One Next.js/TypeScript app lets the phone-facing page and server use the same origin and API contract. Only the server needs the model key. A fixture catalog supplies pack sizes and prices in integer cents. Standard application logic computes order quantities and totals. SQLite stores drafts and receipts on one demo host in data/orders.sqlite. A transaction and draft version protect concurrent changes and repeated clicks. The browser keeps the photo for comparison; the local database stores the draft and receipt.

## Evidence and open work

Independent review paired frontend a6d3702 and backend 24ee7f8. The integrated production build, 11 backend tests, 15 fixture browser checks and nine real-backend browser checks passed. The eight real image calls in the live browser checks used the unavailable-provider fallback. Fixture success used mocked transcription.

The independent review also reproduced approval during an unsaved line correction: changing one milk case to two and approving before saving produced the old $24 receipt. The lead requested a frontend fix with save/cancel regression coverage.

Next: run a genuine photo call with the configured key, evaluate unfamiliar handwriting and unclear units, fix and verify pending-edit approval, then rehearse one end-to-end scan on the presentation phone. Treat Spanish fixtures and merchant benefit as unvalidated until reviewed.

Further reading: [API contract](api-contracts.md), [local storage decision](decisions/ADR-001-local-ordering.md), [feature roadmap](roadmap.md), [PowerShell ordering walkthrough](test-api.md), [frontend test evidence](updates/issue-3.md), [OpenRouter model listing](https://openrouter.ai/google/gemini-2.5-flash).
