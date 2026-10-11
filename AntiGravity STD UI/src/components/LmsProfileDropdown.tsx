"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeContext";
import InitialsAvatar from "@/components/InitialsAvatar";

interface LmsProfileDropdownProps {
  variant?: "dashboard" | "header";
  showName?: boolean; // backwards compatible
}

export default function LmsProfileDropdown({
  variant = "dashboard",
  showName = false,
}: LmsProfileDropdownProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isHeaderMode = showName;

  useEffect(() => {
    const loadAuthIdentity = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          if (user.email) setStudentEmail(user.email);
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          const resolvedName =
            profile?.full_name ||
            (user.user_metadata?.full_name as string) ||
            (user.user_metadata?.name as string) ||
            "";
          if (resolvedName) setStudentName(resolvedName);

          const resolvedAvatar =
            (profile?.avatar_url && !profile.avatar_url.startsWith("data:") && !profile.avatar_url.includes("unsplash.com"))
              ? profile.avatar_url
              : (user.user_metadata?.avatar_url && !user.user_metadata.avatar_url.startsWith("data:") && !user.user_metadata.avatar_url.includes("unsplash.com"))
                ? user.user_metadata.avatar_url
                : null;
          setProfilePic(resolvedAvatar);
        }
      } catch (err) {
        console.error("Failed to load student dropdown identity:", err);
      }
    };

    loadAuthIdentity();

    const handleAvatarUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom?.detail && typeof custom.detail === "string" && !custom.detail.startsWith("data:")) {
        setProfilePic(custom.detail);
      }
    };

    window.addEventListener("speakup:avatar-updated", handleAvatarUpdate);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("speakup:avatar-updated", handleAvatarUpdate);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore if offline
    }
    try {
      localStorage.removeItem("speakup_student_name");
      localStorage.removeItem("speakup_student_email");
      localStorage.removeItem("speakup_student_phone");
      localStorage.removeItem("speakup_enrolled_courses");
    } catch {
      // Safe fallback
    }
    setSignOutModalOpen(false);
    router.replace("/auth/login");
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Trigger Button: Appropriately sized circular profile picture across Dashboard and internal LMS pages */}
      {isHeaderMode ? (
        /* Connected Header Mode (optional override) */
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 py-1.5 px-3 rounded-2xl border border-[var(--surface-border)] bg-white/90 dark:bg-[#141416]/90 hover:border-[#d4af37] hover:bg-[#fdfbf7] dark:hover:bg-[var(--surface-low)] shadow-2xs transition-all cursor-pointer group"
          aria-expanded={isOpen}
          aria-label="Student profile menu"
        >
          <InitialsAvatar
            name={studentName}
            avatarUrl={profilePic}
            sizeClass="w-12 h-12"
            textSizeClass="text-sm"
          />

          <div className="flex flex-col text-left pr-1">
            <span className="font-display font-bold text-sm text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors leading-tight flex items-center gap-1">
              {studentName}
              <span className="material-symbols-outlined text-[16px] text-[#d4af37] transition-transform duration-200 group-hover:translate-y-0.5">
                expand_more
              </span>
            </span>
            <span className="font-serif text-[11px] text-[var(--text-muted)] leading-tight">
              Student Account
            </span>
          </div>
        </button>
      ) : (
        /* Standard Prominently Sized Circular Profile Picture */
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-full hover:ring-2 hover:ring-[#d4af37]/50 transition-all cursor-pointer group"
          aria-expanded={isOpen}
          aria-label="Student profile menu"
        >
          <InitialsAvatar
            name={studentName}
            avatarUrl={profilePic}
            sizeClass="w-16 h-16 sm:w-[68px] sm:h-[68px]"
            textSizeClass="text-xl"
          />
        </button>
      )}

      {/* Styled Profile Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-[#16161c] border border-[var(--surface-border)] shadow-xl p-2 z-50 animate-in fade-in duration-150">
          <div className="p-3 border-b border-[var(--surface-border)]/60">
            <p className="font-display text-sm font-bold text-[var(--text-main)] leading-tight">
              {studentName}
            </p>
            <p className="font-serif text-xs text-[var(--text-muted)] truncate mt-0.5">
              {studentEmail}
            </p>
          </div>

          <div className="py-1 space-y-0.5">
            {/* 1. Profile */}
            <Link
              href="/lms/profile"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-main)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-[#d4af37]">manage_accounts</span>
              <span>Profile</span>
            </Link>

            {/* 2. Public Website */}
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-main)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-[#d4af37]">public</span>
              <span>Public Website</span>
            </Link>

            {/* 4. Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                toggleTheme();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-main)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-colors cursor-pointer text-left"
            >
              <span className="material-symbols-outlined text-[18px] text-[#d4af37]">
                {theme === "light" ? "dark_mode" : "light_mode"}
              </span>
              <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
            </button>

            {/* 4. Sign Out */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSignOutModalOpen(true);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {signOutModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSignOutModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#16161c] border border-[var(--surface-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">logout</span>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                  Confirm Sign Out
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  Are you sure you want to end your current session?
                </p>
              </div>
            </div>

            <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
              You will need to enter your credentials to access your courses and notes again.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSignOutModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-bold text-[var(--text-muted)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-display uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
