import { describe, expect, it } from "vitest";
import { claimPairFormSchema } from "@/lib/validation/pair";

const version = {
  body: "The study found a 40% drop in 2021.",
  language: "en",
  sourceName: "Example Weekly",
  sourceUrl: "https://example.org/article",
  publishedOn: "2026-10-01",
};

const valid = { title: "", a: version, b: { ...version, language: "fa", body: "کاهش ۴۰ درصدی" } };

describe("claimPairFormSchema", () => {
  it("accepts two complete versions, including Persian text", () => {
    expect(claimPairFormSchema.safeParse(valid).success).toBe(true);
  });

  it("trims text fields", () => {
    const parsed = claimPairFormSchema.parse({
      title: "  Drop  ",
      a: { ...version, body: "  text  ", sourceUrl: " https://example.org/a " },
      b: version,
    });
    expect(parsed.title).toBe("Drop");
    expect(parsed.a.body).toBe("text");
    expect(parsed.a.sourceUrl).toBe("https://example.org/a");
  });

  it("rejects an empty claim text on either side", () => {
    expect(claimPairFormSchema.safeParse({ ...valid, a: { ...version, body: " " } }).success).toBe(
      false,
    );
    expect(claimPairFormSchema.safeParse({ ...valid, b: { ...version, body: "" } }).success).toBe(
      false,
    );
  });

  it("rejects addresses that are not web addresses", () => {
    for (const sourceUrl of ["javascript:alert(1)", "ftp://example.org/file", "example.org", ""]) {
      expect(
        claimPairFormSchema.safeParse({ ...valid, a: { ...version, sourceUrl } }).success,
      ).toBe(false);
    }
  });

  it("rejects dates that do not exist", () => {
    for (const publishedOn of ["", "2026-02-30", "01/10/2026"]) {
      expect(
        claimPairFormSchema.safeParse({ ...valid, b: { ...version, publishedOn } }).success,
      ).toBe(false);
    }
  });

  it("rejects an unsupported language", () => {
    expect(
      claimPairFormSchema.safeParse({ ...valid, a: { ...version, language: "fr" } }).success,
    ).toBe(false);
  });
});
