"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

interface LmsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LmsError({ error, reset }: LmsErrorProps) {
  useEffect(() => {
    console.error("Student LMS Boundary Caught Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col justify-center items-center p-6 selection:bg-[#d4af37]/20 font-serif">
      <div className="w-full max-w-lg bg-white dark:bg-[#151518] border border-[var(--surface-border)] rounded-2xl p-8 sm:p-10 shadow-xl space-y-6 text-center">
        {/* Brand Symbol & Icon */}
        <div className="flex flex-col items-center gap-3">
          <Logo size="md" href="/lms/dashboard" brandText="SpeakUp" />
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">school</span>
          </div>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)]">
            Student Portal Notice
          </h2>
          <p className="font-serif text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-md mx-auto">
            We encountered an unexpected issue while loading this section of your LMS workspace. Your account credentials and enrollment progress remain safe.
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
            <span>Try Again</span>
          </button>

          <Link
            href="/lms/dashboard"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141416] text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-main)] shadow-2xs inline-flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            <span>LMS Dashboard</span>
          </Link>

          <Link
            href="/auth/login?redirect=/lms/dashboard"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
          >
            Sign In Again
          </Link>
        </div>
      </div>
    </div>
  );
}
