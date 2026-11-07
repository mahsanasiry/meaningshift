const FALLBACK_MESSAGE = "Something went wrong. Try again in a moment.";

const MESSAGES_BY_CODE: Record<string, string> = {
  "42501": "You do not have permission to do that.",
  P0002: "No account exists for that email address. Ask the person to sign up first.",
  "23505": "That already exists.",
  "23514": "One of the values is not allowed. Check the form and try again.",
};

export function describeDatabaseError(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    if (typeof error.code === "string") {
      return MESSAGES_BY_CODE[error.code] ?? FALLBACK_MESSAGE;
    }
  }
  return FALLBACK_MESSAGE;
}
