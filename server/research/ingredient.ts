export { ingredient, fold, unitScale } from "../match";
export type { Ingredient, Language, Unit } from "../match";
import { fold } from "../match";

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
