import { describe, expect, it } from "vitest";
import { UnsupportedLanguageError, getLanguageRules } from "@/features/detection/languages";
import { findMarkers } from "@/features/detection/markers";
import { normalizeForMatching } from "@/features/detection/text";
import { SUPPORTED_LANGUAGE_CODES } from "@/lib/i18n/languages";

function idsIn(text: string, language: string, family: "conditions" | "certainty") {
  return findMarkers(normalizeForMatching(text), getLanguageRules(language)[family]).map(
    (hit) => hit.id,
  );
}

describe("language registry", () => {
  it("has rules for every supported language", () => {
    for (const code of SUPPORTED_LANGUAGE_CODES) {
      expect(getLanguageRules(code).code).toBe(code);
    }
  });

  it("ignores region subtags and letter case", () => {
    expect(getLanguageRules("en-GB").code).toBe("en");
    expect(getLanguageRules("FA_ir").code).toBe("fa");
  });

  it("refuses languages it has no rules for", () => {
    expect(() => getLanguageRules("fr")).toThrow(UnsupportedLanguageError);
  });
});

describe("rule data", () => {
  for (const code of SUPPORTED_LANGUAGE_CODES) {
    const rules = getLanguageRules(code);

    it(`${code}: every phrase rule has phrases and no phrase is listed twice`, () => {
      const families = [
        rules.conditions,
        rules.certainty,
        rules.relativeDates,
        rules.attributionPrefixes,
        rules.attributionVerbs,
      ];
      for (const family of families) {
        const seen = new Set<string>();
        for (const rule of family) {
          expect(rule.phrases.length).toBeGreaterThan(0);
          for (const phrase of rule.phrases) {
            const normalized = phrase.replace(/\s+/g, " ").toLowerCase();
            expect(seen.has(normalized)).toBe(false);
            seen.add(normalized);
          }
        }
      }
    });

    it(`${code}: certainty strengths are never zero`, () => {
      for (const rule of rules.certainty) {
        expect(rule.strength === 0).toBe(false);
      }
    });
  }
});

describe("condition markers", () => {
  it("finds the markers named in the brief", () => {
    expect(idsIn("It applies if it rains, unless it snows.", "en", "conditions")).toEqual([
      "if",
      "unless",
    ]);
    expect(idsIn("Only when ready, provided that you pay.", "en", "conditions")).toEqual([
      "only-if",
      "provided",
    ]);
  });

  it("prefers the longest marker", () => {
    expect(idsIn("only if it rains", "en", "conditions")).toEqual(["only-if"]);
  });

  it("does not match inside other words", () => {
    expect(idsIn("The gift was lifted", "en", "conditions")).toEqual([]);
  });

  it("finds Persian markers with and without a zero-width joiner", () => {
    expect(idsIn("اگر باران ببارد", "fa", "conditions")).toEqual(["if"]);
    expect(idsIn("مگر این\u200cکه بارش شود", "fa", "conditions")).toEqual(["unless"]);
    expect(idsIn("فقط در صورتی که آماده باشد", "fa", "conditions")).toEqual(["only-if"]);
  });

  it("gives equivalent markers in both languages the same id", () => {
    expect(idsIn("if", "en", "conditions")).toEqual(idsIn("اگر", "fa", "conditions"));
    expect(idsIn("unless", "en", "conditions")).toEqual(idsIn("مگر اینکه", "fa", "conditions"));
  });
});

describe("certainty markers", () => {
  it("finds hedges and strong words from the brief", () => {
    expect(
      idsIn("It may help, reportedly, and always works definitely.", "en", "certainty"),
    ).toEqual(["possible", "reported", "always", "certain"]);
  });

  it("treats may and might as the same hedge", () => {
    expect(idsIn("may", "en", "certainty")).toEqual(idsIn("might", "en", "certainty"));
  });

  it("finds Persian markers and matches them to English ones", () => {
    expect(idsIn("ممکن است", "fa", "certainty")).toEqual(idsIn("may", "en", "certainty"));
    expect(idsIn("همیشه", "fa", "certainty")).toEqual(idsIn("always", "en", "certainty"));
    expect(idsIn("گفته می\u200cشود", "fa", "certainty")).toEqual(["reported"]);
  });
});
