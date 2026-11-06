import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddReviewerForm } from "@/features/workspaces/add-reviewer-form";

const WORKSPACE_ID = "3f2b8d54-9c1e-4a67-8b0a-5d2e1f7c9a10";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ rpc: mocks.rpc }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AddReviewerForm workspaceId={WORKSPACE_ID} />
    </QueryClientProvider>,
  );
}

describe("AddReviewerForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a malformed email without calling the database", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Reviewer email"), "person");
    await user.click(screen.getByRole("button", { name: "Add reviewer" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("adds the reviewer, confirms it and refreshes the page data", async () => {
    mocks.rpc.mockResolvedValue({ data: "id", error: null });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Reviewer email"), "person@example.org");
    await user.click(screen.getByRole("button", { name: "Add reviewer" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Reviewer added.");
    expect(mocks.rpc).toHaveBeenCalledWith("add_workspace_reviewer", {
      target_workspace: WORKSPACE_ID,
      reviewer_email: "person@example.org",
    });
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("explains when no account exists for the email", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "P0002", message: "No account exists for that email address" },
    });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Reviewer email"), "ghost@example.org");
    await user.click(screen.getByRole("button", { name: "Add reviewer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No account exists");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
