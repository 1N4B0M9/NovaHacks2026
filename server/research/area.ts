import { matchesTitle, type ResearchIngredient } from "./ingredient";
import type { Offer } from "./rank";
import { parsePack } from "./storefront";

const skipWord =
  "minced powder powdered puree mashed flake flakes chip chips fries fried fry wedge wedges sauce soup seasoning broth juice pickled roasted pancake pancakes hash tots salad hummus dip oil legs leg drumstick tender tenders nugget nuggets soak magnesium turkey butter chocolate crunch truffle cheese gouda pizza bread honey salami burrito rice chutney puff puffs croccantini crushed peeled bell serrano cayenne fresno jalapeno datil beer ale lager lambicus kriek wine ipa stout cider pierogi gnocchi guacamole masher steak beef sirloin grinder refill pasta bar".split(
    " ",
  );

export type Store = { id: string; name: string };
export type GroceryHit = {
  name?: string;
  slug?: string;
  regularPrice?: number | null;
  salePrice?: number | null;
  uom?: string | null;
};

const stores = new Map<string, Promise<Store | undefined>>();
let gate: Promise<unknown> = Promise.resolve();

function limit<T>(run: () => Promise<T>) {
  const next = gate.then(run, run);
  gate = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export function offersFromWholeFoods(
  products: GroceryHit[],
  query: string,
  store: Store,
  retrievedAt: string,
): Offer[] {
  const soldByPound = products.some(
    (product) =>
      (product.uom ?? "").toLowerCase() === "lb" &&
      matchesTitle(query, product.name ?? ""),
  );
  const offers: Offer[] = [];
  for (const product of products) {
    const name = (product.name ?? "").replace(/\s+/g, " ").trim();
    const slug = product.slug ?? "";
    if (!name || !/^[a-z0-9-]+$/i.test(slug)) continue;
    if (!matchesTitle(query, name)) continue;
    if (/\bnot\b|\bno salt\b/i.test(name)) continue;
    if (/\btomato/.test(query) && (hasWord(name, "diced") || /\bno tomato\b/i.test(name)))
      continue;
    if (query === "potatoes" && hasWord(name, "sweet")) continue;
    if (soldByPound && /\b\d+\s*ct\b/i.test(name)) continue;
    if (skipWord.some((word) => hasWord(name, word) && !hasWord(query, word)))
      continue;
    const sized = parsePack(name);
    const pack = sized ?? packFromUnit(product.uom);
    const sticker = priceOf(product);
    const title = name;
    offers.push({
      supplier: store.name ? `Whole Foods Market · ${store.name}` : "Whole Foods Market",
      title,
      productId: slug,
      url: `https://www.wholefoodsmarket.com/grocery/product/${slug}`,
      evidenceUrl: `https://www.wholefoodsmarket.com/search?text=${encodeURIComponent(query)}&store=${store.id}`,
      evidenceKind: "web_search",
      retrievedAt,
      priceMinor: sticker === null ? null : Math.round(sticker * 100),
      currency: sticker === null ? null : "USD",
      packQuantity: pack?.quantity ?? null,
      packUnit: pack?.unit ?? null,
      available: true,
      shippingMinor: null,
      feesMinor: null,
      minimumPacks: 1,
      minimumSpendMinor: 0,
      locationEligible: true,
    });
    if (offers.length === 5) break;
  }
  return offers;
}

function hasWord(text: string, word: string) {
  return new RegExp(`\\b${word}\\b`, "i").test(text);
}

function priceOf(product: GroceryHit) {
  const regular = dollars(product.regularPrice);
  const sale = dollars(product.salePrice);
  if (sale !== null && (regular === null || sale <= regular)) return sale;
  return regular;
}

function dollars(value: number | null | undefined) {
  return typeof value === "number" && value >= 0.3 && value <= 80 ? value : null;
}

function packFromUnit(uom: string | null | undefined) {
  const unit = (uom ?? "").toLowerCase().replace(/\./g, "");
  if (unit === "lb" || unit === "lbs" || unit === "pound")
    return { quantity: 1, unit: "lb" as const };
  if (unit === "oz" || unit === "ounce") return { quantity: 1, unit: "oz" as const };
  if (["each", "ea", "ct"].includes(unit))
    return { quantity: 1, unit: "each" as const };
  return null;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function getJson(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    signal,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "NOVA-ordering/1.0 (local restaurant demo)",
    },
  });
  if (!response.ok) throw new Error("area lookup failed");
  return response.json();
}

async function nearestStore(zip: string, signal: AbortSignal) {
  const code = zip.slice(0, 5);
  const cached = stores.get(code);
  if (cached) return cached;
  const pending = limit(() => lookupStore(code, signal));
  stores.set(code, pending);
  pending.catch(() => stores.delete(code));
  return pending;
}

async function lookupStore(zip: string, signal: AbortSignal) {
  const place = (await getJson(`https://api.zippopotam.us/us/${zip}`, signal)) as {
    places?: { latitude?: string; longitude?: string; "place name"?: string; "state abbreviation"?: string }[];
  };
  const here = place.places?.[0];
  const lat = Number(here?.latitude);
  const lon = Number(here?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  const viewbox = `${lon - 0.2},${lat + 0.2},${lon + 0.2},${lat - 0.2}`;
  const found = (await getJson(
    "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&bounded=1&q=" +
      encodeURIComponent("Whole Foods Market") +
      "&viewbox=" +
      viewbox,
    signal,
  )) as {
    lat?: string;
    lon?: string;
    name?: string;
    address?: Record<string, string>;
  }[];
  const nearby = [...found]
    .map((row) => ({
      row,
      distance: distance(lat, lon, Number(row.lat), Number(row.lon)),
    }))
    .filter((row) => Number.isFinite(row.distance))
    .sort((a, b) => a.distance - b.distance);
  const tried = new Set<string>();
  for (const { row } of nearby) {
    const address = row.address ?? {};
    const candidates = [
      address.neighbourhood,
      address.suburb,
      address.quarter,
      address.city_district,
      row.name,
    ];
    for (const candidate of candidates) {
      const slug = candidate ? slugify(candidate) : "";
      if (!slug || slug === "wholefoodsmarket" || tried.has(slug)) continue;
      tried.add(slug);
      const store = await readStore(slug, signal);
      if (store) return store;
      if (tried.size >= 6) return;
    }
  }
}

function distance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

async function readStore(slug: string, signal: AbortSignal) {
  const response = await fetch(`https://www.wholefoodsmarket.com/stores/${slug}`, {
    signal,
    cache: "no-store",
    redirect: "follow",
    headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0" },
  });
  if (!response.ok) return;
  const html = await response.text();
  const id = html.match(/"storeCode":"(\d+)"/)?.[1];
  if (!id) return;
  const name = html.match(/"locationName":"([^"]+)"/)?.[1] ?? "";
  return { id, name };
}

async function searchStore(query: string, store: Store, signal: AbortSignal) {
  return limit(async () => {
    const url = new URL("https://www.wholefoodsmarket.com/api/search");
    url.searchParams.set("text", query);
    url.searchParams.set("store", store.id);
    url.searchParams.set("limit", "24");
    const body = (await getJson(url.href, signal)) as { results?: GroceryHit[] };
    return body.results ?? [];
  });
}

export async function searchArea(
  item: ResearchIngredient,
  zip: string,
  signal: AbortSignal,
): Promise<Offer[]> {
  const store = await nearestStore(zip, signal);
  if (!store) return [];
  const query =
    item.query === "pepper" && item.unit === "tsp"
      ? "black pepper"
      : item.query;
  const products = await searchStore(query, store, signal);
  return offersFromWholeFoods(products, query, store, new Date().toISOString());
}
