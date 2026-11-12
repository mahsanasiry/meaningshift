import { isSupportedLanguage, type SupportedLanguageCode } from "@/lib/i18n/languages";
import { englishRules } from "./en";
import { persianRules } from "./fa";
import type { LanguageRules } from "./types";

export class UnsupportedLanguageError extends Error {
  readonly language: string;

  constructor(language: string) {
    super(`There are no detection rules for the language "${language}"`);
    this.name = "UnsupportedLanguageError";
    this.language = language;
  }
}

// Adding a language: write a rules module, add its code to SUPPORTED_LANGUAGE_CODES and
// register it here. The record type makes the compiler flag a missing entry.
const RULES_BY_LANGUAGE: Record<SupportedLanguageCode, LanguageRules> = {
  en: englishRules,
  fa: persianRules,
};

export function getLanguageRules(languageTag: string): LanguageRules {
  const primary = languageTag.trim().toLowerCase().split(/[-_]/)[0] ?? "";
  if (!isSupportedLanguage(primary)) {
    throw new UnsupportedLanguageError(languageTag);
  }
  return RULES_BY_LANGUAGE[primary];
}
