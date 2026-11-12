import { describe, expect, it } from "vitest";
import { datesAreEquivalent, extractDates } from "@/features/detection/dates";
import { getLanguageRules } from "@/features/detection/languages";
import { normalizeForMatching } from "@/features/detection/text";

function datesIn(text: string, language: string) {
  return extractDates(text, normalizeForMatching(text), getLanguageRules(language));
}

function keys(text: string, language: string): string[] {
  return datesIn(text, language).map((mention) => mention.key);
}

describe("extractDates: full dates", () => {
  it("reads ISO dates", () => {
    expect(keys("on 2021-03-04", "en")).toEqual(["i:2021-03-04..2021-03-04"]);
  });

  it("reads the same day written in different English orders", () => {
    const expected = ["i:2021-03-04..2021-03-04"];
    expect(keys("March 4, 2021", "en")).toEqual(expected);
    expect(keys("4 March 2021", "en")).toEqual(expected);
    expect(keys("4th of March, 2021", "en")).toEqual(expected);
    expect(keys("2021/03/04", "en")).toEqual(expected);
  });

  it("reads day-first and month-first slash dates when one order is certain", () => {
    expect(keys("25/12/2021", "en")).toEqual(["i:2021-12-25..2021-12-25"]);
    expect(keys("12/25/2021", "en")).toEqual(["i:2021-12-25..2021-12-25"]);
  });

  it("keeps an ambiguous slash date as written", () => {
    const [mention] = datesIn("04/03/2021", "en");
    expect(mention?.group).toBe("ambiguous");
    expect(mention?.key).toBe("slash:4/3/2021");
  });

  it("rejects dates that do not exist", () => {
    expect(keys("2021-02-30", "en")).toEqual([]);
    expect(keys("31 مهر ۱۴۰۴", "fa")).toEqual([]);
  });

  it("reads Persian dates and converts them to the Gregorian calendar", () => {
    expect(keys("۱۰ مهر ۱۴۰۴", "fa")).toEqual(["i:2025-10-02..2025-10-02"]);
    expect(keys("۱۴۰۴/۰۷/۱۰", "fa")).toEqual(["i:2025-10-02..2025-10-02"]);
  });

  it("reads Gregorian dates written in Persian", () => {
    expect(keys("۴ مارس ۲۰۲۱", "fa")).toEqual(["i:2021-03-04..2021-03-04"]);
  });
});

describe("extractDates: partial dates", () => {
  it("reads a month and a year as a range", () => {
    expect(keys("March 2021", "en")).toEqual(["i:2021-03-01..2021-03-31"]);
    expect(keys("مهر ۱۴۰۴", "fa")).toEqual(["i:2025-09-23..2025-10-22"]);
  });

  it("reads a year only after a preposition", () => {
    const [mention] = datesIn("It happened in 2021.", "en");
    expect(mention?.key).toBe("i:2021-01-01..2021-12-31");
    expect(mention?.gregorianYear).toBe(2021);
    expect(datesIn("It got 2021 votes.", "en")).toHaveLength(0);
  });

  it("reads a Persian year", () => {
    const [mention] = datesIn("در سال ۱۴۰۴", "fa");
    expect(mention?.jalaliYear).toBe(1404);
    expect(mention?.key).toBe("i:2025-03-21..2026-03-20");
  });

  it("reads a month and day without a year", () => {
    expect(keys("on March 4", "en")).toEqual(["md:gregorian:3-4"]);
    expect(keys("on 4 March", "en")).toEqual(["md:gregorian:3-4"]);
  });

  it("reads a month on its own only after a context word", () => {
    expect(keys("in March the vote", "en")).toEqual(["m:gregorian:3"]);
    expect(keys("March madness", "en")).toEqual([]);
    expect(keys("It may rain", "en")).toEqual([]);
    expect(keys("in May", "en")).toEqual(["m:gregorian:5"]);
    expect(keys("در مهر", "fa")).toEqual(["m:jalali:7"]);
  });
});

describe("extractDates: relative references and times", () => {
  it("reads relative days and periods in both languages", () => {
    expect(keys("yesterday and last week", "en")).toEqual(["r:yesterday", "r:last-week"]);
    expect(keys("دیروز و هفته گذشته", "fa")).toEqual(["r:yesterday", "r:last-week"]);
  });

  it("reads counted spans of time", () => {
    expect(keys("3 days ago", "en")).toEqual(["r:ago:3:day"]);
    expect(keys("۳ روز پیش", "fa")).toEqual(["r:ago:3:day"]);
  });

  it("reads clock times", () => {
    expect(keys("at 10:30", "en")).toEqual(["t:10:30"]);
    expect(keys("at 3 pm", "en")).toEqual(["t:15:00"]);
    expect(keys("at 12 am", "en")).toEqual(["t:00:00"]);
    expect(keys("ساعت ۱۵:۳۰", "fa")).toEqual(["t:15:30"]);
    expect(keys("ساعت ۸ صبح", "fa")).toEqual(["t:08:00"]);
    expect(keys("25:99", "en")).toEqual([]);
  });

  it("does not report a date inside another date twice", () => {
    expect(datesIn("March 4, 2021", "en")).toHaveLength(1);
  });
});

describe("datesAreEquivalent: months in different calendars", () => {
  const monthOf = (text: string, language: string) => datesIn(text, language)[0];
  const persianMonth = monthOf("مهر ۱۴۰۴", "fa");

  it("accepts the Gregorian month that most of a Persian month falls in", () => {
    const october = monthOf("October 2025", "en");
    expect(persianMonth && october && datesAreEquivalent(persianMonth, october)).toBe(true);
  });

  it("does not accept neighbouring months", () => {
    const september = monthOf("September 2025", "en");
    const november = monthOf("November 2025", "en");
    expect(persianMonth && september && datesAreEquivalent(persianMonth, september)).toBe(false);
    expect(persianMonth && november && datesAreEquivalent(persianMonth, november)).toBe(false);
  });

  it("does not loosen the comparison inside one calendar", () => {
    const october = monthOf("October 2025", "en");
    const september = monthOf("September 2025", "en");
    expect(october && september && datesAreEquivalent(october, september)).toBe(false);
  });
});

describe("datesAreEquivalent", () => {
  const [persianYear] = datesIn("در سال ۱۴۰۴", "fa");
  const [year2025] = datesIn("in 2025", "en");
  const [year2026] = datesIn("in 2026", "en");
  const [year2024] = datesIn("in 2024", "en");

  it("treats equal keys as equivalent", () => {
    const [first] = datesIn("March 4, 2021", "en");
    const [second] = datesIn("4 March 2021", "en");
    expect(first && second && datesAreEquivalent(first, second)).toBe(true);
  });

  it("accepts either Gregorian year that a Persian year overlaps", () => {
    expect(persianYear && year2025 && datesAreEquivalent(persianYear, year2025)).toBe(true);
    expect(persianYear && year2026 && datesAreEquivalent(year2026, persianYear)).toBe(true);
    expect(persianYear && year2024 && datesAreEquivalent(persianYear, year2024)).toBe(false);
  });
});
