import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreatePairForm } from "@/features/pairs/create-pair-form";

const WORKSPACE_ID = "3f2b8d54-9c1e-4a67-8b0a-5d2e1f7c9a10";
const PAIR_ID = "7a1c2e90-4b3d-4f5a-9c8e-1d2b3c4d5e6f";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ rpc: mocks.rpc }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CreatePairForm workspaceId={WORKSPACE_ID} />
    </QueryClientProvider>,
  );
}

async function fillVersion(user: ReturnType<typeof userEvent.setup>, legend: string, text: string) {
  await user.type(screen.getByLabelText(`${legend} text`), text);
  await user.type(screen.getByLabelText(`${legend} source name`), "Example Weekly");
  await user.type(screen.getByLabelText(`${legend} source address`), "https://example.org/a");
  fireEvent.change(screen.getByLabelText(`${legend} date`), { target: { value: "2026-10-01" } });
}

describe("CreatePairForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows what is missing and does not save an empty form", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Save claim pair" }));

    expect((await screen.findAllByText("Enter the claim text")).length).toBe(2);
    expect(screen.getAllByText("Enter a valid date").length).toBe(2);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("saves both versions in one call and opens the new pair", async () => {
    mocks.rpc.mockResolvedValue({ data: PAIR_ID, error: null });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Title"), "Drop in 2021");
    await fillVersion(user, "Version A", "A 40% drop in 2021");
    await fillVersion(user, "Version B", "کاهش ۴۰ درصدی در ۲۰۲۱");
    await user.click(screen.getByRole("button", { name: "Save claim pair" }));

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(`/workspaces/${WORKSPACE_ID}/pairs/${PAIR_ID}`),
    );
    expect(mocks.rpc).toHaveBeenCalledWith("create_claim_pair", {
      target_workspace: WORKSPACE_ID,
      pair_title: "Drop in 2021",
      a_body: "A 40% drop in 2021",
      a_language: "en",
      a_source_name: "Example Weekly",
      a_source_url: "https://example.org/a",
      a_published_on: "2026-10-01",
      b_body: "کاهش ۴۰ درصدی در ۲۰۲۱",
      b_language: "fa",
      b_source_name: "Example Weekly",
      b_source_url: "https://example.org/a",
      b_published_on: "2026-10-01",
    });
  });

  it("shows a readable message when the database refuses the pair", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "denied" } });
    const user = userEvent.setup();
    renderForm();

    await fillVersion(user, "Version A", "text a");
    await fillVersion(user, "Version B", "text b");
    await user.click(screen.getByRole("button", { name: "Save claim pair" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to do that.",
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
