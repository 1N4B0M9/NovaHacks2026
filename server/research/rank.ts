import {
  unitScale,
  type Ingredient,
  type Language,
  type Unit,
} from "./ingredient";

export type Offer = {
  supplier: string;
  title: string;
  productId: string;
  url: string;
  evidenceUrl: string;
  evidenceKind: "supplier_search" | "supplier_product";
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
};
export function compareOffer(
  item: Ingredient,
  offer: Offer,
  language: Language,
) {
  const es = language === "es";
  const quantity = offer.packQuantity;
  const scale = offer.packUnit && unitScale[offer.packUnit];
  const [dimension, factor] = unitScale[item.unit];
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
  const count =
    pack === null
      ? null
      : Math.max(
          offer.minimumPacks ?? 1,
          spendPacks,
          Math.ceil(Number((item.quantity / pack).toPrecision(12))),
        );
  const merchandise =
    count !== null && offer.priceMinor !== null
      ? count * offer.priceMinor
      : null;
  const canCompare =
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
    offer.available === true &&
    offer.minimumPacks !== null &&
    offer.minimumSpendMinor !== null &&
    offer.locationEligible === true &&
    offer.shippingMinor !== null &&
    offer.feesMinor !== null
      ? merchandise! + offer.shippingMinor + offer.feesMinor
      : null;
  const caveats: string[] = [];
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
    packs: count,
    excess:
      count !== null && pack !== null
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

export function rank(item: Ingredient, offers: Offer[], language: Language) {
  const ranked = offers
    .map((o) => compareOffer(item, o, language))
    .sort((a, b) => {
      const tier = (o: typeof a) =>
        o.landedMinor !== null ? 0 : o.canCompare ? 1 : 2;
      return (
        tier(a) - tier(b) ||
        (a.landedMinor ?? a.knownCostMinor ?? Infinity) -
          (b.landedMinor ?? b.knownCostMinor ?? Infinity) ||
        a.url.localeCompare(b.url)
      );
    });
  return {
    offers: ranked,
    bestComparableUrl: ranked.find((o) => o.landedMinor !== null)?.url ?? null,
    lowestProvisionalUrl:
      ranked.find((o) => o.canCompare && o.landedMinor === null)?.url ?? null,
  };
}
