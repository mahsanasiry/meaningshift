import { getDirection, type TextDirection } from "./direction";

export const SUPPORTED_LANGUAGE_CODES = ["en", "fa"] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

const LANGUAGE_LABELS: Record<SupportedLanguageCode, string> = {
  en: "English",
  fa: "Persian (فارسی)",
};

export const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGE_CODES.map((code) => ({
  value: code,
  label: LANGUAGE_LABELS[code],
}));

export function isSupportedLanguage(code: string): code is SupportedLanguageCode {
  return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code);
}

export function getLanguageLabel(code: string): string {
  return isSupportedLanguage(code) ? LANGUAGE_LABELS[code] : code;
}

export function getTextDirection(code: string): TextDirection {
  return getDirection(code);
}
