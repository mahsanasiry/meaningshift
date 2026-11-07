import { describe, expect, it } from "vitest";
import { describeDatabaseError } from "@/lib/supabase/errors";

describe("describeDatabaseError", () => {
  it("explains a permission failure", () => {
    expect(describeDatabaseError({ code: "42501", message: "denied" })).toBe(
      "You do not have permission to do that.",
    );
  });

  it("explains an unknown reviewer email", () => {
    expect(describeDatabaseError({ code: "P0002" })).toMatch(/No account exists/);
  });

  it("falls back for unknown codes, missing codes and non-objects", () => {
    const fallback = "Something went wrong. Try again in a moment.";
    expect(describeDatabaseError({ code: "99999" })).toBe(fallback);
    expect(describeDatabaseError({ message: "boom" })).toBe(fallback);
    expect(describeDatabaseError(undefined)).toBe(fallback);
  });
});
