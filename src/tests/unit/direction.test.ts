import { describe, expect, it } from "vitest";
import { getDirection } from "@/lib/i18n/direction";

describe("getDirection", () => {
  it("returns ltr for English", () => {
    expect(getDirection("en")).toBe("ltr");
  });

  it("returns rtl for Persian", () => {
    expect(getDirection("fa")).toBe("rtl");
  });

  it("ignores region subtags and letter case", () => {
    expect(getDirection("fa-IR")).toBe("rtl");
    expect(getDirection("FA_ir")).toBe("rtl");
    expect(getDirection("en-GB")).toBe("ltr");
  });

  it("trims surrounding whitespace", () => {
    expect(getDirection("  ar ")).toBe("rtl");
  });

  it("returns rtl for other right-to-left scripts", () => {
    expect(getDirection("he")).toBe("rtl");
    expect(getDirection("ur")).toBe("rtl");
  });

  it("falls back to ltr for empty or unknown tags", () => {
    expect(getDirection("")).toBe("ltr");
    expect(getDirection("xx")).toBe("ltr");
  });
});
