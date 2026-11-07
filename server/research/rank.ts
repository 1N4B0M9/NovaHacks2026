import {
  unitScale,
  type ResearchIngredient,
  type Language,
  type Unit,
} from "./ingredient";
import { assessTitle } from "./ingredient";

export type Offer = {
  supplier: string;
  title: string;
  productId: string;
  url: string;
  evidenceUrl: string;
  evidenceKind: "supplier_search" | "supplier_product" | "web_search";
  retrievedAt: string;
  priceMinor: number | null;
  currency: string | null;
  packQuantity: number | null;
  packUnit: Unit | null;
  available: boolean | null;
  shippingMinor: number | null;
  feesMinor: number | null;
  locationEligible: boolean | null;
  minimumPacks: number | null;
  minimumSpendMinor: number | null;
  purchaseIncrement?: number | null;
  maximumPacks?: number | null;
};
export function compareOffer(
  item: ResearchIngredient,
  offer: Offer,
  language: Language,
) {
  const es = language === "es";
  const quantity = offer.packQuantity;
  const scale = offer.packUnit && unitScale[offer.packUnit];
  const [dimension, factor] = item.unit ? unitScale[item.unit] : [null, 1];
  const assessment = assessTitle(item.query, offer.title);
  const pack =
    scale && dimension === scale[0] && quantity !== null && quantity > 0
      ? (quantity * scale[1]) / factor
      : null;
  const spendPacks =
    offer.minimumSpendMinor !== null &&
    offer.priceMinor !== null &&
    offer.priceMinor > 0
      ? Math.ceil(offer.minimumSpendMinor / offer.priceMinor)
      : 0;
  const needed =
    pack === null || item.quantity === null
      ? null
      : Math.max(
          offer.minimumPacks ?? 1,
          spendPacks,
          Math.ceil(Number((item.quantity / pack).toPrecision(12))),
        );
  const increment = offer.purchaseIncrement ?? 1;
  const minimum = offer.minimumPacks ?? 1;
  const count =
    needed === null
      ? null
      : minimum + Math.ceil((needed - minimum) / increment) * increment;
  const exceedsMaximum =
    count !== null && offer.maximumPacks != null && count > offer.maximumPacks;
  const merchandise =
    count !== null && offer.priceMinor !== null
      ? count * offer.priceMinor
      : null;
  const canCompare =
    assessment.compatibility !== "incompatible" &&
    !exceedsMaximum &&
    merchandise !== null &&
    offer.currency === "USD" &&
    offer.available !== false &&
    offer.locationEligible !== false;
  const knownCost =
    merchandise !== null
      ? merchandise + (offer.shippingMinor ?? 0) + (offer.feesMinor ?? 0)
      : null;
  const landed =
    canCompare &&
    assessment.compatibility === "compatible" &&
    offer.available === true &&
    offer.minimumPacks !== null &&
    offer.minimumSpendMinor !== null &&
    offer.locationEligible === true &&
    offer.shippingMinor !== null &&
    offer.feesMinor !== null
      ? merchandise! + offer.shippingMinor + offer.feesMinor
      : null;
  const caveats: string[] = [];
  if (offer.evidenceKind === "web_search")
    caveats.push(
      es
        ? "Ficha pública. El precio y la entrega no están verificados."
        : "Public product listing. Price and delivery are not verified.",
    );
  if (assessment.compatibility === "needs_confirmation")
    caveats.push(
      es
        ? "Confirma la variedad y los detalles del producto."
        : "Confirm the variety and product attributes.",
    );
  if (exceedsMaximum)
    caveats.push(
      es
        ? "La cantidad necesaria supera el máximo del proveedor."
        : "Required quantity exceeds the supplier maximum.",
    );
  if (!offer.currency || offer.currency !== "USD")
    caveats.push(es ? "Moneda no comparable." : "Currency not comparable.");
  if (pack === null || offer.priceMinor === null)
    caveats.push(
      es
        ? "Precio o tamaño comparable sin confirmar."
        : "Comparable pack or price unconfirmed.",
    );
  if (offer.available !== true)
    caveats.push(
      offer.available === false
        ? es
          ? "Agotado."
          : "Out of stock."
        : es
          ? "Existencias desconocidas."
          : "Stock unknown.",
    );
  if (offer.locationEligible !== true)
    caveats.push(
      offer.locationEligible === false
        ? es
          ? "Entrega no disponible."
          : "Delivery ineligible."
        : es
          ? "Entrega al destino sin confirmar."
          : "Delivery eligibility unknown.",
    );
  if (
    offer.shippingMinor === null ||
    offer.feesMinor === null ||
    offer.minimumPacks === null ||
    offer.minimumSpendMinor === null
  )
    caveats.push(
      es
        ? "Envío, cargos o pedido mínimo sin confirmar."
        : "Shipping, fees or minimum order unconfirmed.",
    );
  return {
    ...offer,
    candidateId: `${offer.supplier}:${offer.productId}`,
    compatibility: assessment.compatibility,
    matchReason: assessment.reason,
    quantityCompatibility:
      pack !== null && item.quantity !== null ? "comparable" : "unknown",
    packs: count,
    excess:
      count !== null && pack !== null && item.quantity !== null
        ? Number((count * pack - item.quantity).toFixed(6))
        : null,
    excessUnit: item.unit,
    merchandiseMinor: merchandise,
    knownCostMinor: knownCost,
    landedMinor: landed,
    canCompare,
    caveats,
  };
}

export function rank(
  item: ResearchIngredient,
  offers: Offer[],
  language: Language,
) {
  const unique = [
    ...new Map(offers.map((o) => [o.supplier + ":" + o.productId, o])).values(),
  ];
  const ranked = unique
    .map((o) => compareOffer(item, o, language))
    .filter((o) => o.compatibility !== "incompatible")
    .sort((a, b) => {
      const tier = (o: typeof a) =>
        o.landedMinor !== null ? 0 : o.canCompare ? 1 : 2;
      return (
        Number(a.compatibility !== "compatible") -
          Number(b.compatibility !== "compatible") ||
        tier(a) - tier(b) ||
        (a.landedMinor ?? a.knownCostMinor ?? Infinity) -
          (b.landedMinor ?? b.knownCostMinor ?? Infinity) ||
        (a.excess ?? Infinity) - (b.excess ?? Infinity) ||
        Number(a.packQuantity === null) - Number(b.packQuantity === null) ||
        (a.packUnit === b.packUnit
          ? (a.packQuantity ?? Infinity) - (b.packQuantity ?? Infinity)
          : 0) ||
        a.url.localeCompare(b.url)
      );
    });
  const first = ranked[0];
  const tied = ranked[1] && ranked[1].landedMinor === first?.landedMinor;
  const best =
    first?.landedMinor !== null && first?.landedMinor !== undefined && !tied
      ? first
      : null;
  return {
    offers: ranked.slice(0, 5),
    bestCandidateId: best?.candidateId ?? null,
    bestComparableUrl: best?.url ?? null,
    lowestProvisionalUrl:
      ranked.find((o) => o.canCompare && o.landedMinor === null)?.url ?? null,
  };
}
