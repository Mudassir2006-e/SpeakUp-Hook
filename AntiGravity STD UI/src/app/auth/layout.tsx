"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/ThemeContext";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Focused authentication screens (Forgot Password, Verify / Send Code, Reset Password, Change Email)
  // must have NO public website header, NO navigation, and NO footer clutter.
  const isFocusedAuth =
    pathname?.startsWith("/auth/forgot-password") ||
    pathname?.startsWith("/auth/verify") ||
    pathname?.startsWith("/auth/reset-password") ||
    pathname?.startsWith("/auth/change-email");

  if (isFocusedAuth) {
    return (
      <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-[var(--bg-main)] text-[var(--text-main)] font-serif selection:bg-[#d4af37]/20 selection:text-[#1a1a1a] relative">
        <header className="w-full flex justify-end max-w-[1200px] mx-auto z-10 py-2">
          <ThemeToggle />
        </header>
        <main className="flex-1 flex items-center justify-center">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--bg-main)] text-[var(--text-main)] font-serif selection:bg-[#d4af37]/20 selection:text-[#1a1a1a] relative">
      {/* Top Floating Nav Anchor */}
      <header className="w-full px-6 py-5 flex items-center justify-between max-w-[1200px] mx-auto z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[#d4af37] transition-colors font-display text-xs uppercase tracking-widest font-semibold py-1 px-3 rounded-full hover:bg-[var(--surface-low)]"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Home</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Central Auth Container */}
      <main className="flex-1 flex items-start justify-center p-4 sm:p-6 pt-2 sm:pt-4 z-10">
        {children}
      </main>
    </div>
  );
}
