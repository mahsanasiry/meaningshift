import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { CreatePairForm } from "@/features/pairs/create-pair-form";
import { getWorkspace } from "@/features/workspaces/queries";
import { workspaceIdSchema } from "@/lib/validation/workspace";

export const metadata: Metadata = { title: "New claim pair" };

type NewPairPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function NewPairPage({ params }: Readonly<NewPairPageProps>) {
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
  if (workspace.ownerId !== user.id) {
    redirect(`/workspaces/${workspace.id}/pairs`);
  }

  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-10">
      <p className="mb-4 text-sm">
        <Link href={`/workspaces/${workspace.id}/pairs`} className="text-accent underline">
          Claim pairs
        </Link>
      </p>
      <h1 className="text-2xl font-semibold">New claim pair</h1>
      <p className="mt-2 max-w-prose text-muted">
        Record the two versions of one claim. MeaningShift will later suggest where their meaning
        may differ; a person decides whether it really does.
      </p>
      <div className="mt-8">
        <CreatePairForm workspaceId={workspace.id} />
      </div>
    </main>
  );
}
