import catalog from "./catalog.json";
import vocabulary from "./vocabulary.json";

export type Language = "en" | "es";
export const unitScale = {
  g: ["mass", 1],
  kg: ["mass", 1000],
  lb: ["mass", 453.59237],
  oz: ["mass", 28.349523125],
  ml: ["volume", 1],
  l: ["volume", 1000],
  "fl oz": ["volume", 29.5735295625],
  each: ["count", 1],
  carton: ["carton", 1],
  case: ["case", 1],
  tsp: ["teaspoon", 1],
  cup: ["cup", 1],
} as const;
export type Unit = keyof typeof unitScale;
export type Ingredient = {
  source: string;
  query: string;
  quantity: number;
  unit: Unit;
  display: Record<Language, string>;
};

export const fold = (s: string) =>
  s
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const unitAliases: Record<string, string> = {
  tsp: "tsp",
  cucharadita: "tsp",
  cucharaditas: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  cup: "cup",
  cups: "cup",
  taza: "cup",
  tazas: "cup",
  kg: "kg",
  kilograms: "kg",
  kilos: "kg",
  公斤: "kg",
  千克: "kg",
  g: "g",
  grams: "g",
  gramos: "g",
  克: "g",
  lb: "lb",
  lbs: "lb",
  pounds: "lb",
  libra: "lb",
  libras: "lb",
  磅: "lb",
  oz: "oz",
  ounces: "oz",
  onzas: "oz",
  盎司: "oz",
  ml: "ml",
  毫升: "ml",
  l: "l",
  litros: "l",
  liters: "l",
  升: "l",
  "fl oz": "fl oz",
  ea: "each",
  each: "each",
  unidad: "each",
  unidades: "each",
  个: "each",
  個: "each",
  颗: "each",
  顆: "each",
  carton: "carton",
  cartons: "carton",
  cartones: "carton",
  盒: "carton",
  cs: "case",
  case: "case",
  cases: "case",
  caja: "case",
  cajas: "case",
  箱: "case",
  doz: "dozen",
  dozen: "dozen",
  dozens: "dozen",
  docena: "dozen",
  docenas: "dozen",
  打: "dozen",
};
const numberWords: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  medio: 0.5,
  media: 0.5,
  one: 1,
  two: 2,
};
const numberPattern =
  "(?:[0-9]+(?:\\s+[0-9]+)?/[0-9]+|[0-9]+(?:[.,][0-9]+)?|(?:" +
  Object.keys(numberWords).join("|") +
  ")\\b|[一二两兩三四五六七八九十]+)";
const unitPattern = Object.keys(unitAliases)
  .sort((a, b) => b.length - a.length)
  .join("|");
// A Latin unit must end at a word boundary. Han units can abut the ingredient.
const amount =
  "(" + numberPattern + ")\\s*(?:(" + unitPattern + ")\\.?(?![a-z]))?";
const prefix = new RegExp("^" + amount + "\\s*(?:de\\s+)?(.+)$");
const suffix = new RegExp("^(.+?)\\s*(?:[×x]\\s*)?" + amount + "$");
const numerals: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  兩: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};
function numeric(s: string) {
  if (Object.hasOwn(numberWords, s)) return numberWords[s];
  const fraction = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/.exec(s);
  if (fraction)
    return Number(fraction[1] ?? 0) + Number(fraction[2]) / Number(fraction[3]);
  if (/^\d/.test(s)) return Number(s.replace(",", "."));
  if (numerals[s]) return numerals[s];
  const match = /^([一二两兩三四五六七八九]?)十([一二三四五六七八九]?)$/.exec(
    s,
  );
  return match
    ? (numerals[match[1]] ?? 1) * 10 + (numerals[match[2]] ?? 0)
    : NaN;
}
const entries = vocabulary.map((v) => ({
  ...v,
  sku: catalog.find((item) => fold(item.label) === v.en)?.sku ?? null,
  keys: [
    ...new Set(
      [
        v.en,
        v.es,
        v.zh,
        ...v.aliases,
        ...(catalog.find((item) => fold(item.label) === v.en)?.aliases ?? []),
      ].map(fold),
    ),
  ],
}));
type Entry = (typeof entries)[number];
function candidate(
  e: Entry,
  reason: "exact_alias" | "one_edit" | "partial_phrase",
) {
  const explanation = {
    exact_alias: {
      en: "Known ingredient name.",
      es: "Nombre de ingrediente reconocido.",
      zh: "已识别的食材名称。",
    },
    one_edit: {
      en: "Similar spelling; confirm the ingredient.",
      es: "Ortografía similar; confirma el ingrediente.",
      zh: "拼写相似，请确认食材。",
    },
    partial_phrase: {
      en: "Only part of the phrase matched; confirm all modifiers.",
      es: "Coincidencia parcial; confirma todos los detalles.",
      zh: "仅匹配了部分文字，请确认所有限定词。",
    },
  };
  return {
    canonical: e.en,
    display: { en: e.en, es: e.es, zh: e.zh },
    sku: e.sku,
    constraints: e.constraints,
    reason,
    explanation: explanation[reason],
  };
}
function oneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + a.length - i + b.length - j === 1;
}
function candidates(phrase: string) {
  const exact = entries.filter((e) => e.keys.includes(phrase));
  if (exact.length) return exact.map((e) => candidate(e, "exact_alias"));
  // For non-exact phrases only suggest; never mint a SKU from a spelling correction.
  const embedded = entries.filter((e) =>
    e.keys.some((k) =>
      /[\u3400-\u9fff]/.test(k)
        ? phrase.includes(k)
        : (" " + phrase + " ").includes(" " + k + " "),
    ),
  );
  if (embedded.length)
    return embedded.map((e) => candidate(e, "partial_phrase"));
  if (!/^[a-z ]{5,}$/.test(phrase)) return [];
  return entries
    .filter((e) => e.keys.some((k) => k.length >= 5 && oneEdit(phrase, k)))
    .map((e) => candidate(e, "one_edit"));
}
export function isHeading(source: string) {
  return /^(?:receta|reseta)\s+(?:de|para)\s+\S|^recipe\s+for\s+\S/.test(
    fold(source),
  );
}
const countable = new Set([
  "whole chicken",
  "potatoes",
  "onion",
  "tomatoes",
  "green chili",
]);
export function matchIngredient(source: string) {
  const s = fold(source);
  const first = prefix.exec(s);
  const last = first ? null : suffix.exec(s);
  let phrase = (first?.[3] ?? last?.[1] ?? s).trim();
  const raw = first?.[1] ?? last?.[2];
  let rawUnit = first?.[2] ?? last?.[3];
  if (first && !rawUnit) {
    const trailing = new RegExp("^(.+?)\\s+(" + unitPattern + ")\\.?$").exec(
      phrase,
    );
    if (trailing) {
      phrase = trailing[1];
      rawUnit = trailing[2];
    }
  }
  const value = raw ? numeric(raw) : null;
  let unit = rawUnit ? unitAliases[rawUnit] : null;
  const quantity =
    value !== null && Number.isFinite(value)
      ? value * (unit === "dozen" ? 12 : 1)
      : null;
  // Preparation belongs to the recipe and should not become a retail product requirement.
  const preparation: string[] = phrase.match(/\b(?:picad[oa]s?|chopped)\s*$/g) ?? [];
  const identity = preparation.length
    ? phrase.slice(0, -preparation[0].length).trim()
    : phrase;
  const options = candidates(identity);
  const exact =
    options.length === 1 && options[0].reason === "exact_alias"
      ? options[0]
      : null;
  const invalid =
    /[?？［\[\]]|\d\s*[-–]\s*\d/.test(s) ||
    (raw !== undefined &&
      (quantity === null ||
        quantity <= 0 ||
        value! > 100000 ||
        (["case", "dozen", "each", "carton"].includes(unit ?? "") &&
          !Number.isInteger(value))));
  if (!unit && exact && quantity !== null && countable.has(exact.canonical))
    unit = "each";
  let reason:
    | "unrecognized_input"
    | "ambiguous_item"
    | "unknown_item"
    | "missing_quantity"
    | "missing_unit"
    | null = null;
  if (invalid) reason = "unrecognized_input";
  else if (!exact)
    reason =
      options.length > 1
        ? "ambiguous_item"
        : options.length
          ? "unrecognized_input"
          : "unknown_item";
  else if (quantity === null) reason = "missing_quantity";
  else if (!unit) reason = "missing_unit";
  let constraints = exact?.constraints ?? [];
  if (
    !exact &&
    options.length === 1 &&
    options[0].reason === "partial_phrase"
  ) {
    const aliases = entries.find((e) => e.en === options[0].canonical)!.keys;
    const token = [...aliases]
      .sort((a, b) => b.length - a.length)
      .find((k) => phrase.includes(k));
    if (token) {
      const residual = phrase.replace(token, " ").trim();
      if (residual) constraints = [residual];
    }
  }
  const heading = isHeading(source);
  const kind = heading ? "heading" : exact ? "ingredient" : "unclear";
  const purchaseStatus = heading
    ? "heading"
    : reason
      ? "needs_clarification"
      : exact?.sku
        ? "local_sku"
        : "no_local_sku";
  return {
    kind,
    purchaseStatus,
    preparation,
    source,
    phrase,
    quantity,
    unit: (unit === "dozen" ? "each" : unit) as Unit | null,
    candidates: options,
    canonical: exact?.canonical ?? null,
    constraints,
    reason,
  };
}
export function ingredient(source: string): Ingredient | null {
  const match = matchIngredient(source);
  if (match.reason || !match.unit || match.quantity === null) return null;
  const c = match.candidates[0];
  return {
    source,
    query: c.canonical,
    quantity: match.quantity,
    unit: match.unit,
    display: c.display,
  };
}
