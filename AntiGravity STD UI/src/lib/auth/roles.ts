import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

/**
 * Retrieves the authenticated user and their verified role from the database.
 * Strictly server-side verification: ignores localStorage, client state, or query parameters.
 */
export async function getCurrentUserRole(): Promise<{
  userId: string | null;
  role: UserRole | null;
  email: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { userId: null, role: null, email: null };
    }

    // Check secure server-side app_metadata role
    const appMetaRole = (user.app_metadata?.role as UserRole) || null;

    // Check profiles table
    let dbRole: UserRole | null = null;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && (profile as { role?: UserRole }).role) {
        dbRole = (profile as { role: UserRole }).role;
      }
    } catch {
      // Database read fallback
    }

    // Role priority: database profile role -> server-side app_metadata role -> default student
    const finalRole: UserRole = dbRole || appMetaRole || "student";

    return {
      userId: user.id,
      role: finalRole,
      email: user.email ?? null,
    };
  } catch {
    return { userId: null, role: null, email: null };
  }
}

export type AccountStatus = "active" | "suspended" | "pending" | "rejected";

/**
 * Checks whether the current session belongs to a verified administrator.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { role } = await getCurrentUserRole();
  return role === "admin";
}

/**
 * Retrieves the authenticated user, their verified role, and their account status.
 * Strictly server-side verification: ignores client parameters, localStorage, or cookies.
 * Enforces native Supabase bans and application account suspensions.
 */
export async function getCurrentUserAccountStatus(): Promise<{
  userId: string | null;
  role: UserRole | null;
  email: string | null;
  status: AccountStatus;
  isSuspended: boolean;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { userId: null, role: null, email: null, status: "pending", isSuspended: false };
    }

    // 1. Supabase native ban check (banned_until timestamp in future)
    const isBanned = Boolean(user.banned_until && new Date(user.banned_until) > new Date());

    // 2. Server-side app_metadata check
    const appMetaRole = (user.app_metadata?.role as UserRole) || null;
    const appMetaStatus = (user.app_metadata?.status as AccountStatus) || null;

    // 3. Database profile check
    let dbRole: UserRole | null = null;
    let dbStatus: AccountStatus | null = null;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, account_status")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        if ((profile as any).role) dbRole = (profile as any).role;
        if ((profile as any).account_status) dbStatus = (profile as any).account_status;
      }
    } catch {
      // Database fallback
    }

    const finalRole: UserRole = dbRole || appMetaRole || "student";
    const defaultStatus: AccountStatus = finalRole === "admin" ? "active" : "pending";
    const finalStatus: AccountStatus = isBanned
      ? "suspended"
      : dbStatus || appMetaStatus || defaultStatus;
    const isSuspended = isBanned || finalStatus === "suspended";

    return {
      userId: user.id,
      role: finalRole,
      email: user.email ?? null,
      status: finalStatus,
      isSuspended,
    };
  } catch {
    return { userId: null, role: null, email: null, status: "pending", isSuspended: false };
  }
}

/**
 * Checks whether a specific student has approved access to a designated course.
 */
export async function hasCourseAccess(
  userId: string,
  courseId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: enrollment, error } = await supabase
      .from("course_enrollments")
      .select("status")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .eq("status", "approved")
      .maybeSingle();

    if (error || !enrollment) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether the current authenticated user has approved access to a designated course.
 * Extracts the user ID strictly from the verified server-side session.
 * Never accepts or trusts client-supplied user identifiers.
 * Enforces both active account status and approved course enrollment status.
 */
export async function hasCurrentStudentCourseAccess(
  courseId: string
): Promise<boolean> {
  const account = await getCurrentUserAccountStatus();
  if (!account.userId || account.isSuspended || (account.role !== "admin" && account.status !== "active")) {
    return false;
  }
  return hasCourseAccess(account.userId, courseId);
}
