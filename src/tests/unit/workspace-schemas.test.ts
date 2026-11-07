import { describe, expect, it } from "vitest";
import { toMembers, toWorkspace } from "@/features/workspaces/schemas";

const OWNER_ID = "3f2b8d54-9c1e-4a67-8b0a-5d2e1f7c9a10";
const REVIEWER_ID = "7a1c2e90-4b3d-4f5a-9c8e-1d2b3c4d5e6f";
const OTHER_ID = "9d8c7b6a-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const WORKSPACE_ID = "c1b2a3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

describe("toWorkspace", () => {
  it("maps database columns to the domain shape", () => {
    expect(
      toWorkspace({
        id: WORKSPACE_ID,
        owner_id: OWNER_ID,
        name: "Election claims",
        description: "",
        created_at: "2026-11-05T10:00:00Z",
      }),
    ).toEqual({
      id: WORKSPACE_ID,
      ownerId: OWNER_ID,
      name: "Election claims",
      description: "",
      createdAt: "2026-11-05T10:00:00Z",
    });
  });
});

describe("toMembers", () => {
  const profiles = [
    { id: OWNER_ID, display_name: "Owner" },
    { id: REVIEWER_ID, display_name: "مهسا" },
  ];

  it("attaches display names and lists the owner first", () => {
    const members = toMembers(
      [
        { user_id: REVIEWER_ID, role: "reviewer", added_at: "2026-11-05T11:00:00Z" },
        { user_id: OWNER_ID, role: "owner", added_at: "2026-11-05T10:00:00Z" },
      ],
      profiles,
    );

    expect(members.map((member) => member.displayName)).toEqual(["Owner", "مهسا"]);
    expect(members.map((member) => member.role)).toEqual(["owner", "reviewer"]);
  });

  it("orders reviewers by when they were added", () => {
    const members = toMembers(
      [
        { user_id: OTHER_ID, role: "reviewer", added_at: "2026-11-06T09:00:00Z" },
        { user_id: REVIEWER_ID, role: "reviewer", added_at: "2026-11-05T11:00:00Z" },
      ],
      [...profiles, { id: OTHER_ID, display_name: "Later" }],
    );

    expect(members.map((member) => member.displayName)).toEqual(["مهسا", "Later"]);
  });

  it("uses a placeholder name when a profile is missing", () => {
    const members = toMembers(
      [{ user_id: OTHER_ID, role: "reviewer", added_at: "2026-11-05T11:00:00Z" }],
      profiles,
    );

    expect(members[0]?.displayName).toBe("Unknown reviewer");
  });
});
