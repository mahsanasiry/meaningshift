import { z } from "zod";

export const workspaceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter a name" })
    .max(120, { error: "Use 120 characters or fewer" }),
  description: z.string().trim().max(2000, { error: "Use 2000 characters or fewer" }),
});

export const addReviewerSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: "Enter a valid email address" })),
});

export const workspaceIdSchema = z.uuid();

export type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;
export type AddReviewerValues = z.infer<typeof addReviewerSchema>;
