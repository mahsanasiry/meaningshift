"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { createClient } from "@/lib/supabase/client";
import { signUpSchema, type SignUpValues } from "@/lib/validation/auth";
import { describeAuthError } from "./auth-error";

export function SignUpForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  const signUp = useMutation({
    mutationFn: async (values: SignUpValues) => {
      const { data, error } = await createClient().auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { display_name: values.displayName } },
      });
      if (error) {
        throw error;
      }
      return { signedIn: data.session !== null };
    },
    onSuccess: ({ signedIn }) => {
      if (signedIn) {
        router.replace("/workspaces");
        router.refresh();
      }
    },
  });

  if (signUp.data && !signUp.data.signedIn) {
    return (
      <Alert tone="success">
        Account created. Check your email for a confirmation link, then sign in.
      </Alert>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => signUp.mutate(values))}
      noValidate
      className="flex flex-col gap-4"
    >
      {signUp.isError ? <Alert tone="error">{describeAuthError(signUp.error)}</Alert> : null}
      <TextField
        label="Name"
        autoComplete="name"
        dir="auto"
        hint="Shown to other reviewers in the review history."
        error={errors.displayName?.message}
        {...register("displayName")}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        dir="ltr"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        hint="At least 8 characters."
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" loading={signUp.isPending}>
        {signUp.isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
