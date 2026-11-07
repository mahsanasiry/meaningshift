import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/utils/format-date";

describe("formatDate", () => {
  it("formats an ISO timestamp as a UTC calendar date", () => {
    expect(formatDate("2026-11-05T23:30:00Z")).toBe("5 Nov 2026");
  });

  it("returns the input unchanged when it is not a date", () => {
    expect(formatDate("not a date")).toBe("not a date");
  });
});
