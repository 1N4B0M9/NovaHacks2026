// Run against a serving app. Set LIVE_API=1 for real backend integration.
// Playwright can be supplied by the host through PLAYWRIGHT_MODULE without changing package files.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { draftFixture } from "./fixtures.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.BASE_URL || "http://localhost:3103";
const live = process.env.LIVE_API === "1";
const output = process.env.UI_OUTPUT || "/tmp/novahacks-ui-evidence";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE || undefined,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => {
  if (
    message.type() === "error" &&
    /hydration|hydrated|uncaught/i.test(message.text())
  )
    pageErrors.push(message.text());
});
let draft,
  order,
  requests = [],
  failNext = null;
let nextTranscription = "2 doz eggs, 1 case oat milk";
let scanFailure = false;
let successfulScans = 0,
  fallbackScans = 0;
async function makePhoto(text) {
  const notePage = await context.newPage();
  await notePage.setContent(
    '<div style="background:#ffffed;width:520px;padding:40px;font:28px cursive;line-height:2;color:#21352b;white-space:pre-line"></div>',
  );
  await notePage.locator("div").evaluate(
    (element, value) => {
      element.textContent = value;
    },
    text.replaceAll(", ", "\n"),
  );
  const buffer = await notePage.locator("div").screenshot({ caret: "initial" });
  await notePage.close();
  return buffer;
}
if (!live)
  await page.route("**/api/transcribe", async (route) => {
    const input = route.request().postDataJSON();
    assert.match(input.image, /^data:image\/jpeg;base64,/);
    assert.ok(input.image.length <= 4000000);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      status: scanFailure ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        scanFailure
          ? { error: "transcription_unavailable" }
          : { text: nextTranscription },
      ),
    });
  });
if (!live)
  await page.route("**/api/drafts**", async (route) => {
    const req = route.request();
    const body = req.postDataJSON();
    requests.push({ method: req.method(), url: req.url(), body });
    const send = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (failNext === "network") {
      failNext = null;
      return route.abort();
    }
    if (failNext === "finalized") {
      failNext = null;
      return send({ error: "draft_finalized" }, 409);
    }
    if (failNext === "stale") {
      failNext = null;
      draft.version++;
      draft.lines[1].cases = 2;
      draft.totalMinor = 4800;
      return send({ error: "stale_version", draft }, 409);
    }
    if (req.method() === "POST" && !req.url().endsWith("/approve")) {
      draft = structuredClone(draftFixture);
      order = null;
      draft.reviewLanguage = body.reviewLanguage;
      if (body.text === "mystery ingredient")
        draft.lines = [
          {
            ...draft.lines[0],
            source: body.text,
            text: body.text,
            sku: null,
            label: null,
            requestedQuantity: null,
            requestedUnit: null,
            packSize: null,
            packUnit: null,
            priceMinor: null,
            reason: "unknown_item",
          },
        ];
      if (body.text === "eggs")
        draft.lines = [
          {
            ...draft.lines[0],
            source: "eggs",
            text: "eggs",
            requestedQuantity: null,
            requestedUnit: null,
            reason: "missing_quantity",
          },
        ];
      if (body.reviewLanguage === "es") {
        draft.lines[0].label = "Huevos";
        if (draft.lines[1]) draft.lines[1].label = "Leche de avena";
      }
    } else if (req.method() === "PATCH") {
      assert.equal(
        body.version,
        draft.version,
        "UI sends current draft version",
      );
      const line = draft.lines.find((item) =>
        req.url().endsWith("/" + item.id),
      );
      assert.ok(line);
      if (body.action === "skip")
        Object.assign(line, { status: "skipped", cases: null });
      else if (body.action === "accept_pack") {
        assert.equal(body.sku, line.sku);
        assert.ok(Number.isInteger(body.cases) && body.cases > 0);
        Object.assign(line, {
          status: "ready",
          cases: body.cases,
          reason: null,
        });
      } else if (body.action === "edit") {
        assert.equal(typeof body.text, "string");
        Object.assign(line, {
          ...structuredClone(draftFixture.lines[0]),
          id: line.id,
          source: line.source,
          text: body.text,
        });
      } else assert.fail("Unknown action");
      draft.version++;
    } else {
      assert.equal(body.version, draft.version);
      if (!draft.canApprove)
        return send({ error: "review_required", draft }, 409);
      order ??= {
        orderId: "fixture-order",
        draftId: draft.id,
        version: draft.version,
        simulated: true,
        currency: "USD",
        totalMinor: draft.totalMinor,
        lines: draft.lines
          .filter((item) => item.status === "ready")
          .map(({ sku, cases, priceMinor }) => ({ sku, cases, priceMinor })),
      };
      return send(order);
    }
    draft.totalMinor = draft.lines
      .filter((item) => item.status === "ready")
      .reduce((total, item) => total + item.cases * item.priceMinor, 0);
    draft.canApprove =
      draft.lines.some((item) => item.status === "ready") &&
      !draft.lines.some((item) => item.status === "needs_review");
    return send(draft, req.method() === "POST" ? 201 : 200);
  });
const wait = async (fn, message) => {
  for (let i = 0; i < 60; i++) {
    if (await fn()) return;
    await page.waitForTimeout(100);
  }
  throw new Error(message);
};
const approve = () =>
  page.getByRole("button", { name: "Approve simulated order", exact: true });
const article = (name) => page.getByRole("article").filter({ hasText: name });
async function scan(text = "2 doz eggs, 1 case oat milk") {
  nextTranscription = text;
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/transcribe"),
  );
  await page.locator("#upload-note").setInputFiles({
    name: "kitchen-note.png",
    mimeType: "image/png",
    buffer: await makePhoto(text),
  });
  const response = await responsePromise;
  if (response.ok()) {
    successfulScans++;
    await page.locator("#kitchen-note").waitFor();
    if (!live)
      assert.equal(await page.locator("#kitchen-note").inputValue(), text);
  } else {
    assert.equal(
      response.status(),
      503,
      "Only transcription unavailability uses the explicit fallback",
    );
    fallbackScans++;
    await page
      .getByRole("button", {
        name: /Transcribe this note myself|Transcribir esta nota manualmente/,
      })
      .click();
  }
  await page.locator("#kitchen-note").fill(text);
  if (!live && successfulScans === 1)
    await page.screenshot({
      path: `${output}/mobile-transcription.png`,
      fullPage: true,
      caret: "initial",
    });
}
async function start(text = "2 doz eggs, 1 case oat milk") {
  await page.goto(base);
  await scan(text);
  await page
    .getByRole("button", { name: "Check supplier matches", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "A second look, before you order." })
    .waitFor();
}
async function assertTotal(total) {
  await wait(
    async () =>
      (await page.locator(".summary-total").innerText()).includes(total),
    "Expected total " + total,
  );
}
let completed = 0;
async function check(name, fn) {
  await fn();
  completed++;
  console.log("PASS " + name);
}
try {
  await check(
    "photo-first mobile intake has camera/upload and no manual list",
    async () => {
      await page.goto(base);
      assert.equal(
        await page
          .getByRole("button", { name: "Take a photo", exact: true })
          .count(),
        1,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Upload note photo", exact: true })
          .count(),
        1,
      );
      assert.equal(await page.locator("textarea").count(), 0);
      assert.equal(
        await page
          .getByRole("button", { name: "Check supplier matches", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        true,
      );
      await page.screenshot({
        path: `${output}/mobile-intake.png`,
        fullPage: true,
        caret: "initial",
      });
    },
  );
  await check("skip yields $24 and only milk in saved order", async () => {
    await start();
    assert.equal(await approve().isDisabled(), true);
    await page.screenshot({
      path: `${output}/mobile-review.png`,
      fullPage: true,
      caret: "initial",
    });
    await article("2 doz eggs")
      .getByRole("button", { name: "Skip this item" })
      .click();
    await wait(() => approve().isEnabled(), "Skip should enable approval");
    await assertTotal("$24.00");
    assert.equal(await page.locator(".status.skipped").count(), 1);
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/approve"),
    );
    await approve().click();
    const saved = await (await responsePromise).json();
    assert.equal(saved.totalMinor, 2400);
    assert.deepEqual(
      saved.lines.map((line) => line.sku),
      ["M1"],
    );
    await page
      .getByRole("heading", { name: "Reviewed. Ready to reference." })
      .waitFor();
    await page.screenshot({
      path: `${output}/mobile-order-skip.png`,
      fullPage: true,
      caret: "initial",
    });
    if (live) {
      const retry = await context.request.post(
        `${base}/api/drafts/${saved.draftId}/approve`,
        { data: { version: saved.version } },
      );
      assert.equal(retry.status(), 200);
      assert.equal((await retry.json()).orderId, saved.orderId);
    }
  });
  await check("buy yields $78 and both SKUs in saved order", async () => {
    await start();
    await article("2 doz eggs")
      .getByRole("button", { name: "Buy selected cases" })
      .click();
    await wait(() => approve().isEnabled(), "Buy should enable approval");
    await assertTotal("$78.00");
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/approve"),
    );
    await approve().click();
    const saved = await (await responsePromise).json();
    assert.equal(saved.totalMinor, 7800);
    assert.deepEqual(saved.lines.map((line) => line.sku).sort(), [
      "E180",
      "M1",
    ]);
    await page
      .getByRole("heading", { name: "Reviewed. Ready to reference." })
      .waitFor();
    await page.screenshot({
      path: `${output}/mobile-order-buy.png`,
      fullPage: true,
      caret: "initial",
    });
  });
  await check("all skipped blocks empty approval", async () => {
    await start();
    await article("2 doz eggs")
      .getByRole("button", { name: "Skip this item" })
      .click();
    await wait(() => approve().isEnabled(), "First skip completed");
    await article("1 case oat milk")
      .getByRole("button", { name: "Skip this item" })
      .click();
    await assertTotal("$0.00");
    assert.equal(await approve().isDisabled(), true);
    assert.equal(
      await page
        .getByText("Include at least one item before approving.", {
          exact: true,
        })
        .count(),
      1,
    );
  });
  await check(
    "editing a confirmed line clears acceptance and preserves source",
    async () => {
      await start();
      await article("2 doz eggs")
        .getByRole("button", { name: "Buy selected cases" })
        .click();
      await wait(() => approve().isEnabled(), "Buy completed");
      await article("2 doz eggs")
        .getByRole("button", { name: "Edit interpretation" })
        .click();
      await page
        .getByLabel("Corrected ingredient, quantity and unit")
        .fill("3 doz eggs");
      await page.getByRole("button", { name: "Save correction" }).click();
      await wait(
        async () =>
          (await page
            .getByText("Current interpretation:", { exact: true })
            .count()) === 1,
        "Correction displayed",
      );
      assert.equal(await approve().isDisabled(), true);
      assert.equal(
        await page.getByText("“2 doz eggs”", { exact: true }).count(),
        1,
      );
    },
  );
  await check("unknown item stays visible and blocks approval", async () => {
    await start("mystery ingredient");
    assert.equal(await approve().isDisabled(), true);
    assert.equal(
      await page
        .getByText("No confirmed supplier match", { exact: true })
        .count(),
      1,
    );
    assert.equal(
      await page.getByRole("button", { name: "Buy selected cases" }).count(),
      0,
    );
    await page.getByRole("button", { name: "Skip this item" }).click();
    await wait(
      async () => (await page.locator(".status.skipped").count()) === 1,
      "Unknown skip completed",
    );
    assert.equal(await approve().isDisabled(), true);
  });
  await check("Spanish intake, review and simulated receipt", async () => {
    await page.goto(base);
    await page.getByLabel("Review language").selectOption("es");
    await scan("2 docenas de huevos, 1 caja de leche de avena");
    await page
      .getByRole("button", {
        name: "Buscar productos del proveedor",
        exact: true,
      })
      .click();
    await page
      .getByRole("heading", { name: "Una revisión antes de pedir." })
      .waitFor();
    await page
      .getByRole("button", { name: "Comprar cajas seleccionadas" })
      .click();
    const button = page.getByRole("button", {
      name: "Aprobar pedido simulado",
      exact: true,
    });
    await wait(() => button.isEnabled(), "Spanish approval enabled");
    await button.click();
    await page
      .getByRole("heading", { name: "Revisado. Listo para consultar." })
      .waitFor();
    assert.ok(
      (await page.locator(".summary-total").innerText()).includes("78.00"),
    );
    await page.screenshot({
      path: `${output}/mobile-spanish.png`,
      fullPage: true,
      caret: "initial",
    });
  });
  await check(
    "matched ingredient missing a quantity requires correction, not pack acceptance",
    async () => {
      await start("eggs");
      assert.equal(await approve().isDisabled(), true);
      assert.equal(
        await page.getByRole("button", { name: "Buy selected cases" }).count(),
        0,
      );
    },
  );
  if (!live) {
    await check(
      "transcription failure exposes an explicit manual fallback",
      async () => {
        await page.goto(base);
        scanFailure = true;
        await scan();
        scanFailure = false;
        assert.equal(
          await page
            .getByText("MANUALLY TRANSCRIBED NOTE", { exact: true })
            .count(),
          1,
        );
        await page
          .getByRole("button", { name: "Check supplier matches", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "A second look, before you order." })
          .waitFor();
      },
    );
    await check(
      "invalid photo does not reveal a fabricated transcription",
      async () => {
        await page.goto(base);
        await page.locator("#upload-note").setInputFiles({
          name: "note.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("not an image"),
        });
        await page.locator(".scan-error, .error-banner").waitFor();
        assert.equal(await page.locator("#kitchen-note").count(), 0);
      },
    );
  }
  if (!live) {
    await check("invalid case count cannot submit", async () => {
      await start();
      await page.getByLabel("Cases to buy").fill("0");
      assert.equal(
        await page
          .getByRole("button", { name: "Buy selected cases" })
          .isDisabled(),
        true,
      );
      await page.getByLabel("Cases to buy").fill("1.5");
      assert.equal(
        await page
          .getByRole("button", { name: "Buy selected cases" })
          .isDisabled(),
        true,
      );
    });
    await check(
      "stale conflict loads latest draft without retrying the mutation",
      async () => {
        await start();
        failNext = "stale";
        const before = requests.length;
        await article("2 doz eggs")
          .getByRole("button", { name: "Skip this item" })
          .click();
        await page.locator(".scan-error, .error-banner").waitFor();
        await assertTotal("$48.00");
        assert.equal(requests.length, before + 1);
        assert.equal(await approve().isDisabled(), true);
        await article("2 doz eggs")
          .getByRole("button", { name: "Skip this item" })
          .click();
        await wait(() => approve().isEnabled(), "Retry uses current version");
      },
    );
    await check("network failure preserves note and allows retry", async () => {
      await page.goto(base);
      await scan();
      failNext = "network";
      await page
        .getByRole("button", { name: "Check supplier matches", exact: true })
        .click();
      await page.locator(".scan-error, .error-banner").waitFor();
      assert.equal(
        await page.locator("#kitchen-note").inputValue(),
        "2 doz eggs, 1 case oat milk",
      );
      await page
        .getByRole("button", { name: "Check supplier matches", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "A second look, before you order." })
        .waitFor();
    });
    await check("finalized conflict prevents further edits", async () => {
      await start();
      failNext = "finalized";
      await article("2 doz eggs")
        .getByRole("button", { name: "Skip this item" })
        .click();
      await page.locator(".scan-error, .error-banner").waitFor();
      assert.equal(await approve().isDisabled(), true);
      assert.equal(
        await article("2 doz eggs")
          .getByRole("button", { name: "Edit interpretation" })
          .isDisabled(),
        true,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Start a new list" })
          .isEnabled(),
        true,
      );
    });
  }
  await check("desktop fits viewport without horizontal overflow", async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base);
    await page.screenshot({
      path: `${output}/desktop-intake.png`,
      fullPage: true,
      caret: "initial",
    });
    await start();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: `${output}/desktop-review.png`,
      fullPage: true,
      caret: "initial",
    });
  });
  assert.deepEqual(pageErrors, [], "No uncaught browser errors");
  console.log(
    `Photo endpoint: ${successfulScans} successful responses; ${fallbackScans} explicit unavailable-service fallbacks.`,
  );
  console.log(
    `${completed} checks passed (${live ? "LIVE BACKEND" : "CONTRACT FIXTURES"}). Screenshots: ${output}`,
  );
} finally {
  await browser.close();
}
