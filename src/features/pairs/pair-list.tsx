import Link from "next/link";
import { getLanguageLabel, getTextDirection } from "@/lib/i18n/languages";
import { formatDate } from "@/lib/utils/format-date";
import { PAIR_STATUS_LABELS } from "./labels";
import type { PairSummary } from "./schemas";

export function PairList({ pairs }: Readonly<{ pairs: PairSummary[] }>) {
  if (pairs.length === 0) {
    return (
      <p className="border border-border bg-surface p-4 text-muted">
        This workspace has no claim pairs yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {pairs.map((pair) => (
        <li key={pair.id} className="border border-border p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link
              href={`/workspaces/${pair.workspaceId}/pairs/${pair.id}`}
              dir="auto"
              className="text-lg font-semibold text-accent underline"
            >
              {pair.title || "Untitled pair"}
            </Link>
            <span className="text-sm text-muted">
              {PAIR_STATUS_LABELS[pair.status]} · Added {formatDate(pair.createdAt)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {getLanguageLabel(pair.languageA)} and {getLanguageLabel(pair.languageB)}
          </p>
          <p
            lang={pair.languageA}
            dir={getTextDirection(pair.languageA)}
            className="mt-2 line-clamp-2"
          >
            {pair.excerptA}
          </p>
        </li>
      ))}
    </ul>
  );
}
