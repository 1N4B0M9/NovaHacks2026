import assert from "node:assert/strict";
import test from "node:test";
import { matchIngredient, ingredient } from "./match";
import { interpret } from "./interpret";
import { Orders } from "./orders";

// Labeled text evaluation; these fixtures measure interpretation, never handwriting accuracy.
const corpus: [string, string | null][] = [
  ["romaine 2 cs.", "romaine"],
  ["2 cajas de lechuga romana", "romaine"],
  ["tomatos 3 lbs", "tomatoes"],
  ["豆奶一箱", null],
  ["燕麦奶一箱", "oat milk"],
  ["兩箱燕麥奶", "oat milk"],
  ["雞蛋十二個", "eggs"],
  ["一打鸡蛋", "eggs"],
  ["４磅番茄", "tomatoes"],
  ["2 cajas oat milk", "oat milk"],
  ["albahaca seca 3 g", "dried basil"],
  ["新鲜罗勒 2公斤", "fresh basil"],
  ["糙米 2 kg", "brown rice"],
  ["2 l de leche de vaca", "dairy milk"],
  ["2 kg black beans", "black beans"],
  ["1 case romain", null],
  ["1 kg fresh or dried basil", null],
  ["鸡蛋[?]箱", null],
  ["oat milk", null],
  ["3 huevos", null],
  ["燕麦奶半箱", null],
  ["2 kg purple rice", null],
  ["1 case lactose-free oat milk", null],
  ["西红柿两斤", null],
];
test("held-out multilingual text classification", () => {
  let correct = 0,
    wrong = 0,
    deferred = 0;
  for (const [source, expected] of corpus) {
    const actual = ingredient(source)?.query ?? null;
    if (actual === null) deferred++;
    else if (actual === expected) correct++;
    else wrong++;
    assert.equal(actual, expected, source);
  }
  assert.equal(wrong, 0);
  console.log("Text fixtures:", {
    total: corpus.length,
    correct,
    wrong,
    deferred,
  });
});
test("fuzzy candidates and unrecognized modifiers never authorize a purchase", () => {
  const fuzzy = matchIngredient("1 case romain");
  assert.equal(fuzzy.candidates[0].canonical, "romaine");
  assert.equal(fuzzy.candidates[0].reason, "one_edit");
  assert.equal(interpret("1", "1 case romain").sku, null);
  const modified = matchIngredient("1 case organic oat milk");
  assert.deepEqual(modified.constraints, ["organic"]);
  assert.ok(modified.reason);
});
test("varieties can be researched with no verified supplier SKU", () => {
  for (const [source, query] of [
    ["2 kg dried basil", "dried basil"],
    ["2 kg fresh basil", "fresh basil"],
    ["无糖燕麦奶1升", "unsweetened oat milk"],
  ]) {
    assert.equal(ingredient(source)?.query, query);
    assert.equal(interpret("1", source).sku, null);
  }
});
test("Chinese note preserves source, holds a pack mismatch and approves only after review", () => {
  const store = new Orders(":memory:");
  try {
    const d = store.create({
      text: "鸡蛋两打，燕麥奶一箱",
      reviewLanguage: "en",
    });
    const [eggs, milk] = d.lines;
    assert.equal(eggs.requestedQuantity, 24);
    assert.equal(eggs.reason, "pack_mismatch");
    assert.equal(milk.cases, 1);
    assert.equal(milk.source, "燕麥奶一箱");
    store.edit(d.id, eggs.id, { action: "skip", version: 1 });
    assert.equal(store.approve(d.id, { version: 2 }).totalMinor, 2400);
  } finally {
    store.close();
  }
});
