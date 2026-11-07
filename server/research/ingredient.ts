export { ingredient, fold, unitScale } from "../match";
export type { Ingredient, Language, Unit } from "../match";
import { fold, matchIngredient, type Ingredient, type Unit } from "../match";

export type ResearchIngredient = Omit<Ingredient, "quantity" | "unit"> & {
  quantity: number | null;
  unit: Unit | null;
};
// A missing amount blocks cost comparison, not browsing a known identity.
export function researchIngredient(source: string): ResearchIngredient | null {
  const match = matchIngredient(source);
  if (
    !match.canonical ||
    (match.reason &&
      !["missing_quantity", "missing_unit"].includes(match.reason))
  )
    return null;
  const candidate = match.candidates.find(
    (c) => c.canonical === match.canonical,
  )!;
  return {
    source,
    query: candidate.canonical,
    display: candidate.display,
    quantity: match.quantity,
    unit: match.unit,
  };
}

const tokens = (text: string) =>
  fold(text)
    .replace(/\d+(?:\.\d+)?/g, " ")
    .match(/[a-z]+/g)
    ?.map(
      (w) =>
        ({
          tomatoes: "tomato",
          potatoes: "potato",
          onions: "onion",
          lentils: "lentil",
          eggs: "egg",
          beans: "bean",
          chickpeas: "chickpea",
          cubes: "cube",
        })[w] ?? w,
    ) ?? [];
const packaging = new Set(
  "organic fresh lb lbs oz kg g ml l fl bag bags pack packs bulk grown in usa certified x carton cartons case count ct each ea pc pcs liter liters pounds gram grams loose special".split(
    " ",
  ),
);
const forms =
  "powder powdered flour soup sauce juice tea fried canned dried sundried dehydrated frozen roasted cooked pickled puree paste ketchup granulated granules flakes seasoning seed seeds supplement mix chocolate flavored sweetened concentrate chips cracker crackers rings".split(
    " ",
  );
export function assessTitle(query: string, title: string) {
  const wanted = tokens(query),
    words = tokens(title);
  const reject = (reason: string) => ({
    compatibility: "incompatible" as const,
    reason,
  });
  if (!wanted.length || !wanted.every((w) => words.includes(w)))
    return reject("ingredient_mismatch");
  if (forms.some((w) => words.includes(w) && !wanted.includes(w)))
    return reject("different_product_form");
  if (
    wanted.includes("onion") &&
    !wanted.includes("green") &&
    words.includes("green")
  )
    return reject("different_ingredient");
  if (
    wanted.includes("whole") &&
    wanted.includes("chicken") &&
    ["breast", "thigh", "wing", "wings", "strips", "sausage"].some((w) =>
      words.includes(w),
    )
  )
    return reject("different_cut");
  if (
    wanted.includes("flour") &&
    ["wheat", "almond", "rice", "corn", "coconut"].some(
      (w) => words.includes(w) && !wanted.includes(w),
    )
  )
    return reject("different_flour");
  const extras = words.filter((w) => !wanted.includes(w) && !packaging.has(w));
  return {
    compatibility: extras.length
      ? ("needs_confirmation" as const)
      : ("compatible" as const),
    reason: extras.length
      ? "confirm_variety_or_attributes"
      : "ingredient_and_form_match",
  };
}
export function matchesTitle(query: string, title: string) {
  return assessTitle(query, title).compatibility !== "incompatible";
}
