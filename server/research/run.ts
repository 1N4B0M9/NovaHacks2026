import { localize } from "../../lib/locale";
import { OrderError } from "../order-error";
import { isHeading } from "../match";
import {
  researchIngredient,
  fold,
  unitScale,
  type Unit,
  type ResearchIngredient,
  type Language,
} from "./ingredient";
import { rank, type Offer } from "./rank";
import { searchStore, suppliers } from "./storefront";
import { searchWeb } from "./web";

type Search = (
  item: ResearchIngredient,
  store: (typeof suppliers)[number],
  signal: AbortSignal,
) => Promise<Offer[]>;
type WebSearch = (
  item: ResearchIngredient,
  signal: AbortSignal,
) => Promise<Offer[]>;
const copy = {
  zh: {
    review: "请确认食材、数量或单位后再查询。",
    empty: "所查询的商店没有匹配商品。",
    failed: "供应商查询失败。",
    timeout: "供应商查询超时。",
    partial: "部分供应商未能查询。",
    provisional: "这是查到的最低暂估商品小计，运费和最低订购量可能影响排序。",
    best: "这是已核实的最低到货价。",
    incomplete: "找到商品，但无法比较购买总价。",
    coverage: "先查询美国商店；没有匹配商品时，再查公开商品信息。请向供应商确认配送条件与最终费用。",
    web: "找到公开商品信息；商店价格和配送尚未核实。",
  },
  en: {
    review: "Correct the ingredient, quantity or unit before searching.",
    empty:
      "No matching listing found in the checked stores or the public product index.",
    web: "Public product listings were found. They are not a store price or a delivery promise.",
    failed: "Supplier research failed.",
    timeout: "Supplier research timed out.",
    partial: "Some suppliers could not be checked.",
    provisional:
      "Lowest observed merchandise subtotal; delivery, fees or minimums may change the ranking.",
    best: "Lowest verified delivered cost among the checked offers.",
    incomplete: "Listings found, but none has a comparable purchasable cost.",
    coverage:
      "Checked US storefronts. If none have a compatible listing, a public product index is searched. Destination eligibility and final costs require supplier confirmation.",
  },
  es: {
    review: "Corrige el ingrediente, la cantidad o la unidad antes de buscar.",
    empty:
      "No se encontró una oferta coincidente en las tiendas ni en el índice público de productos.",
    web: "Hay fichas públicas de productos. No son un precio de tienda ni una promesa de entrega.",
    failed: "La búsqueda en proveedores falló.",
    timeout: "Se agotó el tiempo de búsqueda.",
    partial: "No se pudieron consultar todos los proveedores.",
    provisional:
      "Subtotal de productos más bajo observado; la entrega, los cargos o el pedido mínimo pueden cambiar el orden.",
    best: "Costo de entrega verificado más bajo entre las ofertas consultadas.",
    incomplete:
      "Hay resultados, pero ninguno tiene un costo de compra comparable.",
    coverage:
      "Se consultaron tiendas estadounidenses. Si ninguna tiene una oferta compatible, se busca un índice público de productos. Confirma la entrega y el costo final con el proveedor.",
  },
};
export async function research(
  input: Record<string, unknown>,
  search: Search = searchStore,
  timeoutMs = 6500,
  findOnWeb: WebSearch = searchWeb,
) {
  if (
    input.reviewLanguage !== "en" &&
    input.reviewLanguage !== "es" &&
    input.reviewLanguage !== "zh"
  )
    throw new OrderError(400, "invalid_language");
  if (
    typeof input.text !== "string" ||
    !input.text.trim() ||
    input.text.length > 2000
  )
    throw new OrderError(400, "invalid_text");
  if (
    input.deliveryLocation != null &&
    (typeof input.deliveryLocation !== "string" ||
      input.deliveryLocation.length > 120)
  )
    throw new OrderError(400, "invalid_location");
  const lines = input.text
    .split(/\r?\n|[;；，、]|,(?!\d)/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!lines.length || lines.length > 16)
    throw new OrderError(400, "invalid_line_count");
  const language: Language = input.reviewLanguage,
    t = copy[language];
  // Explicit merchant corrections also support ingredients outside the seed glossary.
  const corrected = new Map<number, ResearchIngredient>();
  if (input.corrections !== undefined) {
    if (
      !Array.isArray(input.corrections) ||
      input.corrections.length > lines.length
    )
      throw new OrderError(400, "invalid_corrections");
    for (const row of input.corrections) {
      if (
        !row ||
        !Number.isInteger(row.lineIndex) ||
        row.lineIndex < 0 ||
        row.lineIndex >= lines.length ||
        corrected.has(row.lineIndex) ||
        typeof row.englishName !== "string" ||
        !/^[a-z][a-z -]{0,79}$/i.test(row.englishName) ||
        typeof row.displayName !== "string" ||
        !row.displayName.trim() ||
        row.displayName.length > 100 ||
        typeof row.quantity !== "number" ||
        !Number.isFinite(row.quantity) ||
        row.quantity <= 0 ||
        row.quantity > 100000 ||
        typeof row.unit !== "string" ||
        !Object.hasOwn(unitScale, row.unit)
      )
        throw new OrderError(400, "invalid_corrections");
      const query = fold(row.englishName).replace(/[- ]+/g, " ").trim();
      corrected.set(row.lineIndex, {
        source: lines[row.lineIndex],
        query,
        quantity: row.quantity,
        unit: row.unit as Unit,
        display: {
          en: query,
          es: row.displayName.trim(),
          zh: row.displayName.trim(),
        },
      });
    }
  }
  async function worker(source: string, index: number) {
    const item = corrected.get(index) ?? researchIngredient(source);
    const base = {
      source,
      query: item?.query ?? null,
      description: item?.display[language] ?? source,
      quantity: item?.quantity ?? null,
      unit: item?.unit ?? null,
    };
    const blank = {
      offers: [],
      bestCandidateId: null,
      bestComparableUrl: null,
      lowestProvisionalUrl: null,
    };
    if (isHeading(source))
      return {
        ...base,
        ...blank,
        status: "heading",
        message: localize(
          language,
          "Recipe heading.",
          "Título de la receta.",
          "食谱标题。",
        ),
        stores: [],
      };
    if (!item)
      return {
        ...base,
        ...blank,
        status: "needs_review",
        message: t.review,
        stores: [],
      };
    const signal = AbortSignal.timeout(timeoutMs);
    const observed = await Promise.all(
      suppliers.map(async (store) => {
        try {
          return {
            supplier: store.name,
            status: "ok",
            offers: await search(item, store, signal),
          };
        } catch {
          return {
            supplier: store.name,
            status: signal.aborted ? "timeout" : "failed",
            offers: [],
          };
        }
      }),
    );
    const storeOffers = observed.flatMap((x) => x.offers);
    let webStatus: "ok" | "failed" | "timeout" | "skipped" = "skipped";
    let webOffers: Offer[] = [];
    if (!rank(item, storeOffers, language).offers.length) {
      const webSignal = AbortSignal.timeout(Math.min(4000, timeoutMs));
      try {
        webOffers = await findOnWeb(item, webSignal);
        webStatus = "ok";
      } catch {
        webStatus = webSignal.aborted ? "timeout" : "failed";
      }
    }
    const stores = [
      ...observed.map(({ supplier, status }) => ({ supplier, status })),
      ...(webStatus === "skipped"
        ? []
        : [
            {
              supplier: "Open Food Facts",
              status: webStatus === "ok" ? ("ok" as const) : webStatus,
            },
          ]),
    ];
    const ranked = rank(item, [...storeOffers, ...webOffers], language);
    const storeStatuses = observed.map((x) => x.status);
    const webProblem = webStatus === "failed" || webStatus === "timeout";
    const status = ranked.offers.length
      ? storeStatuses.some((x) => x !== "ok") || webProblem
        ? "partial"
        : "completed"
      : storeStatuses.every((x) => x === "timeout")
        ? "timeout"
        : storeStatuses.every((x) => x !== "ok")
          ? "failed"
          : webProblem
            ? "partial"
            : "no_results";
    const webOnly =
      ranked.offers.length > 0 &&
      ranked.offers.every((offer) => offer.evidenceKind === "web_search");
    const summary = webOnly
      ? t.web
      : ranked.bestComparableUrl
        ? t.best
        : ranked.lowestProvisionalUrl
          ? t.provisional
          : ranked.offers.length
            ? t.incomplete
            : t.empty;
    let message =
      status === "failed"
        ? t.failed
        : status === "timeout"
          ? t.timeout
          : status === "partial"
            ? t.partial + " " + summary
            : summary;
    const first = ranked.offers[0];
    if (first?.canCompare && first.knownCostMinor !== null) {
      const amount = new Intl.NumberFormat(language, {
        style: "currency",
        currency: "USD",
        currencyDisplay: "code",
      }).format(first.knownCostMinor / 100);
      message +=
        language === "zh"
          ? ` ${first.supplier}：${first.packs} 包，已知费用 ${amount}。`
          : language === "es"
            ? ` ${first.supplier}: ${first.packs} paquetes por ${amount} en costos conocidos para cubrir ${item.quantity} ${item.unit}.`
            : ` ${first.supplier}: ${first.packs} packs at ${amount} in known costs cover ${item.quantity} ${item.unit}.`;
    }
    return { ...base, ...ranked, status, message, stores };
  }
  const items: Awaited<ReturnType<typeof worker>>[] = new Array(lines.length);
  let next = 0;
  async function consume() {
    while (next < lines.length) {
      const index = next++;
      items[index] = await worker(lines[index], index);
    }
  }
  await Promise.all([consume(), consume()]);
  const status = items.every((i) => ["timeout", "failed"].includes(i.status))
    ? "failed"
    : items.some((i) =>
          ["partial", "timeout", "failed", "needs_review"].includes(i.status),
        )
      ? "partial"
      : "completed";
  return {
    status,
    reviewLanguage: language,
    deliveryLocation: input.deliveryLocation ?? null,
    locationHint:
      typeof input.deliveryLocation === "string" &&
      input.deliveryLocation.trim()
        ? null
        : localize(
            language,
            "Provide the destination and confirm delivery with the supplier.",
            "Indica el destino y confirma el envío con el proveedor.",
            "请填写目的地，并向供应商确认配送条件。",
          ),
    coverage: t.coverage,
    items,
  };
}
