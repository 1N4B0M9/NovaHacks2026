import { matchIngredient } from "./match";
import catalog from "./catalog.json";

export type Line = {
  match?: ReturnType<typeof matchIngredient>;
  id: string;
  source: string;
  text: string;
  sku: string | null;
  label: string | null;
  requestedQuantity: number | null;
  requestedUnit: string | null;
  packSize: number | null;
  packUnit: string | null;
  priceMinor: number | null;
  cases: number | null;
  supplier?: string | null;
  productUrl?: string | null;
  status: "ready" | "needs_review" | "skipped";
  reason:
    | "unknown_item"
    | "ambiguous_item"
    | "missing_quantity"
    | "missing_unit"
    | "pack_mismatch"
    | "unrecognized_input"
    | null;
};

export function interpret(id: string, source: string, text = source): Line {
  const match = matchIngredient(text);
  const product =
    match.candidates.length === 1 &&
    match.candidates[0].reason === "exact_alias"
      ? catalog.find((item) => item.sku === match.candidates[0].sku)
      : undefined;
  const line: Line = {
    id,
    source,
    text,
    match,
    sku: product?.sku ?? null,
    label: product?.label ?? null,
    requestedQuantity: match.quantity,
    requestedUnit: match.unit,
    packSize: product?.size ?? null,
    packUnit: product?.unit ?? null,
    priceMinor: product?.price ?? null,
    cases: null,
    status: "needs_review",
    reason: match.reason,
  };
  if (match.reason) return line;
  if (!product)
    return {
      ...line,
      reason: match.constraints.length ? "unrecognized_input" : "unknown_item",
    };
  const cases =
    match.unit === "case"
      ? match.quantity!
      : match.unit === product.unit
        ? match.quantity! / product.size
        : 0;
  if (!Number.isInteger(cases) || cases < 1)
    return { ...line, reason: "pack_mismatch" };
  return { ...line, cases, status: "ready", reason: null };
}
