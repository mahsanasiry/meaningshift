"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { describeDatabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/client";
import { addReviewerSchema, type AddReviewerValues } from "@/lib/validation/workspace";

export function AddReviewerForm({ workspaceId }: Readonly<{ workspaceId: string }>) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addReviewerSchema),
    defaultValues: { email: "" },
  });

  const addReviewer = useMutation({
    mutationFn: async (values: AddReviewerValues) => {
      const { error } = await createClient().rpc("add_workspace_reviewer", {
        target_workspace: workspaceId,
        reviewer_email: values.email,
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      resetForm();
      router.refresh();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => addReviewer.mutate(values))}
      noValidate
      className="flex flex-col gap-4"
    >
      {addReviewer.isError ? (
        <Alert tone="error">{describeDatabaseError(addReviewer.error)}</Alert>
      ) : null}
      {addReviewer.isSuccess ? <Alert tone="success">Reviewer added.</Alert> : null}
      <TextField
        label="Reviewer email"
        type="email"
        autoComplete="off"
        dir="ltr"
        hint="The person needs an account already."
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" loading={addReviewer.isPending}>
        {addReviewer.isPending ? "Adding…" : "Add reviewer"}
      </Button>
    </form>
  );
}
