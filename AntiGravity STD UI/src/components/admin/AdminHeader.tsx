"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeContext";
import InitialsAvatar from "@/components/InitialsAvatar";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  adminEmail?: string | null;
  actions?: React.ReactNode;
}

export default function AdminHeader({
  title,
  subtitle = "SpeakUp Academic Administration & Access Control",
  adminEmail: initialAdminEmail,
  actions,
}: AdminHeaderProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [adminAvatar, setAdminAvatar] = useState<string>("");
  const [adminName, setAdminName] = useState<string>("Administrator");
  const [adminEmail, setAdminEmail] = useState<string>(initialAdminEmail || "");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch admin profile data & listen for avatar updates
  useEffect(() => {
    if (initialAdminEmail) setAdminEmail(initialAdminEmail);
    const fetchAdminProfile = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          if (user.email) setAdminEmail(user.email);
          const metaName =
            (user.user_metadata?.full_name as string) ||
            (user.user_metadata?.name as string) ||
            "Administrator";

          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          const resolvedName = profile?.full_name || metaName;
          setAdminName(resolvedName);

          const rawProfileAvatar = profile?.avatar_url;
          const rawMetaAvatar = user.user_metadata?.avatar_url as string | undefined;
          const validAvatar = (rawProfileAvatar && !rawProfileAvatar.includes("unsplash.com"))
            ? rawProfileAvatar
            : (rawMetaAvatar && !rawMetaAvatar.includes("unsplash.com"))
              ? rawMetaAvatar
              : "";
          setAdminAvatar(validAvatar || "");
        }
      } catch {
        // Offline / fallback
      }
    };

    fetchAdminProfile();

    const handleAvatarUpdateEvent = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        setAdminAvatar(custom.detail);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("speakup:avatar-updated", handleAvatarUpdateEvent);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("speakup:avatar-updated", handleAvatarUpdateEvent);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [initialAdminEmail]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Offline fallback
    }
    try {
      localStorage.removeItem("speakup_student_name");
      localStorage.removeItem("speakup_student_email");
      localStorage.removeItem("speakup_student_phone");
      localStorage.removeItem("speakup_enrolled_courses");
    } catch {
      // Storage access safety
    }
    setIsOpen(false);
    router.replace("/auth/login");
  };

  return (
    <header className="min-h-[5rem] sm:min-h-[5.5rem] py-3.5 px-4 sm:px-8 lg:px-10 bg-white dark:bg-[#141416] border-b border-[var(--surface-border)] flex items-center justify-between sticky top-0 z-30 shadow-2xs gap-4">
      {/* Left Side: Primary Large Heading & Refined Supporting Subtitle */}
      <div className="flex flex-col justify-center min-w-0 flex-1 pr-2 sm:pr-4">
        <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight line-clamp-1">
          {title}
        </h1>
        {subtitle && (
          <p className="font-serif text-[11px] sm:text-xs lg:text-sm text-[var(--text-muted)] tracking-wide mt-0.5 sm:mt-1 leading-snug line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Side: Actions + Admin Profile Avatar with Dropdown Menu */}
      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        {/* Admin Profile Avatar Dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="relative group p-0.5 rounded-full border-2 border-[#d4af37]/80 hover:border-[#d4af37] transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 block"
            title="Admin Profile Menu"
            aria-expanded={isOpen}
            aria-label="Admin Profile Menu"
          >
            <InitialsAvatar
              name={adminName}
              avatarUrl={adminAvatar}
              sizeClass="w-11 h-11 sm:w-13 sm:h-13"
              textSizeClass="text-base sm:text-lg"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#141416]"></span>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-[#16161c] border border-[var(--surface-border)] shadow-xl p-2 z-50 animate-in fade-in duration-150">
              {/* Header info */}
              <div className="p-3 border-b border-[var(--surface-border)]/60">
                <p className="font-display text-sm font-bold text-[var(--text-main)] leading-tight">
                  {adminName}
                </p>
                <p className="font-serif text-xs text-[var(--text-muted)] truncate mt-0.5">
                  {adminEmail || "—"}
                </p>
                <span className="inline-block mt-1 font-display text-[10px] uppercase tracking-wider font-bold text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded-full">
                  Administrator
                </span>
              </div>

              <div className="py-1 space-y-0.5">
                {/* 1. View Public Website (New Tab) */}
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-main)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#d4af37]">public</span>
                  <span>View Public Website</span>
                </Link>

                {/* 2. View Student LMS Portal (New Tab) */}
                <Link
                  href="/lms/dashboard?preview=admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-main)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#d4af37]">school</span>
                  <span>View Student LMS Portal</span>
                </Link>

              {/* 3. Profile */}
              <Link
                href="/admin/profile"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-main)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-[#d4af37]">admin_panel_settings</span>
                <span>Profile</span>
              </Link>

              {/* 4. Light/Dark Mode */}
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

              {/* 5. Sign Out */}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
