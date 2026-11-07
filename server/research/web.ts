import { matchesTitle, type ResearchIngredient } from "./ingredient";
import type { Offer } from "./rank";
import { parsePack } from "./storefront";

const searchOrigin = "https://search.openfoodfacts.org";
const productOrigin = "https://world.openfoodfacts.org";

export function productsFromSearch(
  query: string,
  payload: unknown,
  evidenceUrl: string,
  retrievedAt: string,
): Offer[] {
  const hits = (payload as { hits?: unknown }).hits;
  if (!Array.isArray(hits)) throw new Error("invalid product search");
  const offers: Offer[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (!hit || typeof hit !== "object") continue;
    const row = hit as { code?: unknown; product_name?: unknown; quantity?: unknown };
    const code = typeof row.code === "string" ? row.code : "";
    const title = typeof row.product_name === "string" ? row.product_name.trim() : "";
    if (!/^[0-9]{4,20}$/.test(code) || !title || title.length > 180 || seen.has(code))
      continue;
    if (!matchesTitle(query, title)) continue;
    seen.add(code);
    const size = typeof row.quantity === "string" ? parsePack(row.quantity) : null;
    offers.push({
      supplier: "Open Food Facts",
      title,
      productId: code,
      url: `${productOrigin}/product/${code}`,
      evidenceUrl,
      evidenceKind: "web_search",
      retrievedAt,
      priceMinor: null,
      currency: null,
      packQuantity: size?.quantity ?? null,
      packUnit: size?.unit ?? null,
      available: null,
      shippingMinor: null,
      feesMinor: null,
      minimumPacks: null,
      minimumSpendMinor: null,
      locationEligible: null,
    });
    if (offers.length === 8) break;
  }
  return offers;
}

export async function searchWeb(
  item: ResearchIngredient,
  signal: AbortSignal,
): Promise<Offer[]> {
  const url = new URL("/search", searchOrigin);
  url.searchParams.set("q", item.query);
  url.searchParams.set("page_size", "8");
  url.searchParams.set("fields", "code,product_name,quantity");
  const response = await fetch(url, {
    signal,
    cache: "no-store",
    redirect: "manual",
    headers: {
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.8",
      "User-Agent": "NOVA-ordering/1.0 (local restaurant demo)",
    },
  });
  if (!response.ok) throw new Error("product search failed");
  return productsFromSearch(
    item.query,
    await response.json(),
    url.href,
    new Date().toISOString(),
  );
}
