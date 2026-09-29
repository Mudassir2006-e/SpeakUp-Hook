"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SpeakUpSymbol } from "@/components/Logo";

function ChangeEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentEmail = searchParams.get("current") || "";
  const flowParam = searchParams.get("flow") || "";

  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const targetEmail = newEmail || currentEmail || "scholar@example.com";
      router.push(`/auth/verify?email=${encodeURIComponent(targetEmail)}${flowParam ? `&flow=${flowParam}` : ""}`);
    }, 600);
  };

  return (
    <div className="w-full max-w-[440px] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl shadow-sm p-8 sm:p-10 relative overflow-hidden transition-all">
      {/* Logo & Headings */}
      <div className="flex flex-col items-center text-center mb-8">
        <SpeakUpSymbol sizeClass="w-18 h-18 mb-4" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)] tracking-tight mb-2">
          Change Your Email
        </h1>
        <p className="font-serif text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
          Enter the email address where you&apos;d like to receive your verification code.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="new-email">
            New Email Address
          </label>
          <input
            id="new-email"
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="updated.email@example.com"
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
                <span>Updating Email...</span>
              </>
            ) : (
              <>
                <span>Send Code</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>

          <Link
            href={`/auth/verify?email=${encodeURIComponent(currentEmail || "scholar@example.com")}${flowParam ? `&flow=${flowParam}` : ""}`}
            className="block text-center py-2 font-display text-xs uppercase tracking-wider text-[var(--text-muted)] hover:text-[#d4af37] transition-colors"
          >
            Back to verification
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ChangeEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-display uppercase tracking-wider">Loading...</div>}>
      <ChangeEmailContent />
    </Suspense>
  );
}
