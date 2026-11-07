import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  memberRowSchema,
  profileRowSchema,
  toMembers,
  toWorkspace,
  workspaceRowSchema,
  type Member,
  type Workspace,
} from "./schemas";

const WORKSPACE_COLUMNS = "id, owner_id, name, description, created_at";

export async function listWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select(WORKSPACE_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load workspaces: ${error.message}`);
  }
  return z.array(workspaceRowSchema).parse(data).map(toWorkspace);
}

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select(WORKSPACE_COLUMNS)
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load the workspace: ${error.message}`);
  }
  return data ? toWorkspace(workspaceRowSchema.parse(data)) : null;
}

export async function listMembers(workspaceId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data: memberData, error: memberError } = await supabase
    .from("workspace_members")
    .select("user_id, role, added_at")
    .eq("workspace_id", workspaceId);

  if (memberError) {
    throw new Error(`Could not load the members: ${memberError.message}`);
  }
  const members = z.array(memberRowSchema).parse(memberData);
  if (members.length === 0) {
    return [];
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in(
      "id",
      members.map((member) => member.user_id),
    );

  if (profileError) {
    throw new Error(`Could not load the member names: ${profileError.message}`);
  }
  return toMembers(members, z.array(profileRowSchema).parse(profileData));
}
