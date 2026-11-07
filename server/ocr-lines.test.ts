import { test } from "node:test";
import assert from "node:assert/strict";
import { compareReadings, type LocalLine } from "../lib/ocr-lines";
import { POST } from "../app/api/transcribe/route";
import { readFileSync } from "node:fs";
function line(text: string, confidence = 95): LocalLine {
  return { text, confidence, box: { x0: 1, y0: 2, x1: 3, y1: 4 } };
}
test("cosmetic Han spaces agree, but changed quantities, units and low-confidence identical text need review", () => {
  const rows = compareReadings(
    [
      line("鸡 蛋 1 箱"),
      line("牛奶 1 箱"),
      line("燕麦奶 2 打"),
      line("盐 1 箱", 51),
      line("[?]"),
    ],
    "鸡蛋1箱\n牛奶2箱\n燕麦奶2箱\n盐1箱\n[?]",
  );
  assert.deepEqual(
    rows.map((r) => r.reason),
    [null, "different", "different", "low", "unclear"],
  );
});
test("preserve lines omitted by either reader without shifting the next agreed item", () => {
  const a = compareReadings([line("A"), line("B"), line("C")], "A\nC\nD");
  assert.deepEqual(
    a.map((r) => [r.local, r.online, r.reason]),
    [
      ["A", "A", null],
      ["B", null, "missing"],
      ["C", "C", null],
      [null, "D", "missing"],
    ],
  );
  assert.equal(
    compareReadings([line("12 cartons")], "1 2 cartons")[0].reason,
    "different",
  );
});
test("hybrid verifies the local transcription against the image and flags a mocked model disagreement", async (t) => {
  const img =
    "data:image/png;base64," +
    readFileSync("tests/fixtures/chinese-order.png").toString("base64");
  const priorKey = process.env.OPENROUTER_API_KEY,
    priorModel = process.env.OPENROUTER_VISION_MODEL;
  process.env.OPENROUTER_API_KEY = "test";
  process.env.OPENROUTER_VISION_MODEL = "test";
  try {
    t.mock.method(
      globalThis,
      "fetch",
      async (_url: string, init: RequestInit) => {
        const content = JSON.parse(String(init.body)).messages[0].content;
        assert.match(content[0].text.replace(/\s/g, ""), /鸡蛋1箱/);
        assert.equal(content[1].image_url.url, img);
        return Response.json({
          choices: [
            {
              message: { content: "鸡蛋 2 箱\n燕麦奶 1 箱" },
              finish_reason: "stop",
            },
          ],
        });
      },
    );
    const r = await POST(
      new Request("http://localhost/api/transcribe", {
        method: "POST",
        body: JSON.stringify({
          image: img,
          engine: "hybrid",
          sourceLanguage: "zh",
        }),
      }),
    );
    const data = await r.json();
    assert.deepEqual(data.readers, { local: true, online: true });
    assert.equal(data.rows[0].reason, "different");
    assert.ok(data.rows[0].box);
  } finally {
    if (priorKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = priorKey;
    if (priorModel === undefined) delete process.env.OPENROUTER_VISION_MODEL;
    else process.env.OPENROUTER_VISION_MODEL = priorModel;
  }
});
