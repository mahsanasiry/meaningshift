import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "@/features/auth/sign-in-form";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithPassword: mocks.signInWithPassword } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SignInForm />
    </QueryClientProvider>,
  );
}

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows validation messages and does not call Supabase for empty input", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in and moves to the workspaces page", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Email"), "reviewer@example.org");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/workspaces"));
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "reviewer@example.org",
      password: "correct-password",
    });
  });

  it("shows a readable message when the credentials are rejected", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { code: "invalid_credentials", message: "Invalid login credentials" },
    });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Email"), "reviewer@example.org");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The email or password is not correct.",
    );
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
