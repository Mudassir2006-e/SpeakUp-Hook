"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProfilePictureModal from "../ProfilePictureModal";
import InitialsAvatar from "@/components/InitialsAvatar";
import { createClient } from "@/lib/supabase/client";
import { changePasswordAction, removeStudentAvatarAction } from "@/app/lms/actions";
import { validatePassword } from "@/lib/validation";

interface EnrolledCourseItem {
  id: string;
  title: string;
  level?: string;
  status: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [editPicModalOpen, setEditPicModalOpen] = useState(false);
  const [selectedImageForAdjustment, setSelectedImageForAdjustment] = useState<string | null>(null);

  // Authenticated student information (initialized empty, loaded strictly from Supabase)
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // Dynamic active courses from enrollment data (Display Only)
  const [activeCourses, setActiveCourses] = useState<EnrolledCourseItem[]>([]);

  // Secure Change Password State (Passwords are never read, prefilled or exposed)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [avatarFeedback, setAvatarFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. Fetch verified server-side identity & enrolled courses from Supabase
    const loadAuthIdentity = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/auth/login");
          return;
        }

        // Strictly bind to the authenticated user's session email
        const authEmail = user.email || "";
        setStudentEmail(authEmail);
        setIsVerified(Boolean(user.email_confirmed_at));

          // Query profiles table for actual profile record
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("full_name, phone, avatar_url, status, email")
            .eq("id", user.id)
            .maybeSingle();

          const resolvedName =
            profile?.full_name ||
            (user.user_metadata?.full_name as string) ||
            (user.user_metadata?.name as string) ||
            "";
          const resolvedPhone =
            profile?.phone ||
            (user.user_metadata?.phone as string) ||
            "";

          const rawAvatar =
            (profile?.avatar_url && !profile.avatar_url.startsWith("data:") && !profile.avatar_url.includes("unsplash.com"))
              ? profile.avatar_url
              : (user.user_metadata?.avatar_url && !user.user_metadata.avatar_url.startsWith("data:") && !user.user_metadata.avatar_url.includes("unsplash.com"))
                ? user.user_metadata.avatar_url
                : null;

          setStudentName(resolvedName);
          setStudentPhone(resolvedPhone);
          setProfilePic(rawAvatar);
          if (profile?.status === "active") {
            setIsVerified(true);
          }

          // Fetch verified enrollments for this user strictly as DISPLAY ONLY
          try {
            const { data: enrollments } = await (supabase as any)
              .from("course_enrollments")
              .select("id, status, courses(id, title, level)")
              .eq("user_id", user.id);

            if (enrollments && enrollments.length > 0) {
              const formatted: EnrolledCourseItem[] = enrollments.map((e: any) => ({
                id: e.courses?.id || e.id,
                title: e.courses?.title || "Enrolled Course",
                level: e.courses?.level || "Standard",
                status: e.status === "approved" ? "Active" : e.status === "pending" ? "Pending Approval" : "Archived",
              }));
              setActiveCourses(formatted);
            } else {
              setActiveCourses([]);
            }
          } catch {
            setActiveCourses([]);
          }
        } catch (err) {
          console.error("Failed to load authenticated profile:", err);
        }
      };

    loadAuthIdentity();

    const handlePicUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom?.detail && typeof custom.detail === "string" && !custom.detail.startsWith("data:")) {
        setProfilePic(custom.detail);
      }
    };

    window.addEventListener("speakup:avatar-updated", handlePicUpdate);
    return () => {
      window.removeEventListener("speakup:avatar-updated", handlePicUpdate);
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarFeedback(null);
    const file = e.target.files?.[0];
    if (file) {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        setAvatarFeedback({
          type: "error",
          text: "Invalid image format. Allowed formats: PNG, JPG, or WebP only.",
        });
        e.target.value = "";
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setAvatarFeedback({
          type: "error",
          text: `File exceeds maximum 2MB size limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
        });
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;

        const img = new Image();
        img.onload = () => {
          if (img.naturalWidth < 128 || img.naturalHeight < 128) {
            setAvatarFeedback({
              type: "error",
              text: `Image resolution is too low (${img.naturalWidth} × ${img.naturalHeight}px). Minimum required is 128 × 128 pixels so avatars remain clear.`,
            });
            return;
          }
          setSelectedImageForAdjustment(dataUrl);
          setEditPicModalOpen(true);
        };
        img.onerror = () => {
          setAvatarFeedback({
            type: "error",
            text: "Could not read image file dimensions.",
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleSaveProfilePic = (newPic: string) => {
    setProfilePic(newPic);
    try {
      localStorage.setItem("speakup_profile_pic", newPic);
    } catch {}
    window.dispatchEvent(new Event("speakup_profile_pic_updated"));
    window.dispatchEvent(new CustomEvent("speakup:avatar-updated", { detail: newPic }));
  };

  const handleRemoveProfilePic = async () => {
    setProfilePic(null);
    setSelectedImageForAdjustment(null);
    try {
      localStorage.removeItem("speakup_profile_pic");
    } catch {}
    window.dispatchEvent(new Event("speakup_profile_pic_updated"));
    window.dispatchEvent(new CustomEvent("speakup:avatar-updated", { detail: "" }));

    try {
      await removeStudentAvatarAction();
    } catch {
      // Non-blocking fallback
    }
  };

  // Secure Password Update handler using Supabase Auth
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      setPasswordFeedback({ type: "error", text: pwCheck.error || "Password does not meet strength requirements." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", text: "New passwords do not match. Please verify." });
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await changePasswordAction(newPassword);
      if (result.success) {
        setPasswordFeedback({
          type: "success",
          text: "Your password has been securely updated. All other active sessions and devices have been revoked.",
        });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordFeedback({ type: "error", text: result.error || "Failed to update password." });
      }
    } catch {
      setPasswordFeedback({ type: "error", text: "An error occurred while updating your password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-[var(--bg-main)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--surface-border)]/60">
          <div className="space-y-1">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
              Profile Settings
            </h1>
            <p className="font-serif text-base sm:text-lg text-[var(--text-muted)]">
              Account identity, student credentials, and profile photo.
            </p>
          </div>

          <Link
            href="/lms/dashboard"
            className="inline-flex items-center gap-2 font-display text-xs uppercase tracking-wider text-[var(--text-main)] hover:text-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] px-4 py-2.5 rounded-xl transition-all bg-white hover:bg-[#d4af37] dark:bg-[var(--surface-lowest)] dark:hover:bg-[#d4af37] shadow-xs font-semibold self-start sm:self-center cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Clean, De-boxed Profile Interface */}
        <div className="rounded-2xl bg-white dark:bg-[#141418]/60 border border-[var(--surface-border)] p-6 sm:p-10 shadow-xs space-y-8">
          {/* Photo and Identity with Initials Avatar Fallback */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-[var(--surface-border)]/50">
            {/* Hidden file input for Change Photo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              {/* Profile Photo Display with Initials Avatar when no custom picture is set */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative group cursor-pointer"
                title="Click to change profile picture"
              >
                <InitialsAvatar
                  name={studentName}
                  avatarUrl={profilePic}
                  sizeClass="w-24 h-24 sm:w-28 sm:h-28"
                  textSizeClass="text-3xl"
                  className="shadow-md hover:ring-3 hover:ring-[#d4af37]/30 transition-all"
                />
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-full text-white">
                  <span className="material-symbols-outlined text-[22px]">photo_camera</span>
                  <span className="font-display text-[9px] uppercase font-bold mt-0.5">Change</span>
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold text-[var(--text-main)] leading-tight">
                  {studentName || "—"}
                </h2>
                <p className="font-serif text-sm text-[var(--text-muted)]">
                  Registered Student
                </p>
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-display font-semibold pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{isVerified ? "Verified Account" : "Active Student"}</span>
                </div>
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 self-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 cursor-pointer font-display text-xs uppercase tracking-wider text-[var(--text-main)] hover:text-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] px-4 sm:px-5 py-2.5 rounded-xl transition-all bg-white hover:bg-[#d4af37] dark:bg-[var(--surface-low)] dark:hover:bg-[#d4af37] shadow-xs font-bold shrink-0"
              >
                <span className="material-symbols-outlined text-[18px] text-[#d4af37]">photo_camera</span>
                <span>{profilePic ? "Change Photo" : "Upload Photo"}</span>
              </button>

              {Boolean(profilePic) && (
                <button
                  type="button"
                  onClick={handleRemoveProfilePic}
                  className="inline-flex items-center gap-1.5 cursor-pointer font-display text-xs uppercase tracking-wider text-rose-600 hover:text-white border border-rose-500/30 hover:border-rose-600 hover:bg-rose-600 px-4 py-2.5 rounded-xl transition-all shadow-xs font-bold shrink-0"
                >
                  <span className="material-symbols-outlined text-[17px]">delete</span>
                  <span>Remove Picture</span>
                </button>
              )}
            </div>
          </div>

          {/* Avatar Validation Feedback Alert */}
          {avatarFeedback && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-serif ${
                avatarFeedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[17px]">
                  {avatarFeedback.type === "success" ? "check_circle" : "error"}
                </span>
                <span>{avatarFeedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setAvatarFeedback(null)}
                className="text-[11px] font-display uppercase tracking-wider underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Refined Read-Only Account & Enrollment Details */}
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-display text-xs uppercase tracking-[0.14em] text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                Account &amp; Enrollment Credentials
              </h3>
              <span className="text-[11px] font-display font-semibold text-[var(--text-muted)] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Verified Records (Display Only)</span>
              </span>
            </div>

            {/* Prominent Student Name Card */}
            <div className="rounded-xl p-5 bg-[#fbf9f4] dark:bg-[var(--surface-low)]/70 border border-[#d4af37]/35 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="font-display text-[10px] uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-bold block">
                  Student Name
                </span>
                <span className="font-display font-extrabold text-xl sm:text-2xl text-[var(--text-main)] tracking-tight block">
                  {studentName || "—"}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25 self-start sm:self-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Enrolled Student</span>
              </span>
            </div>

            {/* Secondary Credentials Grid: Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-xl p-4.5 bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]/40 border border-[var(--surface-border)]/80 space-y-1">
                <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                  Email Address
                </span>
                <p className="font-sans text-sm sm:text-[15px] text-[var(--text-main)] font-medium truncate">
                  {studentEmail || "—"}
                </p>
              </div>

              <div className="rounded-xl p-4.5 bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]/40 border border-[var(--surface-border)]/80 space-y-1">
                <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                  Phone Number
                </span>
                <p className="font-sans text-sm sm:text-[15px] text-[var(--text-main)] font-medium">
                  {studentPhone || "—"}
                </p>
              </div>
            </div>

            {/* Active Enrolled Courses — STRICTLY DISPLAY ONLY */}
            <div className="rounded-xl p-4.5 bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]/40 border border-[var(--surface-border)]/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                  Enrolled Courses (Read Only)
                </span>
                <span className="text-xs text-[var(--text-muted)] font-sans">
                  {activeCourses.length} enrolled cohort{activeCourses.length === 1 ? "" : "s"}
                </span>
              </div>
              {activeCourses.length === 0 ? (
                <div className="p-6 text-center rounded-lg bg-white dark:bg-[var(--surface-lowest)] border border-[var(--surface-border)]/70 text-xs text-[var(--text-muted)] font-serif">
                  — No enrolled courses
                </div>
              ) : (
                <div className="space-y-2">
                  {activeCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-[var(--surface-lowest)] border border-[var(--surface-border)]/70"
                    >
                      <div className="min-w-0">
                        <span className="font-display font-bold text-sm sm:text-[15px] text-[var(--text-main)] block truncate">
                          {course.title}
                        </span>
                        {course.level && (
                          <span className="font-serif text-[11px] text-[var(--text-muted)] block mt-0.5">
                            Level: {course.level}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-display uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        • {course.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Password Security & Change Password Section */}
            <div id="settings" className="rounded-xl p-5 bg-[#fbf9f4] dark:bg-[var(--surface-low)]/50 border border-[var(--surface-border)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)]/60 pb-3">
                <div className="space-y-0.5">
                  <h4 className="font-display text-sm font-bold text-[var(--text-main)]">
                    Password Security
                  </h4>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    Update your account password securely. Existing passwords are never retrieved, displayed, or exposed.
                  </p>
                </div>
                <span className="material-symbols-outlined text-[20px] text-[#d4af37]">shield</span>
              </div>

              {passwordFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-serif flex items-center gap-2 ${
                    passwordFeedback.type === "success"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {passwordFeedback.type === "success" ? "check_circle" : "error"}
                  </span>
                  <span>{passwordFeedback.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3.5">
                {/* New Password and Confirm New Password with active-entry eye toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1" htmlFor="new-pw">
                      New Password (min. 8 characters) *
                    </label>
                    <div className="relative">
                      <input
                        id="new-pw"
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full border border-[var(--surface-border)] rounded-xl py-2.5 px-3.5 bg-white dark:bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                        title={showNewPassword ? "Hide password" : "Show password"}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showNewPassword ? "visibility" : "visibility_off"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1" htmlFor="conf-pw">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        id="conf-pw"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full border border-[var(--surface-border)] rounded-xl py-2.5 px-3.5 bg-white dark:bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showConfirmPassword ? "visibility" : "visibility_off"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading || !newPassword || !confirmPassword}
                    className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c29d2b] disabled:opacity-50 text-black font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
                  >
                    {passwordLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </div>

      {/* Profile Picture Adjustment Modal */}
      <ProfilePictureModal
        isOpen={editPicModalOpen}
        onClose={() => {
          setEditPicModalOpen(false);
          setSelectedImageForAdjustment(null);
        }}
        currentImage={selectedImageForAdjustment || profilePic}
        onSave={(newPic) => {
          handleSaveProfilePic(newPic);
          setSelectedImageForAdjustment(null);
        }}
      />
    </div>
  );
}
