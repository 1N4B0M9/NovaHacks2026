import test from "node:test";
import assert from "node:assert/strict";
import {
  ingredient,
  researchIngredient,
  assessTitle,
} from "./research/ingredient";
import { rank, type Offer } from "./research/rank";
import { parsePack, searchStore, suppliers } from "./research/storefront";
import { research } from "./research/run";
import { Orders } from "./orders";
const onion: Offer = {
  supplier: "Fixture grocery",
  productId: "one",
  title: "Onion - 1 each",
  url: "https://example.org/onion",
  evidenceUrl: "https://example.org/onion",
  evidenceKind: "supplier_product",
  retrievedAt: "2026-11-07T20:00:00Z",
  priceMinor: 100,
  currency: "USD",
  packQuantity: 1,
  packUnit: "each",
  available: true,
  shippingMinor: null,
  feesMinor: null,
  locationEligible: null,
  minimumPacks: 1,
  minimumSpendMinor: null,
  purchaseIncrement: 1,
  maximumPacks: null,
};
test("fractional recipe demand buys a whole onion and reports surplus", () => {
  for (const text of ["1/2 cebolla picada", "0.5 each onion"]) {
    const item = ingredient(text)!;
    assert.equal(item.quantity, 0.5);
    const result = rank(item, [onion], "es");
    assert.equal(result.offers[0].packs, 1);
    assert.equal(result.offers[0].excess, 0.5);
    assert.equal(result.offers[0].knownCostMinor, 100);
    assert.equal(result.bestCandidateId, null);
  }
});
test("small demand compares actual pack cost instead of cheap bulk unit price", () => {
  const result = rank(
    ingredient("0.5 each onion")!,
    [
      onion,
      { ...onion, productId: "bulk", packQuantity: 20, priceMinor: 1000 },
    ],
    "en",
  );
  assert.equal(result.offers[0].productId, "one");
});
test("branded or variety products are candidates, incompatible forms stay excluded", () => {
  for (const [query, title] of [
    ["onion", "Fresh Yellow Onion - 1 each"],
    ["salt", "Morton Iodized Salt - 26 oz"],
    ["tomatoes", "Roma Tomatoes - 1 lb"],
  ])
    assert.equal(assessTitle(query, title).compatibility, "needs_confirmation");
  for (const [query, title] of [
    ["onion", "Onion powder"],
    ["onion", "Onion, Granulated, Organic"],
    ["tomatoes", "Tomato, Organic, Sundried, Halves"],
    ["tomatoes", "Hunts Tomato Paste"],
    ["onion", "Green onions"],
    ["whole chicken", "Chicken bouillon cubes"],
    ["whole chicken", "Whole Chicken Breast"],
    ["almond flour", "Almond Wheat Flour"],
    ["fresh basil", "Dried basil"],
    ["gluten-free flour", "Wheat flour"],
    ["almond flour", "Wheat flour"],
    ["oat milk", "Chocolate Oat Milk"],
  ])
    assert.equal(assessTitle(query, title).compatibility, "incompatible");
});
test("unknown conversions and missing demand retain observed pack evidence", async () => {
  const salt = {
    ...onion,
    title: "Salt - 26 oz",
    packQuantity: 26,
    packUnit: "oz" as const,
  };
  const offer = rank(ingredient("1 cucharadita de sal")!, [salt], "en")
    .offers[0];
  assert.equal(offer.priceMinor, 100);
  assert.equal(offer.packQuantity, 26);
  assert.equal(offer.packs, null);
  assert.equal(offer.quantityCompatibility, "unknown");
  const item = researchIngredient("garlic")!;
  assert.equal(item.quantity, null);
  assert.equal(item.unit, null);
  const result = await research(
    { text: "garlic", reviewLanguage: "en" },
    async () => [{ ...onion, title: "Garlic - 1 each" }],
  );
  assert.equal(result.items[0].offers.length, 1);
  assert.equal(result.items[0].offers[0].knownCostMinor, null);
  assert.equal(researchIngredient("garlic [?]"), null);
});
test("minimums, increments and maximums govern purchase quantities", () => {
  const item = ingredient("4 each onion")!;
  const valid = rank(
    item,
    [{ ...onion, minimumPacks: 2, purchaseIncrement: 3, maximumPacks: 8 }],
    "en",
  ).offers[0];
  assert.equal(valid.packs, 5);
  assert.equal(valid.excess, 1);
  const invalid = rank(item, [{ ...onion, maximumPacks: 3 }], "en");
  assert.equal(invalid.offers[0].canCompare, false);
  assert.equal(invalid.lowestProvisionalUrl, null);
});
test("tied delivered costs have no winner; duplicate variants collapse; list capped at five", () => {
  const known = {
    ...onion,
    shippingMinor: 0,
    feesMinor: 0,
    minimumSpendMinor: 0,
    locationEligible: true,
  };
  const items = [
    known,
    ...Array.from({ length: 7 }, (_, i) => ({
      ...known,
      productId: String(i),
      url: `https://example.org/${i}`,
    })),
  ];
  const result = rank(ingredient("1 each onion")!, [...items, known], "en");
  assert.equal(result.offers.length, 5);
  assert.equal(result.bestCandidateId, null);
  assert.equal(result.bestComparableUrl, null);
  const unique = rank(
    ingredient("1 each onion")!,
    [known, { ...known, productId: "costlier", priceMinor: 200 }],
    "en",
  );
  assert.equal(unique.bestCandidateId, "Fixture grocery:one");
});
test("pack parser accepts explicit individual units but refuses ambiguous packs", () => {
  assert.deepEqual(parsePack("Fresh Onion - each"), {
    quantity: 1,
    unit: "each",
  });
  assert.deepEqual(parsePack("3 ct"), { quantity: 3, unit: "each" });
  for (const title of ["bag of 3 each", "1/2 each", "1-2 each", "Onion"])
    assert.equal(parsePack(title), null, title);
});
test("source adapter preserves supplier increments and excludes incompatible search hits", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    if (url.pathname === "/cart.js") return Response.json({ currency: "USD" });
    if (url.pathname.endsWith(".js"))
      return Response.json({
        title: "Yellow Onion",
        variants: [
          {
            id: 123,
            title: "1 each",
            price: 125,
            available: true,
            quantity_rule: { min: 2, increment: 3, max: 8 },
          },
        ],
      });
    return Response.json({
      resources: {
        results: {
          products: [
            {
              title: "Yellow Onion",
              handle: "onion",
              price_min: "1.25",
              price_max: "1.25",
              available: true,
            },
            {
              title: "Onion Powder",
              handle: "powder",
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
    ingredient("0.5 each onion")!,
    suppliers[0],
    AbortSignal.timeout(1000),
  );
  assert.equal(offers.length, 1);
  assert.equal(offers[0].purchaseIncrement, 3);
  assert.equal(offers[0].maximumPacks, 8);
  assert.equal(offers[0].packUnit, "each");
});
test("confirming a suggested interpretation is a versioned correction, never a blind purchase", () => {
  const db = new Orders(":memory:");
  try {
    const draft = db.create({ text: "1 case romain", reviewLanguage: "en" });
    assert.equal(draft.lines[0].match?.candidates[0].canonical, "romaine");
    assert.equal(draft.canApprove, false);
    const next = db.edit(draft.id, draft.lines[0].id, {
      version: 1,
      action: "edit",
      text: "1 case romaine",
    });
    assert.equal(next.lines[0].source, "1 case romain");
    assert.equal(next.version, 2);
    assert.throws(() => db.approve(draft.id, { version: 1 }));
  } finally {
    db.close();
  }
});
