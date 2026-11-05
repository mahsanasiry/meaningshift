import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpForm } from "@/features/auth/sign-up-form";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signUp: mocks.signUp } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SignUpForm />
    </QueryClientProvider>,
  );
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), "مهسا");
  await user.type(screen.getByLabelText("Email"), "reviewer@example.org");
  await user.type(screen.getByLabelText("Password"), "long-enough-password");
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the display name as user metadata and continues when a session exists", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    renderForm();

    await fillAndSubmit();

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/workspaces"));
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "reviewer@example.org",
      password: "long-enough-password",
      options: { data: { display_name: "مهسا" } },
    });
  });

  it("asks the person to confirm their email when no session is returned", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    renderForm();

    await fillAndSubmit();

    expect(await screen.findByRole("status")).toHaveTextContent("Check your email");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("shows a readable message when the account already exists", async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: null },
      error: { code: "user_already_exists", message: "User already registered" },
    });
    renderForm();

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An account with this email already exists.",
    );
  });
});
