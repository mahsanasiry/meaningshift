"use client";

import { Button } from "@/components/ui/button";

export default function WorkspaceAreaError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted">This page could not be loaded. Try again in a moment.</p>
      {error.digest ? <p className="mt-2 text-sm text-muted">Reference: {error.digest}</p> : null}
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
