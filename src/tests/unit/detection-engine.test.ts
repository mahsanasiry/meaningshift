import { describe, expect, it } from "vitest";
import { UnsupportedLanguageError } from "@/features/detection/languages";
import { detectDifferences } from "@/features/detection/engine";
import type { DetectedDifference, Detector } from "@/features/detection/types";

function run(
  textA: string,
  languageA: string,
  textB: string,
  languageB: string,
): DetectedDifference[] {
  return detectDifferences({
    a: { text: textA, language: languageA },
    b: { text: textB, language: languageB },
  });
}

function categories(differences: DetectedDifference[]): string[] {
  return differences.map((difference) => difference.category);
}

describe("detectDifferences: nothing to report", () => {
  it("returns nothing for identical texts", () => {
    const text = "The ministry said unemployment fell by 4% in March.";
    expect(run(text, "en", text, "en")).toEqual([]);
  });

  it("returns nothing when only casing and spacing differ", () => {
    expect(run("Prices  ROSE today", "en", "prices rose today", "en")).toEqual([]);
  });

  it("does not flag a number when only its spelling differs", () => {
    const result = run(
      "Four percent of voters stayed home.",
      "en",
      "4% of voters stayed home.",
      "en",
    );
    expect(categories(result)).not.toContain("number");
  });

  it("treats Persian and Latin digits as the same figure across languages", () => {
    expect(run("بیکاری ۴ درصد کاهش یافت", "fa", "Unemployment fell by 4%.", "en")).toEqual([]);
  });

  it("treats a Persian month and the Gregorian month it mostly covers as equal", () => {
    const result = run(
      "انتخابات در مهر ۱۴۰۴ برگزار شد.",
      "fa",
      "The election was held in October 2025.",
      "en",
    );
    expect(categories(result)).not.toContain("date");
  });

  it("treats the same Persian date and Gregorian date as equal", () => {
    expect(
      run(
        "انتخابات در ۱۰ مهر ۱۴۰۴ برگزار شد.",
        "fa",
        "The election was held on October 2, 2025.",
        "en",
      ),
    ).toEqual([]);
  });

  it("does not flag certainty when two hedges mean the same", () => {
    const result = run("The drug may help.", "en", "The drug might help.", "en");
    expect(categories(result)).not.toContain("certainty");
  });
});

describe("detectDifferences: numbers", () => {
  it("flags a changed percentage and links both highlights", () => {
    const textA = "Unemployment fell by 4% in March, the ministry said.";
    const textB = "Unemployment fell by 5% in March, the ministry said.";
    const result = run(textA, "en", textB, "en");

    expect(categories(result)).toEqual(["number"]);
    expect(result[0]?.a?.excerpt).toBe("4%");
    expect(result[0]?.b?.excerpt).toBe("5%");
    expect(result[0]?.summary).toContain("Possible number difference");
  });

  it("flags a different order of magnitude despite thousand separators", () => {
    expect(categories(run("1,000 people came", "en", "10,000 people came", "en"))).toEqual([
      "number",
    ]);
    expect(categories(run("1,000 people came", "en", "1000 people came", "en"))).not.toContain(
      "number",
    );
  });

  it("flags a figure that exists in only one version", () => {
    const result = run("About 300 people came.", "en", "People came.", "en");
    expect(result[0]?.category).toBe("number");
    expect(result[0]?.b).toBeNull();
  });

  it("flags a changed figure across languages", () => {
    const result = run("بیکاری ۴ درصد کاهش یافت", "fa", "Unemployment fell by 5%.", "en");
    expect(categories(result)).toEqual(["number"]);
    expect(result[0]?.a?.excerpt).toBe("۴ درصد");
  });
});

describe("detectDifferences: dates", () => {
  it("flags a changed date", () => {
    const result = run(
      "The vote was held on March 4, 2021.",
      "en",
      "The vote was held on March 5, 2021.",
      "en",
    );
    expect(categories(result)).toEqual(["date"]);
  });

  it("does not report the digits of a date as numbers", () => {
    expect(categories(run("It ended in 2021.", "en", "It ended in 2022.", "en"))).toEqual(["date"]);
  });

  it("flags a Persian date that is one day off from the English one", () => {
    const result = run(
      "انتخابات در ۱۰ مهر ۱۴۰۴ برگزار شد.",
      "fa",
      "The election was held on October 3, 2025.",
      "en",
    );
    expect(categories(result)).toEqual(["date"]);
  });

  it("flags a changed time reference", () => {
    expect(categories(run("It happened yesterday.", "en", "It happened last week.", "en"))).toEqual(
      ["date"],
    );
  });
});

describe("detectDifferences: conditions", () => {
  it("flags a condition that was dropped", () => {
    const result = run(
      "The tax applies if parliament approves it.",
      "en",
      "The tax applies.",
      "en",
    );
    expect(categories(result)).toEqual(["condition"]);
    expect(result[0]?.a?.excerpt).toBe("if");
    expect(result[0]?.b).toBeNull();
  });

  it("flags a condition that was changed", () => {
    const result = run(
      "The rule applies if the court agrees.",
      "en",
      "The rule applies unless the court agrees.",
      "en",
    );
    expect(categories(result)).toEqual(["condition"]);
    expect(result[0]?.summary).toContain("unless the court agrees");
  });

  it("flags a condition missing from a translation", () => {
    const result = run(
      "The tax applies if parliament approves.",
      "en",
      "این مالیات اعمال می\u200cشود.",
      "fa",
    );
    expect(categories(result)).toEqual(["condition"]);
  });

  it("does not flag the same condition written in Persian", () => {
    expect(
      run(
        "The tax applies if parliament approves.",
        "en",
        "اگر پارلمان تصویب کند، این مالیات اعمال می‌شود.",
        "fa",
      ),
    ).toEqual([]);
  });
});

describe("detectDifferences: certainty", () => {
  it("flags a dropped hedge", () => {
    const result = run("The drug may reduce deaths.", "en", "The drug reduces deaths.", "en");
    expect(categories(result)).toEqual(["certainty"]);
    expect(result[0]?.summary).toContain("a hedge");
  });

  it("flags a hedge that became a strong claim and says which way", () => {
    const result = run("The policy may help.", "en", "The policy will definitely help.", "en");
    expect(categories(result)).toEqual(["certainty"]);
    expect(result[0]?.summary).toContain("Version B sounds more certain.");
  });

  it("flags a dropped 'reportedly'", () => {
    const result = run("The factory reportedly closed.", "en", "The factory closed.", "en");
    expect(categories(result)).toEqual(["certainty"]);
  });
});

describe("detectDifferences: attribution", () => {
  it("flags a dropped attribution", () => {
    const result = run("The ministry said unemployment fell.", "en", "Unemployment fell.", "en");
    expect(categories(result)).toEqual(["attribution"]);
  });

  it("flags a different source", () => {
    const result = run("The ministry said prices rose.", "en", "The army said prices rose.", "en");
    expect(categories(result)).toEqual(["attribution"]);
  });

  it("flags a verb that distances the source from the claim", () => {
    const result = run(
      "The ministry said prices rose.",
      "en",
      "The ministry claimed prices rose.",
      "en",
    );
    expect(categories(result)).toEqual(["attribution"]);
    expect(result[0]?.summary).toContain("present the source differently");
  });

  it("does not flag an attribution that survives translation", () => {
    expect(
      run("The ministry said prices rose.", "en", "وزارت اعلام کرد که قیمت‌ها افزایش یافت.", "fa"),
    ).toEqual([]);
  });
});

describe("detectDifferences: wording only", () => {
  it("reports only wording when nothing else matches", () => {
    const result = run(
      "The council approved the budget after a long debate.",
      "en",
      "After a long debate, the council approved the budget.",
      "en",
    );
    expect(result.length).toBeGreaterThan(0);
    expect(new Set(categories(result))).toEqual(new Set(["stylistic"]));
  });

  it("does not repeat a flagged change as wording", () => {
    const result = run("The drug may reduce deaths.", "en", "The drug reduces deaths.", "en");
    expect(categories(result)).not.toContain("stylistic");
  });

  it("does not compare wording across languages", () => {
    expect(run("Prices rose.", "en", "قیمت‌ها بالا رفت.", "fa")).toEqual([]);
  });
});

describe("detectDifferences: combined changes", () => {
  it("reports each category separately and in reading order", () => {
    const result = run(
      "The ministry said in March 2021 that 40% of voters may back the plan if turnout is high.",
      "en",
      "The ministry said in April 2021 that 45% of voters back the plan.",
      "en",
    );
    expect(categories(result)).toEqual(["date", "number", "certainty", "condition"]);
  });
});

describe("detectDifferences: highlights", () => {
  it("returns spans that point at the original text, including Persian digits and joiners", () => {
    const textA = "نرخ بیکاری\u200c ۴۰ درصد بود.";
    const textB = "نرخ بیکاری\u200c ۵۰ درصد بود.";
    const result = run(textA, "fa", textB, "fa");

    expect(categories(result)).toEqual(["number"]);
    for (const difference of result) {
      if (difference.a) {
        expect(textA.slice(difference.a.span.start, difference.a.span.end)).toBe(
          difference.a.excerpt,
        );
      }
      if (difference.b) {
        expect(textB.slice(difference.b.span.start, difference.b.span.end)).toBe(
          difference.b.excerpt,
        );
      }
    }
    expect(result[0]?.a?.excerpt).toBe("۴۰ درصد");
  });

  it("gives every difference a highlight on at least one side", () => {
    const result = run(
      "The ministry said 40% may agree if asked.",
      "en",
      "Officials claimed 45% agree.",
      "en",
    );
    expect(result.length).toBeGreaterThan(0);
    for (const difference of result) {
      expect(difference.a !== null || difference.b !== null).toBe(true);
    }
  });
});

describe("detectDifferences: fingerprints", () => {
  it("makes repeated differences unique", () => {
    const result = run("12 cats and 12 dogs", "en", "13 cats and 13 dogs", "en");
    const fingerprints = result.map((difference) => difference.fingerprint);
    expect(result.length).toBeGreaterThan(1);
    expect(new Set(fingerprints).size).toBe(fingerprints.length);
  });

  it("is stable for the same input", () => {
    const first = run("Prices rose 4%.", "en", "Prices rose 5%.", "en");
    const second = run("Prices rose 4%.", "en", "Prices rose 5%.", "en");
    expect(first.map((difference) => difference.fingerprint)).toEqual(
      second.map((difference) => difference.fingerprint),
    );
  });
});

describe("detectDifferences: extension points", () => {
  it("runs a custom detector without any change to the engine", () => {
    const loud: Detector = {
      id: "loud",
      category: "stylistic",
      detect: (context) =>
        context.a.text.includes("!") !== context.b.text.includes("!")
          ? [
              {
                category: "stylistic",
                detectorId: "loud",
                fingerprint: "loud",
                summary: "Possible wording difference: an exclamation mark.",
                a: null,
                b: { span: { start: 0, end: 1 }, excerpt: context.b.text.slice(0, 1) },
              },
            ]
          : [],
    };

    const result = detectDifferences(
      { a: { text: "Hello", language: "en" }, b: { text: "Hello!", language: "en" } },
      [loud],
    );
    expect(result.map((difference) => difference.detectorId)).toEqual(["loud"]);
  });

  it("accepts language tags with a region", () => {
    expect(run("40% agreed", "en-GB", "40% agreed", "en-US")).toEqual([]);
  });

  it("refuses a language without rules", () => {
    expect(() => run("bonjour", "fr", "bonjour", "fr")).toThrow(UnsupportedLanguageError);
  });
});
