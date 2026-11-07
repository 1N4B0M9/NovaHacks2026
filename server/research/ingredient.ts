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
} as const;
export type Unit = keyof typeof unitScale;
export type Ingredient = {
  source: string;
  query: string;
  quantity: number;
  unit: Unit;
  display: Record<Language, string>;
};

const names: [string, string, string[]][] = [
  ["green lentils", "lentejas verdes", []],
  ["brown lentils", "lentejas marrones", ["lentejas pardas"]],
  ["red lentils", "lentejas rojas", []],
  ["lentils", "lentejas", []],
  ["brown rice", "arroz integral", []],
  ["white rice", "arroz blanco", []],
  ["rice", "arroz", []],
  ["oat milk", "leche de avena", []],
  ["unsweetened oat milk", "leche de avena sin azucar", []],
  ["eggs", "huevos", ["egg", "huevo"]],
  ["tomatoes", "tomates", ["tomato", "tomate"]],
  ["romaine", "lechuga romana", ["romaine lettuce"]],
  ["chickpeas", "garbanzos", []],
  ["black beans", "frijoles negros", []],
  ["rolled oats", "avena en hojuelas", []],
  ["almond flour", "harina de almendras", []],
  ["brown rice flour", "harina de arroz integral", []],
];
const units: Record<string, Unit> = {
  kg: "kg",
  kilograms: "kg",
  kilos: "kg",
  g: "g",
  grams: "g",
  gramos: "g",
  lb: "lb",
  lbs: "lb",
  pounds: "lb",
  libras: "lb",
  libra: "lb",
  oz: "oz",
  ounces: "oz",
  onzas: "oz",
  ml: "ml",
  l: "l",
  litros: "l",
  liters: "l",
  "fl oz": "fl oz",
  each: "each",
  ea: "each",
  unidades: "each",
  carton: "carton",
  cartons: "carton",
  cartones: "carton",
  case: "case",
  cases: "case",
  caja: "case",
  cajas: "case",
};
export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function ingredient(source: string): Ingredient | null {
  const match = /^(\d+(?:[.,]\d+)?)\s+(.+)$/.exec(fold(source));
  if (!match) return null;
  const count = Number(match[1].replace(",", "."));
  if (count <= 0 || count > 100000) return null;
  // Recognize the entire expression; never strip a variety, uncertainty marker or modifier.
  const parts = /^([a-z]+(?: oz)?)\s+(?:de\s+)?(.+)$/.exec(match[2]);
  if (!parts) return null;
  const dozen = ["doz", "dozen", "dozens", "docena", "docenas"].includes(
    parts[1],
  );
  const unit = dozen
    ? "each"
    : Object.hasOwn(units, parts[1])
      ? units[parts[1]]
      : null;
  const entry = names.find(([en, es, aliases]) =>
    [en, es, ...aliases].includes(parts[2]),
  );
  if (!entry || !unit) return null;
  return {
    source,
    query: entry[0],
    quantity: count * (dozen ? 12 : 1),
    unit,
    display: { en: entry[0], es: entry[1] },
  };
}

// A storefront may return recipes, flour, bundles or flavored substitutes for a search.
// Require ingredient tokens and allow only known presentation/size words beyond them.
export function matchesTitle(query: string, title: string) {
  const words: string[] =
    fold(title)
      .replace(/\d+(?:\.\d+)?/g, " ")
      .match(/[a-z]+/g) ?? [];
  const wanted = query.split(" ");
  const allowed = new Set([
    ...wanted,
    "organic",
    "lb",
    "lbs",
    "oz",
    "kg",
    "g",
    "ml",
    "l",
    "fl",
    "bag",
    "bags",
    "pack",
    "packs",
    "bulk",
    "grown",
    "in",
    "usa",
    "certified",
    "x",
    "carton",
    "cartons",
    "case",
    "count",
    "ct",
    "each",
    "liter",
    "liters",
    "pounds",
    "gram",
    "grams",
  ]);
  return (
    wanted.every((word) => words.includes(word)) &&
    words.every((word) => allowed.has(word))
  );
}
