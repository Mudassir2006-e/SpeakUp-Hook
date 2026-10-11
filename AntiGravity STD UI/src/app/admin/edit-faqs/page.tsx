"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditFaqsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/faqs");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf8f5] dark:bg-[#0c0c0e]">
      <div className="flex items-center gap-3 text-sm font-display uppercase tracking-wider text-[var(--text-muted)] font-bold">
        <span className="w-4 h-4 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></span>
        <span>Redirecting to Centralized FAQs Management...</span>
      </div>
    </div>
  );
}
