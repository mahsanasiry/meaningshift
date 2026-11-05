const FALLBACK_MESSAGE = "Something went wrong. Try again in a moment.";
const NETWORK_MESSAGE = "Could not reach the server. Check your connection and try again.";

const MESSAGES_BY_CODE: Record<string, string> = {
  invalid_credentials: "The email or password is not correct.",
  email_not_confirmed: "Confirm your email address before signing in.",
  user_already_exists: "An account with this email already exists.",
  email_exists: "An account with this email already exists.",
  weak_password: "Choose a stronger password.",
  over_request_rate_limit: "Too many attempts. Wait a minute and try again.",
  over_email_send_rate_limit: "Too many emails were sent. Wait a while and try again.",
};

export function describeAuthError(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return FALLBACK_MESSAGE;
  }
  if ("name" in error && error.name === "AuthRetryableFetchError") {
    return NETWORK_MESSAGE;
  }
  if ("code" in error && typeof error.code === "string") {
    return MESSAGES_BY_CODE[error.code] ?? FALLBACK_MESSAGE;
  }
  return FALLBACK_MESSAGE;
}
