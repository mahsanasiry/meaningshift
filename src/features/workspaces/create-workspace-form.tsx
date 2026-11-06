"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/textarea-field";
import { TextField } from "@/components/ui/text-field";
import { describeDatabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/client";
import { workspaceFormSchema, type WorkspaceFormValues } from "@/lib/validation/workspace";
import { createdWorkspaceSchema } from "./schemas";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: { name: "", description: "" },
  });

  const createWorkspace = useMutation({
    mutationFn: async (values: WorkspaceFormValues) => {
      const { data, error } = await createClient()
        .from("workspaces")
        .insert({ name: values.name, description: values.description })
        .select("id")
        .single();
      if (error) {
        throw error;
      }
      return createdWorkspaceSchema.parse(data).id;
    },
    onSuccess: (workspaceId) => {
      router.push(`/workspaces/${workspaceId}`);
      router.refresh();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => createWorkspace.mutate(values))}
      noValidate
      className="flex flex-col gap-4"
    >
      {createWorkspace.isError ? (
        <Alert tone="error">{describeDatabaseError(createWorkspace.error)}</Alert>
      ) : null}
      <TextField label="Name" dir="auto" error={errors.name?.message} {...register("name")} />
      <TextAreaField
        label="Description"
        hint="Optional. What research question does this project address?"
        dir="auto"
        error={errors.description?.message}
        {...register("description")}
      />
      <Button type="submit" loading={createWorkspace.isPending}>
        {createWorkspace.isPending ? "Creating…" : "Create workspace"}
      </Button>
    </form>
  );
}
