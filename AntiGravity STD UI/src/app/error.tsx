"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    console.error("Public Portal Boundary Caught Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col justify-center items-center p-6 selection:bg-[#d4af37]/20 font-serif">
      <div className="w-full max-w-lg bg-white dark:bg-[#16161c] border border-[var(--surface-border)] rounded-2xl p-8 sm:p-10 shadow-xl space-y-6 text-center">
        {/* Brand Symbol */}
        <div className="flex flex-col items-center gap-3">
          <Logo size="md" href="/" brandText="SpeakUp" />
          <div className="w-12 h-12 rounded-full bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">public</span>
          </div>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)]">
            Academic Portal Notice
          </h2>
          <p className="font-serif text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-md mx-auto">
            This page is momentarily unavailable. The student portal, administrative control panels, and authentication systems remain active.
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
            <span>Reload Page</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141416] text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-main)] shadow-2xs inline-flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>Homepage</span>
          </Link>

          <Link
            href="/auth/login"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#d4af37]/35 bg-[#d4af37]/10 text-xs font-display uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37] inline-flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            <span>Sign In to Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
