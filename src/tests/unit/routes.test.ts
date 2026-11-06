import { describe, expect, it } from "vitest";
import { isAuthPage, isProtectedPath } from "@/lib/auth/routes";

describe("isProtectedPath", () => {
  it("protects the workspace area and its nested routes", () => {
    expect(isProtectedPath("/workspaces")).toBe(true);
    expect(isProtectedPath("/workspaces/abc/pairs")).toBe(true);
    expect(isProtectedPath("/study")).toBe(true);
    expect(isProtectedPath("/settings")).toBe(true);
  });

  it("leaves public pages open", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/signup")).toBe(false);
  });

  it("does not match paths that only share a prefix", () => {
    expect(isProtectedPath("/workspaces-archive")).toBe(false);
    expect(isProtectedPath("/studying")).toBe(false);
  });
});

describe("isAuthPage", () => {
  it("recognises the sign-in and sign-up pages", () => {
    expect(isAuthPage("/login")).toBe(true);
    expect(isAuthPage("/signup")).toBe(true);
  });

  it("ignores other pages", () => {
    expect(isAuthPage("/")).toBe(false);
    expect(isAuthPage("/workspaces")).toBe(false);
    expect(isAuthPage("/login-help")).toBe(false);
  });
});
