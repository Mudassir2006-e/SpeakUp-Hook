"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "scholar@example.com";
  const flowParam = searchParams.get("flow"); // "reset" or "email_change" or null

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(59);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canResend = timer === 0;
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // 59-second resend countdown timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleOtpChange = (val: string, index: number) => {
    // Only accept numeric digit
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned && val !== "") return;

    const newOtp = [...otp];
    newOtp[index] = cleaned.slice(-1);
    setOtp(newOtp);

    // Auto-advance
    if (cleaned && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const nextIdx = Math.min(pasted.length, 5);
    inputsRef.current[nextIdx]?.focus();
  };

  const handleResend = async () => {
    if (!canResend) return;
    setErrorMessage(null);
    setTimer(59);
    setOtp(["", "", "", "", "", ""]);
    inputsRef.current[0]?.focus();

    try {
      const supabase = createClient();
      if (flowParam === "reset") {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        await supabase.auth.resetPasswordForEmail(emailParam, {
          redirectTo: `${origin}/auth/reset-password`,
        });
      } else if (flowParam === "email_change") {
        await supabase.auth.updateUser({ email: emailParam });
      } else {
        await supabase.auth.resend({
          type: "signup",
          email: emailParam,
        });
      }
    } catch {
      // Safe fallback
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const token = otp.join("");
    if (token.length < 6) {
      setErrorMessage("Please enter all 6 digits of the verification code.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      let type: "signup" | "recovery" | "email_change" = "signup";
      if (flowParam === "reset") {
        type = "recovery";
      } else if (flowParam === "email_change") {
        type = "email_change";
      }

      const { error } = await supabase.auth.verifyOtp({
        email: emailParam,
        token,
        type,
      });

      if (error) {
        setErrorMessage(error.message || "Invalid or expired verification code. Please request a new one.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccess(true);

      setTimeout(() => {
        if (flowParam === "reset") {
          router.push(`/auth/reset-password?email=${encodeURIComponent(emailParam)}`);
        } else if (flowParam === "email_change") {
          router.push("/lms/profile?verified=email_updated");
        } else {
          router.push("/auth/login?verified=true");
        }
      }, 900);
    } catch {
      setErrorMessage("Verification failed. Please check your network connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl shadow-sm p-8 sm:p-10 relative overflow-hidden transition-all">
      {/* Top Logo & Headings */}
      <div className="flex flex-col items-center text-center mb-8">
        <Logo size="lg" showText={false} href="/" className="mb-4" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)] tracking-tight mb-2">
          Verify Your Email
        </h1>
        <p className="font-serif text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
          We&apos;ve sent a 6-digit verification code to your email address. Enter the code below to continue.
        </p>
        <p className="font-display text-xs text-[#d4af37] font-semibold mt-2 px-3 py-1 bg-[var(--surface-low)] rounded-full border border-[var(--surface-border)]">
          {emailParam}
        </p>
      </div>

      {!success ? (
        <form onSubmit={handleVerify} className="space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs font-display font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* OTP 6-Digit Container */}
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputsRef.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                autoFocus={idx === 0}
                onChange={(e) => handleOtpChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className="w-11 h-13 sm:w-13 sm:h-14 text-center font-display text-xl sm:text-2xl font-bold rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] focus:outline-none focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/30 transition-all"
              />
            ))}
          </div>

          {/* Resend Timer */}
          <div className="text-center font-display text-xs">
            {!canResend ? (
              <p className="text-[var(--text-muted)]">
                Didn&apos;t receive the code? Resend code in{" "}
                <span className="font-bold text-[#d4af37] font-mono whitespace-nowrap">
                  00:{timer < 10 ? `0${timer}` : timer}
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-[#d4af37] hover:underline uppercase tracking-wider font-bold cursor-pointer"
              >
                Resend Verification Code
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={loading || otp.join("").length < 6}
              className="w-full py-4 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all duration-300 font-display text-xs uppercase tracking-widest font-bold rounded-full shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify &amp; Continue</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>

            <Link
              href={`/auth/change-email?current=${encodeURIComponent(emailParam)}${flowParam ? `&flow=${flowParam}` : ""}`}
              className="block text-center py-2 font-display text-xs uppercase tracking-wider text-[var(--text-muted)] hover:text-[#d4af37] transition-colors"
            >
              Change email address
            </Link>
          </div>
        </form>
      ) : (
        /* Success Confirmation Feedback */
        <div className="text-center py-6 space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <h3 className="font-display text-xl font-bold text-[var(--text-main)]">
            Email Verified Successfully
          </h3>
          <p className="font-serif text-sm text-[var(--text-muted)]">
            Redirecting you to the next step...
          </p>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-display uppercase tracking-wider">Loading verification...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
