import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, UserRole } from "./types";

/**
 * Refreshes the Supabase authentication session and resolves the user's role.
 * Safe for Next.js Edge Middleware.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { supabaseResponse, user: null, role: null };
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Important: getUser() authenticates the token against Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: UserRole | null = null;
  let isSuspended = false;
  let isPendingApproval = false;
  let isRejected = false;
  let isSessionRevoked = false;

  if (user) {
    // 1. Check native Supabase ban
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      isSuspended = true;
    }

    const appMetaRole = (user.app_metadata?.role as UserRole) || null;
    const appMetaStatus = (user.app_metadata?.status as string) || null;
    if (appMetaStatus === "suspended") {
      isSuspended = true;
    } else if (appMetaStatus === "pending") {
      isPendingApproval = true;
    } else if (appMetaStatus === "rejected") {
      isRejected = true;
    }

    // 2. Session Invalidation Check: Has user's password been changed after this session was created?
    const metaPasswordChangedAt = (user.app_metadata?.password_changed_at as string) || null;
    if (metaPasswordChangedAt && user.last_sign_in_at) {
      const signInTime = new Date(user.last_sign_in_at).getTime();
      const changeTime = new Date(metaPasswordChangedAt).getTime();
      if (signInTime < changeTime - 2000) {
        isSessionRevoked = true;
      }
    }

    let dbRole: UserRole | null = null;
    let dbStatus: string | null = null;

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
      // Ignore database errors in middleware
    }

    if (dbStatus === "suspended") {
      isSuspended = true;
      isPendingApproval = false;
      isRejected = false;
    } else if (dbStatus === "pending") {
      isPendingApproval = true;
    } else if (dbStatus === "rejected") {
      isRejected = true;
    } else if (dbStatus === "active") {
      isPendingApproval = false;
      isRejected = false;
    }

    role = dbRole || appMetaRole || "student";
  }

  return { supabaseResponse, user, role, isSuspended, isSessionRevoked, isPendingApproval, isRejected };
}
