"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SpeakUpSymbol } from "@/components/Logo";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push(`/auth/verify?flow=reset&email=${encodeURIComponent(email || "scholar@example.com")}`);
    }, 600);
  };

  return (
    <div className="w-full max-w-[440px] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl shadow-sm p-8 sm:p-10 relative overflow-hidden transition-all">
      {/* Logo & Headings */}
      <div className="flex flex-col items-center text-center mb-8">
        <SpeakUpSymbol sizeClass="w-18 h-18 mb-4" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)] tracking-tight mb-2">
          Forgot Password
        </h1>
        <p className="font-serif text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
          Enter your email to receive your 6-digit verification code.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="reset-email">
            Enter your email
          </label>
          <input
            id="reset-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full border border-[var(--surface-border)] rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
          />
        </div>

        <div className="space-y-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all duration-300 font-display text-xs uppercase tracking-widest font-bold rounded-full shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                <span>Sending Code...</span>
              </>
            ) : (
              <>
                <span>Send Code</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>

          <Link
            href="/auth/login"
            className="block text-center py-2 font-display text-xs uppercase tracking-wider text-[var(--text-muted)] hover:text-[#d4af37] transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
