// Real draft/edit/approval API, mocked OCR and supplier responses. No photo leaves localhost.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const base = process.env.BASE_URL || "http://localhost:3104";
const output = process.env.UI_OUTPUT || "/tmp/novahacks-recipe-evidence";
await mkdir(output, { recursive: true });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const recipe = await readFile("server/fixtures/spanish-recipe.txt", "utf8");
let note = recipe,
  mode = "empty",
  calls = [];
await page.route("**/api/transcribe", (route) =>
  route.fulfill({ json: { text: note } }),
);
await page.route("**/api/research", async (route) => {
  const body = route.request().postDataJSON();
  calls.push(body);
  if (mode === "failure")
    return route.fulfill({ status: 503, json: { error: "unavailable" } });
  if (mode === "live") return route.continue();
  await new Promise((r) => setTimeout(r, 150));
  const offers =
    mode === "offers"
      ? [
          {
            supplier: "Fixture supplier",
            title: "Green Lentils - 4 lb",
            productId: "fixture",
            url: "https://example.com/lentils",
            evidenceUrl: "https://example.com/lentils",
            retrievedAt: "2026-11-07T19:00:00Z",
            packs: 2,
            knownCostMinor: 3790,
            landedMinor: null,
            canCompare: true,
            caveats: ["Envío y cargos sin confirmar."],
          },
        ]
      : [];
  return route.fulfill({
    json: {
      coverage: "Tiendas de prueba; cobertura limitada.",
      locationHint: "Confirma el destino y el envío.",
      items: [
        {
          source: body.text,
          status: offers.length ? "completed" : "no_results",
          message: offers.length
            ? "Subtotal provisional; entrega sin confirmar."
            : "No se encontró una oferta coincidente en las tiendas consultadas.",
          offers,
          stores: [{ supplier: "Fixture supplier", status: "ok" }],
        },
      ],
    },
  });
});
const card = (text) =>
  page
    .locator(".line-card")
    .filter({ has: page.locator(".source-text", { hasText: text }) });
async function start(text) {
  note = text;
  await page.goto(base);
  await page.locator("select").selectOption("es");
  await page.locator("#upload-note").setInputFiles({
    name: "synthetic.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDlgAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.locator("#kitchen-note").waitFor();
  await page
    .getByRole("button", {
      name: "Buscar productos del proveedor",
      exact: true,
    })
    .click();
  await page.locator(".line-card").first().waitFor();
}
try {
  await start(recipe);
  assert.equal(await page.locator(".line-card").count(), 11);
  assert.match(
    await page.locator(".recipe-headings").innerText(),
    /Reseta de pollo/,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Buscar ofertas", exact: true })
      .count(),
    10,
  );
  assert.match(await card("cebolla").innerText(), /0.5 unidades/);
  assert.match(await card("cebolla").innerText(), /picada/);
  assert.equal(
    await card("ajos")
      .getByRole("button", { name: "Buscar ofertas", exact: true })
      .count(),
    1,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Aprobar pedido simulado", exact: true })
      .isDisabled(),
    true,
  );
  await card("papas")
    .getByRole("button", { name: "Buscar ofertas", exact: true })
    .click();
  await card("papas")
    .getByText(/No se encontró una oferta/)
    .waitFor();
  assert.equal(calls[0].text, "2 papas");
  assert.equal(calls[0].reviewLanguage, "es");
  mode = "failure";
  await card("papas")
    .getByRole("button", { name: "Buscar ofertas", exact: true })
    .click();
  await card("papas").getByRole("alert").waitFor();
  mode = "empty";
  await card("papas")
    .getByRole("button", { name: "Buscar ofertas", exact: true })
    .click();
  await card("papas")
    .getByText(/No se encontró una oferta/)
    .waitFor();
  await card("papas")
    .getByRole("button", { name: "Editar interpretación", exact: true })
    .click();
  await card("papas").locator("textarea").fill("3 papas");
  await card("papas")
    .getByRole("button", { name: "Guardar corrección", exact: true })
    .click();
  await card("papas").getByText("3 unidades", { exact: true }).waitFor();
  assert.equal(await card("papas").locator(".research-results").count(), 0);
  assert.equal(await page.locator(".summary-lines li").count(), 1); // empty placeholder; research never adds a purchase
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: `${output}/recipe-mobile.png`,
    fullPage: true,
    caret: "initial",
  });
  console.log(
    "PASS recipe: 11 ingredients, heading, 10 research actions, clarification, source preservation, no-results, failure/retry, edit invalidation, mobile layout",
  );
  await start("dos cebollas picadas; 3 kg de lentejas verdes");
  mode = "offers";
  await card("lentejas")
    .getByRole("button", { name: "Buscar ofertas", exact: true })
    .click();
  await card("lentejas")
    .getByRole("link", { name: "Green Lentils - 4 lb" })
    .waitFor();
  assert.match(await card("lentejas").innerText(), /37.90/);
  assert.match(
    await card("lentejas").innerText(),
    /Envío y cargos sin confirmar/,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Aprobar pedido simulado", exact: true })
      .isDisabled(),
    true,
  );
  await page.screenshot({
    path: `${output}/offers-mobile.png`,
    fullPage: true,
    caret: "initial",
  });
  console.log(
    "PASS second note: recognized onion/lentils, English offer title, Spanish caveats and provisional cost, no approval",
  );
  // Exercise real research endpoint with manual text only; observations vary by supplier.
  if (process.env.LIVE_RESEARCH === "1") {
    mode = "live";
    await card("cebollas")
      .getByRole("button", { name: "Buscar ofertas", exact: true })
      .click();
    await card("cebollas")
      .locator(".research-message")
      .waitFor({ timeout: 20000 });
    console.log(
      "LIVE research observation:",
      await card("cebollas").locator(".research-message").innerText(),
    );
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("PASS no browser runtime errors");
} finally {
  await browser.close();
}
