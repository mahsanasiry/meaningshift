import { describe, expect, it } from "vitest";
import { getLanguageRules } from "@/features/detection/languages";
import { extractNumbers, parseDigitNumber } from "@/features/detection/numbers";
import { normalizeForMatching } from "@/features/detection/text";

function numbersIn(
  text: string,
  language: string,
  excluded: Array<{ start: number; end: number }> = [],
) {
  return extractNumbers(normalizeForMatching(text), getLanguageRules(language), excluded);
}

function summary(text: string, language: string) {
  return numbersIn(text, language).map((mention) => mention.key);
}

describe("parseDigitNumber", () => {
  it("reads plain, decimal and grouped numbers", () => {
    expect(parseDigitNumber("1000")).toBe(1000);
    expect(parseDigitNumber("2.5")).toBe(2.5);
    expect(parseDigitNumber("1,000")).toBe(1000);
    expect(parseDigitNumber("1,234,567.89")).toBe(1234567.89);
  });

  it("reads a decimal comma", () => {
    expect(parseDigitNumber("3,5")).toBe(3.5);
  });

  it("skips shapes it cannot read with confidence", () => {
    expect(parseDigitNumber("1.234.567")).toBeNull();
    expect(parseDigitNumber("1,2,3")).toBeNull();
  });
});

describe("extractNumbers with digits", () => {
  it("finds numbers in different formats", () => {
    expect(summary("1,000 and 2.5 and 3,5 and 42", "en")).toEqual(["1000", "2.5", "3.5", "42"]);
  });

  it("reads percentages written with a sign or a word", () => {
    expect(summary("40% and 12 percent and 7 per cent", "en")).toEqual(["40%", "12%", "7%"]);
  });

  it("includes the percent sign or word in the span", () => {
    const [first] = numbersIn("about 40 percent of voters", "en");
    expect(first?.span).toEqual({ start: 6, end: 16 });
  });

  it("reads Persian digits and separators", () => {
    expect(summary("۴۰ درصد", "fa")).toEqual(["40%"]);
    expect(summary("۱٬۲۰۰ نفر و ۲٫۵ میلیون", "fa")).toEqual(["1200", "2500000"]);
  });

  it("multiplies a number that is followed by a scale word", () => {
    expect(summary("2.5 million people and 1.2 billion dollars", "en")).toEqual([
      "2500000",
      "1200000000",
    ]);
    expect(summary("۳ میلیون نفر", "fa")).toEqual(["3000000"]);
  });

  it("treats the same figure in either script as equal", () => {
    expect(summary("۱۲۳", "fa")).toEqual(summary("123", "en"));
  });

  it("ignores ordinals and numbers glued to letters", () => {
    expect(summary("the 40th day, COVID19, 3rd place", "en")).toEqual([]);
  });

  it("skips spans that belong to dates", () => {
    const text = "In 2021 about 300 people came";
    const excluded = [{ start: 3, end: 7 }];
    expect(numbersIn(text, "en", excluded).map((mention) => mention.key)).toEqual(["300"]);
  });
});

describe("extractNumbers with written numbers (English)", () => {
  it("reads simple and hyphenated numbers", () => {
    expect(summary("ten people and twenty-five dogs", "en")).toEqual(["10", "25"]);
  });

  it("reads hundreds, thousands and millions", () => {
    expect(summary("two hundred and fifty", "en")).toEqual(["250"]);
    expect(summary("three thousand five hundred", "en")).toEqual(["3500"]);
    expect(summary("one million two hundred thousand", "en")).toEqual(["1200000"]);
  });

  it("reads written percentages", () => {
    expect(summary("four percent", "en")).toEqual(["4%"]);
  });

  it("does not join unrelated number words", () => {
    expect(summary("five six", "en")).toEqual(["5", "6"]);
    expect(summary("five and six", "en")).toEqual(["5", "6"]);
  });

  it("ignores a lone one but keeps it before a percent word", () => {
    expect(summary("one of the ministers", "en")).toEqual([]);
    expect(summary("one percent", "en")).toEqual(["1%"]);
  });
});

describe("extractNumbers with written numbers (Persian)", () => {
  it("joins tens and ones with the conjunction", () => {
    expect(summary("بیست و پنج نفر", "fa")).toEqual(["25"]);
  });

  it("reads hundreds, thousands and millions", () => {
    expect(summary("صد و بیست", "fa")).toEqual(["120"]);
    expect(summary("دو هزار و پانصد", "fa")).toEqual(["2500"]);
    expect(summary("یک میلیون و دویست هزار", "fa")).toEqual(["1200000"]);
  });

  it("reads written percentages", () => {
    expect(summary("چهار درصد", "fa")).toEqual(["4%"]);
  });

  it("ignores a lone article-like one", () => {
    expect(summary("یک مرد آمد", "fa")).toEqual([]);
  });

  it("does not read weekday names as numbers", () => {
    expect(summary("سه\u200cشنبه و چهار شنبه", "fa")).toEqual([]);
  });
});
