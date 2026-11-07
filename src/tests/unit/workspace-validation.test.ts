import { describe, expect, it } from "vitest";
import {
  addReviewerSchema,
  workspaceFormSchema,
  workspaceIdSchema,
} from "@/lib/validation/workspace";

describe("workspaceFormSchema", () => {
  it("trims the name and the description", () => {
    const values = workspaceFormSchema.parse({
      name: "  Election claims ",
      description: " notes ",
    });
    expect(values).toEqual({ name: "Election claims", description: "notes" });
  });

  it("accepts a Persian name and an empty description", () => {
    expect(
      workspaceFormSchema.safeParse({ name: "ادعاهای انتخابات", description: "" }).success,
    ).toBe(true);
  });

  it("rejects a blank or overlong name", () => {
    expect(workspaceFormSchema.safeParse({ name: "   ", description: "" }).success).toBe(false);
    expect(workspaceFormSchema.safeParse({ name: "a".repeat(121), description: "" }).success).toBe(
      false,
    );
  });

  it("rejects an overlong description", () => {
    expect(
      workspaceFormSchema.safeParse({ name: "x", description: "a".repeat(2001) }).success,
    ).toBe(false);
  });
});

describe("addReviewerSchema", () => {
  it("trims and accepts a valid email", () => {
    expect(addReviewerSchema.parse({ email: " person@example.org " }).email).toBe(
      "person@example.org",
    );
  });

  it("rejects a malformed email", () => {
    expect(addReviewerSchema.safeParse({ email: "person" }).success).toBe(false);
  });
});

describe("workspaceIdSchema", () => {
  it("accepts a UUID and rejects anything else", () => {
    expect(workspaceIdSchema.safeParse("3f2b8d54-9c1e-4a67-8b0a-5d2e1f7c9a10").success).toBe(true);
    expect(workspaceIdSchema.safeParse("new").success).toBe(false);
  });
});
