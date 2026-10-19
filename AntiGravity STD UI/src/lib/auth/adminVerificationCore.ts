import crypto from "crypto";

export const ADMIN_VERIFY_COOKIE_NAME = "speakup_admin_mfa_verified";
export const ADMIN_MFA_CHALLENGE_KEY = "admin_verification_challenges";
export const CODE_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes (180,000 ms)
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const MAX_VERIFY_ATTEMPTS = 5;

// 12-Hour Device Verification Trust Period (Inactivity-Based Sliding Policy)
export const ADMIN_TRUST_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours (43,200,000 ms)
export const ADMIN_COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours (43,200 seconds)
export const ADMIN_SLIDING_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes sliding window extension

/**
 * Derives the HMAC key strictly from server environment secrets.
 * Fails closed if neither ADMIN_VERIFICATION_SECRET nor SUPABASE_SERVICE_ROLE_KEY is set.
 */
export function getHmacSecret(): Buffer {
  const seed =
    process.env.ADMIN_VERIFICATION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!seed || typeof seed !== "string" || seed.trim().length < 16) {
    throw new Error(
      "CRITICAL SECURITY CONFIGURATION ERROR: ADMIN_VERIFICATION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be configured on the server with at least 16 characters of entropy."
    );
  }
  return crypto.createHash("sha256").update(seed.trim()).digest();
}

export function isHmacSecretConfigured(): boolean {
  try {
    getHmacSecret();
    return true;
  } catch {
    return false;
  }
}

/**
 * Mask an email for safe UI display (e.g., "m***@gmail.com").
 */
export function maskEmailAddress(email: string): string {
  if (!email || !email.includes("@")) return "authorized admin email";
  const [local, domain] = email.trim().toLowerCase().split("@");
  if (!domain) return "authorized admin email";
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
}

/**
 * Generates a signed, tamper-proof verification token tied to user ID, session timestamp,
 * and a 12-hour sliding inactivity window.
 */
export function generateAdminVerificationToken(
  userId: string,
  lastSignInAt?: string | null,
  issuedAtMs?: number
): string {
  const now = issuedAtMs || Date.now();
  const expiresAt = now + ADMIN_TRUST_DURATION_MS; // 12 hours from activity
  const sessionStamp = lastSignInAt || "session";
  const payload = `${userId}|${sessionStamp}|${now}|${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", getHmacSecret())
    .update(payload)
    .digest("hex");
  return `${payload}|${signature}`;
}

/**
 * Validates a signed verification token against the current authenticated user, session timestamp,
 * and 12-hour inactivity window.
 */
export function verifyAdminVerificationToken(
  token: string | undefined | null,
  userId: string,
  lastSignInAt?: string | null
): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split("|");
  if (parts.length !== 5) return false;

  const [tUserId, tSessionStamp, , tExpiresAtStr, signature] = parts;
  const expiresAt = Number(tExpiresAtStr);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return false; // Inactivity expired (> 12 hours)
  }

  if (tUserId !== userId) {
    return false; // User identity mismatch
  }

  const expectedSessionStamp = lastSignInAt || "session";
  if (tSessionStamp !== expectedSessionStamp) {
    return false; // Session invalidated or changed
  }

  try {
    const payload = parts.slice(0, 4).join("|");
    const expectedSig = crypto
      .createHmac("sha256", getHmacSecret())
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Evaluates whether an existing valid admin trust token should be refreshed
 * to extend its 12-hour sliding inactivity window based on current panel activity.
 */
export function shouldRefreshAdminTrustToken(
  token: string | undefined | null,
  userId: string,
  lastSignInAt?: string | null
): boolean {
  if (!verifyAdminVerificationToken(token, userId, lastSignInAt)) {
    return false;
  }
  const parts = token!.split("|");
  const issuedAt = Number(parts[2]);
  if (isNaN(issuedAt)) return false;
  // If more than 5 minutes have elapsed since last issuance, renew the 12-hour inactivity window
  return Date.now() - issuedAt >= ADMIN_SLIDING_REFRESH_INTERVAL_MS;
}

/**
 * Renews a valid admin verification token, extending its 12-hour inactivity trust window.
 */
export function renewAdminTrustToken(
  token: string | undefined | null,
  userId: string,
  lastSignInAt?: string | null
): string | null {
  if (!verifyAdminVerificationToken(token, userId, lastSignInAt)) {
    return null;
  }
  return generateAdminVerificationToken(userId, lastSignInAt);
}

/**
 * Generates a 6-digit cryptographic numeric OTP.
 */
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes a verification code with a cryptographic salt using SHA-256.
 */
export function hashVerificationCode(code: string, salt: string): string {
  return crypto
    .createHash("sha256")
    .update(`${code.trim()}:${salt}`)
    .digest("hex");
}

/**
 * Validates a submitted verification code against a stored hash using timing-safe comparison.
 */
export function verifyCodeHash(
  inputCode: string,
  salt: string,
  expectedHash: string
): boolean {
  if (!inputCode || !salt || !expectedHash) return false;
  const computed = hashVerificationCode(inputCode, salt);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Helper for proxy / middleware to verify admin cookie against current request.
 */
export function checkAdminMfaCookie(
  cookiesObj: { get: (name: string) => { value: string } | undefined },
  user: { id: string; last_sign_in_at?: string }
): boolean {
  if (!user || !user.id) return false;
  const cookie = cookiesObj.get(ADMIN_VERIFY_COOKIE_NAME)?.value;
  return verifyAdminVerificationToken(cookie, user.id, user.last_sign_in_at);
}

/**
 * Generates an HMAC-signed OAuth state parameter bound to the admin user ID and 15-minute expiry.
 */
export function generateOAuthState(userId: string): string {
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 minutes
  const payload = `oauth|${userId}|${now}|${expiresAt}`;
  const sig = crypto
    .createHmac("sha256", getHmacSecret())
    .update(payload)
    .digest("hex");
  return `${payload}|${sig}`;
}

/**
 * Validates an HMAC-signed OAuth state parameter against the expected admin user ID.
 */
export function verifyOAuthState(
  state: string | null | undefined,
  expectedUserId: string
): boolean {
  if (!state || typeof state !== "string") return false;
  const parts = state.split("|");
  if (parts.length !== 5) return false;

  const [prefix, userId, , expiresAtStr, signature] = parts;
  if (prefix !== "oauth" || userId !== expectedUserId) return false;

  const expiresAt = Number(expiresAtStr);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

  try {
    const payload = parts.slice(0, 4).join("|");
    const expectedSig = crypto
      .createHmac("sha256", getHmacSecret())
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    return false;
  }
}
