"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeContext";
import {
  sendAdminVerificationCodeAction,
  verifyAdminCodeAction,
  clearAdminMfaSessionAction,
  checkAdminSessionVerifiedAction,
} from "@/lib/auth/adminVerification";

function getSafeAdminRedirect(target: string | null): string {
  const defaultTarget = "/admin";
  if (!target) return defaultTarget;

  // Strict internal path validation:
  // Must start with '/admin'
  // Disallow '//', '\\', ':', '@' to prevent protocol-relative, scheme, or authority bypasses
  if (
    (target === "/admin" || target.startsWith("/admin/")) &&
    !target.startsWith("//") &&
    !target.includes("\\") &&
    !target.includes(":") &&
    !target.includes("@")
  ) {
    return target;
  }

  return defaultTarget;
}

export default function AdminVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = getSafeAdminRedirect(searchParams.get("redirect"));

  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [cooldown, setCooldown] = useState<number>(0);
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [codeExpired, setCodeExpired] = useState<boolean>(false);
  const [deliveryStatus, setDeliveryStatus] = useState<"idle" | "delivered" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasRequestedRef = useRef(false);

  // Auto-send verification code on initial mount if not already sent or already verified
  useEffect(() => {
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    startTransition(async () => {
      // 1. Check if the current administrator already has an active, valid MFA session
      const status = await checkAdminSessionVerifiedAction();
      if (status.isVerified) {
        router.replace(redirectParam);
        return;
      }

      // 2. Check for OAuth callback error parameter
      const oauthErr = searchParams.get("oauth_error");
      if (oauthErr) {
        setDeliveryStatus("failed");
        setCodeExpired(false);
        setExpiresIn(0);
        setErrorMessage(`Google OAuth error: ${decodeURIComponent(oauthErr)}`);
        return;
      }

      // 3. Otherwise dispatch single-use code to authoritative login email
      const isJustConnected = searchParams.get("gmail_connected") === "true";
      const res = await sendAdminVerificationCodeAction();
      if (res.success) {
        setDeliveryStatus("delivered");
        setCodeExpired(false);
        if (res.maskedEmail) setMaskedEmail(res.maskedEmail);
        if (res.resendCooldown) setCooldown(res.resendCooldown);
        if (res.expiresInSeconds) setExpiresIn(res.expiresInSeconds);
        setSuccessMessage(
          isJustConnected
            ? "Portal Gmail account connected successfully! Security verification code dispatched to your administrator email (valid for 3 minutes)."
            : res.provider === "gmail"
            ? "Security verification code dispatched via Portal Email (Gmail) to authorized administrator email (valid for 3 minutes)."
            : "Security verification code sent to authorized administrator email (valid for 3 minutes)."
        );
      } else {
        setDeliveryStatus("failed");
        setCodeExpired(false);
        setExpiresIn(0);
        setErrorMessage(res.error || "Failed to dispatch verification code.");
        if (res.maskedEmail) setMaskedEmail(res.maskedEmail);
        if (res.resendCooldown) setCooldown(res.resendCooldown);
      }
    });
  }, [redirectParam, router, searchParams]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Countdown timer for 3-minute OTP expiration
  useEffect(() => {
    if (expiresIn <= 0) return;
    const interval = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          setCodeExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresIn]);

  const formatExpiryTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (codeExpired || expiresIn === 0) {
      setErrorMessage("This verification code has expired. Please request a new code.");
      return;
    }

    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      setErrorMessage("Please enter all 6 digits of your verification code.");
      return;
    }

    startTransition(async () => {
      const res = await verifyAdminCodeAction(cleanCode);
      if (res.success) {
        setSuccessMessage("Verification confirmed. Redirecting to dashboard...");
        setTimeout(() => {
          router.push(redirectParam);
          router.refresh();
        }, 600);
      } else {
        setErrorMessage(res.error || "Verification failed. Please check the code and try again.");
      }
    });
  };

  const handleResend = () => {
    if (cooldown > 0 || isPending) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setCode("");

    startTransition(async () => {
      const res = await sendAdminVerificationCodeAction();
      if (res.success) {
        setDeliveryStatus("delivered");
        setCodeExpired(false);
        if (res.maskedEmail) setMaskedEmail(res.maskedEmail);
        setCooldown(res.resendCooldown || 60);
        if (res.expiresInSeconds) setExpiresIn(res.expiresInSeconds);
        setSuccessMessage(
          res.provider === "gmail"
            ? "New verification code dispatched via Portal Email (Gmail) (valid for 3 minutes)."
            : "New verification code dispatched (valid for 3 minutes)."
        );
      } else {
        setDeliveryStatus("failed");
        setCodeExpired(false);
        setExpiresIn(0);
        setErrorMessage(res.error || "Failed to resend verification code.");
        if (res.resendCooldown) setCooldown(res.resendCooldown);
      }
    });
  };

  const handleSignOut = async () => {
    try {
      await clearAdminMfaSessionAction();
    } catch {}
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col justify-between font-serif selection:bg-[#d4af37]/20 selection:text-[#1a1a1a] relative transition-colors duration-200">
      {/* Top Floating Nav Anchor */}
      <header className="w-full px-6 py-5 flex items-center justify-between max-w-[1200px] mx-auto z-10">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[#d4af37] transition-colors font-display text-xs uppercase tracking-widest font-semibold py-1 px-3 rounded-full hover:bg-[var(--surface-low)]"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Sign In</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-[480px] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl shadow-sm p-6 sm:p-10 relative overflow-hidden transition-all">
          {/* Header Branding with Approved SpeakUp Logo */}
          <div className="flex flex-col items-center text-center mb-8">
            <Logo size="lg" showText={false} href="/" className="mb-4" />
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-low)] border border-[var(--surface-border)] text-[#997a15] dark:text-[#d4af37] flex items-center justify-center mb-3 shadow-xs">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text-main)] uppercase mb-2">
              Security Verification
            </h1>
            <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed max-w-[340px]">
              {deliveryStatus === "failed"
                ? "Verification code delivery could not be completed. Please review the configuration notice below."
                : "Administrative access requires two-factor email verification. A single-use code has been dispatched."}
            </p>
            {maskedEmail && (
              <div className="inline-block mt-3 px-3 py-1 bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-full text-[11px] font-mono text-[#997a15] dark:text-[#d4af37]">
                Destination: {maskedEmail}
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 font-serif text-xs leading-relaxed flex flex-col gap-2.5 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span>{errorMessage}</span>
              </div>
              {errorMessage.includes("Portal Email") && (
                <div className="pt-3 border-t border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)]">
                    OAuth Setup:
                  </span>
                  <a
                    href="/api/auth/google/connect"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-display text-xs font-bold rounded-lg transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                    <span>Connect Portal Gmail Account</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {successMessage && !codeExpired && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-serif text-xs leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">check_circle</span>
              <span>{successMessage}</span>
            </div>
          )}

          {codeExpired && (
            <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-400 font-serif text-xs leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">timer_off</span>
              <span>Verification code expired (3-minute lifetime). Please request a new code to continue.</span>
            </div>
          )}

          {/* Code Input Form */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="admin-otp-code" className="font-display text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                  Enter 6-Digit Access Code
                </label>
                {deliveryStatus === "delivered" && expiresIn > 0 && (
                  <span className="font-mono text-xs font-bold text-[#8a6d1b] dark:text-[#d4af37] bg-[var(--surface-low)] px-2.5 py-0.5 rounded-full border border-[var(--surface-border)]">
                    Expires: {formatExpiryTime(expiresIn)}
                  </span>
                )}
              </div>
              <input
                id="admin-otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedData = e.clipboardData.getData("text");
                  const digits = pastedData.replace(/\D/g, "").slice(0, 6);
                  if (digits) {
                    setCode(digits);
                  }
                }}
                placeholder={deliveryStatus === "failed" ? "Delivery Failed" : "••••••"}
                autoFocus={deliveryStatus !== "failed"}
                disabled={isPending || deliveryStatus === "failed" || codeExpired}
                className="w-full bg-[var(--surface-lowest)] border border-[var(--surface-border)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-3.5 text-center text-2xl sm:text-3xl font-mono tracking-[0.3em] sm:tracking-[0.5em] text-[var(--text-main)] focus:outline-none transition-all shadow-xs disabled:opacity-50"
              />
            </div>

            {deliveryStatus === "failed" ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isPending}
                className="w-full py-4 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#2a2a2a] dark:hover:bg-[#e0bc42] dark:hover:text-[#1a1a1a] transition-all duration-300 font-display text-xs uppercase tracking-widest font-bold rounded-full shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span>Retrying Dispatch...</span>
                  </>
                ) : (
                  <>
                    <span>Retry Code Dispatch</span>
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                  </>
                )}
              </button>
            ) : codeExpired ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isPending}
                className="w-full py-4 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#2a2a2a] dark:hover:bg-[#e0bc42] dark:hover:text-[#1a1a1a] transition-all duration-300 font-display text-xs uppercase tracking-widest font-bold rounded-full shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span>Requesting Code...</span>
                  </>
                ) : (
                  <>
                    <span>Code Expired — Request New Code</span>
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isPending || code.length !== 6}
                className="w-full py-4 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#2a2a2a] dark:hover:bg-[#e0bc42] dark:hover:text-[#1a1a1a] transition-all duration-300 font-display text-xs uppercase tracking-widest font-bold rounded-full shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Access Dashboard</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            )}
          </form>

          {/* Actions & Cooldown */}
          <div className="mt-6 pt-6 border-t border-[var(--surface-border)] flex items-center justify-between text-xs font-display uppercase tracking-wider">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isPending}
              className="text-[var(--text-muted)] hover:text-[#997a15] dark:hover:text-[#d4af37] font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Resend Code (${cooldown}s)` : "Resend Code"}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="text-rose-600 dark:text-rose-400 hover:underline font-bold transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
