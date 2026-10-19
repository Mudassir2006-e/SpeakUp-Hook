"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { sendBrandedEmail } from "@/lib/email";
import { getAdminMfaVerificationEmailHtml } from "@/lib/email/templates";
import {
  ADMIN_VERIFY_COOKIE_NAME,
  CODE_EXPIRY_MS,
  RESEND_COOLDOWN_MS,
  MAX_VERIFY_ATTEMPTS,
  ADMIN_COOKIE_MAX_AGE_SECONDS,
  maskEmailAddress,
  generateAdminVerificationToken,
  verifyAdminVerificationToken,
  shouldRefreshAdminTrustToken,
  generateVerificationCode,
  hashVerificationCode,
  verifyCodeHash,
} from "./adminVerificationCore";

export interface StoredChallenge {
  adminId: string;
  hashedCode: string;
  salt: string;
  expiresAt: number;
  attemptsLeft: number;
  resendAvailableAt: number;
  targetEmail: string;
}

/**
 * Resolves the explicitly configured admin Gmail / notification email address.
 * Never trusts client input.
 */
export async function resolveAdminVerificationEmail(adminUser?: {
  email?: string | null;
}): Promise<string | null> {
  // Strictly route verification to the authenticated admin account's login email
  if (adminUser?.email && adminUser.email.includes("@")) {
    return adminUser.email.trim().toLowerCase();
  }

  // Fallback to trusted server-side authoritative admin resolution
  try {
    const { resolveAuthoritativeAdminEmail } = await import("@/lib/email");
    const authoritativeEmail = await resolveAuthoritativeAdminEmail();
    if (authoritativeEmail) {
      return authoritativeEmail;
    }
  } catch {}

  // Fails closed if no verified admin email can be resolved
  return null;
}

/**
 * Retrieves an active verification challenge from dedicated private storage (admin_mfa_challenges).
 * Fails closed: returns null if the record does not exist or if database storage is unavailable.
 */
async function getStoredChallenge(adminId: string): Promise<StoredChallenge | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await (admin as any)
      .from("admin_mfa_challenges")
      .select("admin_id, hashed_code, salt, expires_at, attempts_left, resend_available_at, target_email")
      .eq("admin_id", adminId)
      .maybeSingle();

    if (error) {
      console.error("[MFA Storage] Error reading challenge from database:", error.message);
      return null;
    }

    if (data) {
      return {
        adminId: data.admin_id,
        hashedCode: data.hashed_code,
        salt: data.salt,
        expiresAt: new Date(data.expires_at).getTime(),
        attemptsLeft: Number(data.attempts_left ?? MAX_VERIFY_ATTEMPTS),
        resendAvailableAt: new Date(data.resend_available_at).getTime(),
        targetEmail: data.target_email,
      };
    }
  } catch (err) {
    console.error("[MFA Storage] Exception reading challenge from database:", err);
    return null;
  }

  return null;
}

/**
 * Durably saves an active verification challenge to dedicated private database storage.
 * Fails closed: returns false on any database error or exception.
 * Under no circumstances does this fall back to in-memory storage.
 */
async function saveStoredChallenge(challenge: StoredChallenge): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await (admin as any).from("admin_mfa_challenges").upsert(
      {
        admin_id: challenge.adminId,
        hashed_code: challenge.hashedCode,
        salt: challenge.salt,
        expires_at: new Date(challenge.expiresAt).toISOString(),
        attempts_left: challenge.attemptsLeft,
        resend_available_at: new Date(challenge.resendAvailableAt).toISOString(),
        target_email: challenge.targetEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "admin_id" }
    );

    if (error) {
      console.error("[MFA Storage] Failed to persist challenge to database:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[MFA Storage] Exception persisting challenge to database:", err);
    return false;
  }
}

/**
 * Single-use consumption: immediately deletes the challenge upon successful verification or expiry.
 */
async function deleteStoredChallenge(adminId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await (admin as any).from("admin_mfa_challenges").delete().eq("admin_id", adminId);
    if (error) {
      console.error("[MFA Storage] Failed to delete challenge from database:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[MFA Storage] Exception deleting challenge from database:", err);
    return false;
  }
}

/**
 * Server Action: Triggers and sends a one-time verification code to the authorized admin email.
 */
export async function sendAdminVerificationCodeAction(): Promise<{
  success: boolean;
  maskedEmail?: string;
  resendCooldown?: number;
  expiresInSeconds?: number;
  deliveryFailed?: boolean;
  error?: string;
  provider?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return { success: false, error: "Authentication required." };
    }

    const { role } = await getCurrentUserRole();
    if (role !== "admin") {
      return { success: false, error: "Administrative privileges required." };
    }

    const targetEmail = await resolveAdminVerificationEmail(user);
    if (!targetEmail) {
      return {
        success: false,
        error: "No verified email address is associated with this administrative account.",
      };
    }

    const now = Date.now();
    const existing = await getStoredChallenge(user.id);

    // Check resend cooldown
    if (existing && existing.resendAvailableAt > now) {
      const waitSeconds = Math.ceil((existing.resendAvailableAt - now) / 1000);
      return {
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting a new verification code.`,
        resendCooldown: waitSeconds,
        maskedEmail: maskEmailAddress(targetEmail),
      };
    }

    // Generate new secure code & salt
    const code = generateVerificationCode();
    const salt = crypto.randomBytes(16).toString("hex");
    const hashedCode = hashVerificationCode(code, salt);

    // Challenge is saved with strict 3-minute expiry (CODE_EXPIRY_MS = 180,000ms)
    // Any existing prior challenge for this admin is superseded and replaced
    const challenge: StoredChallenge = {
      adminId: user.id,
      hashedCode,
      salt,
      expiresAt: now + CODE_EXPIRY_MS,
      attemptsLeft: MAX_VERIFY_ATTEMPTS,
      resendAvailableAt: now + RESEND_COOLDOWN_MS,
      targetEmail,
    };

    const saved = await saveStoredChallenge(challenge);
    if (!saved) {
      return {
        success: false,
        error:
          "MFA challenge storage failure: persistent database storage is unavailable. Please ensure database migration 20261015_admin_mfa_challenges.sql is applied.",
      };
    }

    // Dispatch branded email via responsive, mobile-optimized template with 3-minute expiry
    const emailHtml = getAdminMfaVerificationEmailHtml({
      code,
      expiresMinutes: 3,
    });

    const emailSubject = `SpeakUp LMS — Admin Security Code: ${code}`;
    const emailText = `SpeakUp LMS Admin Security Code: ${code}. Valid for 3 minutes. If you did not request this, please change your password immediately.`;

    let sendRes = await sendBrandedEmail({
      to: targetEmail,
      fromName: "SpeakUp Team",
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    });

    // Check if initial dispatch failed due to Resend sandbox restrictions or unverified domain
    if (!sendRes.success) {
      const errLower = (sendRes.error || "").toLowerCase();
      const isSandboxRestriction =
        errLower.includes("own email address") ||
        errLower.includes("sandbox") ||
        errLower.includes("unverified") ||
        errLower.includes("resend.com/domains") ||
        errLower.includes("testing emails") ||
        errLower.includes("validation_error");

      if (isSandboxRestriction) {
        // Inspect whether Portal Email (Gmail) is configured, authorized and operational
        const { isGmailOperational } = await import("@/lib/email");
        const gmailStatus = await isGmailOperational();

        if (gmailStatus.operational) {
          // Route MFA dispatch through authorized Portal Email (Gmail).
          // Recipient remains strictly fixed to authoritative administrator login email (targetEmail).
          const gmailRes = await sendBrandedEmail({
            to: targetEmail,
            fromName: "SpeakUp Team",
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
            provider: "gmail",
          });

          if (gmailRes.success) {
            sendRes = gmailRes;
          } else {
            // Delete undelivered challenge so no phantom challenge remains active
            await deleteStoredChallenge(user.id);
            return {
              success: false,
              deliveryFailed: true,
              maskedEmail: maskEmailAddress(targetEmail),
              resendCooldown: 0,
              error: `Administrator verification email delivery failed: Resend sandbox rejected recipient (${maskEmailAddress(targetEmail)}), and Portal Email (Gmail) dispatch failed: ${gmailRes.error || "Gmail dispatch error"}. Please reconnect or reauthorize your Google account in Portal Email settings (/admin/portal-email).`,
            };
          }
        } else {
          // Gmail is not operational, authorized, or configured:
          // Show clear, actionable error with exact missing configuration.
          // Never redirect to Resend owner or bypass MFA.
          await deleteStoredChallenge(user.id);
          return {
            success: false,
            deliveryFailed: true,
            maskedEmail: maskEmailAddress(targetEmail),
            resendCooldown: 0,
            error: `Administrator verification email delivery failed: Resend is in unverified sandbox mode and only sends to its account owner. Portal Email (Gmail) fallback is unavailable: ${gmailStatus.reason || "Google OAuth is not configured"}. To deliver verification codes to your admin email (${maskEmailAddress(targetEmail)}), please configure Google OAuth in .env.local and connect your account at /admin/portal-email, or verify your custom sending domain in Resend.`,
          };
        }
      }
    }

    if (!sendRes.success) {
      // Delete undelivered challenge so no phantom challenge remains active
      await deleteStoredChallenge(user.id);
      return {
        success: false,
        deliveryFailed: true,
        maskedEmail: maskEmailAddress(targetEmail),
        resendCooldown: 0,
        error:
          sendRes.error ||
          "Failed to dispatch verification email. Please ensure your email delivery provider (Gmail or Resend) is configured.",
      };
    }

    return {
      success: true,
      maskedEmail: maskEmailAddress(targetEmail),
      resendCooldown: 60,
      expiresInSeconds: 180, // 3 minutes
      provider: sendRes.provider,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to initiate email verification.",
    };
  }
}

/**
 * Server Action: Validates the user-submitted code and issues a secure, session-bound verification cookie.
 */
export async function verifyAdminCodeAction(code: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const cleanCode = (code || "").trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return { success: false, error: "Please enter a valid 6-digit verification code." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return { success: false, error: "Authentication required." };
    }

    const { role } = await getCurrentUserRole();
    if (role !== "admin") {
      return { success: false, error: "Administrative privileges required." };
    }

    const now = Date.now();
    const challenge = await getStoredChallenge(user.id);

    if (!challenge) {
      return {
        success: false,
        error:
          "No active verification challenge found or persistent challenge storage is unavailable. Please request a new code.",
      };
    }

    if (now > challenge.expiresAt) {
      await deleteStoredChallenge(user.id);
      return {
        success: false,
        error: "Verification code has expired (3-minute lifetime). Please request a new code.",
      };
    }

    if (challenge.attemptsLeft <= 0) {
      await deleteStoredChallenge(user.id);
      return {
        success: false,
        error: "Maximum verification attempts exceeded. Please request a new code.",
      };
    }

    const isMatch = verifyCodeHash(cleanCode, challenge.salt, challenge.hashedCode);

    // Prefer atomic stored procedure consume_admin_mfa_attempt (FOR UPDATE) if available
    let atomicRpcHandled = false;
    try {
      const admin = createAdminClient();
      const { data: rpcData, error: rpcErr } = await (admin as any).rpc("consume_admin_mfa_attempt", {
        p_admin_id: user.id,
        p_success: isMatch,
      });

      if (!rpcErr && rpcData) {
        atomicRpcHandled = true;
        if (!isMatch) {
          if (rpcData.error) {
            return { success: false, error: rpcData.error };
          }
          const attemptsRemaining = rpcData.attempts_left ?? (challenge.attemptsLeft - 1);
          return {
            success: false,
            error: `Invalid code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
          };
        }
      }
    } catch {
      // RPC may not yet be defined if only table schema was migrated; fall through to table handling
    }

    if (!atomicRpcHandled) {
      if (!isMatch) {
        challenge.attemptsLeft -= 1;
        if (challenge.attemptsLeft <= 0) {
          await deleteStoredChallenge(user.id);
          return {
            success: false,
            error: "Maximum verification attempts exceeded. Please request a new code.",
          };
        } else {
          const updated = await saveStoredChallenge(challenge);
          if (!updated) {
            return {
              success: false,
              error:
                "Failed to record remaining verification attempts. Persistent challenge storage is unavailable.",
            };
          }
          return {
            success: false,
            error: `Invalid code. ${challenge.attemptsLeft} attempt${challenge.attemptsLeft === 1 ? "" : "s"} remaining.`,
          };
        }
      }

      // Success: single-use consumption (delete challenge immediately)
      await deleteStoredChallenge(user.id);
    }

    // Issue tamper-proof, session-bound cookie with 12-hour sliding inactivity trust
    const token = generateAdminVerificationToken(user.id, user.last_sign_in_at);
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_VERIFY_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS, // 12 hours
      path: "/",
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Verification failed.",
    };
  }
}

/**
 * Server Action: Explicitly clears and revokes the admin MFA verification cookie upon sign-out.
 */
export async function clearAdminMfaSessionAction(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_VERIFY_COOKIE_NAME);
    cookieStore.set(ADMIN_VERIFY_COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Checks whether the current server action caller has a verified administrative session.
 */
export async function isCurrentAdminSessionVerified(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const cookieStore = await cookies();
    const cookie = cookieStore.get(ADMIN_VERIFY_COOKIE_NAME)?.value;
    return verifyAdminVerificationToken(cookie, user.id, user.last_sign_in_at);
  } catch {
    return false;
  }
}

/**
 * Server Action: Queries whether the current authenticated admin user has an active, valid MFA session.
 * Used by /admin/verify to bypass redundant challenges and redirect seamlessly.
 */
export async function checkAdminSessionVerifiedAction(): Promise<{
  isVerified: boolean;
  isAdmin: boolean;
}> {
  try {
    const { role } = await getCurrentUserRole();
    if (role !== "admin") {
      return { isVerified: false, isAdmin: false };
    }
    const isVerified = await isCurrentAdminSessionVerified();
    return { isVerified, isAdmin: true };
  } catch {
    return { isVerified: false, isAdmin: false };
  }
}

/**
 * Centralized, authoritative administrator verification for all protected admin server actions.
 * Enforces:
 * 1. Valid authenticated user session.
 * 2. Verified 'admin' role in database profiles.
 * 3. Verified MFA session token bound to the current session.
 */
export async function verifyAdminCaller(): Promise<
  { adminId: string; adminEmail: string } | { error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return { error: "Forbidden: Administrative privileges required." };
    }

    const { role } = await getCurrentUserRole();
    if (role !== "admin") {
      return { error: "Forbidden: Administrative privileges required." };
    }

    const cookieStore = await cookies();
    const currentCookie = cookieStore.get(ADMIN_VERIFY_COOKIE_NAME)?.value;
    const isVerified = verifyAdminVerificationToken(currentCookie, user.id, user.last_sign_in_at);
    if (!isVerified) {
      return {
        error:
          "Forbidden: Two-factor email verification required. Please complete verification at /admin/verify.",
      };
    }

    // Server-side sliding renewal:
    // Only genuine, successfully authorized admin mutations renew the 12-hour trust period.
    // Read-only checks, unauthenticated callers, invalid tokens, and non-admin requests NEVER renew.
    if (
      currentCookie &&
      shouldRefreshAdminTrustToken(currentCookie, user.id, user.last_sign_in_at)
    ) {
      try {
        const renewedToken = generateAdminVerificationToken(user.id, user.last_sign_in_at);
        cookieStore.set(ADMIN_VERIFY_COOKIE_NAME, renewedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
          path: "/",
        });
      } catch {
        // Safe failover if cookieStore is read-only in specific execution contexts
      }
    }

    const { resolveAuthoritativeAdminEmail } = await import("@/lib/email");
    const authoritativeEmail = user.email?.trim().toLowerCase() || (await resolveAuthoritativeAdminEmail());
    if (!authoritativeEmail) {
      return { error: "Forbidden: Admin account has no verified email address." };
    }

    return {
      adminId: user.id,
      adminEmail: authoritativeEmail,
    };
  } catch {
    return { error: "Authentication verification failed." };
  }
}
