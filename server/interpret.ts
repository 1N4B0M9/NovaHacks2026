import catalog from "./catalog.json";

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

const units: Record<string, string> = {
  case: "case",
  cases: "case",
  cs: "case",
  caja: "case",
  cajas: "case",
  doz: "dozen",
  dozen: "dozen",
  dozens: "dozen",
  docena: "dozen",
  docenas: "dozen",
  ea: "each",
  each: "each",
  unidad: "each",
  unidades: "each",
  carton: "carton",
  cartons: "carton",
  cartones: "carton",
  lb: "lb",
  lbs: "lb",
  pounds: "lb",
  libra: "lb",
  libras: "lb",
};

export function interpret(id: string, source: string, text = source): Line {
  const line: Line = {
    id,
    source,
    text,
    sku: null,
    label: null,
    requestedQuantity: null,
    requestedUnit: null,
    packSize: null,
    packUnit: null,
    priceMinor: null,
    cases: null,
    status: "needs_review",
    reason: "unknown_item",
  };
  const words = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const matches = catalog.flatMap((item) => {
    const alias = item.aliases.find((name) =>
      new RegExp("\\b" + name + "\\b").test(words),
    );
    return alias ? [{ item, alias }] : [];
  });
  if (matches.length !== 1) {
    line.reason = matches.length ? "ambiguous_item" : "unknown_item";
    return line;
  }
  const { item, alias } = matches[0];
  Object.assign(line, {
    sku: item.sku,
    label: item.label,
    packSize: item.size,
    packUnit: item.unit,
    priceMinor: item.price,
  });
  // Consume the complete remainder so modifiers, ranges or multiple quantities never silently disappear.
  const remainder = words
    .replace(new RegExp("\\b" + alias + "\\b"), " ")
    .trim();
  const match = /^(\d+)\s*([a-z]+)?(?:\s+de)?$/.exec(remainder);
  if (!match) {
    line.reason = remainder ? "unrecognized_input" : "missing_quantity";
    return line;
  }
  const count = Number(match[1]);
  if (!Number.isSafeInteger(count) || count < 1 || count > 100000) {
    line.reason = "unrecognized_input";
    return line;
  }
  const unit = units[match[2] ?? ""];
  line.requestedQuantity = unit === "dozen" ? count * 12 : count;
  line.requestedUnit = unit === "dozen" ? "each" : (unit ?? null);
  if (!unit) {
    line.reason = match[2] ? "unrecognized_input" : "missing_unit";
    return line;
  }
  const cases =
    unit === "case"
      ? count
      : line.requestedUnit === item.unit
        ? line.requestedQuantity / item.size
        : 0;
  if (!Number.isInteger(cases) || cases < 1) {
    line.reason = "pack_mismatch";
    return line;
  }
  return { ...line, cases, status: "ready", reason: null };
}
