import { z } from "zod";

export const workspaceRowSchema = z.object({
  id: z.uuid(),
  owner_id: z.uuid(),
  name: z.string(),
  description: z.string(),
  created_at: z.string(),
});

export const memberRowSchema = z.object({
  user_id: z.uuid(),
  role: z.enum(["owner", "reviewer"]),
  added_at: z.string(),
});

export const profileRowSchema = z.object({
  id: z.uuid(),
  display_name: z.string(),
});

export const createdWorkspaceSchema = z.object({ id: z.uuid() });

type WorkspaceRow = z.infer<typeof workspaceRowSchema>;
type MemberRow = z.infer<typeof memberRowSchema>;
type ProfileRow = z.infer<typeof profileRowSchema>;

export type WorkspaceRole = MemberRow["role"];

export type Workspace = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  createdAt: string;
};

export type Member = {
  userId: string;
  displayName: string;
  role: WorkspaceRole;
  addedAt: string;
};

export function toWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  };
}

export function toMembers(members: MemberRow[], profiles: ProfileRow[]): Member[] {
  const namesById = new Map(profiles.map((profile) => [profile.id, profile.display_name]));

  return members
    .map((member) => ({
      userId: member.user_id,
      displayName: namesById.get(member.user_id) ?? "Unknown reviewer",
      role: member.role,
      addedAt: member.added_at,
    }))
    .sort((a, b) => {
      if (a.role !== b.role) {
        return a.role === "owner" ? -1 : 1;
      }
      return a.addedAt.localeCompare(b.addedAt);
    });
}
