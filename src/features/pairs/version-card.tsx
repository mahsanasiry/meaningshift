import { getLanguageLabel, getTextDirection } from "@/lib/i18n/languages";
import { formatDate } from "@/lib/utils/format-date";
import type { ClaimVersion } from "./schemas";

type VersionCardProps = {
  heading: string;
  version: ClaimVersion;
};

export function VersionCard({ heading, version }: Readonly<VersionCardProps>) {
  return (
    <article className="flex flex-col gap-3 border border-border p-4">
      <h2 className="text-lg font-semibold">{heading}</h2>
      <p
        lang={version.language}
        dir={getTextDirection(version.language)}
        className="whitespace-pre-wrap text-lg leading-relaxed"
      >
        {version.body}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Language</dt>
        <dd>{getLanguageLabel(version.language)}</dd>
        <dt className="text-muted">Source</dt>
        <dd dir="auto">{version.sourceName}</dd>
        <dt className="text-muted">Published</dt>
        <dd>{formatDate(version.publishedOn)}</dd>
        <dt className="text-muted">Address</dt>
        <dd className="break-all" dir="ltr">
          <a
            href={version.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            {version.sourceUrl}
          </a>
        </dd>
      </dl>
    </article>
  );
}
