import Link from "next/link";

export default function LandingPage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16"
    >
      <h1 className="text-4xl font-semibold tracking-tight">MeaningShift</h1>
      <p className="text-lg text-muted">
        Compare two versions of a claim across languages or republications, and review where the
        meaning may have shifted.
      </p>
      <p className="border-s-4 border-accent bg-surface p-4">
        Flags are suggestions for a human reviewer. MeaningShift never decides whether a claim is
        true or false.
      </p>
      <nav aria-label="Get started" className="flex gap-3">
        <Link
          href="/login"
          className="bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Sign in
        </Link>
        <Link href="/signup" className="border border-border px-4 py-2 text-sm font-medium">
          Create an account
        </Link>
      </nav>
    </main>
  );
}
