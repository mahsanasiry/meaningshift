import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { PAIR_STATUS_LABELS } from "@/features/pairs/labels";
import { getPair } from "@/features/pairs/queries";
import { VersionCard } from "@/features/pairs/version-card";
import { formatDate } from "@/lib/utils/format-date";
import { workspaceIdSchema } from "@/lib/validation/workspace";

type PairPageProps = {
  params: Promise<{ workspaceId: string; pairId: string }>;
};

export default async function PairPage({ params }: Readonly<PairPageProps>) {
  const { workspaceId, pairId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) {
    notFound();
  }
  if (!workspaceIdSchema.safeParse(pairId).success) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const pair = await getPair(pairId);
  if (!pair || pair.summary.workspaceId !== workspaceId) {
    notFound();
  }

  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-10">
      <p className="mb-4 text-sm">
        <Link href={`/workspaces/${workspaceId}/pairs`} className="text-accent underline">
          Claim pairs
        </Link>
      </p>
      <h1 dir="auto" className="text-2xl font-semibold">
        {pair.summary.title || "Untitled pair"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {PAIR_STATUS_LABELS[pair.summary.status]} · Added {formatDate(pair.summary.createdAt)}
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <VersionCard heading="Version A" version={pair.versionA} />
        <VersionCard heading="Version B" version={pair.versionB} />
      </div>
    </main>
  );
}
