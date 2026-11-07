# Issue 3 — Frontend / UI

**Issue:** https://github.com/1N4B0M9/NovaHacks2026/issues/3
**Worker:** Partner / Codex
**Branch:** `codex/frontend-review`
**Status:** Frontend implemented; backend integration verification in progress

## Authorization and scope

The owner explicitly assigned #3 for implementation in this chat. The checkout's older planning status is superseded for this scoped assignment; shared progress remains owned by the lead. Frontend owns `app/page.tsx`, `app/layout.tsx`, styles, UI components, frontend fixtures/checks, and this note. Server, API routes, package files, and the canonical contract are unchanged.

## Work completed

- Mobile-first typed intake and illustrative English/Spanish UI.
- Original source and editable interpretation alongside supplier SKU, normalized quantity, pack, and price.
- Explicit positive whole-case selection, buy/skip, visible skipped lines, and server-sourced totals.
- Approval blocked for unresolved/all-skipped drafts; immutable simulated order receipt from the API response.
- Pending controls, network retry, stale-draft replacement without automatic mutation replay, finalized-draft recovery, and accessible labels/status messages.
- Frontend wire types follow the backend owner's [issue handoff](https://github.com/1N4B0M9/NovaHacks2026/issues/3#issuecomment-6710745494). Fixtures exist only in tests; the app always calls the real API.

## Verification so far

- Isolated temporary Next.js harness: TypeScript check passed.
- `node tests/frontend/check-ui.mjs` with the host's Playwright/browser supplied through environment variables: **12 fixture browser checks passed**.
- Fixture checks include $24 skip, $78 buy, all-skipped/unknown blocking, edit invalidation, Spanish receipt, invalid case counts, stale conflict, network retry, finalized conflict, and responsive overflow checks.
- Inspected mobile intake/review/receipt and desktop intake screenshots. No visual overflow found at 390px and 1440px.
- These first checks use contract-shaped fixtures and are not backend integration evidence. Integration with backend PR #6 is next.

## How to run frontend checks

Run against a serving app with Playwright available. `PLAYWRIGHT_MODULE` can point to an external installed Playwright package; `BROWSER_EXECUTABLE` optionally selects an installed Chromium executable. No frontend dependency changes are required.

```sh
BASE_URL=http://localhost:3103 node tests/frontend/check-ui.mjs
LIVE_API=1 BASE_URL=http://localhost:3104 node tests/frontend/check-ui.mjs
```

The first command intercepts API traffic with test fixtures. The second exercises the real backend, including an idempotent approval retry. Screenshots default to `/tmp/novahacks-ui-evidence`; override with `UI_OUTPUT`.

## Limits / next action

English/Spanish translations and catalog data remain illustrative and unverified. Photo intake is optional and outside this assignment's typed-first implementation. API contract and architecture changes are unnecessary because the implementation consumes the lead's contract unchanged. No PR merge is authorized; lead/human review follows integration evidence.
