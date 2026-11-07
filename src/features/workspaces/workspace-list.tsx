import Link from "next/link";
import { formatDate } from "@/lib/utils/format-date";
import type { Workspace } from "./schemas";

type WorkspaceListProps = {
  workspaces: Workspace[];
  currentUserId: string;
};

export function WorkspaceList({ workspaces, currentUserId }: Readonly<WorkspaceListProps>) {
  if (workspaces.length === 0) {
    return (
      <p className="border border-border bg-surface p-4 text-muted">
        You have no workspaces yet. Create your first one below.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {workspaces.map((workspace) => (
        <li key={workspace.id} className="border border-border p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link
              href={`/workspaces/${workspace.id}`}
              dir="auto"
              className="text-lg font-semibold text-accent underline"
            >
              {workspace.name}
            </Link>
            <span className="text-sm text-muted">
              {workspace.ownerId === currentUserId ? "Owner" : "Reviewer"} · Created{" "}
              {formatDate(workspace.createdAt)}
            </span>
          </div>
          {workspace.description ? (
            <p dir="auto" className="mt-2 text-muted">
              {workspace.description}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
