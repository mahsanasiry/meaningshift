import { z } from "zod";
import { SUPPORTED_LANGUAGE_CODES } from "@/lib/i18n/languages";

const claimVersionSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: "Enter the claim text" })
    .max(5000, { error: "Use 5000 characters or fewer" }),
  language: z.enum(SUPPORTED_LANGUAGE_CODES, { error: "Choose a language" }),
  sourceName: z
    .string()
    .trim()
    .min(1, { error: "Enter the source name" })
    .max(200, { error: "Use 200 characters or fewer" }),
  sourceUrl: z
    .string()
    .trim()
    .pipe(
      z.url({
        protocol: /^https?$/,
        error: "Enter a full web address starting with http:// or https://",
      }),
    ),
  publishedOn: z.iso.date({ error: "Enter a valid date" }),
});

export const claimPairFormSchema = z.object({
  title: z.string().trim().max(200, { error: "Use 200 characters or fewer" }),
  a: claimVersionSchema,
  b: claimVersionSchema,
});

export const createdPairIdSchema = z.uuid();

export type ClaimPairFormValues = z.infer<typeof claimPairFormSchema>;
