import { test } from "node:test";
import assert from "node:assert/strict";
import { Orders } from "./orders";
import { research } from "./research/run";
import { matchIngredient } from "./match";
import { readFileSync } from "node:fs";
import { transcribeLocally } from "./chinese-ocr";

test("local Simplified Chinese reader transcribes the printed demo without an external model", async () => {
  const image =
    "data:image/png;base64," +
    readFileSync("tests/fixtures/chinese-order.png").toString("base64");
  const { text } = await transcribeLocally(image, "zh");
  assert.deepEqual(
    text
      .trim()
      .split(/\r?\n/)
      .map((line: string) => line.replace(/\s/g, "")),
    ["鸡蛋1箱", "燕麦奶1箱"],
  );
});

test("local OCR spacing preserves the two original lines and produces a $78 Chinese receipt", () => {
  const store = new Orders(":memory:");
  try {
    const d = store.create({
      text: "鸡 蛋 1 箱\n燕 麦 奶 1 箱",
      reviewLanguage: "zh",
    });
    assert.equal(d.reviewLanguage, "zh");
    assert.deepEqual(
      d.lines.map((l) => [l.source, l.sku, l.cases]),
      [
        ["鸡 蛋 1 箱", "E180", 1],
        ["燕 麦 奶 1 箱", "M1", 1],
      ],
    );
    assert.equal(store.approve(d.id, { version: d.version }).totalMinor, 7800);
    assert.ok(matchIngredient("鸡 蛋 [?] 箱").reason);
  } finally {
    store.close();
  }
});
test("Chinese review localizes research messages while preserving the English query", async () => {
  const result = await research(
    { text: "鸡蛋 1 箱", reviewLanguage: "zh" },
    async () => [],
  );
  assert.equal(result.items[0].query, "eggs");
  assert.equal(result.items[0].description, "鸡蛋");
  assert.match(result.items[0].message, /商店/);
});
