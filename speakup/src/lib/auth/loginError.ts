/**
 * SpeakUp LMS — Shared Authentication Error & Rate-Limit Helper
 * Used by login client components, server actions, and automated security test suites.
 */

export interface LoginErrorLike {
  message?: string;
  status?: number;
}

/**
 * Maps Supabase GoTrue authentication errors into safe, user-friendly responses.
 * Detects HTTP 429 status and throttling errors to display cooldown guidance.
 * Note: Rate limiting at the network layer is enforced by Supabase GoTrue; this
 * helper provides the client-side presentation layer for those throttled responses.
 */
export function getLoginErrorMessage(error: LoginErrorLike | null | undefined): string {
  if (!error) return "Invalid email or password. Please verify your credentials.";

  const errMsg = (error.message || "").toLowerCase();
  const status = error.status;

  const isRateLimited =
    status === 429 ||
    errMsg.includes("rate limit") ||
    errMsg.includes("too many requests") ||
    errMsg.includes("security purposes") ||
    errMsg.includes("over_email_send_rate_limit");

  if (isRateLimited) {
    return "Too many sign-in attempts detected. For security protection, please wait 15 minutes before trying again.";
  }

  return "Invalid email or password. Please verify your credentials.";
}

/**
 * Maps Supabase Auth errors (including leaked/compromised password detections)
 * into informative, user-friendly responses without exposing internal stack traces.
 */
export function getAuthErrorMessage(error: LoginErrorLike | null | undefined): string {
  if (!error) return "An unexpected authentication error occurred. Please try again.";

  const msg = (error.message || "").toLowerCase();

  // Leaked/Compromised password check (HaveIBeenPwned / Supabase leaked password protection)
  if (
    msg.includes("leaked") ||
    msg.includes("compromised") ||
    msg.includes("pwned") ||
    msg.includes("data breach") ||
    msg.includes("breach")
  ) {
    return "This password has appeared in a known public data breach. For your security, please choose a different, unique password.";
  }

  // Password complexity / weak password
  if (msg.includes("weak_password") || msg.includes("should be at least") || msg.includes("password is too weak")) {
    return "Password does not meet institutional security requirements. It must contain at least 8 characters, with uppercase, lowercase, numbers, and special characters.";
  }

  // Rate limiting / Throttling
  if (
    error.status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("security purposes")
  ) {
    return "Too many requests. Please wait a few moments before trying again.";
  }

  return error.message || "An authentication error occurred. Please try again.";
}

