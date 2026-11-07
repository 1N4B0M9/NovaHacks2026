# Issue 3 — Frontend / UI

**Issue:** https://github.com/1N4B0M9/NovaHacks2026/issues/3
**Worker:** Partner / Codex
**Branch:** `codex/frontend-review`
**Status:** Ready for lead review; live transcription provider smoke check remains external

## Authorization and scope

The owner assigned #3 for implementation in this chat, then explicitly corrected intake to **photograph handwritten notes in another language → extract an editable list → supplier review**. That instruction supersedes the prior typed-first plan. The correction was [posted to the lead](https://github.com/1N4B0M9/NovaHacks2026/issues/3#issuecomment-6710867168); the lead owns updates to shared product/architecture docs.

Frontend owns `app/page.tsx`, `app/layout.tsx`, styles, UI components, frontend fixtures/checks, and this task note/evidence. Server, API routes, package files, and the canonical contract are unchanged. No branches have been merged.

## Final behavior

- Mobile camera capture and photo upload are the default intake. There is no default paste/prewritten-list field.
- JPG/PNG/WebP photos are validated and resized on-device before `POST /api/transcribe`, respecting its encoded-size limit. Images stay in page memory for comparison; no browser persistence is introduced.
- The photo remains visible beside editable extracted text and in supplier review. Users verify quantities/units before requesting matches.
- Failed transcription offers a clearer-photo retry or explicitly labeled manual transcription of the photographed note. It never fabricates a successful extraction.
- English/Spanish UI, source-preserving corrections, catalog SKU/pack/price display, explicit whole-case purchase decisions, skip, and server-sourced totals.
- Missing quantities and unknown items require correction or skip; only a `pack_mismatch` offers case acceptance.
- Unresolved and all-skipped drafts cannot be approved. A successful API response produces a clearly simulated immutable receipt.
- Pending controls, network retry, stale-draft replacement without automatic mutation replay, finalized-draft recovery, focused error feedback, and announced total updates.
- The app always calls real endpoints. Mock responses exist only in browser tests.

## Verified evidence

Tested the frontend overlaid onto backend PR [#6](https://github.com/1N4B0M9/NovaHacks2026/pull/6), commit `58559d16783d3e74d619b4d476b566bbc19482da`, in an isolated detached integration checkout. No backend changes were brought into the frontend branch.

- **15 contract-fixture browser checks passed.** Covers photo-first entry, successful mocked transcription, invalid image, service-failure fallback, $24 skip, $78 buy, Spanish receipt, unknown/all-skipped blocking, missing quantity, edit invalidation, invalid case counts, stale recovery, network retry, finalized-draft recovery, and responsive layouts.
- **9 real-backend browser checks passed**, on both development and production builds. Covers $24 milk-only receipt, $78 eggs/milk receipt, idempotent approval retry, empty/unknown blocking, edit invalidation, missing quantity, Spanish UI, and responsive layout.
- **Important:** all 8 image submissions in the real-backend suite returned `503 transcription_unavailable`; those runs exercised the explicit manual-transcription fallback. The 12 successful transcription responses in the fixture suite were mocked. Live handwriting recognition and accuracy are **not verified**.
- Integrated `npm run typecheck`: passed.
- Integrated `npm test`: **5 backend regression tests passed** with Node 24.22.1. The initial sandbox run hit the runner's IPC restriction; the permitted rerun passed unchanged.
- Integrated `npm run build`: passed with Next.js 16.4.5, including TypeScript and production route generation.
- `git diff --check`: passed. No uncaught browser/hydration errors in the final suites.
- Visually inspected mobile scan, transcription, review and receipt plus desktop intake/review. No horizontal overflow at 390px and 1440px. Native camera hardware was not tested; file upload and capture-control wiring were exercised in Chromium.

### Screenshots

These are synthetic test data, not merchant evidence. Transcription/review fixture screenshots use generated note images and mocked OCR; the receipt screenshot comes from the real order backend after manual fallback.

- [Mobile photo intake](issue-3-evidence/mobile-scan.png)
- [Editable extracted list — fixture](issue-3-evidence/mobile-transcription-fixture.png)
- [Desktop supplier review — fixture](issue-3-evidence/desktop-review-fixture.png)
- [Real-backend $78 simulated receipt](issue-3-evidence/mobile-order-live.png)

## Reproducing checks

Use Node 24+ with the lead's locked dependencies and this frontend together. A Playwright installation is needed for the browser script; `PLAYWRIGHT_MODULE` may point to an external package so repository package files need not change. `BROWSER_EXECUTABLE` optionally selects an installed Chromium binary.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run dev -- --webpack -p 3104
BASE_URL=http://localhost:3104 node tests/frontend/check-ui.mjs
LIVE_API=1 BASE_URL=http://localhost:3104 node tests/frontend/check-ui.mjs
```

The first browser invocation mocks both transcription and draft endpoints. `LIVE_API=1` intercepts neither: if transcription is unavailable it verifies the explicit manual fallback before exercising the live order service. Screenshots default to `/tmp/novahacks-ui-evidence`; override with `UI_OUTPUT`.

This host supplied Playwright through `PLAYWRIGHT_MODULE=/Users/nathanmorelli/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright` and Chromium through `BROWSER_EXECUTABLE=/Users/nathanmorelli/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`. These are host-specific test overrides, not application dependencies.

## Remaining lead / human checks

- Configure the lead-owned vision provider and run a real handwritten English/Spanish camera-to-list smoke test before the demo. Configuration values stay server-side and must not be posted in GitHub.
- Review illustrative translations with a fluent speaker; catalog packs/prices remain unverified fixtures.
- Update the lead-owned PRD/architecture to make photo intake core rather than optional. The frontend consumes the existing transcription and order wire contracts unchanged.
- Integrate with #6 and review/merge through the humans. No push to main, merge, or deployment was performed.
