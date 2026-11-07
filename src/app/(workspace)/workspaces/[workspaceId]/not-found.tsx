import Link from "next/link";

export default function WorkspaceNotFound() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Workspace not found</h1>
      <p className="mt-2 text-muted">
        It may not exist, or you may not have access to it.{" "}
        <Link href="/workspaces" className="text-accent underline">
          Back to your workspaces
        </Link>
      </p>
    </main>
  );
}
