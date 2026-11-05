import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

describe("signInSchema", () => {
  it("accepts a valid email and a password", () => {
    const result = signInSchema.safeParse({ email: "reviewer@example.org", password: "x" });
    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace from the email", () => {
    const result = signInSchema.parse({ email: "  reviewer@example.org ", password: "x" });
    expect(result.email).toBe("reviewer@example.org");
  });

  it("rejects an empty or malformed email", () => {
    expect(signInSchema.safeParse({ email: "", password: "x" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(signInSchema.safeParse({ email: "reviewer@example.org", password: "" }).success).toBe(
      false,
    );
  });
});

describe("signUpSchema", () => {
  const valid = { displayName: "Reviewer", email: "reviewer@example.org", password: "long-enough" };

  it("accepts valid input, including a Persian display name", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
    expect(signUpSchema.safeParse({ ...valid, displayName: "مهسا" }).success).toBe(true);
  });

  it("rejects a blank display name", () => {
    expect(signUpSchema.safeParse({ ...valid, displayName: "   " }).success).toBe(false);
  });

  it("rejects a display name longer than 80 characters", () => {
    expect(signUpSchema.safeParse({ ...valid, displayName: "a".repeat(81) }).success).toBe(false);
  });

  it("enforces password length limits", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: "a".repeat(73) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: "a".repeat(8) }).success).toBe(true);
  });
});
