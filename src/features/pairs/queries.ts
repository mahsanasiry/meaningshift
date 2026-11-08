import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  claimVersionRowSchema,
  pairOverviewRowSchema,
  pickVersions,
  toPairSummary,
  type PairDetail,
  type PairSummary,
} from "./schemas";

export async function listPairs(workspaceId: string): Promise<PairSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("claim_pair_overview")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load the claim pairs: ${error.message}`);
  }
  return z.array(pairOverviewRowSchema).parse(data).map(toPairSummary);
}

export async function getPair(pairId: string): Promise<PairDetail | null> {
  const supabase = await createClient();
  const [overview, versions] = await Promise.all([
    supabase.from("claim_pair_overview").select("*").eq("id", pairId).maybeSingle(),
    supabase
      .from("claim_versions")
      .select("side, body, language, source_name, source_url, published_on")
      .eq("pair_id", pairId),
  ]);

  if (overview.error) {
    throw new Error(`Could not load the claim pair: ${overview.error.message}`);
  }
  if (versions.error) {
    throw new Error(`Could not load the claim versions: ${versions.error.message}`);
  }
  if (!overview.data) {
    return null;
  }

  const picked = pickVersions(z.array(claimVersionRowSchema).parse(versions.data));
  if (!picked) {
    throw new Error("The claim pair is missing one of its two versions");
  }
  return {
    summary: toPairSummary(pairOverviewRowSchema.parse(overview.data)),
    versionA: picked.a,
    versionB: picked.b,
  };
}
