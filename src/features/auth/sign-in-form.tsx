"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { createClient } from "@/lib/supabase/client";
import { signInSchema, type SignInValues } from "@/lib/validation/auth";
import { describeAuthError } from "./auth-error";

export function SignInForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signIn = useMutation({
    mutationFn: async (values: SignInValues) => {
      const { error } = await createClient().auth.signInWithPassword(values);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      router.replace("/workspaces");
      router.refresh();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => signIn.mutate(values))}
      noValidate
      className="flex flex-col gap-4"
    >
      {signIn.isError ? <Alert tone="error">{describeAuthError(signIn.error)}</Alert> : null}
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
        autoComplete="current-password"
        dir="ltr"
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" loading={signIn.isPending}>
        {signIn.isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
