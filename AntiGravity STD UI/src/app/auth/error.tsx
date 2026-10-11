"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

interface AuthErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthError({ error, reset }: AuthErrorProps) {
  useEffect(() => {
    console.error("Auth Boundary Caught Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col justify-center items-center p-6 selection:bg-[#d4af37]/20 font-serif">
      <div className="w-full max-w-md bg-white dark:bg-[#16161c] border border-[var(--surface-border)] rounded-2xl p-8 shadow-xl space-y-6 text-center">
        {/* Brand Symbol */}
        <div className="flex flex-col items-center gap-3">
          <Logo size="md" showText={false} href="/" />
          <div className="w-12 h-12 rounded-full bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">key</span>
          </div>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2">
          <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text-main)]">
            Sign-In Recovery Notice
          </h2>
          <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
            We encountered an unexpected issue while initializing this authentication screen. You can reload this view or return to the sign-in portal.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Reload View</span>
          </button>

          <Link
            href="/auth/login"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141416] text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-main)] shadow-2xs inline-flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            <span>Sign In</span>
          </Link>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] hover:text-[#d4af37]"
          >
            Return to Public Website
          </Link>
        </div>
      </div>
    </div>
  );
}
