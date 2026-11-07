import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/transcribe/route";
import { readFileSync } from "node:fs";

function input(sourceLanguage: unknown) {
  return new Request("http://localhost/api/transcribe", {
    method: "POST",
    body: JSON.stringify({
      sourceLanguage,
      image: "data:image/png;base64,AA==",
    }),
  });
}
test("rejects an invalid source-language hint before provider access", async () => {
  assert.equal((await POST(input(["zh"]))).status, 400);
});
test("obsolete local-only requests never forward an image to OpenRouter", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () =>
    assert.fail("unexpected network call"),
  );
  const response = await POST(
    new Request("http://localhost/api/transcribe", {
      method: "POST",
      body: JSON.stringify({
        image: "data:image/png;base64,AA==",
        engine: "local-zh",
      }),
    }),
  );
  assert.equal(response.status, 400);
  assert.equal(fetch.mock.callCount(), 0);
});
test("unavailable verifier returns local lines requiring review", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw Error("provider unavailable");
  });
  const image =
    "data:image/png;base64," +
    readFileSync("tests/fixtures/chinese-order.png").toString("base64");
  const response = await POST(
    new Request("http://localhost/api/transcribe", {
      method: "POST",
      body: JSON.stringify({ image, sourceLanguage: "zh" }),
    }),
  );
  assert.equal(response.status, 200);
  const { readers, rows } = await response.json();
  assert.deepEqual(readers, { local: true, online: false });
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row: { reason: string }) => row.reason === "missing"));
});
test("provider timeout leaves scan available for manual correction", async (t) => {
  const key = process.env.OPENROUTER_API_KEY,
    model = process.env.OPENROUTER_VISION_MODEL;
  try {
    process.env.OPENROUTER_API_KEY = "fixture";
    process.env.OPENROUTER_VISION_MODEL = "fixture";
    t.mock.method(globalThis, "fetch", async () => {
      throw new DOMException("Timed out", "TimeoutError");
    });
    const response = await POST(input("zh-Hant"));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: "transcription_unavailable",
    });
  } finally {
    if (key === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = key;
    if (model === undefined) delete process.env.OPENROUTER_VISION_MODEL;
    else process.env.OPENROUTER_VISION_MODEL = model;
  }
});
