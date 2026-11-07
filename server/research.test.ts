import test from "node:test";
import assert from "node:assert/strict";
import { ingredient, matchesTitle } from "./research/ingredient";
import { rank, type Offer } from "./research/rank";
import { research } from "./research/run";
import { searchStore, suppliers } from "./research/storefront";
import { productsFromSearch } from "./research/web";

const item = ingredient("2 kg de lentejas verdes")!;
test("merchant-confirmed translation preserves the source for an unfamiliar ingredient", async () => {
  const res = await research(
    {
      text: "¿2 kg de sorgo?",
      reviewLanguage: "es",
      corrections: [
        {
          lineIndex: 0,
          englishName: "sorghum",
          displayName: "sorgo",
          quantity: 2,
          unit: "kg",
        },
      ],
    },
    async (item) => {
      assert.equal(item.query, "sorghum");
      return [];
    },
    undefined,
    async () => [],
  );
  assert.equal(res.items[0].source, "¿2 kg de sorgo?");
  assert.equal(res.items[0].description, "sorgo");
  assert.equal(res.items[0].status, "no_results");
});
test("storefront attaches a variant-specific price and source; incompatible products stay excluded", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    if (url.pathname === "/cart.js") return Response.json({ currency: "USD" });
    if (url.pathname.endsWith(".js"))
      return Response.json({
        title: "Green Lentils",
        variants: [{ id: 123, title: "2 lb", available: true, price: 700 }],
      });
    return Response.json({
      resources: {
        results: {
          products: [
            {
              title: "Green Lentils",
              handle: "green-lentils",
              price_min: "7.00",
              price_max: "28.00",
              available: true,
            },
            {
              title: "Green Lentils Soup",
              handle: "soup",
              price_min: "1.00",
              price_max: "1.00",
              available: true,
            },
          ],
        },
      },
    });
  });
  const offers = await searchStore(
    item,
    suppliers[0],
    AbortSignal.timeout(1000),
  );
  assert.equal(offers.length, 1);
  assert.equal(offers[0].evidenceKind, "supplier_product");
  assert.equal(offers[0].priceMinor, 700);
  assert.equal(offers[0].packQuantity, 2);
  assert.match(offers[0].url, /variant=123$/);
  assert.equal(offers[0].shippingMinor, null);
});
const example: Offer = {
  supplier: "Test store",
  productId: "one",
  title: "Green Lentils - 1 lb",
  url: "https://example.org/one",
  evidenceUrl: "https://example.org/search",
  evidenceKind: "supplier_search",
  retrievedAt: "2026-11-07T17:00:00Z",
  priceMinor: 1395,
  currency: "USD",
  packQuantity: 1,
  packUnit: "lb",
  available: true,
  shippingMinor: null,
  feesMinor: null,
  minimumPacks: null,
  minimumSpendMinor: null,
  locationEligible: null,
};
test("whole-pack cost in requested units beats misleading sticker price", () => {
  const larger = {
    ...example,
    productId: "four",
    title: "Green Lentils - 4 lb",
    priceMinor: 1895,
    packQuantity: 4,
    url: "https://example.org/four",
  };
  const { offers, bestComparableUrl, lowestProvisionalUrl } = rank(
    item,
    [example, larger],
    "es",
  );
  assert.equal(bestComparableUrl, null);
  assert.equal(lowestProvisionalUrl, larger.url);
  assert.equal(offers[0].packs, 2);
  assert.equal(offers[0].merchandiseMinor, 3790);
  assert.equal(offers[0].excess, 1.628739);
  assert.equal(offers[0].title, larger.title);
  assert.equal(offers[0].landedMinor, null);
  assert.match(offers[0].caveats.join(" "), /Envío/);
});
test("minimums, known fees and delivery change comparable landed cost", () => {
  const known = {
    ...example,
    locationEligible: true,
    minimumPacks: 1,
    minimumSpendMinor: 8000,
    feesMinor: 100,
    shippingMinor: 400,
  };
  const { offers, bestComparableUrl } = rank(
    item,
    [
      known,
      { ...known, productId: "sold", url: "sold", available: false },
      {
        ...known,
        productId: "wrong-area",
        url: "wrong-area",
        locationEligible: false,
      },
    ],
    "en",
  );
  assert.equal(bestComparableUrl, known.url);
  assert.equal(offers[0].packs, 6);
  assert.equal(offers[0].landedMinor, 8870);
  assert.equal(offers.filter((o) => o.canCompare).length, 1);
});
test("incompatible dimensions and unknown currencies have no winner", () => {
  const { lowestProvisionalUrl } = rank(
    item,
    [
      { ...example, packUnit: "ml" },
      { ...example, currency: null },
    ],
    "en",
  );
  assert.equal(lowestProvisionalUrl, null);
});
test("preserves constraints and refuses guessed or substituted ingredients", () => {
  assert.equal(
    ingredient("1 l de leche de avena sin azúcar")?.query,
    "unsweetened oat milk",
  );
  for (const s of [
    "2 kg de lentejas verdes [?]",
    "eggs ×2",
    "2 cases eggs or tomatoes",
    "1 l lactose-free oat milk",
  ])
    assert.equal(ingredient(s), null);
  assert.equal(matchesTitle("rice", "rice flour - 1 lb"), false);
  assert.equal(matchesTitle("oat milk", "Oat Milk Chocolate - 1 l"), false);
});
test("worker failures preserve other results; unclear lines never make requests", async () => {
  const calls: string[] = [];
  const r = await research(
    { text: "2 kg de lentejas verdes; unknown", reviewLanguage: "es" },
    async (i, s) => {
      calls.push(i.query);
      if (s.name === "Elmhurst 1925") throw Error();
      return s.name === "Palouse Brand" ? [example] : [];
    },
  );
  assert.equal(calls.length, suppliers.length);
  assert.deepEqual(new Set(calls), new Set(["green lentils"]));
  assert.equal(r.status, "partial");
  assert.equal(r.items[0].status, "partial");
  assert.equal(r.items[1].status, "needs_review");
  assert.match(r.items[0].message, /proveedores/);
  assert.equal(r.items[0].offers[0].priceMinor, 1395);
});
test("no results differ from failed providers", async () => {
  const input = { text: "1 dozen eggs", reviewLanguage: "en" };
  const noWeb = async () => [];
  assert.equal(
    (await research(input, async () => [], undefined, noWeb)).items[0].status,
    "no_results",
  );
  assert.equal(
    (
      await research(
        input,
        async () => {
          throw Error();
        },
        undefined,
        noWeb,
      )
    ).status,
    "failed",
  );
});
test("slow ingredient times out independently", async () => {
  const r = await research(
    { text: "1 lb green lentils; 1 lb brown rice", reviewLanguage: "en" },
    async (item, _s, signal) => {
      if (item.query === "brown rice") return [];
      return new Promise((_, reject) => {
        const timer = setTimeout(() => reject(Error("missed timeout")), 1000);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(signal.reason);
          },
          { once: true },
        );
      });
    },
    20,
    async () => [],
  );
  assert.deepEqual(
    r.items.map((i) => i.status),
    ["timeout", "no_results"],
  );
});
test("at most two ingredients start concurrently and input order is preserved", async () => {
  let active = 0,
    peak = 0;
  const r = await research(
    {
      text: "1 lb rice; 2 lb tomatoes; 3 lb lentils; 4 lb chickpeas",
      reviewLanguage: "en",
    },
    async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((done) => setTimeout(done, 5));
      active--;
      return [];
    },
    undefined,
    async () => [],
  );
  assert.equal(peak, 2 * suppliers.length);
  assert.deepEqual(
    r.items.map((i) => i.query),
    ["rice", "tomatoes", "lentils", "chickpeas"],
  );
});
test("public product listings fill an empty storefront search without inventing a price", async () => {
  let calls = 0;
  const result = await research(
    { text: "1 lb onion", reviewLanguage: "en" },
    async () => [],
    undefined,
    async () => {
      calls++;
      return productsFromSearch(
        "onion",
        {
          hits: [
            {
              code: "20175887",
              product_name: "Red onions",
              quantity: "750g",
            },
            {
              code: "11111111",
              product_name: "Onion powder",
              quantity: "50 g",
            },
            {
              code: "222",
              product_name: "Onion",
              quantity: "1 each",
            },
            { code: "not-a-code", product_name: "Onion", quantity: "1 lb" },
          ],
        },
        "https://search.openfoodfacts.org/search?q=onion",
        "2026-11-07T19:40:00.000Z",
      );
    },
  );
  assert.equal(calls, 1);
  const item = result.items[0];
  assert.equal(item.status, "completed");
  assert.equal(item.offers.length, 1);
  assert.equal(item.offers[0].productId, "20175887");
  assert.equal(item.offers[0].evidenceKind, "web_search");
  assert.equal(item.offers[0].priceMinor, null);
  assert.equal(item.offers[0].packQuantity, 750);
  assert.equal(item.offers[0].packUnit, "g");
  assert.equal(item.bestCandidateId, null);
  assert.equal(item.stores.at(-1)?.supplier, "Open Food Facts");
  assert.match(item.message, /Public product listings/);
  assert.match(item.offers[0].url, /^https:\/\/world\.openfoodfacts\.org\/product\/20175887$/);
});
test("a storefront match skips the public product index", async () => {
  let calls = 0;
  const result = await research(
    { text: "1 lb green lentils", reviewLanguage: "en" },
    async () => [example],
    undefined,
    async () => {
      calls++;
      return [];
    },
  );
  assert.equal(calls, 0);
  assert.equal(result.items[0].offers[0].supplier, "Test store");
  assert.equal(result.items[0].stores.some((s) => s.supplier === "Open Food Facts"), false);
});
test("chili plurals match and salsa does not count as the herb", () => {
  assert.equal(matchesTitle("green chili", "Green chilies"), true);
  assert.equal(matchesTitle("cilantro", "Cilantro Salsa"), false);
  assert.equal(matchesTitle("garlic", "Garlic Baguettes"), false);
  assert.equal(matchesTitle("garlic", "Garlic Bread"), false);
  assert.equal(matchesTitle("potatoes", "Potato Starch"), false);
});
