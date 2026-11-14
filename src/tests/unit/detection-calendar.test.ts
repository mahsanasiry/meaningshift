import { describe, expect, it } from "vitest";
import {
  addDays,
  gregorianMonthInterval,
  gregorianToIso,
  gregorianYearInterval,
  jalaliMonthInterval,
  jalaliToIso,
  jalaliYearInterval,
} from "@/features/detection/calendar";

describe("gregorianToIso", () => {
  it("formats valid dates", () => {
    expect(gregorianToIso(2021, 3, 4)).toBe("2021-03-04");
    expect(gregorianToIso(2024, 2, 29)).toBe("2024-02-29");
  });

  it("rejects dates that do not exist", () => {
    expect(gregorianToIso(2021, 2, 29)).toBeNull();
    expect(gregorianToIso(2021, 13, 1)).toBeNull();
    expect(gregorianToIso(2021, 4, 31)).toBeNull();
    expect(gregorianToIso(99, 1, 1)).toBeNull();
  });
});

describe("jalaliToIso", () => {
  it("converts the first day of the year", () => {
    expect(jalaliToIso(1400, 1, 1)).toBe("2021-03-21");
    expect(jalaliToIso(1404, 1, 1)).toBe("2025-03-21");
  });

  it("converts dates in the second half of the year", () => {
    expect(jalaliToIso(1404, 7, 10)).toBe("2025-10-02");
    expect(jalaliToIso(1404, 10, 11)).toBe("2026-01-01");
  });

  it("knows which Esfand has a thirtieth day", () => {
    expect(jalaliToIso(1403, 12, 30)).toBe("2025-03-20");
    expect(jalaliToIso(1404, 12, 30)).toBeNull();
  });

  it("rejects impossible days", () => {
    expect(jalaliToIso(1404, 7, 31)).toBeNull();
    expect(jalaliToIso(1404, 13, 1)).toBeNull();
  });
});

describe("intervals", () => {
  it("builds Gregorian year and month ranges", () => {
    expect(gregorianYearInterval(2021)).toEqual({ start: "2021-01-01", end: "2021-12-31" });
    expect(gregorianMonthInterval(2024, 2)).toEqual({ start: "2024-02-01", end: "2024-02-29" });
  });

  it("builds Persian year and month ranges", () => {
    expect(jalaliYearInterval(1404)).toEqual({ start: "2025-03-21", end: "2026-03-20" });
    expect(jalaliMonthInterval(1404, 7)).toEqual({ start: "2025-09-23", end: "2025-10-22" });
    expect(jalaliMonthInterval(1403, 12)).toEqual({ start: "2025-02-19", end: "2025-03-20" });
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2021-01-31", 1)).toBe("2021-02-01");
    expect(addDays("2021-03-01", -1)).toBe("2021-02-28");
  });
});
