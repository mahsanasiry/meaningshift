import type { Metadata } from "next";

export const metadata: Metadata = { title: "Workspaces" };

export default function WorkspacesPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Workspaces</h1>
      <p className="mt-2 text-muted">You are signed in.</p>
    </main>
  );
}
