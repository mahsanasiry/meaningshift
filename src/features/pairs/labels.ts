import type { PairStatus } from "./schemas";

export const PAIR_STATUS_LABELS: Record<PairStatus, string> = {
  unreviewed: "Not reviewed",
  in_review: "In review",
  meaning_changed: "Reviewer: meaning changed",
  meaning_unchanged: "Reviewer: meaning unchanged",
  uncertain: "Reviewer: uncertain",
};
