import { describe, expect, it } from "vitest";
import { describeAuthError } from "@/features/auth/auth-error";

describe("describeAuthError", () => {
  it("explains rejected credentials without revealing which part was wrong", () => {
    expect(describeAuthError({ code: "invalid_credentials" })).toBe(
      "The email or password is not correct.",
    );
  });

  it("treats both duplicate-account codes the same way", () => {
    const expected = "An account with this email already exists.";
    expect(describeAuthError({ code: "user_already_exists" })).toBe(expected);
    expect(describeAuthError({ code: "email_exists" })).toBe(expected);
  });

  it("reports network failures separately", () => {
    expect(describeAuthError({ name: "AuthRetryableFetchError", message: "fetch failed" })).toMatch(
      /Could not reach the server/,
    );
  });

  it("falls back to a generic message for unknown codes and non-objects", () => {
    const fallback = "Something went wrong. Try again in a moment.";
    expect(describeAuthError({ code: "something_new" })).toBe(fallback);
    expect(describeAuthError(null)).toBe(fallback);
    expect(describeAuthError("boom")).toBe(fallback);
  });
});
