// Real local draft/edit/approval APIs; controlled supplier data and mocked OCR.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const base = process.env.BASE_URL || "http://localhost:3104";
const output = process.env.UI_OUTPUT || "/tmp/issue20-browser";
await mkdir(output, { recursive: true });
let text = "",
  requests = 0;
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/api/transcribe", (r) => r.fulfill({ json: { text } }));
await page.route("**/api/research", async (r) => {
  requests++;
  const body = r.request().postDataJSON();
  const salt = body.text.includes("sal");
  const offers = Array.from({ length: salt ? 1 : 3 }, (_, i) => ({
    supplier: "Fixture grocery",
    title: salt
      ? "Iodized Salt - 26 oz"
      : `${["Yellow", "Red", "White"][i]} Onion - 1 each`,
    productId: String(i),
    candidateId: `fixture:${i}`,
    url: `https://example.org/${i}`,
    evidenceUrl: "https://example.org/source",
    retrievedAt: "2026-11-07T19:00:00Z",
    priceMinor: salt ? 249 : 100 + i * 25,
    currency: "USD",
    packQuantity: salt ? 26 : 1,
    packUnit: salt ? "oz" : "each",
    quantityCompatibility: salt ? "unknown" : "comparable",
    compatibility: "needs_confirmation",
    canCompare: !salt,
    packs: salt ? null : 1,
    knownCostMinor: salt ? null : 100 + i * 25,
    landedMinor: null,
    excess: salt ? null : 0.5,
    excessUnit: salt ? "tsp" : "each",
    caveats: ["Confirma la variedad. Envío y cargos sin confirmar."],
  }));
  await r.fulfill({
    json: {
      coverage: "Fuente de prueba.",
      locationHint: "Confirma el destino.",
      items: [
        {
          status: "completed",
          message: "Elige una opción; no hay un ganador verificado.",
          offers,
          bestCandidateId: null,
          stores: [{ supplier: "Fixture grocery", status: "ok" }],
        },
      ],
    },
  });
});
async function start(note) {
  text = note;
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
const card = (source) =>
  page
    .locator(".line-card")
    .filter({ has: page.locator(".source-text", { hasText: source }) });
const approve = () =>
  page.getByRole("button", { name: "Aprobar pedido simulado", exact: true });
try {
  await start("0.5 each onion; 1 cucharadita de sal");
  assert.equal(
    await page.getByText("Sin producto confirmado", { exact: true }).count(),
    0,
  );
  await card("onion")
    .getByRole("button", { name: "Buscar ofertas", exact: true })
    .click();
  await card("onion").locator(".research-offers > li").first().waitFor();
  assert.equal(await card("onion").locator(".research-offers > li").count(), 3);
  assert.match(await card("onion").innerText(), /Sobrante: 0.5 unidades/);
  assert.match(
    await card("onion").innerText(),
    /Precio observado por paquete: \$1.00/,
  );
  await card("sal")
    .getByRole("button", { name: "Buscar ofertas", exact: true })
    .click();
  await card("sal")
    .getByText(/No podemos calcular/)
    .waitFor();
  assert.match(await card("sal").innerText(), /26 oz/);
  assert.match(await card("sal").innerText(), /\$2.49/);
  assert.equal(await approve().isDisabled(), true);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: `${output}/small-quantity-candidates.png`,
    fullPage: true,
    caret: "initial",
  });
  console.log(
    "PASS three potential matches, half-onion surplus, observed salt price/size without conversion, no generic catalog failure, no order mutation",
  );
  await start("1 case romain");
  const before = requests;
  await page
    .getByRole("button", { name: "Usar esta interpretación", exact: true })
    .click();
  assert.equal(
    await page.locator(".edit-form textarea").inputValue(),
    "1 case romaine",
  );
  assert.equal(await approve().isDisabled(), true);
  await page
    .getByRole("button", { name: "Guardar corrección", exact: true })
    .click();
  await page.getByText("1 case romaine", { exact: false }).first().waitFor();
  await page.waitForFunction(() => !document.querySelector(".edit-form"));
  assert.match(await page.locator(".source-text").innerText(), /1 case romain/);
  assert.equal(requests, before);
  await page
    .getByRole("button", { name: "Editar interpretación", exact: true })
    .click();
  await page.locator(".edit-form textarea").fill("2 case romaine");
  assert.equal(await approve().isDisabled(), true);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.equal(await approve().isEnabled(), true);
  await approve().click();
  await page.getByText("PEDIDO SIMULADO", { exact: true }).first().waitFor();
  console.log(
    "PASS candidate choice requires saving, source retained, approval blocked during unsaved edit, cancel restores approval",
  );
  assert.deepEqual(errors, []);
  console.log("PASS no browser runtime errors");
} finally {
  await browser.close();
}
