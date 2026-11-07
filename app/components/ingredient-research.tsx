"use client";
import { localize } from "../../lib/locale";
import { useEffect, useRef, useState } from "react";
import { unitLabel } from "./copy";
import { money, type Language, type Line } from "./order-types";

type Research = Awaited<
  ReturnType<typeof import("../../server/research/run").research>
>;
// Evidence links are external data; only ordinary web links are navigable.
function webLink(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function IngredientResearch({
  line,
  language,
  disabled,
  onInterpretation,
}: {
  line: Line;
  language: Language;
  disabled: boolean;
  onInterpretation: (text: string) => void;
}) {
  const match = line.match;
  const [result, setResult] = useState<Research | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  if (!match || match.kind === "heading") return null;
  const candidate = match.candidates.find(
    (c) => c.canonical === match.canonical,
  );
  const clear =
    !!match.canonical &&
    (!match.reason ||
      ["missing_quantity", "missing_unit"].includes(match.reason));
  async function search() {
    if (controller.current || disabled) return;
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    setError(false);
    setResult(null);
    const timer = setTimeout(() => request.abort(), 15000);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: line.text, reviewLanguage: language }),
        signal: request.signal,
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.items) || !data.items.length)
        throw new Error("research_failed");
      setResult(data);
    } catch {
      setError(true);
    } finally {
      clearTimeout(timer);
      controller.current = null;
      setPending(false);
    }
  }
  return (
    <section
      className="ingredient-research"
      aria-label={localize(
        language,
        "Recognition and research",
        "Reconocimiento y búsqueda",
        "食材识别与查询",
      )}
    >
      <p className="field-label">
        {candidate
          ? localize(
              language,
              "Ingredient recognized",
              "Ingrediente reconocido",
              "已识别食材",
            )
          : localize(
              language,
              "Ingredient to clarify",
              "Ingrediente por confirmar",
              "食材待确认",
            )}
      </p>
      <h3>{candidate?.display[language] ?? match.phrase}</h3>
      {candidate && (
        <p className="small muted">
          {localize(
            language,
            "English search name",
            "Nombre en inglés",
            "英文查询名称",
          )}
          : {candidate.canonical}
        </p>
      )}
      {!!match.preparation.length && (
        <p className="small">
          {localize(
            language,
            "Written preparation",
            "Preparación escrita",
            "清单上的备料说明",
          )}
          : {match.preparation.join(", ")}
        </p>
      )}
      {!!match.constraints.length && (
        <p className="small">
          {localize(
            language,
            "Preserved details",
            "Detalles conservados",
            "保留的要求",
          )}
          : {match.constraints.join(", ")}
        </p>
      )}
      {!clear && (
        <p className="small">
          {localize(
            language,
            "Clarify the name, quantity and unit with “Edit interpretation” before searching.",
            "Aclara el nombre, la cantidad y la unidad con «Editar interpretación» antes de buscar.",
            "请先修改并确认食材名称、数量和单位，再查询。",
          )}
        </p>
      )}
      {!clear && !!match.candidates.length && (
        <ul className="small">
          {match.candidates.slice(0, 3).map((c) => (
            <li key={c.canonical}>
              {c.display[language]} — {c.explanation[language]}
              <button
                className="text-button"
                type="button"
                disabled={disabled || line.status === "skipped"}
                onClick={() =>
                  onInterpretation(
                    [
                      match.quantity,
                      match.unit,
                      c.canonical,
                      ...match.constraints.filter(
                        (word) => !c.canonical.includes(word),
                      ),
                      ...match.preparation,
                    ]
                      .filter((value) => value !== null && value !== "")
                      .join(" "),
                  )
                }
              >
                {localize(
                  language,
                  "Use this interpretation",
                  "Usar esta interpretación",
                  "采用此识别结果",
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {clear && match.reason && (
        <p className="small">
          {localize(
            language,
            "You can browse products. Clarify the amount and unit to compare how much to buy.",
            "Puedes ver productos. Aclara la cantidad y la unidad para comparar cuánto comprar.",
            "可先查看商品；确认数量和单位后才能比较购买量。",
          )}
        </p>
      )}
      {clear && line.status !== "skipped" && (
        <>
          <p className="small muted">
            {localize(
              language,
              "Search English storefronts. If none match, public product listings are checked. Nothing is added to the simulated order.",
              "Consulta tiendas en inglés. Si ninguna coincide, se buscan fichas públicas. Nada se añade al pedido simulado.",
              "查询英文商店；若无匹配，再查看公开商品信息。查询结果不会自动加入模拟订单。",
            )}
          </p>
          <button
            type="button"
            className="button ghost small-button"
            onClick={() => void search()}
            disabled={disabled || pending}
          >
            {pending
              ? localize(
                  language,
                  "Searching offers…",
                  "Buscando ofertas…",
                  "正在查询报价…",
                )
              : localize(
                  language,
                  "Find supplier offers",
                  "Buscar ofertas",
                  "查询供应商报价",
                )}
          </button>
        </>
      )}
      <div aria-live="polite" aria-busy={pending}>
        {error && (
          <p role="alert">
            {localize(
              language,
              "Research is unavailable. Try again; your order has not changed.",
              "La búsqueda no está disponible. Inténtalo de nuevo; tu pedido no cambió.",
              "暂时无法查询，请重试。订单未更改。",
            )}
          </p>
        )}
        {result && (
          <div className="research-results">
            <h4>
              {localize(
                language,
                "Potential product matches",
                "Posibles productos",
                "可能匹配的商品",
              )}
            </h4>
            <p className="small muted">{result.coverage}</p>
            {result.locationHint && (
              <p className="small muted">{result.locationHint}</p>
            )}
            {result.items.map((item, index) => (
              <div key={index}>
                <p className="research-message">{item.message}</p>
                <ul className="research-offers">
                  {item.offers.map((offer) => (
                    <li key={`${offer.supplier}-${offer.productId}`}>
                      <div className="research-offer-head">
                        <span className="status ready">{offer.supplier}</span>
                        <span className="sku">
                          {offer.evidenceKind === "web_search"
                            ? localize(
                                language,
                                "Public listing",
                                "Ficha pública",
                                "公开商品信息",
                              )
                            : localize(
                                language,
                                "Storefront",
                                "Tienda",
                                "商店",
                              )}
                        </span>
                      </div>
                      <p className="research-offer-title">
                        <a
                          href={webLink(offer.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {offer.title}
                        </a>
                      </p>
                      {offer.evidenceKind === "web_search" && (
                        <p className="reason">
                          {localize(
                            language,
                            "Public product listing. Price and delivery are not verified.",
                            "Ficha pública. El precio y la entrega no están verificados.",
                            "公开商品信息。价格与配送尚未核实。",
                          )}
                        </p>
                      )}
                      {offer.compatibility === "needs_confirmation" && (
                        <p className="reason">
                          {localize(
                            language,
                            "Confirm this variety suits your recipe.",
                            "Confirma que esta variedad te sirve.",
                            "请确认这个品种适合您的食谱。",
                          )}
                        </p>
                      )}
                      <dl className="comparison">
                        <div>
                          <dt>
                            {localize(
                              language,
                              "Product size",
                              "Tamaño del producto",
                              "包装规格",
                            )}
                          </dt>
                          <dd>
                            {offer.packQuantity !== null &&
                            offer.packQuantity !== undefined &&
                            offer.packUnit
                              ? `${offer.packQuantity} ${unitLabel(offer.packUnit, language)}`
                              : localize(
                                  language,
                                  "Unconfirmed",
                                  "Sin confirmar",
                                  "待确认",
                                )}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            {localize(
                              language,
                              "Observed price per pack",
                              "Precio observado por paquete",
                              "查到的每包价格",
                            )}
                          </dt>
                          <dd>
                            {offer.priceMinor !== null &&
                            offer.priceMinor !== undefined &&
                            offer.currency === "USD"
                              ? money(offer.priceMinor, language)
                              : localize(
                                  language,
                                  "Unconfirmed in USD",
                                  "Sin confirmar en USD",
                                  "美元价格待确认",
                                )}
                          </dd>
                        </div>
                        {offer.canCompare && offer.knownCostMinor !== null && (
                          <div>
                            <dt>
                              {offer.packs}{" "}
                              {localize(language, "packs", "paquetes", "包")}
                            </dt>
                            <dd>
                              {money(offer.knownCostMinor, language)}{" "}
                              {localize(
                                language,
                                "in known costs",
                                "en costos conocidos",
                                "已知费用",
                              )}
                            </dd>
                          </div>
                        )}
                      </dl>
                      {offer.quantityCompatibility === "unknown" && (
                        <p className="small muted">
                          {localize(
                            language,
                            "Recipe coverage is unknown; confirm the unit or conversion.",
                            "No podemos calcular cuánto cubre tu receta; confirma la unidad o conversión.",
                            "暂时无法确认能否满足所需数量，请核对单位。",
                          )}
                        </p>
                      )}
                      {offer.excess !== null && offer.excess !== undefined && (
                        <p className="small">
                          <span className="excess">
                            {localize(
                              language,
                              "Surplus",
                              "Sobrante",
                              "多出数量",
                            )}
                            : {offer.excess}{" "}
                            {unitLabel(offer.excessUnit, language)}
                          </span>
                        </p>
                      )}
                      {offer.landedMinor !== null && (
                        <p className="purchase-description">
                          {localize(
                            language,
                            "Verified delivered cost",
                            "Costo total verificado",
                            "已确认的到货总价",
                          )}
                          : {money(offer.landedMinor, language)}
                        </p>
                      )}
                      {!!offer.caveats.length && (
                        <ul className="research-caveats">
                          {offer.caveats.map((c) => (
                            <li className="reason" key={c}>
                              {c}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="small muted research-source">
                        <a
                          href={webLink(offer.evidenceUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {localize(language, "Source", "Fuente", "来源")}
                        </a>{" "}
                        · {offer.retrievedAt}
                      </p>
                    </li>
                  ))}
                </ul>
                <details className="small">
                  <summary>
                    {localize(
                      language,
                      "Stores checked",
                      "Tiendas consultadas",
                      "已查询的商店",
                    )}
                  </summary>
                  <ul>
                    {item.stores.map((store) => (
                      <li key={store.supplier}>
                        {store.supplier}:{" "}
                        {store.status === "ok"
                          ? localize(
                              language,
                              "checked",
                              "consultada",
                              "已查询",
                            )
                          : localize(
                              language,
                              "unavailable",
                              "no disponible",
                              "不可用",
                            )}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
