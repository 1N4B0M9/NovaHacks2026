// Frontend view of the wire contract published by the backend owner in issue #3.
export type Language = "en" | "es";
export type Line = {
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
export type Draft = {
  id: string;
  version: number;
  reviewLanguage: Language;
  currency: "USD";
  totalMinor: number;
  canApprove: boolean;
  lines: Line[];
};
export type Order = {
  orderId: string;
  draftId: string;
  version: number;
  simulated: true;
  currency: "USD";
  totalMinor: number;
  lines: { sku: string; cases: number; priceMinor: number }[];
};
export type LineAction =
  | { action: "skip" }
  | { action: "accept_pack"; sku: string; cases: number }
  | { action: "edit"; text: string };
export const money = (value: number, language: Language) =>
  new Intl.NumberFormat(language === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
