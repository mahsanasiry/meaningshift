import { z } from "zod";

export const pairStatusSchema = z.enum([
  "unreviewed",
  "in_review",
  "meaning_changed",
  "meaning_unchanged",
  "uncertain",
]);

export const differenceCategorySchema = z.enum([
  "number",
  "date",
  "condition",
  "certainty",
  "attribution",
  "stylistic",
]);

export const pairOverviewRowSchema = z.object({
  id: z.uuid(),
  workspace_id: z.uuid(),
  title: z.string(),
  created_by: z.uuid(),
  created_at: z.string(),
  status: pairStatusSchema,
  status_changed_at: z.string().nullable(),
  language_a: z.string(),
  language_b: z.string(),
  source_name_a: z.string(),
  source_name_b: z.string(),
  published_on_a: z.string(),
  published_on_b: z.string(),
  excerpt_a: z.string(),
  excerpt_b: z.string(),
  categories: z.array(differenceCategorySchema),
  reviewer_ids: z.array(z.uuid()),
});

export const claimVersionRowSchema = z.object({
  side: z.enum(["a", "b"]),
  body: z.string(),
  language: z.string(),
  source_name: z.string(),
  source_url: z.url({ protocol: /^https?$/ }),
  published_on: z.string(),
});

type PairOverviewRow = z.infer<typeof pairOverviewRowSchema>;
type ClaimVersionRow = z.infer<typeof claimVersionRowSchema>;

export type PairStatus = z.infer<typeof pairStatusSchema>;
export type DifferenceCategory = z.infer<typeof differenceCategorySchema>;

export type PairSummary = {
  id: string;
  workspaceId: string;
  title: string;
  createdBy: string;
  createdAt: string;
  status: PairStatus;
  languageA: string;
  languageB: string;
  sourceNameA: string;
  sourceNameB: string;
  excerptA: string;
  excerptB: string;
  categories: DifferenceCategory[];
  reviewerIds: string[];
};

export type ClaimVersion = {
  body: string;
  language: string;
  sourceName: string;
  sourceUrl: string;
  publishedOn: string;
};

export type PairDetail = {
  summary: PairSummary;
  versionA: ClaimVersion;
  versionB: ClaimVersion;
};

export function toPairSummary(row: PairOverviewRow): PairSummary {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    createdBy: row.created_by,
    createdAt: row.created_at,
    status: row.status,
    languageA: row.language_a,
    languageB: row.language_b,
    sourceNameA: row.source_name_a,
    sourceNameB: row.source_name_b,
    excerptA: row.excerpt_a,
    excerptB: row.excerpt_b,
    categories: row.categories,
    reviewerIds: row.reviewer_ids,
  };
}

export function toClaimVersion(row: ClaimVersionRow): ClaimVersion {
  return {
    body: row.body,
    language: row.language,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    publishedOn: row.published_on,
  };
}

export function pickVersions(rows: ClaimVersionRow[]): { a: ClaimVersion; b: ClaimVersion } | null {
  const a = rows.find((row) => row.side === "a");
  const b = rows.find((row) => row.side === "b");
  return a && b ? { a: toClaimVersion(a), b: toClaimVersion(b) } : null;
}
