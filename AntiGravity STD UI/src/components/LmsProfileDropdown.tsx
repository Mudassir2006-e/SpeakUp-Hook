"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80";

interface LmsProfileDropdownProps {
  variant?: "dashboard" | "header";
  showName?: boolean; // backwards compatible
}

export default function LmsProfileDropdown({
  variant = "dashboard",
  showName = false,
}: LmsProfileDropdownProps) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("Mudassir Ali");
  const [studentEmail, setStudentEmail] = useState("mudassir.ali@gmail.com");
  const [profilePic, setProfilePic] = useState<string>(DEFAULT_AVATAR);
  const [isOpen, setIsOpen] = useState(false);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isHeaderMode = showName;

  useEffect(() => {
    const savedName = localStorage.getItem("speakup_student_name");
    if (savedName) setStudentName(savedName);

    const savedEmail = localStorage.getItem("speakup_student_email");
    if (savedEmail) {
      setStudentEmail(savedEmail);
    } else {
      localStorage.setItem("speakup_student_email", "mudassir.ali@gmail.com");
    }

    const savedPic = localStorage.getItem("speakup_profile_pic");
    if (savedPic) setProfilePic(savedPic);

    const handleNameUpdate = () => {
      const updated = localStorage.getItem("speakup_student_name");
      if (updated) setStudentName(updated);
    };

    const handleEmailUpdate = () => {
      const updatedEmail = localStorage.getItem("speakup_student_email");
      if (updatedEmail) setStudentEmail(updatedEmail);
    };

    const handlePicUpdate = () => {
      const updatedPic = localStorage.getItem("speakup_profile_pic");
      if (updatedPic) setProfilePic(updatedPic);
    };

    window.addEventListener("speakup_student_name_updated", handleNameUpdate);
    window.addEventListener("speakup_student_email_updated", handleEmailUpdate);
    window.addEventListener("speakup_profile_pic_updated", handlePicUpdate);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("speakup_student_name_updated", handleNameUpdate);
      window.removeEventListener("speakup_student_email_updated", handleEmailUpdate);
      window.removeEventListener("speakup_profile_pic_updated", handlePicUpdate);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    setSignOutModalOpen(false);
    router.push("/auth/login");
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
          <div className="w-12 h-12 rounded-full border-2 border-[#d4af37] p-0.5 bg-white dark:bg-[#141416] overflow-hidden shadow-xs transition-transform duration-200 group-hover:scale-105 shrink-0">
            <div
              className="w-full h-full rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url('${profilePic}')` }}
            />
          </div>

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
        /* Standard Prominently Sized Circular Profile Picture (Dashboard, Enrolled Courses, Learning Player, Events) */
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-full hover:ring-2 hover:ring-[#d4af37]/50 transition-all cursor-pointer group"
          aria-expanded={isOpen}
          aria-label="Student profile menu"
        >
          {/* Slightly increased profile picture size for clear visibility and balance */}
          <div className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full border-2 border-[#d4af37] p-0.5 bg-white dark:bg-[#141416] overflow-hidden shadow-sm transition-transform duration-200 group-hover:scale-105 shrink-0">
            <div
              className="w-full h-full rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url('${profilePic}')` }}
            />
          </div>
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

          <div className="py-1">
            <Link
              href="/lms/profile"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-main)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-[#d4af37]">manage_accounts</span>
              <span>Profile</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSignOutModalOpen(true);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
