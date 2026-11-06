import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { CreateWorkspaceForm } from "@/features/workspaces/create-workspace-form";
import { listWorkspaces } from "@/features/workspaces/queries";
import { WorkspaceList } from "@/features/workspaces/workspace-list";

export const metadata: Metadata = { title: "Workspaces" };

export default async function WorkspacesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const workspaces = await listWorkspaces();

  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Workspaces</h1>
      <p className="mt-2 text-muted">
        A workspace holds the claim pairs and reviews of one research project.
      </p>

      <section aria-labelledby="your-workspaces" className="mt-8">
        <h2 id="your-workspaces" className="mb-3 text-lg font-semibold">
          Your workspaces
        </h2>
        <WorkspaceList workspaces={workspaces} currentUserId={user.id} />
      </section>

      <section aria-labelledby="new-workspace" className="mt-10 max-w-xl">
        <h2 id="new-workspace" className="mb-3 text-lg font-semibold">
          New workspace
        </h2>
        <CreateWorkspaceForm />
      </section>
    </main>
  );
}
