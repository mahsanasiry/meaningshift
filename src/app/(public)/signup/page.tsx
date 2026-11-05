import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/features/auth/sign-up-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16"
    >
      <h1 className="text-3xl font-semibold tracking-tight">Create an account</h1>
      <SignUpForm />
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
