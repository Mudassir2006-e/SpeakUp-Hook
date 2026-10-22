"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  checkLoginAllowed,
  recordFailedLoginAttempt,
  recordSuccessfulLogin,
  getAttemptStatus,
} from "@/lib/auth/loginProtection";
import { clearAdminMfaSessionAction } from "@/lib/auth/adminVerification";
import { getLoginErrorMessage } from "@/lib/auth/loginError";

async function getClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIp = headerList.get("x-real-ip");
    if (realIp) return realIp.trim();
  } catch {}
  return "unknown";
}

/**
 * Server Action: Validates whether a login attempt is allowed before evaluating credentials.
 * Protects against password brute-force and rapid spam from multiple tabs or sources.
 */
export async function preLoginCheckAction(email: string): Promise<{
  allowed: boolean;
  retryAfterSeconds: number;
  error?: string;
}> {
  if (!email || !email.includes("@")) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const ip = await getClientIp();
  const check = checkLoginAllowed(email, ip);

  if (!check.allowed) {
    return {
      allowed: false,
      retryAfterSeconds: check.retryAfterSeconds,
      error: `Too many failed login attempts. Please wait ${check.retryAfterSeconds} seconds before trying again.`,
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Server Action: Records the result of an authentication attempt.
 */
export async function reportLoginResultAction(params: {
  email: string;
  success: boolean;
}): Promise<{
  allowed: boolean;
  retryAfterSeconds: number;
  error?: string;
}> {
  const ip = await getClientIp();

  if (params.success) {
    recordSuccessfulLogin(params.email, ip);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const res = recordFailedLoginAttempt(params.email, ip);
  if (res.retryAfterSeconds > 0) {
    return {
      allowed: false,
      retryAfterSeconds: res.retryAfterSeconds,
      error: `Too many failed login attempts. Please wait ${res.retryAfterSeconds} seconds before trying again.`,
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Server Action: Authenticates user credentials with server-side protection.
 */
export async function authenticateWithProtectionAction(params: {
  email: string;
  password: string;
}): Promise<{
  success: boolean;
  role?: string;
  status?: string;
  studentName?: string | null;
  error?: string;
  retryAfterSeconds?: number;
}> {
  const email = params.email?.trim().toLowerCase();
  const password = params.password;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const ip = await getClientIp();

  // 1. Pre-authentication attempt limiter check
  const check = checkLoginAllowed(email, ip);
  if (!check.allowed) {
    return {
      success: false,
      retryAfterSeconds: check.retryAfterSeconds,
      error: `Too many failed login attempts. Please wait ${check.retryAfterSeconds} seconds before trying again.`,
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      const record = recordFailedLoginAttempt(email, ip);
      if (record.retryAfterSeconds > 0) {
        return {
          success: false,
          retryAfterSeconds: record.retryAfterSeconds,
          error: `Too many failed login attempts. Please wait ${record.retryAfterSeconds} seconds before trying again.`,
        };
      }
      return { success: false, error: getLoginErrorMessage(error) };
    }

    // Check account suspension status
    const isBanned = Boolean(
      data.user.banned_until && new Date(data.user.banned_until) > new Date()
    );
    const isSuspended = isBanned || data.user.app_metadata?.status === "suspended";

    if (isSuspended) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: "Your account is currently suspended. Please contact SpeakUp administration.",
      };
    }

    // Determine role & status from app_metadata and profiles
    const appMetaRole = (data.user.app_metadata?.role as string) || null;
    const appMetaStatus = (data.user.app_metadata?.status as string) || null;
    let dbRole: string | null = null;
    let dbStatus: string | null = null;
    let studentName: string | null = null;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, account_status, full_name")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile) {
        dbRole = (profile as any).role || null;
        dbStatus = (profile as any).account_status || null;
        studentName = (profile as any).full_name || null;
      }
    } catch {}

    const finalRole = dbRole || appMetaRole || "student";
    const finalStatus = dbStatus || appMetaStatus || "pending";

    if (finalRole !== "admin") {
      if (finalStatus === "pending") {
        await supabase.auth.signOut();
        return {
          success: false,
          error:
            "Your account registration is currently pending review by SpeakUp administration. You will receive an email once approved.",
        };
      }
      if (finalStatus === "rejected") {
        await supabase.auth.signOut();
        return {
          success: false,
          error:
            "Your account registration request was not approved. Please contact administration for further details.",
        };
      }
    }

    // Reset failure counter upon authenticated access
    recordSuccessfulLogin(email, ip);

    // If administrator, clear prior MFA session cookie
    if (finalRole === "admin") {
      try {
        await clearAdminMfaSessionAction();
      } catch (e) {
        console.error("[MFA] Error resetting prior admin MFA session:", e);
      }
    }

    return {
      success: true,
      role: finalRole,
      status: finalStatus,
      studentName: studentName || data.user.user_metadata?.full_name || null,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Authentication exception.",
    };
  }
}
