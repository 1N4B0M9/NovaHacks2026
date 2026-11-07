import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Orders } from "./orders";
import { interpret } from "./interpret";

for (const [action, total] of [
  ["skip", 2400],
  ["accept_pack", 7800],
] as const) {
  test(action + " preserves original and freezes an idempotent receipt", () => {
    const store = new Orders(":memory:");
    try {
      const draft = store.create({
        text: "2 docenas de huevos, 1 case oat milk",
        reviewLanguage: "es",
      });
      const eggs = draft.lines[0];
      assert.equal(eggs.requestedQuantity, 24);
      assert.equal(eggs.packSize, 180);
      assert.equal(draft.totalMinor, 2400);
      assert.throws(
        () => store.approve(draft.id, { version: 1 }),
        /review_required/,
      );
      const next = store.edit(draft.id, eggs.id, {
        action,
        sku: "E180",
        cases: 1,
        version: 1,
      });
      assert.equal(next.lines[0].source, "2 docenas de huevos");
      assert.equal(next.totalMinor, total);
      assert.throws(
        () => store.approve(draft.id, { version: 1 }),
        /stale_version/,
      );
      const receipt = store.approve(draft.id, { version: 2 });
      assert.equal(receipt.totalMinor, total);
      assert.equal(receipt.lines.length, action === "skip" ? 1 : 2);
      assert.deepEqual(store.approve(draft.id, { version: 2 }), receipt);
      assert.throws(
        () => store.edit(draft.id, eggs.id, { action: "skip", version: 2 }),
        /draft_finalized/,
      );
    } finally {
      store.close();
    }
  });
}
test("editing an accepted pack invalidates confirmation; skip-all cannot be approved", () => {
  const store = new Orders(":memory:");
  try {
    const d = store.create({ text: "2 doz eggs", reviewLanguage: "en" });
    const id = d.lines[0].id;
    store.edit(d.id, id, {
      version: 1,
      action: "accept_pack",
      sku: "E180",
      cases: 1,
    });
    const revised = store.edit(d.id, id, {
      version: 2,
      action: "edit",
      text: "3 doz eggs",
    });
    assert.equal(revised.lines[0].requestedQuantity, 36);
    assert.equal(revised.totalMinor, 0);
    assert.equal(revised.canApprove, false);
    assert.throws(
      () => store.edit(d.id, id, { version: 2, action: "skip" }),
      /stale_version/,
    );
    store.edit(d.id, id, { version: 3, action: "skip" });
    assert.throws(() => store.approve(d.id, { version: 4 }), /review_required/);
  } finally {
    store.close();
  }
});
test("unfamiliar lines remain unresolved and cannot be bought by blind confirmation", () => {
  const store = new Orders(":memory:");
  try {
    const d = store.create({
      text: "2 calendulas; 2 huevos; 1 case eggs or oat milk; 2 cases oat milk unsweetened",
      reviewLanguage: "es",
    });
    assert.deepEqual(
      d.lines.map((l) => l.reason),
      ["unknown_item", "missing_unit", "ambiguous_item", "unrecognized_input"],
    );
    assert.throws(
      () =>
        store.edit(d.id, d.lines[1].id, {
          version: 1,
          action: "accept_pack",
          sku: "E180",
          cases: 1,
        }),
      /invalid_pack/,
    );
    assert.equal(interpret("1", "1 caja de leche de avena").cases, 1);
  } finally {
    store.close();
  }
});
test("a ZIP selects the best shipped offer and adds it without review", async () => {
  const store = new Orders(":memory:");
  try {
    const draft = store.create({
      text: "2 kg de lentejas verdes",
      reviewLanguage: "en",
    });
    assert.equal(draft.canApprove, false);
    const cart = await store.recommend(
      draft.id,
      { version: 1, zip: "10011" },
      async () => ({
        items: [
          {
            source: "2 kg de lentejas verdes",
            offers: [
              {
                canCompare: true,
                packs: 2,
                priceMinor: 1895,
                packQuantity: 4,
                packUnit: "lb",
                supplier: "Palouse Brand",
                title: "Green Lentils - 4 lb",
                productId: "green-lentils-4-lb",
                url: "https://www.palousebrand.com/products/green-lentils-4-lb",
              },
              {
                canCompare: true,
                packs: 1,
                priceMinor: 9000,
                packQuantity: 18,
                packUnit: "lb",
                supplier: "Palouse Brand",
                title: "Green Lentils - 18 lb",
                productId: "green-lentils-18-lb",
                url: "https://www.palousebrand.com/products/green-lentils-18-lb",
              },
            ],
          },
        ],
      }),
    );
    assert.equal(cart.deliveryZip, "10011");
    assert.equal(cart.canApprove, true);
    assert.equal(cart.lines[0].status, "ready");
    assert.equal(cart.lines[0].label, "Green Lentils - 4 lb");
    assert.equal(cart.lines[0].cases, 2);
    assert.equal(cart.totalMinor, 3790);
    const receipt = store.approve(draft.id, { version: cart.version });
    assert.equal(receipt.lines[0].sku, "green-lentils-4-lb");
    await assert.rejects(
      () => store.recommend(draft.id, { version: cart.version, zip: "10011" }),
      /draft_finalized/,
    );
  } finally {
    store.close();
  }
});
test("a nearby web listing is added when the stores have no comparable price", async () => {
  const store = new Orders(":memory:");
  try {
    const draft = store.create({
      text: "un pollo entero",
      reviewLanguage: "es",
    });
    const cart = await store.recommend(
      draft.id,
      { version: 1, zip: "10011" },
      async () => ({
        items: [
          {
            source: "un pollo entero",
            offers: [
              {
                evidenceKind: "web_search",
                supplier: "Whole Foods Market",
                title: "Whole Chicken",
                productId: "whole-chicken",
                url: "https://www.wholefoodsmarket.com/grocery/product/whole-chicken",
                priceMinor: null,
              },
            ],
          },
        ],
      }),
    );
    assert.equal(cart.lines[0].status, "ready");
    assert.equal(cart.lines[0].label, "Whole Chicken");
    assert.equal(cart.lines[0].supplier, "Whole Foods Market");
    assert.equal(cart.lines[0].priceMinor, null);
    assert.equal(cart.canApprove, true);
  } finally {
    store.close();
  }
});
test("an unmatched line is left out of the cart", async () => {
  const store = new Orders(":memory:");
  try {
    const draft = store.create({
      text: "2 calendulas",
      reviewLanguage: "en",
    });
    const cart = await store.recommend(
      draft.id,
      { version: 1, zip: "94110" },
      async () => ({ items: [{ source: "2 calendulas", offers: [] }] }),
    );
    assert.equal(cart.lines[0].status, "skipped");
    assert.equal(cart.canApprove, false);
    await assert.rejects(
      () => store.recommend(draft.id, { version: 1, zip: "abc" }),
      /invalid_location/,
    );
  } finally {
    store.close();
  }
});
test("receipt survives reopening the database", () => {
  const dir = mkdtempSync(join(tmpdir(), "nova-store-"));
  const file = join(dir, "orders.sqlite");
  try {
    const first = new Orders(file);
    const d = first.create({ text: "1 case oat milk", reviewLanguage: "en" });
    const receipt = first.approve(d.id, { version: 1 });
    first.close();
    const second = new Orders(file);
    try {
      assert.deepEqual(second.approve(d.id, { version: 1 }), receipt);
    } finally {
      second.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
