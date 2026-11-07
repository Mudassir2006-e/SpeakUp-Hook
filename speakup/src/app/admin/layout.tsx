"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminRouteGuard from "@/components/admin/AdminRouteGuard";
import AdminInactivityWatcher from "@/components/admin/AdminInactivityWatcher";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AdminRouteGuard onAdminResolved={setAdminEmail}>
      {/* Automatic Inactivity Watcher (2 continuous minutes timeout) */}
      <AdminInactivityWatcher />

      <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg-main)] text-[var(--text-main)] font-serif antialiased">
        {/* Mobile & Tablet Header Bar (< 1024px) */}
        <header className="lg:hidden sticky top-0 z-40 h-16 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-md border-b border-[var(--surface-border)] px-3.5 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <Logo size="md" href="/admin/dashboard" brandText="SpeakUp" />
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-[#d4af37]/15 border border-[#d4af37]/35 text-[10px] font-display uppercase tracking-widest font-bold text-[#8a6d1b] dark:text-[#e4c665]">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] cursor-pointer flex items-center justify-center shrink-0 shadow-2xs hover:border-[#d4af37] transition-colors"
              aria-label="Toggle admin navigation menu"
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </header>

        {/* Mobile / Tablet Drawer Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-72 max-w-[85vw] h-full bg-white dark:bg-[#141416] shadow-2xl flex flex-col animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <AdminSidebar
                adminEmail={adminEmail}
                onNavigate={() => setMobileMenuOpen(false)}
                onClose={() => setMobileMenuOpen(false)}
                className="w-full h-full border-r-0"
              />
            </div>
          </div>
        )}

        {/* Dedicated Desktop Admin Sidebar */}
        <AdminSidebar adminEmail={adminEmail} className="hidden lg:flex" />

        {/* Main Admin Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminRouteGuard>
  );
}
