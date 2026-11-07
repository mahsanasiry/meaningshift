import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateWorkspaceForm } from "@/features/workspaces/create-workspace-form";

const WORKSPACE_ID = "3f2b8d54-9c1e-4a67-8b0a-5d2e1f7c9a10";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  single: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      insert: (row: unknown) => {
        mocks.insert(row);
        return { select: () => ({ single: mocks.single }) };
      },
    }),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CreateWorkspaceForm />
    </QueryClientProvider>,
  );
}

describe("CreateWorkspaceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for a name before saving", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(await screen.findByText("Enter a name")).toBeInTheDocument();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("saves trimmed values and opens the new workspace", async () => {
    mocks.single.mockResolvedValue({ data: { id: WORKSPACE_ID }, error: null });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Name"), "  Election claims  ");
    await user.click(screen.getByRole("button", { name: "Create workspace" }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}`));
    expect(mocks.insert).toHaveBeenCalledWith({ name: "Election claims", description: "" });
  });

  it("shows a readable message when the database refuses the insert", async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: "42501", message: "denied" } });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Election claims");
    await user.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to do that.",
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
