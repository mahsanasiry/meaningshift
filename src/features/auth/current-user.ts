import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", claims.sub)
    .maybeSingle();

  const email = "email" in claims && typeof claims.email === "string" ? claims.email : "";
  const displayName =
    profile && typeof profile.display_name === "string" ? profile.display_name : email;

  return { id: claims.sub, email, displayName };
}
