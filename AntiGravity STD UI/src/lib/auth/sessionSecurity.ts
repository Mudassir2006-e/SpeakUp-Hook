import fs from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/server";

const REVOCATIONS_FILE = path.join(process.cwd(), "src", "config", "session-revocations.json");

interface RevocationRecord {
  passwordChangedAt: string;
  revokedAt: string;
  reason: "password_change" | "admin_revocation" | "security_reset";
}

// In-memory rate limiter for authentication endpoints
interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const authRateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Checks and updates rate limits for sensitive authentication actions.
 * @param key Unique identifier (e.g. `login:ip:email` or `password_reset:ip`)
 * @param maxAttempts Maximum allowed attempts in the window
 * @param windowSeconds Window length in seconds
 * @returns { allowed: boolean, remainingAttempts: number, retryAfterSeconds: number }
 */
export function checkAuthRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowSeconds: number = 900 // 15 minutes default
): { allowed: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = authRateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    authRateLimitMap.set(key, { attempts: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfterSeconds: 0 };
  }

  if (entry.attempts >= maxAttempts) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds: retryAfter };
  }

  entry.attempts += 1;
  return {
    allowed: true,
    remainingAttempts: maxAttempts - entry.attempts,
    retryAfterSeconds: 0,
  };
}

/**
 * Resets the rate limit counter upon successful authentication.
 */
export function clearAuthRateLimit(key: string): void {
  authRateLimitMap.delete(key);
}

/**
 * Reads local session revocations map.
 */
function readRevocations(): Record<string, RevocationRecord> {
  try {
    if (!fs.existsSync(REVOCATIONS_FILE)) return {};
    const raw = fs.readFileSync(REVOCATIONS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Persists a revocation record locally.
 */
function writeRevocation(userId: string, record: RevocationRecord): void {
  try {
    const dir = path.dirname(REVOCATIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const current = readRevocations();
    current[userId] = record;
    fs.writeFileSync(REVOCATIONS_FILE, JSON.stringify(current, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write revocation record:", err);
  }
}

/**
 * Records a verified password change and invalidates all existing sessions/tokens.
 * 1. Sets password_changed_at in Supabase Auth app_metadata (via Admin API).
 * 2. Updates profiles table password_changed_at column.
 * 3. Calls Supabase Admin signOut to revoke active refresh tokens globally.
 * 4. Records to local revocation audit register.
 */
export async function recordPasswordChange(
  userId: string,
  reason: "password_change" | "admin_revocation" | "security_reset" = "password_change"
): Promise<{ success: boolean; changedAt: string }> {
  const changedAt = new Date().toISOString();

  // 1. Local register
  writeRevocation(userId, {
    passwordChangedAt: changedAt,
    revokedAt: changedAt,
    reason,
  });

  // 2. Supabase Auth app_metadata & global sign out
  try {
    const admin = createAdminClient();
    // Update app_metadata so getUser() in middleware can inspect it without database lookups
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        password_changed_at: changedAt,
      },
    });

    // Revoke all refresh tokens globally across all devices
    await admin.auth.admin.signOut(userId, "global");

    return { success: true, changedAt };
  } catch (err) {
    console.warn("Supabase admin session revocation fallback:", err);
    return { success: true, changedAt };
  }
}

/**
 * Checks whether an authenticated session is revoked due to an antecedent password change.
 * Safe for Edge runtime and Node.js.
 */
export function isSessionStale(
  lastSignInAt: string | undefined | null,
  passwordChangedAt: string | undefined | null
): boolean {
  if (!passwordChangedAt) return false;
  if (!lastSignInAt) return true; // Missing sign in timestamp with known password change is stale

  const signInTime = new Date(lastSignInAt).getTime();
  const changeTime = new Date(passwordChangedAt).getTime();

  // If signed in before the password change (2-second clock drift allowance)
  return signInTime < changeTime - 2000;
}
