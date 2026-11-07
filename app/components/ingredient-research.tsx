"use client";
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
  const es = language === "es";
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
      aria-label={es ? "Reconocimiento y búsqueda" : "Recognition and research"}
    >
      <p className="field-label">
        {candidate
          ? es
            ? "Ingrediente reconocido"
            : "Ingredient recognized"
          : es
            ? "Ingrediente por confirmar"
            : "Ingredient to clarify"}
      </p>
      <h3>{candidate?.display[language] ?? match.phrase}</h3>
      {candidate && (
        <p className="small muted">
          {es ? "Nombre en inglés" : "English search name"}:{" "}
          {candidate.canonical}
        </p>
      )}
      {!!match.preparation.length && (
        <p className="small">
          {es ? "Preparación escrita" : "Written preparation"}:{" "}
          {match.preparation.join(", ")}
        </p>
      )}
      {!!match.constraints.length && (
        <p className="small">
          {es ? "Detalles conservados" : "Preserved details"}:{" "}
          {match.constraints.join(", ")}
        </p>
      )}
      {!clear && (
        <p className="small">
          {es
            ? "Aclara el nombre, la cantidad y la unidad con «Editar interpretación» antes de buscar."
            : "Clarify the name, quantity and unit with “Edit interpretation” before searching."}
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
                {es ? "Usar esta interpretación" : "Use this interpretation"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {clear && match.reason && (
        <p className="small">
          {es
            ? "Puedes ver productos. Aclara la cantidad y la unidad para comparar cuánto comprar."
            : "You can browse products. Clarify the amount and unit to compare how much to buy."}
        </p>
      )}
      {clear && line.status !== "skipped" && (
        <>
          <p className="small muted">
            {es
              ? "Consulta tiendas en inglés. Las ofertas son informativas y no se añaden al pedido simulado."
              : "Search English storefronts. Offers are informational and are not added to the simulated order."}
          </p>
          <button
            type="button"
            className="button ghost small-button"
            onClick={() => void search()}
            disabled={disabled || pending}
          >
            {pending
              ? es
                ? "Buscando ofertas…"
                : "Searching offers…"
              : es
                ? "Buscar ofertas"
                : "Find supplier offers"}
          </button>
        </>
      )}
      <div aria-live="polite" aria-busy={pending}>
        {error && (
          <p role="alert">
            {es
              ? "La búsqueda no está disponible. Inténtalo de nuevo; tu pedido no cambió."
              : "Research is unavailable. Try again; your order has not changed."}
          </p>
        )}
        {result && (
          <div className="research-results">
            <h4>{es ? "Posibles productos" : "Potential product matches"}</h4>
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
                      <strong>{offer.supplier}</strong>
                      {offer.compatibility === "needs_confirmation" && (
                        <p className="small">
                          {es
                            ? "Confirma que esta variedad te sirve."
                            : "Confirm this variety suits your recipe."}
                        </p>
                      )}
                      <p>
                        <a
                          href={webLink(offer.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {offer.title}
                        </a>
                      </p>
                      <p className="small">
                        {es ? "Tamaño del producto" : "Product size"}:{" "}
                        {offer.packQuantity !== null &&
                        offer.packQuantity !== undefined &&
                        offer.packUnit
                          ? `${offer.packQuantity} ${unitLabel(offer.packUnit, language)}`
                          : es
                            ? "sin confirmar"
                            : "unconfirmed"}
                      </p>
                      <p className="small">
                        {es
                          ? "Precio observado por paquete"
                          : "Observed price per pack"}
                        :{" "}
                        {offer.priceMinor !== null &&
                        offer.priceMinor !== undefined &&
                        offer.currency === "USD"
                          ? money(offer.priceMinor, language)
                          : es
                            ? "sin confirmar en USD"
                            : "unconfirmed in USD"}
                      </p>
                      {offer.quantityCompatibility === "unknown" && (
                        <p className="small">
                          {es
                            ? "No podemos calcular cuánto cubre tu receta; confirma la unidad o conversión."
                            : "Recipe coverage is unknown; confirm the unit or conversion."}
                        </p>
                      )}
                      {offer.excess !== null && offer.excess !== undefined && (
                        <p className="small">
                          {es ? "Sobrante" : "Surplus"}: {offer.excess}{" "}
                          {unitLabel(offer.excessUnit, language)}
                        </p>
                      )}
                      {offer.canCompare && offer.knownCostMinor !== null && (
                        <p>
                          {offer.packs} {es ? "paquetes" : "packs"} ·{" "}
                          {money(offer.knownCostMinor, language)}{" "}
                          {es ? "en costos conocidos" : "in known costs"}
                        </p>
                      )}
                      {offer.landedMinor !== null && (
                        <p>
                          {es
                            ? "Costo total verificado"
                            : "Verified delivered cost"}
                          : {money(offer.landedMinor, language)}
                        </p>
                      )}
                      <ul className="small">
                        {offer.caveats.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                      <p className="small muted">
                        <a
                          href={webLink(offer.evidenceUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {es ? "Fuente" : "Source"}
                        </a>{" "}
                        · {offer.retrievedAt}
                      </p>
                    </li>
                  ))}
                </ul>
                <details className="small">
                  <summary>
                    {es ? "Tiendas consultadas" : "Stores checked"}
                  </summary>
                  <ul>
                    {item.stores.map((store) => (
                      <li key={store.supplier}>
                        {store.supplier}:{" "}
                        {store.status === "ok"
                          ? es
                            ? "consultada"
                            : "checked"
                          : es
                            ? "no disponible"
                            : "unavailable"}
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
