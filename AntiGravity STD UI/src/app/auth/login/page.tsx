"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SpeakUpSymbol } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/lms/dashboard");
    }, 600);
  };

  return (
    <div className="w-full max-w-[480px] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl shadow-sm p-8 sm:p-10 relative overflow-hidden transition-all">
      {/* Top Logo & Headings */}
      <div className="flex flex-col items-center text-center mb-8">
        <SpeakUpSymbol sizeClass="w-18 h-18 mb-4" />
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

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="login-email">
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full border border-[var(--surface-border)] rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold" htmlFor="login-password">
              Password
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-[var(--surface-border)] rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all pr-12"
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
