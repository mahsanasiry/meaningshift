import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/features/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16"
    >
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <SignInForm />
      <p className="text-sm text-muted">
        New to MeaningShift?{" "}
        <Link href="/signup" className="text-accent underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
