# Issue 10 — English supplier research with localized results

**Worker:** backend lead · **Branch:** ingredient-research · [Issue](https://github.com/1N4B0M9/NovaHacks2026/issues/10)

After a merchant confirms the scan, POST the reviewed text, language, and optional delivery location to /api/research. Source text survives normalization; unresolved lines can be corrected explicitly. The endpoint returns scoped English listing evidence and localized ranking rationale. The three public suppliers are Palouse Brand, Country Life Natural Foods and Elmhurst 1925. No account or search-model key is required. Existing order API and frontend files are unchanged.

## Repeat the live walkthrough

Run Node 24+, npm ci, then npm run dev. If your network requires an HTTP proxy, use a Node version supporting NODE_USE_ENV_PROXY=1 with the host's configured HTTPS proxy. In a second PowerShell:

```powershell
$body = @{ text='2 kg de lentejas verdes; 7 lb de lentejas marrones; huevos?'; reviewLanguage='es'; deliveryLocation='Pittsburgh, PA' } | ConvertTo-Json
$result = Invoke-RestMethod 'http://localhost:3000/api/research' -Method Post -ContentType application/json -Body $body
$result.items | Select-Object query,status,message,lowestProvisionalUrl
```

On November 7, 2026 at 18:43 UTC, a real request to the **production HTTP route** returned Spanish results from public supplier searches. For 2 kg of green lentils, two [4 lb packs](https://www.palousebrand.com/products/montana-grown-green-lentils) at $18.95 cost $37.90, with 1.628739 kg excess. Alternatives were one [18 lb pack](https://www.palousebrand.com/products/green-lentils-18-lb) at $52.95 or five [1 lb packs](https://www.palousebrand.com/products/green-lentils-1-lb-non-gmo-vegan-non-irradiated-will-sprout-kosher-vegan-grown-pacific-northwest) at $69.75. [Live search evidence](https://www.palousebrand.com/search/suggest.json?q=green+lentils&resources%5Btype%5D=product&resources%5Blimit%5D=6). For 7 lb of brown lentils the first provisional result was two [5 lb packs](https://www.palousebrand.com/products/brown-lentils-5-lb) at $21.95, totaling $43.90. “huevos?” was held for review and triggered zero supplier queries. The overall result was partial. All costs are observations at retrieval time. The suppliers did not establish delivered cost to Pittsburgh, so bestComparableUrl remained null.

## Verification and limitations

All 21 tests and the TypeScript no-emit check passed. Next.js production build generated the research route. Verification used Node 24.

Deterministic fixtures cover pack conversions, sticker vs purchase price, minimums, fees, stock, location, failed/timed-out workers, unsupported text, corrected ingredients and search-vs-product evidence. Real prices above came from the live HTTP route, separately from those fixtures. No checkout, order mutation, inventory forecast, or UI claim of universal lowest cost. The frontend owner received the [additive contract](https://github.com/1N4B0M9/NovaHacks2026/issues/3#issuecomment-6711432176).
