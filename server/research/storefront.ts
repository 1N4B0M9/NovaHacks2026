import { matchesTitle, type Ingredient, type Unit } from "./ingredient";
import type { Offer } from "./rank";

export const suppliers = [
  { name: "Palouse Brand", origin: "https://www.palousebrand.com" },
  {
    name: "Country Life Natural Foods",
    origin: "https://countrylifefoods.com",
  },
  { name: "Elmhurst 1925", origin: "https://elmhurst1925.com" },
] as const;

type Product = {
  title: string;
  handle: string;
  price_min: string;
  price_max: string;
  available: boolean;
};
type Variant = {
  id: number;
  title: string;
  price: number;
  available: boolean;
  quantity_rule?: { min: number; max: number | null; increment: number };
};

function parsePack(label: string) {
  // Only a single unambiguous net size, optionally preceded by an explicit multiplier.
  const sizes = [
    ...label
      .toLowerCase()
      .matchAll(
        /(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(fl\s*oz|lbs?|kg|oz|ml|g|l|ct|cartons?)\b/g,
      ),
  ];
  if (
    sizes.length !== 1 ||
    /\d\s*[-–/]\s*\d/.test(label) ||
    /\b(?:case|pack|bag)\s+of\s+\d|\d+\s*[- ](?:pack|count)\b/i.test(label)
  )
    return null;
  const m = sizes[0];
  const unit = m[3].replace(/\s+/g, " ");
  return {
    quantity: Number(m[1] ?? 1) * Number(m[2]),
    unit: (unit === "lbs"
      ? "lb"
      : unit === "ct"
        ? "each"
        : unit === "cartons"
          ? "carton"
          : unit) as Unit,
  };
}

async function getJson(url: URL, signal: AbortSignal) {
  let current = url;
  for (let i = 0; i < 3; i++) {
    const response = await fetch(current, {
      signal,
      cache: "no-store",
      redirect: "manual",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.8",
      },
    });
    if (response.ok) return response.json();
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) break;
    const target = new URL(location, current);
    if (
      target.protocol !== "https:" ||
      target.port ||
      target.hostname.replace(/^www\./, "") !==
        url.hostname.replace(/^www\./, "")
    )
      break;
    current = target;
  }
  throw new Error("supplier request failed");
}
export async function searchStore(
  item: Ingredient,
  store: (typeof suppliers)[number],
  signal: AbortSignal,
): Promise<Offer[]> {
  const search = new URL("/search/suggest.json", store.origin);
  search.search = new URLSearchParams({
    q: item.query,
    "resources[type]": "product",
    "resources[limit]": "6",
  }).toString();
  const [results, cart] = await Promise.all([
    getJson(search, signal),
    getJson(new URL("/cart.js", store.origin), signal).catch(() => null),
  ]);
  const products = results?.resources?.results?.products;
  if (!Array.isArray(products)) throw new Error("invalid search response");
  const currency = typeof cart?.currency === "string" ? cart.currency : null;
  const observed = new Date().toISOString();
  const out: Offer[] = [];
  let detailReads = 0;
  for (const p of products as Product[]) {
    if (
      typeof p?.title !== "string" ||
      typeof p.handle !== "string" ||
      !/^[a-z0-9-]+$/.test(p.handle) ||
      !matchesTitle(item.query, p.title)
    )
      continue;
    const url = new URL("/products/" + p.handle, store.origin);
    const size = parsePack(p.title);
    const price =
      p.price_min === p.price_max && /^\d+\.\d{2}$/.test(p.price_min)
        ? Math.round(Number(p.price_min) * 100)
        : null;
    const base: Offer = {
      supplier: store.name,
      title: p.title,
      productId: p.handle,
      url: url.href,
      evidenceUrl: search.href,
      evidenceKind: "supplier_search",
      retrievedAt: observed,
      priceMinor: price,
      currency,
      packQuantity: size?.quantity ?? null,
      packUnit: size?.unit ?? null,
      available: typeof p.available === "boolean" ? p.available : null,
      shippingMinor: null,
      feesMinor: null,
      minimumPacks: null,
      minimumSpendMinor: null,
      locationEligible: null,
    };
    if ((!size || price === null) && detailReads < 2) {
      detailReads++;
      const detailUrl = new URL(url.href + ".js");
      const detail = await getJson(detailUrl, signal).catch(() => null);
      if (signal.aborted) throw signal.reason;
      if (detail?.title === p.title && Array.isArray(detail.variants)) {
        let added = false;
        for (const v of (detail.variants as Variant[]).slice(0, 12)) {
          if (
            !Number.isSafeInteger(v.price) ||
            v.price < 0 ||
            !Number.isSafeInteger(v.id) ||
            typeof v.title !== "string"
          )
            continue;
          const variantSize = parsePack(
            v.title === "Default Title" ? p.title : v.title,
          );
          // Unknown variants may change the ingredient. Only accept plain size variants.
          if (
            v.title !== "Default Title" &&
            !matchesTitle(item.query, item.query + " " + v.title)
          )
            continue;
          if (
            v.quantity_rule &&
            (v.quantity_rule.increment !== 1 || v.quantity_rule.max !== null)
          )
            continue;
          out.push({
            ...base,
            title:
              v.title === "Default Title" ? p.title : p.title + " — " + v.title,
            productId: String(v.id),
            url: url.href + "?variant=" + v.id,
            evidenceKind: "supplier_product",
            evidenceUrl: detailUrl.href,
            priceMinor: v.price,
            available: typeof v.available === "boolean" ? v.available : null,
            packQuantity: variantSize?.quantity ?? null,
            packUnit: variantSize?.unit ?? null,
            minimumPacks: v.quantity_rule?.min ?? null,
          });
          added = true;
        }
        if (added) continue;
      }
    }
    out.push(base);
  }
  return out;
}
