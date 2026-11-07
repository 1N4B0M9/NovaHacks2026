import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Orders } from "./orders";
import { ingredient, matchIngredient } from "./match";
import { research } from "./research/run";

const recipe = readFileSync("server/fixtures/spanish-recipe.txt", "utf8");
test("manually transcribed recipe separates heading, ingredient identity and supplier readiness", () => {
  const store = new Orders(":memory:");
  try {
    const draft = store.create({ text: recipe, reviewLanguage: "es" });
    assert.deepEqual(draft.headings, ["Reseta de pollo en pinol"]);
    assert.equal(draft.lines.length, 11);
    assert.deepEqual(
      draft.lines.map((l) => l.match?.canonical),
      [
        "whole chicken",
        "potatoes",
        "onion",
        "garlic",
        "tomatoes",
        "green chili",
        "cilantro",
        "salt",
        "pepper",
        "chicken bouillon cubes",
        null,
      ],
    );
    const [chicken, potato, onion, garlic, tomato, , , , , , flour] =
      draft.lines;
    assert.deepEqual(chicken.match?.constraints, ["whole"]);
    assert.equal(chicken.match?.purchaseStatus, "no_local_sku");
    assert.deepEqual(
      [potato.requestedQuantity, potato.requestedUnit],
      [2, "each"],
    );
    assert.deepEqual(
      [onion.requestedQuantity, onion.match?.preparation],
      [0.5, ["picada"]],
    );
    assert.equal(garlic.match?.reason, "missing_unit");
    assert.equal(tomato.reason, "pack_mismatch");
    assert.equal(tomato.cases, null);
    assert.deepEqual(
      [flour.requestedQuantity, flour.requestedUnit, flour.match?.constraints],
      [1.5, "cup", ["dorado"]],
    );
    assert.equal(draft.canApprove, false);
  } finally {
    store.close();
  }
});
test("recipe research keeps whole-line evidence and skips the heading and unresolved items", async () => {
  const result = await research(
    { text: recipe, reviewLanguage: "es" },
    async () => [],
  );
  assert.equal(result.items.length, 12);
  assert.equal(result.items[0].status, "heading");
  assert.deepEqual(result.items[0].stores, []);
  assert.deepEqual(
    result.items
      .filter((i) => i.status === "needs_review")
      .map((i) => i.source),
    ["1 1/2 taza harina de maiz dorado"],
  );
  assert.equal(result.items.find((i) => i.query === "salt")?.unit, "tsp");
  // Missing garlic/bouillon units now permit discovery but not quantity comparison.
  for (const query of ["garlic", "chicken bouillon cubes"]) {
    const item = result.items.find((i) => i.query === query)!;
    assert.equal(item.unit, null);
    assert.equal(item.status, "no_results");
  }
});
test("second Spanish note and unsupported conversions", () => {
  assert.equal(ingredient("dos cebollas picadas")?.query, "onion");
  assert.equal(ingredient("media taza de sal")?.quantity, 0.5);
  for (const s of [
    "1/0 taza de sal",
    "1-2 papas",
    "un ajo",
    "1 taza de cilantro [?]",
  ])
    assert.ok(matchIngredient(s).reason, s);
});
