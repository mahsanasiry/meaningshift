import { describe, expect, it } from "vitest";
import { parseSupabaseEnv } from "@/lib/supabase/env";

describe("parseSupabaseEnv", () => {
  it("returns the values when both are present and valid", () => {
    const env = parseSupabaseEnv({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example",
    });
    expect(env).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example",
    });
  });

  it("names the missing URL variable", () => {
    expect(() => parseSupabaseEnv({ url: undefined, publishableKey: "key" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL is not set/,
    );
  });

  it("rejects a URL that is not a URL", () => {
    expect(() => parseSupabaseEnv({ url: "not a url", publishableKey: "key" })).toThrow(
      /must be a valid URL/,
    );
  });

  it("names the missing key variable", () => {
    expect(() =>
      parseSupabaseEnv({ url: "https://example.supabase.co", publishableKey: undefined }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set/);
    expect(() =>
      parseSupabaseEnv({ url: "https://example.supabase.co", publishableKey: "" }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set/);
  });
});
