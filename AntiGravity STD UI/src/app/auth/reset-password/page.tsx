"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SpeakUpSymbol } from "@/components/Logo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 1000);
    }, 600);
  };

  return (
    <div className="w-full max-w-[460px] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl shadow-sm p-8 sm:p-10 relative overflow-hidden transition-all">
      {/* Logo & Headings */}
      <div className="flex flex-col items-center text-center mb-8">
        <SpeakUpSymbol sizeClass="w-18 h-18 mb-4" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)] tracking-tight mb-2">
          Reset Password
        </h1>
        <p className="font-serif text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
          Enter your new password below to secure and regain access to your account.
        </p>
      </div>

      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Field 1: New Password */}
          <div>
            <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="new-pw">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-pw"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border border-[var(--surface-border)] rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
            {/* Policy note */}
            <div className="flex items-center gap-2 mt-2 text-xs font-serif text-[var(--text-muted)]">
              <span className="material-symbols-outlined text-[#d4af37] text-[16px]">info</span>
              <span>Must be at least 8 characters, including a number and symbol.</span>
            </div>
          </div>

          {/* Field 2: Confirm New Password */}
          <div>
            <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="confirm-pw">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirm-pw"
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border border-[var(--surface-border)] rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirm ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all duration-300 font-display text-xs uppercase tracking-widest font-bold rounded-full shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Update Password</span>
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
          <div className="w-16 h-16 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <h3 className="font-display text-xl font-bold text-[var(--text-main)]">
            Password Updated Successfully
          </h3>
          <p className="font-serif text-sm text-[var(--text-muted)]">
            Redirecting to login with your new credentials...
          </p>
        </div>
      )}
    </div>
  );
}
