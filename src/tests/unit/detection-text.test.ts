import { describe, expect, it } from "vitest";
import {
  boundedAlternation,
  clauseFrom,
  normalizeForMatching,
  overlapsAny,
  quote,
  spansOverlap,
} from "@/features/detection/text";

describe("normalizeForMatching", () => {
  it("turns Persian and Arabic-Indic digits into Latin digits", () => {
    expect(normalizeForMatching("۱۲۳۴۵۶۷۸۹۰")).toBe("1234567890");
    expect(normalizeForMatching("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  it("maps Arabic separators and the percent sign", () => {
    expect(normalizeForMatching("۱٬۲۰۰٫۵٪")).toBe("1,200.5%");
  });

  it("unifies Arabic and Persian letter variants", () => {
    expect(normalizeForMatching("كي")).toBe("\u06a9\u06cc");
  });

  it("replaces joiners and direction marks with spaces", () => {
    expect(normalizeForMatching("می\u200cگوید")).toBe("می گوید");
    expect(normalizeForMatching("a\u200eb\u200fc\u00a0d")).toBe("a b c d");
  });

  it("never changes the length, so offsets stay valid", () => {
    const sample = "نرخ بیکاری‌ ۴۰٫۵٪ بود؛ the rate was 4,5% \u202bسلام\u202c";
    expect(normalizeForMatching(sample)).toHaveLength(sample.length);
  });
});

describe("boundedAlternation", () => {
  it("matches whole words only", () => {
    const hits = [..."if the gift is lifted".matchAll(boundedAlternation(["if"]))];
    expect(hits).toHaveLength(1);
    expect(hits[0]?.index).toBe(0);
  });

  it("prefers the longest phrase at a position", () => {
    const hits = [..."only if it rains".matchAll(boundedAlternation(["if", "only if"]))];
    expect(hits).toHaveLength(1);
    expect(hits[0]?.[0]).toBe("only if");
  });

  it("lets a space match any run of whitespace", () => {
    const hits = [..."only   when ready".matchAll(boundedAlternation(["only when"]))];
    expect(hits).toHaveLength(1);
  });

  it("matches nothing when given no phrases", () => {
    expect([..."anything".matchAll(boundedAlternation([]))]).toHaveLength(0);
  });
});

describe("span helpers", () => {
  it("detects overlap but not touching spans", () => {
    expect(spansOverlap({ start: 0, end: 5 }, { start: 4, end: 8 })).toBe(true);
    expect(spansOverlap({ start: 0, end: 5 }, { start: 5, end: 8 })).toBe(false);
    expect(
      overlapsAny({ start: 2, end: 3 }, [
        { start: 10, end: 12 },
        { start: 1, end: 4 },
      ]),
    ).toBe(true);
  });
});

describe("clauseFrom and quote", () => {
  it("reads up to the end of the clause", () => {
    expect(clauseFrom("if the court agrees, it will start", 0)).toBe("if the court agrees");
    expect(clauseFrom("اگر دادگاه موافقت کند، اجرا می شود", 0)).toBe("اگر دادگاه موافقت کند");
  });

  it("limits very long clauses", () => {
    expect(clauseFrom("x".repeat(200), 0, 50)).toHaveLength(50);
  });

  it("wraps an excerpt in typographic quotes with direction isolates", () => {
    expect(quote("  40  %")).toBe("\u201c\u206840 %\u2069\u201d");
  });
});
