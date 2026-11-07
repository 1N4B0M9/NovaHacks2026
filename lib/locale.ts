export type Language = "en" | "es" | "zh";

export function localize(
  language: Language,
  en: string,
  es: string,
  zh: string,
) {
  return { en, es, zh }[language];
}
