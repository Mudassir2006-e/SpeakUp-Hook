"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/validation";

function getSafeRedirect(target: string | null, allowedPrefix: "/admin" | "/lms"): string {
  const defaultTarget = allowedPrefix === "/admin" ? "/admin/dashboard" : "/lms/dashboard";
  if (!target) return defaultTarget;

  // Strict internal path validation:
  // Must start with allowedPrefix ('/admin' or '/lms')
  // Disallow '//', '\\', ':', '@' to prevent protocol-relative, scheme, or authority bypasses
  if (
    (target === allowedPrefix || target.startsWith(`${allowedPrefix}/`)) &&
    !target.startsWith("//") &&
    !target.includes("\\") &&
    !target.includes(":") &&
    !target.includes("@")
  ) {
    return target;
  }

  return defaultTarget;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const errorParam = searchParams.get("error");
  const messageParam = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (messageParam === "password_updated") {
      setSuccessMessage("Your password has been set successfully. Please sign in with your new credentials.");
    }
    if (errorParam === "account_suspended") {
      setErrorMessage("Your account is currently suspended. Access to learning resources has been restricted by administration.");
    } else if (errorParam === "account_pending") {
      setErrorMessage("Your account registration is currently pending review by SpeakUp administration. You will receive an email once approved.");
    } else if (errorParam === "account_rejected") {
      setErrorMessage("Your account registration request was not approved. Please contact administration for further details.");
    } else if (errorParam === "session_revoked") {
      setErrorMessage("Your session has ended because your password was changed. Please sign in with your new credentials.");
    } else if (errorParam === "session_expired") {
      setErrorMessage("Your session has expired. Please sign in again to continue.");
    }
  }, [errorParam, messageParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const errors: Record<string, string> = {};
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      errors.email = emailCheck.error!;
    }
    if (!password) {
      errors.password = "Password is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        setErrorMessage("Invalid email or password. Please verify your credentials.");
        setLoading(false);
        return;
      }

      // Check account suspension status immediately
      const isBanned = Boolean(
        data.user.banned_until && new Date(data.user.banned_until) > new Date()
      );
      const isSuspended = isBanned || data.user.app_metadata?.status === "suspended";

      if (isSuspended) {
        await supabase.auth.signOut();
        setErrorMessage("Your account is currently suspended. Please contact SpeakUp administration.");
        setLoading(false);
        return;
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
          .select("role, status, full_name")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile) {
          dbRole = (profile as any).role || null;
          dbStatus = (profile as any).status || null;
          studentName = (profile as any).full_name || null;
        }
      } catch {
        // Safe fallback
      }

      const finalRole = dbRole || appMetaRole || "student";
      const finalStatus = dbStatus || appMetaStatus || "pending";

      if (finalRole !== "admin") {
        if (finalStatus === "pending") {
          await supabase.auth.signOut();
          setErrorMessage("Your account registration is currently pending review by SpeakUp administration. You will receive an email once approved.");
          setLoading(false);
          return;
        }
        if (finalStatus === "rejected") {
          await supabase.auth.signOut();
          setErrorMessage("Your account registration request was not approved. Please contact administration for further details.");
          setLoading(false);
          return;
        }
      }

      if (finalRole === "admin") {
        router.push(getSafeRedirect(redirectParam, "/admin"));
      } else {
        // Non-authoritative fallback cache for LMS presentation
        if (studentName || data.user.user_metadata?.full_name) {
          localStorage.setItem(
            "speakup_student_name",
            studentName || data.user.user_metadata?.full_name
          );
        }
        if (data.user.email) {
          localStorage.setItem("speakup_student_email", data.user.email);
        }

        router.push(getSafeRedirect(redirectParam, "/lms"));
      }
    } catch {
      setErrorMessage("Authentication failed. Please check your network connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl shadow-sm p-8 sm:p-10 relative overflow-hidden transition-all">
      {/* Top Logo & Headings */}
      <div className="flex flex-col items-center text-center mb-8">
        <Logo size="lg" showText={false} href="/" className="mb-4" />
        <h1 className="font-display text-3xl font-bold text-[var(--text-main)] tracking-tight mb-2">
          Sign In
        </h1>
        <p className="font-serif text-base text-[var(--text-muted)]">
          Access your premium learning experience.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="relative flex mb-8 bg-[var(--surface-low)] rounded-xl p-1 border border-[var(--surface-border)]">
        <div className="w-1/2 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-center rounded-lg bg-[var(--surface-lowest)] text-[#d4af37] shadow-xs">
          Sign In
        </div>
        <Link
          href="/auth/register"
          className="w-1/2 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
        >
          Register
        </Link>
      </div>

      {/* Success Notice */}
      {successMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-serif text-xs leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">check_circle</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 font-serif text-xs leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold" htmlFor="login-email">
              Email Address *
            </label>
          </div>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
            }}
            placeholder="name@example.com"
            className={`w-full border rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none transition-all ${
              fieldErrors.email
                ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                : "border-[var(--surface-border)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
            }`}
          />
          {fieldErrors.email && (
            <p className="mt-1.5 text-xs text-rose-500 font-serif flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold" htmlFor="login-password">
              Password *
            </label>
            <Link
              href="/auth/forgot-password"
              className="font-display text-[11px] uppercase tracking-wider text-[#d4af37] hover:underline font-semibold"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
              }}
              placeholder="••••••••"
              className={`w-full border rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none transition-all pr-12 ${
                fieldErrors.password
                  ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  : "border-[var(--surface-border)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility" : "visibility_off"}
              </span>
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1.5 text-xs text-rose-500 font-serif flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">error</span>
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div className="pt-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all duration-300 font-display text-xs uppercase tracking-widest font-bold rounded-full shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-display text-xs uppercase tracking-wider text-[var(--text-muted)]">Loading Sign In...</div>}>
      <LoginForm />
    </Suspense>
  );
}
