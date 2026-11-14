import { describe, expect, it } from "vitest";
import { extractAttributions, sourcesMatch } from "@/features/detection/attribution";
import { getLanguageRules } from "@/features/detection/languages";
import { normalizeForMatching } from "@/features/detection/text";

function attributionsIn(text: string, language: string) {
  return extractAttributions(normalizeForMatching(text), getLanguageRules(language));
}

describe("extractAttributions (English)", () => {
  it("finds the source in front of a speech verb", () => {
    const [mention] = attributionsIn("The ministry said unemployment fell.", "en");
    expect(mention).toMatchObject({ source: "ministry", framing: "neutral", script: "latin" });
    expect(mention?.span).toEqual({ start: 0, end: 17 });
  });

  it("finds the source after 'according to'", () => {
    const [mention] = attributionsIn("According to Reuters, prices rose.", "en");
    expect(mention).toMatchObject({ source: "reuters", framing: "neutral" });
  });

  it("marks verbs that distance the speaker from the claim", () => {
    const [mention] = attributionsIn("Officials claimed that the figure was wrong.", "en");
    expect(mention).toMatchObject({ source: "officials", framing: "distancing" });
  });

  it("reads passive hearsay constructions", () => {
    const [mention] = attributionsIn("The company is said to be bankrupt.", "en");
    expect(mention).toMatchObject({ source: "company", framing: "distancing" });
  });

  it("skips auxiliaries between the source and the verb", () => {
    const [mention] = attributionsIn("The minister has also said it is true.", "en");
    expect(mention?.source).toBe("minister");
  });

  it("only looks inside the current clause", () => {
    const [mention] = attributionsIn("Prices rose, the central bank said.", "en");
    expect(mention?.source).toBe("central bank");
  });

  it("finds nothing when no one is credited", () => {
    expect(attributionsIn("Unemployment fell by 4%.", "en")).toEqual([]);
  });
});

describe("extractAttributions (Persian)", () => {
  it("finds the source in front of a speech verb", () => {
    const [mention] = attributionsIn("وزارت بهداشت اعلام کرد که آمار تغییر کرده است.", "fa");
    expect(mention).toMatchObject({ source: "وزارت بهداشت", framing: "neutral", script: "arabic" });
  });

  it("finds the source after a prefix phrase", () => {
    const [mention] = attributionsIn("به گفته وزارت بهداشت، آمار تغییر کرد.", "fa");
    expect(mention).toMatchObject({ source: "وزارت بهداشت", framing: "neutral" });
  });

  it("marks claims as distancing", () => {
    const [mention] = attributionsIn("سازمان ادعا کرد که آمار نادرست است.", "fa");
    expect(mention?.framing).toBe("distancing");
  });
});

describe("sourcesMatch", () => {
  const make = (source: string, script: "latin" | "arabic" = "latin") => ({
    source,
    script,
    framing: "neutral" as const,
    span: { start: 0, end: 1 },
  });

  it("matches equal names and names that contain each other", () => {
    expect(sourcesMatch(make("reuters"), make("reuters"))).toBe(true);
    expect(sourcesMatch(make("reuters"), make("reuters news"))).toBe(true);
  });

  it("separates different names", () => {
    expect(sourcesMatch(make("ministry"), make("army"))).toBe(false);
  });

  it("cannot compare names written in different scripts", () => {
    expect(sourcesMatch(make("ministry"), make("وزارت", "arabic"))).toBe(true);
  });
});
