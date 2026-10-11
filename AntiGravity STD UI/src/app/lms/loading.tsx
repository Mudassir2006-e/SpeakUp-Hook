import React from "react";

export default function LmsLoading() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-[var(--bg-main)] flex flex-col items-center justify-center p-6 selection:bg-[#d4af37]/20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[#d4af37]/25 border-t-[#d4af37] rounded-full animate-spin"></div>
        <span className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
          Loading Student Workspace...
        </span>
      </div>
    </div>
  );
}
