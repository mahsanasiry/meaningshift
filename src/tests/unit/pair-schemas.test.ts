import { describe, expect, it } from "vitest";
import { PAIR_STATUS_LABELS } from "@/features/pairs/labels";
import {
  claimVersionRowSchema,
  pairStatusSchema,
  pickVersions,
  toPairSummary,
} from "@/features/pairs/schemas";

const ID = "3f2b8d54-9c1e-4a67-8b0a-5d2e1f7c9a10";
const OTHER_ID = "7a1c2e90-4b3d-4f5a-9c8e-1d2b3c4d5e6f";

const versionRow = {
  side: "a" as const,
  body: "text",
  language: "en",
  source_name: "Example Weekly",
  source_url: "https://example.org/article",
  published_on: "2026-10-01",
};

describe("toPairSummary", () => {
  it("maps database columns to the domain shape", () => {
    const summary = toPairSummary({
      id: ID,
      workspace_id: OTHER_ID,
      title: "Drop",
      created_by: OTHER_ID,
      created_at: "2026-11-05T10:00:00Z",
      status: "unreviewed",
      status_changed_at: null,
      language_a: "en",
      language_b: "fa",
      source_name_a: "A",
      source_name_b: "B",
      published_on_a: "2026-10-01",
      published_on_b: "2026-10-02",
      excerpt_a: "x",
      excerpt_b: "y",
      categories: ["number"],
      reviewer_ids: [],
    });

    expect(summary).toMatchObject({
      id: ID,
      workspaceId: OTHER_ID,
      languageA: "en",
      languageB: "fa",
      categories: ["number"],
    });
  });
});

describe("pickVersions", () => {
  it("returns both versions by side", () => {
    const picked = pickVersions([{ ...versionRow, side: "b", body: "second" }, versionRow]);
    expect(picked?.a.body).toBe("text");
    expect(picked?.b.body).toBe("second");
  });

  it("returns null when a side is missing", () => {
    expect(pickVersions([versionRow])).toBeNull();
  });
});

describe("claimVersionRowSchema", () => {
  it("refuses a source address that is not http or https", () => {
    const result = claimVersionRowSchema.safeParse({
      ...versionRow,
      source_url: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });
});

describe("PAIR_STATUS_LABELS", () => {
  it("has a label for every status", () => {
    for (const status of pairStatusSchema.options) {
      expect(PAIR_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});
