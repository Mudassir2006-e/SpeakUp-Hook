"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

interface AdminRouteGuardProps {
  children: React.ReactNode;
  onAdminResolved?: (email: string | null) => void;
}

export default function AdminRouteGuard({
  children,
  onAdminResolved,
}: AdminRouteGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    // Safety watchdog: Force loading to complete after 6 seconds to prevent infinite hang
    const watchdogTimer = setTimeout(() => {
      if (isMounted && loading) {
        setAuthorized(false);
        setErrorMessage(
          "Administrative authorization check timed out. Please verify your connection or sign in again."
        );
        setLoading(false);
      }
    }, 6000);

    async function verifyAdmin() {
      try {
        const supabase = createClient();
        
        // Timeout individual auth check at 5 seconds
        const authPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error("Supabase auth request timed out.")), 5000)
        );

        const {
          data: { user },
          error: userError,
        } = await Promise.race([authPromise, timeoutPromise]);

        if (userError || !user) {
          if (isMounted) {
            clearTimeout(watchdogTimer);
            setAuthorized(false);
            setErrorMessage(
              "Administrative session required. Please sign in with an authorized administrator account."
            );
            setLoading(false);
            router.replace("/auth/login");
          }
          return;
        }

        // Check both database profile and server-side app_metadata.role
        const appMetaRole = (user.app_metadata?.role as string) || null;
        let dbRole: string | null = null;
        let profileEmail = user.email || null;

        try {
          const { data: profileRaw } = await supabase
            .from("profiles")
            .select("role, email, full_name")
            .eq("id", user.id)
            .maybeSingle();

          const profile = profileRaw as { role?: string; email?: string; full_name?: string } | null;
          if (profile?.role) {
            dbRole = profile.role;
          }
          if (profile?.email) {
            profileEmail = profile.email;
          }
        } catch {
          // Fallback gracefully to metadata if DB read fails
        }

        const effectiveRole = dbRole || appMetaRole || "student";

        if (effectiveRole === "admin") {
          if (isMounted) {
            clearTimeout(watchdogTimer);
            setAuthorized(true);
            if (onAdminResolved) {
              onAdminResolved(profileEmail);
            }
            setLoading(false);
          }
        } else {
          // Student attempting to access /admin -> redirect to student dashboard
          if (isMounted) {
            clearTimeout(watchdogTimer);
            setAuthorized(false);
            setErrorMessage(
              "Access Restricted. Your account is registered as a student. Administrative privileges are required to view this area."
            );
            setLoading(false);
            router.replace("/lms/dashboard");
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          clearTimeout(watchdogTimer);
          setAuthorized(false);
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Unable to verify administrative authorization."
          );
          setLoading(false);
        }
      }
    }

    verifyAdmin();

    return () => {
      isMounted = false;
      clearTimeout(watchdogTimer);
    };
  }, [onAdminResolved, router, retryKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-main)] p-4">
        <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-300">
          <Logo size="md" href="/admin/dashboard" brandText="SpeakUp" />
          <div className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-[#d4af37] font-bold">
            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            <span>Verifying Admin Authorization...</span>
          </div>
        </div>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] p-4">
        <div className="w-full max-w-md bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-8 shadow-xl text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto border border-rose-500/20">
            <span className="material-symbols-outlined text-[28px]">lock</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-[var(--text-main)] tracking-tight">
              Access Restricted
            </h2>
            <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
              {errorMessage || "You do not have permission to access the SpeakUp Admin Panel."}
            </p>
          </div>

          <div className="p-3 bg-[var(--surface-low)] rounded-xl border border-[var(--surface-border)] text-[11px] font-display text-[var(--text-muted)] leading-relaxed">
            Administrators must authenticate via the unified sign-in portal with assigned administrative credentials.
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setAuthorized(null);
                setErrorMessage(null);
                setRetryKey((k) => k + 1);
              }}
              className="flex-1 py-3 rounded-xl border border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10 font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Retry</span>
            </button>

            <Link
              href="/auth/login"
              className="flex-1 py-3 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Sign In</span>
            </Link>

            <Link
              href="/lms/dashboard"
              className="flex-1 py-3 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">school</span>
              <span>Student</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
