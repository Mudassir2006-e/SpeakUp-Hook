"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo, { SpeakUpSymbol } from "@/components/Logo";
import { useTheme } from "@/components/ThemeContext";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80";

export default function LMSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [certificateNotification, setCertificateNotification] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePic, setProfilePic] = useState<string>(DEFAULT_AVATAR);

  const isLearnPage = pathname === "/lms/learn" || pathname?.startsWith("/lms/learn");
  const isProfilePage = pathname === "/lms/profile" || pathname?.startsWith("/lms/profile");
  const isCoursesPage = pathname === "/lms/courses" || pathname?.startsWith("/lms/courses");
  const isDashboardPage = pathname === "/lms/dashboard" || pathname === "/lms";
  const hideSidebar = isLearnPage || isProfilePage;
  const hideHeader = isLearnPage || isProfilePage || isCoursesPage;
  const [studentName, setStudentName] = useState("Mudassir Ali");

  useEffect(() => {
    const saved = localStorage.getItem("speakup_profile_pic");
    if (saved) setProfilePic(saved);

    const savedName = localStorage.getItem("speakup_student_name");
    if (savedName) setStudentName(savedName);

    const handlePicUpdate = () => {
      const updated = localStorage.getItem("speakup_profile_pic");
      if (updated) setProfilePic(updated);
    };

    const handleNameUpdate = () => {
      const updatedName = localStorage.getItem("speakup_student_name");
      if (updatedName) setStudentName(updatedName);
    };

    window.addEventListener("speakup_profile_pic_updated", handlePicUpdate);
    window.addEventListener("speakup_student_name_updated", handleNameUpdate);
    return () => {
      window.removeEventListener("speakup_profile_pic_updated", handlePicUpdate);
      window.removeEventListener("speakup_student_name_updated", handleNameUpdate);
    };
  }, []);

  const handleCertificateClick = () => {
    setCertificateNotification(
      "Your certificate is locked. Complete this course to unlock your certificate. Your certificate will be provided via email and WhatsApp."
    );
    setTimeout(() => {
      setCertificateNotification(null);
    }, 6000);
  };

  const lmsNavItems = [
    { label: "Dashboard", href: "/lms/dashboard", icon: "dashboard" },
    { label: "Enrolled Courses", href: "/lms/courses", icon: "school" },
    { label: "Upcoming Events", href: "/lms/events", icon: "event" },
  ];

  const handleSignOut = () => {
    setSignOutModalOpen(false);
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen flex bg-[#fdfbf7] dark:bg-[var(--bg-main)] text-[var(--text-main)] font-serif antialiased">
      {/* Desktop Collapsible Sidebar - Hidden on Learning Player and Profile pages */}
      {!hideSidebar && (
        <aside
          className={`hidden md:flex flex-col fixed left-0 top-0 h-screen border-r border-[var(--surface-border)] bg-white dark:bg-[#141416] z-30 transition-all duration-300 ${
            sidebarCollapsed ? "w-20" : "w-72"
          }`}
        >
          {/* Sidebar Header */}
          <div className={`p-6 border-b border-[var(--surface-border)] flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
            <SpeakUpSymbol sizeClass="w-11 h-11" />
            {!sidebarCollapsed && (
              <span className="font-display text-2xl font-bold tracking-wider uppercase brand-name-text text-[#141416] dark:text-[#f7f0e8]">
                SpeakUp
              </span>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scroll">
            {lmsNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-display text-[13px] uppercase tracking-wider font-semibold transition-all ${
                    isActive
                      ? "bg-[#d4af37]/20 text-[#141416] dark:text-[#d4af37] border-r-4 border-[#d4af37] shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#f7f2ea] dark:hover:bg-[var(--surface-low)]"
                  } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="material-symbols-outlined text-[22px] shrink-0 text-[#d4af37]">
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}

            {/* Locked Certificate Trigger Button */}
            <button
              type="button"
              onClick={handleCertificateClick}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-display text-[13px] uppercase tracking-wider font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#f7f2ea] dark:hover:bg-[var(--surface-low)] transition-all cursor-pointer ${
                sidebarCollapsed ? "justify-center px-0" : ""
              }`}
              title="Certificates (Locked)"
            >
              <div className="flex items-center gap-3.5">
                <span className="material-symbols-outlined text-[22px] shrink-0 text-[#d4af37]">workspace_premium</span>
                {!sidebarCollapsed && <span>Certificates</span>}
              </div>
              {!sidebarCollapsed && (
                <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)]">lock</span>
              )}
            </button>
          </nav>

          {/* Sidebar Footer with Theme Toggle directly above Public Website button */}
          <div className="p-4 border-t border-[var(--surface-border)] space-y-2">
            {sidebarCollapsed ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-center p-2.5 rounded-xl text-xs font-display uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#f7f2ea] dark:hover:bg-[var(--surface-low)] transition-colors cursor-pointer"
                  title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
                  aria-label={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
                >
                  <span className="material-symbols-outlined text-[18px] text-[#d4af37]">
                    {theme === "light" ? "dark_mode" : "light_mode"}
                  </span>
                </button>
                <Link
                  href="/"
                  className="flex items-center justify-center p-2.5 rounded-xl text-xs font-display uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#f7f2ea] dark:hover:bg-[var(--surface-low)] transition-colors"
                  title="Public Website"
                >
                  <span className="material-symbols-outlined text-[18px]">public</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 1st Row: Theme Toggle directly above Public Website */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full h-10 px-3.5 flex items-center gap-3 rounded-xl text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#f7f2ea] dark:hover:bg-[var(--surface-low)] transition-colors border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)]/50 cursor-pointer"
                  title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
                  aria-label={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
                >
                  <span className="material-symbols-outlined text-[18px] text-[#d4af37] shrink-0">
                    {theme === "light" ? "dark_mode" : "light_mode"}
                  </span>
                  <span className="truncate">{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
                </button>

                {/* 2nd Row: Public Website Button */}
                <Link
                  href="/"
                  className="w-full h-10 px-3.5 flex items-center gap-3 rounded-xl text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#f7f2ea] dark:hover:bg-[var(--surface-low)] transition-colors border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)]/50"
                  title="Public Website"
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0">public</span>
                  <span className="truncate">Public Website</span>
                </Link>
              </div>
            )}

            {/* Collapse Control directly below both buttons */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full h-10 flex items-center justify-center gap-2 px-3 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors font-display text-xs uppercase tracking-wider font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {sidebarCollapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
              </span>
              {!sidebarCollapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          hideSidebar ? "w-full ml-0" : sidebarCollapsed ? "md:ml-20" : "md:ml-72"
        }`}
      >
        {/* Mobile-only header bar (Desktop header completely removed per requirement) */}
        {!hideSidebar && (
          <div className="md:hidden sticky top-0 z-20 h-16 bg-white/95 dark:bg-[var(--bg-main)]/95 backdrop-blur-md border-b border-[var(--surface-border)] px-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-[var(--surface-border)] text-[var(--text-main)] cursor-pointer"
              aria-label="Open navigation menu"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <Logo size="sm" />
            <div className="w-8"></div>
          </div>
        )}



        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[var(--surface-lowest)] border-b border-[var(--surface-border)] p-4 space-y-2 z-30 shadow-md">
            {lmsNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold ${
                  pathname === item.href ? "bg-[#d4af37]/20 text-[#d4af37]" : "text-[var(--text-muted)]"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleCertificateClick();
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] cursor-pointer hover:bg-[var(--surface-low)]"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-[#d4af37]">workspace_premium</span>
                <span>Certificates</span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)]">lock</span>
            </button>
            <div className="pt-2 border-t border-[var(--surface-border)]">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-display uppercase tracking-wider text-[var(--text-muted)]"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Exit to Website</span>
              </Link>
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>

      {/* Sign Out Confirmation Modal */}
      {signOutModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSignOutModalOpen(false)}
        >
          <div
            className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[24px]">logout</span>
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-display text-lg font-bold text-[var(--text-main)]">Sign Out</h3>
              <p className="font-serif text-sm text-[var(--text-muted)]">
                Are you sure you want to end your current LMS study session?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSignOutModalOpen(false)}
                className="flex-1 py-2.5 rounded-full border border-[var(--surface-border)] font-display text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] hover:bg-[var(--surface-low)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-display text-xs uppercase tracking-wider font-bold shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Polished Academic Certificate Notification Modal */}
      {certificateNotification && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cert-popup-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setCertificateNotification(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#151518] text-[var(--text-main)] border border-[#d4af37]/35 rounded-2xl p-6 sm:p-7 shadow-[0_12px_40px_-8px_rgba(212,175,55,0.18),0_10px_24px_-4px_rgba(0,0,0,0.3)] relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-[var(--surface-border)]/60">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#d4af37]/25 to-[#d4af37]/10 border border-[#d4af37]/45 text-[#d4af37] flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
                </div>
                <div>
                  <h4 id="cert-popup-title" className="font-display text-base font-bold text-[var(--text-main)] leading-tight tracking-tight">
                    Certificate Notification
                  </h4>
                  <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                    SpeakUp Academic Credentials
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCertificateNotification(null)}
                aria-label="Close notification"
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-[var(--surface-low)] transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="bg-[#f9f5ed]/80 dark:bg-[var(--surface-low)]/70 border border-[var(--surface-border)] rounded-xl p-4.5 mb-5 shadow-inner">
              <p className="font-serif text-[13.5px] sm:text-[14px] text-[var(--text-main)] leading-relaxed">
                {certificateNotification}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCertificateNotification(null)}
                className="px-6 py-2.5 bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold rounded-xl shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
