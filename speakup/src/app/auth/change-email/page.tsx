"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

function ChangeEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentEmail = searchParams.get("current") || "";
  const flowParam = searchParams.get("flow") || "";

  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const targetEmail = newEmail.trim();

      const { error } = await supabase.auth.updateUser({
        email: targetEmail,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccessMessage("Verification message dispatched to your new email. Redirecting to verification...");

      setTimeout(() => {
        router.push(
          `/auth/verify?email=${encodeURIComponent(targetEmail)}&flow=email_change`
        );
      }, 1200);
    } catch {
      setErrorMessage("Unable to process email change. Please check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl shadow-sm p-8 sm:p-10 relative overflow-hidden transition-all">
      {/* Logo & Headings */}
      <div className="flex flex-col items-center text-center mb-8">
        <Logo size="lg" showText={false} href="/" className="mb-4" />
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)] tracking-tight mb-2">
          Change Your Email
        </h1>
        <p className="font-serif text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
          Enter the email address where you&apos;d like to receive your verification code.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs font-display font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-display font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{successMessage}</span>
          </div>
        )}

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
