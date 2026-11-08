import { describe, expect, it } from "vitest";
import {
  getLanguageLabel,
  getTextDirection,
  isSupportedLanguage,
  LANGUAGE_OPTIONS,
} from "@/lib/i18n/languages";

describe("languages", () => {
  it("offers English and Persian", () => {
    expect(LANGUAGE_OPTIONS.map((option) => option.value)).toEqual(["en", "fa"]);
  });

  it("recognises only supported codes", () => {
    expect(isSupportedLanguage("fa")).toBe(true);
    expect(isSupportedLanguage("fr")).toBe(false);
    expect(isSupportedLanguage("constructor")).toBe(false);
  });

  it("labels known languages and echoes unknown codes", () => {
    expect(getLanguageLabel("en")).toBe("English");
    expect(getLanguageLabel("fr")).toBe("fr");
  });

  it("derives the text direction from the language", () => {
    expect(getTextDirection("fa")).toBe("rtl");
    expect(getTextDirection("en")).toBe("ltr");
  });
});
