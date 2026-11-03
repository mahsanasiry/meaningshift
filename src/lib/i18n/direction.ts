export type TextDirection = "ltr" | "rtl";

const RTL_LANGUAGES: ReadonlySet<string> = new Set(["ar", "fa", "he", "ur"]);

export function getDirection(languageTag: string): TextDirection {
  const primarySubtag = languageTag.trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return RTL_LANGUAGES.has(primarySubtag) ? "rtl" : "ltr";
}
