import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { AddReviewerForm } from "@/features/workspaces/add-reviewer-form";
import { getWorkspace, listMembers } from "@/features/workspaces/queries";
import { formatDate } from "@/lib/utils/format-date";
import { workspaceIdSchema } from "@/lib/validation/workspace";

type WorkspacePageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspacePage({ params }: Readonly<WorkspacePageProps>) {
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
  const members = await listMembers(workspaceId);
  const isOwner = workspace.ownerId === user.id;

  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-10">
      <p className="mb-4 text-sm">
        <Link href="/workspaces" className="text-accent underline">
          All workspaces
        </Link>
      </p>
      <h1 dir="auto" className="text-2xl font-semibold">
        {workspace.name}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {isOwner ? "You are the owner" : "You are a reviewer"} · Created{" "}
        {formatDate(workspace.createdAt)}
      </p>
      {workspace.description ? (
        <p dir="auto" className="mt-4 max-w-prose">
          {workspace.description}
        </p>
      ) : null}

      <section aria-labelledby="members" className="mt-10">
        <h2 id="members" className="mb-3 text-lg font-semibold">
          Members
        </h2>
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-baseline justify-between gap-2 border border-border p-3"
            >
              <span dir="auto">{member.displayName}</span>
              <span className="text-sm text-muted">
                {member.role === "owner" ? "Owner" : "Reviewer"} · Added{" "}
                {formatDate(member.addedAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="add-reviewer" className="mt-10 max-w-xl">
        <h2 id="add-reviewer" className="mb-3 text-lg font-semibold">
          Add a reviewer
        </h2>
        {isOwner ? (
          <AddReviewerForm workspaceId={workspace.id} />
        ) : (
          <p className="text-muted">Only the owner of a workspace can add reviewers.</p>
        )}
      </section>
    </main>
  );
}
