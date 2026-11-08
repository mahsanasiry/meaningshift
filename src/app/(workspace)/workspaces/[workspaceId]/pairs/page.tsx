import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { listPairs } from "@/features/pairs/queries";
import { PairList } from "@/features/pairs/pair-list";
import { getWorkspace } from "@/features/workspaces/queries";
import { workspaceIdSchema } from "@/lib/validation/workspace";

export const metadata: Metadata = { title: "Claim pairs" };

type PairsPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function PairsPage({ params }: Readonly<PairsPageProps>) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) {
    notFound();
  }
  const pairs = await listPairs(workspaceId);
  const isOwner = workspace.ownerId === user.id;

  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-10">
      <p className="mb-4 text-sm">
        <Link href={`/workspaces/${workspace.id}`} dir="auto" className="text-accent underline">
          {workspace.name}
        </Link>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Claim pairs</h1>
        {isOwner ? (
          <Link
            href={`/workspaces/${workspace.id}/pairs/new`}
            className="bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            New claim pair
          </Link>
        ) : null}
      </div>
      <div className="mt-6">
        <PairList pairs={pairs} />
      </div>
    </main>
  );
}
