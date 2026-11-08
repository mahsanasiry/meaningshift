"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextAreaField } from "@/components/ui/textarea-field";
import { TextField } from "@/components/ui/text-field";
import { LANGUAGE_OPTIONS } from "@/lib/i18n/languages";
import { createClient } from "@/lib/supabase/client";
import { describeDatabaseError } from "@/lib/supabase/errors";
import {
  claimPairFormSchema,
  createdPairIdSchema,
  type ClaimPairFormValues,
} from "@/lib/validation/pair";

type Side = "a" | "b";

const EMPTY_VERSION = { body: "", sourceName: "", sourceUrl: "", publishedOn: "" };

export function CreatePairForm({ workspaceId }: Readonly<{ workspaceId: string }>) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(claimPairFormSchema),
    defaultValues: {
      title: "",
      a: { ...EMPTY_VERSION, language: "en" as const },
      b: { ...EMPTY_VERSION, language: "fa" as const },
    },
  });

  const createPair = useMutation({
    mutationFn: async (values: ClaimPairFormValues) => {
      const { data, error } = await createClient().rpc("create_claim_pair", {
        target_workspace: workspaceId,
        pair_title: values.title,
        a_body: values.a.body,
        a_language: values.a.language,
        a_source_name: values.a.sourceName,
        a_source_url: values.a.sourceUrl,
        a_published_on: values.a.publishedOn,
        b_body: values.b.body,
        b_language: values.b.language,
        b_source_name: values.b.sourceName,
        b_source_url: values.b.sourceUrl,
        b_published_on: values.b.publishedOn,
      });
      if (error) {
        throw error;
      }
      return createdPairIdSchema.parse(data);
    },
    onSuccess: (pairId) => {
      router.push(`/workspaces/${workspaceId}/pairs/${pairId}`);
      router.refresh();
    },
  });

  function renderVersion(side: Side, legend: string) {
    const fieldErrors = errors[side];
    return (
      <fieldset className="flex flex-col gap-4 border border-border p-4">
        <legend className="px-2 text-lg font-semibold">{legend}</legend>
        <TextAreaField
          label={`${legend} text`}
          dir="auto"
          error={fieldErrors?.body?.message}
          {...register(`${side}.body`)}
        />
        <SelectField
          label={`${legend} language`}
          options={LANGUAGE_OPTIONS}
          error={fieldErrors?.language?.message}
          {...register(`${side}.language`)}
        />
        <TextField
          label={`${legend} source name`}
          dir="auto"
          error={fieldErrors?.sourceName?.message}
          {...register(`${side}.sourceName`)}
        />
        <TextField
          label={`${legend} source address`}
          type="url"
          dir="ltr"
          hint="A full web address, for example https://example.org/article"
          error={fieldErrors?.sourceUrl?.message}
          {...register(`${side}.sourceUrl`)}
        />
        <TextField
          label={`${legend} date`}
          type="date"
          dir="ltr"
          hint="The day this version was published."
          error={fieldErrors?.publishedOn?.message}
          {...register(`${side}.publishedOn`)}
        />
      </fieldset>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => createPair.mutate(values))}
      noValidate
      className="flex flex-col gap-6"
    >
      {createPair.isError ? (
        <Alert tone="error">{describeDatabaseError(createPair.error)}</Alert>
      ) : null}
      <TextField
        label="Title"
        dir="auto"
        hint="Optional. A short label to find this pair later."
        error={errors.title?.message}
        {...register("title")}
      />
      <div className="grid gap-6 md:grid-cols-2">
        {renderVersion("a", "Version A")}
        {renderVersion("b", "Version B")}
      </div>
      <div>
        <Button type="submit" loading={createPair.isPending}>
          {createPair.isPending ? "Saving…" : "Save claim pair"}
        </Button>
      </div>
    </form>
  );
}
