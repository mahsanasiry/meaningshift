import { z } from "zod";

const supabaseEnvSchema = z.object({
  url: z
    .string({ error: "NEXT_PUBLIC_SUPABASE_URL is not set" })
    .pipe(z.url({ error: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL" })),
  publishableKey: z
    .string({ error: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set" })
    .min(1, { error: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set" }),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

type RawSupabaseEnv = {
  url: string | undefined;
  publishableKey: string | undefined;
};

export function parseSupabaseEnv(raw: RawSupabaseEnv): SupabaseEnv {
  const result = supabaseEnvSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid Supabase configuration: ${details}. See .env.example.`);
  }
  return result.data;
}

// Next.js only inlines NEXT_PUBLIC_ variables that are read with a literal name.
export function getSupabaseEnv(): SupabaseEnv {
  return parseSupabaseEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
