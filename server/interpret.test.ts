import assert from "node:assert/strict";
import { test } from "node:test";
import { interpret } from "./interpret";

test("whole catalog packs convert to cases without rounding", () => {
  const line = interpret("line", "360 huevos");
  assert.equal(line.reason, "missing_unit");
  assert.equal(line.cases, null);
  const exact = interpret("line", "30 docenas de huevos");
  assert.equal(exact.requestedQuantity, 360);
  assert.equal(exact.cases, 2);
  assert.equal(exact.status, "ready");
});

test("fractional cases remain unresolved even when the unit matches", () => {
  const line = interpret("line", "7 cartons oat milk");
  assert.equal(line.requestedQuantity, 7);
  assert.equal(line.packSize, 6);
  assert.equal(line.reason, "pack_mismatch");
  assert.equal(line.cases, null);
});

test("invalid quantities never produce purchasable lines", () => {
  for (const text of ["0 cases eggs", "-1 case eggs", "1.5 cases eggs", "1-2 cases eggs"]) {
    const line = interpret("line", text);
    assert.equal(line.status, "needs_review", text);
    assert.equal(line.cases, null, text);
  }
});

test("correcting a line preserves the merchant's original words", () => {
  const line = interpret("line", "avena?", "1 caja de leche de avena");
  assert.equal(line.source, "avena?");
  assert.equal(line.text, "1 caja de leche de avena");
  assert.equal(line.sku, "M1");
  assert.equal(line.cases, 1);
});
