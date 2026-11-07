// Run with a serving app. LIVE_API=1 exercises the printed Chinese note end to end.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.BASE_URL || "http://localhost:3000";
const live = process.env.LIVE_API === "1";
const output = process.env.UI_OUTPUT || "data/ui-verification";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE || undefined,
});
try {
  for (const width of live ? [390] : [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    await page.goto(base);
    await page.locator(".order-ticket").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(output, `hero-${width}.png`) });
    await page.locator("#review-language").selectOption("es");
    assert.match(
      await page.locator(".order-ticket").innerText(),
      /Leche de avena/,
    );
    await page.locator("#review-language").selectOption("zh");
    assert.match(await page.locator(".order-ticket").innerText(), /燕麦奶/);
    await page.locator("#zip-code").fill("10011");
    const lines = Array.from({ length: live ? 2 : 18 }, (_, i) =>
      i % 2 ? "燕麦奶 1 箱" : "鸡蛋 1 箱",
    );
    let sentScans = 0;
    if (!live) {
      await page.route("**/api/transcribe", (r) => {
        sentScans++;
        return r.fulfill({
          json: {
            text: lines.join("\n"),
            readers: { local: true, online: true },
            rows: lines.map((online) => ({
              local: "[?]",
              online,
              reason: "different",
            })),
          },
        });
      });
      await page.route("**/api/drafts", async (r) => {
        const input = r.request().postDataJSON();
        assert.equal(input.zip, "10011");
        assert.equal(input.reviewLanguage, "zh");
        const submitted = input.text.split("\n");
        assert.equal(submitted[0], "鸡蛋 2 箱");
        await r.fulfill({
          status: 201,
          json: {
            id: "fixture",
            version: 1,
            canApprove: true,
            deliveryZip: "10011",
            totalMinor: submitted.length * 2400,
            lines: submitted.map((source, i) => ({
              id: String(i),
              sku: "fixture-" + i,
              label: "Supplier product " + i,
              source,
              text: source,
              status: "ready",
              packSize: 6,
              packUnit: "each",
              priceMinor: 2400,
              cases: 1,
            })),
          },
        });
      });
    }
    await page.getByLabel("先裁剪再识别").check();
    await page
      .locator("#upload-note")
      .setInputFiles("tests/fixtures/chinese-order.png");
    await page.locator(".note-crop").waitFor();
    assert.equal(sentScans, 0);
    await page.getByRole("button", { name: "识别选区" }).click();
    const first = page.locator(".parsed-row input").first();
    await first.waitFor({ timeout: 50000 });
    assert.equal(await page.locator(".parsed-row").count(), lines.length);
    assert.equal(
      await page.getByText("Tesseract", { exact: false }).count(),
      0,
    );
    if (!live) {
      await first.fill("鸡蛋 2 箱");
      await page.getByRole("button", { name: "添加一行" }).click();
      assert.equal(await page.locator(".parsed-row").count(), 19);
      await page
        .getByRole("button", { name: "删除行 19", exact: true })
        .click();
    }
    await page.screenshot({ path: resolve(output, `list-${width}.png`) });
    await page.getByRole("button", { name: "加入购物车" }).click();
    await page.locator(".cart-item").first().waitFor();
    assert.equal(await page.locator(".cart-item").count(), lines.length);
    if (!live)
      assert.ok(
        await page
          .locator(".cart-scroll")
          .evaluate((e) => e.scrollHeight > e.clientHeight),
      );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({ path: resolve(output, `cart-${width}.png`) });
    if (live) {
      const receipt = page.waitForResponse((r) => r.url().endsWith("/approve"));
      await page.getByRole("button", { name: "确认模拟订单" }).click();
      assert.equal((await (await receipt).json()).totalMinor, 7800);
    } else {
      await page.goto(base);
      await page
        .locator("#upload-note")
        .setInputFiles({
          name: "note.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("not a photo"),
        });
      await page.locator(".scan-error").waitFor();
      assert.equal(await page.locator(".parsed-row").count(), 0);
      await page.unroute("**/api/transcribe");
      await page.route("**/api/transcribe", (route) =>
        route.fulfill({
          status: 503,
          json: { error: "transcription_unavailable" },
        }),
      );
      await page
        .locator("#upload-note")
        .setInputFiles("tests/fixtures/chinese-order.png");
      await page
        .getByRole("button", { name: "Transcribe this note myself" })
        .click();
      await page.locator(".parsed-row input").fill("1 case eggs");
      await page.locator("#zip-code").fill("10011");
      await page.unroute("**/api/drafts");
      await page.route("**/api/drafts", (route) => route.abort());
      await page.getByRole("button", { name: "Add to cart" }).click();
      await page.locator(".error-banner").waitFor();
      assert.equal(
        await page.locator(".parsed-row input").inputValue(),
        "1 case eggs",
      );
    }
    console.log(
      "PASS",
      width,
      live
        ? "live cropped scan → $78 receipt"
        : "disagreement → editable list → long cart",
    );
    await page.close();
  }
} finally {
  await browser.close();
}
