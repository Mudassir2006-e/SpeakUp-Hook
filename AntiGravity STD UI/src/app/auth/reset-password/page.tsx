"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/validation";
import PasswordRequirementsList from "@/components/PasswordRequirementsList";
import { invalidateSessionOnResetAction } from "@/app/lms/actions";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isInvitation, setIsInvitation] = useState(false);
  const [isLinkInvalid, setIsLinkInvalid] = useState(false);

  useEffect(() => {
    // 1. Inspect URL hash and search params for errors or invitation flow
    const hashStr = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const hashParams = new URLSearchParams(hashStr);
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();

    const error = searchParams.get("error") || hashParams.get("error");
    const errorDescription = searchParams.get("error_description") || hashParams.get("error_description");
    const errorCode = searchParams.get("error_code") || hashParams.get("error_code");
    const flowType = searchParams.get("type") || hashParams.get("type");

    if (flowType === "invite") {
      setIsInvitation(true);
    }

    if (error || errorCode) {
      setIsLinkInvalid(true);
      if (errorCode === "otp_expired" || (errorDescription && errorDescription.toLowerCase().includes("expired"))) {
        setErrorMessage("This password setup or recovery link has expired. Please request a new link or contact SpeakUp administration.");
      } else {
        setErrorMessage(errorDescription || "This password setup link is invalid or has already been used.");
      }
      return;
    }

    // 2. Exchange code for session if PKCE code is present
    const code = searchParams.get("code");
    const supabase = createClient();
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeErr }) => {
        if (exchangeErr) {
          setIsLinkInvalid(true);
          setErrorMessage(exchangeErr.message || "Failed to establish secure authentication session.");
        }
      });
    }

    // 3. Listen to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setErrorMessage(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const errors: Record<string, string> = {};
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      errors.newPassword = pwCheck.error!;
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Confirm password is required.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMessage(error.message || "Failed to update password. Please request a new reset link.");
        setLoading(false);
        return;
      }

      // Revoke all existing sessions globally and register revocation timestamp
      try {
        await invalidateSessionOnResetAction();
      } catch {}
    } catch {
      setErrorMessage("An unexpected error occurred. Please verify your connection.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      router.push("/auth/login?message=password_updated");
    }, 1200);
  };

  return (
    <div className="w-full max-w-[460px] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl shadow-sm p-6 sm:p-10 relative overflow-hidden transition-all">
      {/* Logo & Headings */}
      <div className="flex flex-col items-center text-center mb-8">
        <Logo size="lg" showText={false} href="/" className="mb-4" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)] tracking-tight mb-2">
          {isInvitation ? "Welcome to SpeakUp LMS" : "Reset Password"}
        </h1>
        <p className="font-serif text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
          {isInvitation
            ? "Create a secure password below to activate your student account."
            : "Enter your new password below to secure and regain access to your account."}
        </p>
      </div>

      {isLinkInvalid ? (
        /* Expired or Invalid Link State */
        <div className="space-y-5 text-center py-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/30 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl">link_off</span>
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
              Link Expired or Invalid
            </h3>
            <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed max-w-sm mx-auto">
              {errorMessage || "This password setup or recovery link has expired or has already been used. Please request a new link or contact administration."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/auth/forgot-password"
              className="flex-1 py-3 px-4 rounded-xl bg-[#d4af37] text-black font-display text-xs uppercase tracking-wider font-bold hover:bg-[#c29d2b] transition-colors"
            >
              Request New Link
            </Link>
            <Link
              href="/auth/login"
              className="flex-1 py-3 px-4 rounded-xl border border-[var(--surface-border)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold hover:border-[#d4af37] transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      ) : !success ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs font-display font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Field 1: New Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold" htmlFor="new-pw">
                New Password *
              </label>
            </div>
            <div className="relative">
              <input
                id="new-pw"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: "" }));
                }}
                placeholder="••••••••••••"
                className={`w-full border rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none transition-all pr-12 ${
                  fieldErrors.newPassword
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
            {fieldErrors.newPassword && (
              <p className="mt-1.5 text-xs text-rose-500 font-serif flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {fieldErrors.newPassword}
              </p>
            )}
            {/* Real-time Password Requirements Checklist */}
            <PasswordRequirementsList password={newPassword} />
          </div>

          {/* Field 2: Confirm New Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold" htmlFor="confirm-pw">
                Confirm New Password *
              </label>
            </div>
            <div className="relative">
              <input
                id="confirm-pw"
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                placeholder="••••••••••••"
                className={`w-full border rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none transition-all pr-12 ${
                  fieldErrors.confirmPassword
                    ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : "border-[var(--surface-border)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirm ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="mt-1.5 text-xs text-rose-500 font-serif flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#2a2a2a] dark:hover:bg-[#e0bc42] dark:hover:text-[#1a1a1a] transition-all duration-300 font-display text-xs uppercase tracking-widest font-bold rounded-full shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>{isInvitation ? "Activating Account..." : "Updating Password..."}</span>
                </>
              ) : (
                <>
                  <span>{isInvitation ? "Set Password & Activate" : "Update Password"}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>

            <Link
              href="/auth/login"
              className="block text-center py-2 font-display text-xs uppercase tracking-wider text-[var(--text-muted)] hover:text-[#d4af37] transition-colors"
            >
              Back to login
            </Link>
          </div>
        </form>
      ) : (
        /* Success State */
        <div className="text-center py-6 space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <h3 className="font-display text-xl font-bold text-[var(--text-main)]">
            {isInvitation ? "Account Activated Successfully" : "Password Updated Successfully"}
          </h3>
          <p className="font-serif text-sm text-[var(--text-muted)]">
            Redirecting to sign in with your new credentials...
          </p>
        </div>
      )}
    </div>
  );
}
