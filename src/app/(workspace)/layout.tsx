import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/features/auth/current-user";
import { SignOutButton } from "@/features/auth/sign-out-button";

export default async function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only bg-accent px-3 py-2 text-accent-foreground focus:not-sr-only focus:absolute focus:start-2 focus:top-2"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/workspaces" className="font-semibold">
            MeaningShift
          </Link>
          <div className="flex items-center gap-4">
            <span dir="auto" className="text-sm text-muted">
              {user.displayName}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
