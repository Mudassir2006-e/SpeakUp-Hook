"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { createClient } from "@/lib/supabase/client";
import { uploadAdminAvatarAction, removeAdminAvatarAction, changeAdminPasswordAction } from "@/app/admin/actions";
import InitialsAvatar from "@/components/InitialsAvatar";
import { validateName, validatePhone, validatePassword } from "@/lib/validation";

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [role, setRole] = useState<string>("admin");
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Picture Editor State
  const [avatarScale, setAvatarScale] = useState(1);
  const [avatarOffsetX, setAvatarOffsetX] = useState(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [avatarDragStart, setAvatarDragStart] = useState({ x: 0, y: 0 });
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Profile Info State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Change Email State
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Change Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Toast / General Feedback
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Load actual authenticated account details from Supabase
  useEffect(() => {
    async function loadAccountDetails() {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          setEmail(user.email || "");
          setIsVerified(Boolean(user.email_confirmed_at));

          // Check profiles table first for actual saved profile info
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("full_name, role, avatar_url, phone, account_status")
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

          const rawMetaAvatar = user.user_metadata?.avatar_url as string | undefined;
          const validMetaAvatar = rawMetaAvatar && !rawMetaAvatar.startsWith("data:") && !rawMetaAvatar.includes("unsplash.com") ? rawMetaAvatar : null;

          const rawProfileAvatar = profile?.avatar_url as string | undefined;
          const validProfileAvatar = rawProfileAvatar && !rawProfileAvatar.startsWith("data:") && !rawProfileAvatar.includes("unsplash.com") ? rawProfileAvatar : null;

          const resolvedAvatar = validProfileAvatar || validMetaAvatar || null;

          setFullName(resolvedName);
          setEditName(resolvedName);
          setPhone(resolvedPhone);
          setEditPhone(resolvedPhone);
          setAvatar(resolvedAvatar);
          setRole(profile?.role || "admin");
          if (profile?.status === "active") {
            setIsVerified(true);
          }
        }
      } catch (err: any) {
        console.error("Failed to load admin profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAccountDetails();
  }, []);

  // 2. Profile Picture Upload & Validation (Image files only, max 2MB)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMime = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMime.includes(file.type)) {
      showToast("error", "Please select a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "Image file size should not exceed 2MB.");
      return;
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPendingAvatar(previewUrl);
    setAvatarScale(1);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
    showToast("success", "Image loaded. Adjust zoom/crop and click 'Save Changes'.");
  };

  // Save changes to profile picture using Supabase Storage URL
  const handleSaveAvatar = async () => {
    setAvatarSaving(true);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const res = await uploadAdminAvatarAction(formData);

        if (!res.success || !res.data) {
          showToast("error", res.error || "Failed to upload avatar.");
          return;
        }

        const newUrl = res.data.avatarUrl;
        setAvatar(newUrl);
        localStorage.setItem("speakup_admin_avatar", newUrl);
        window.dispatchEvent(new CustomEvent("speakup:avatar-updated", { detail: newUrl }));
        setSelectedFile(null);
      } else {
        const targetAvatar = pendingAvatar || avatar;
        if (targetAvatar && !targetAvatar.startsWith("data:") && !targetAvatar.startsWith("blob:")) {
          setAvatar(targetAvatar);
          localStorage.setItem("speakup_admin_avatar", targetAvatar);
          window.dispatchEvent(new CustomEvent("speakup:avatar-updated", { detail: targetAvatar }));
        }
      }

      setPendingAvatar(null);
      showToast("success", "Profile picture updated across Admin Panel.");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to save avatar.");
    } finally {
      setAvatarSaving(false);
    }
  };

  // Remove profile picture and reset to initials fallback
  const handleRemoveAvatar = async () => {
    setAvatar(null);
    setPendingAvatar(null);
    setSelectedFile(null);
    setAvatarScale(1);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
    localStorage.removeItem("speakup_admin_avatar");
    window.dispatchEvent(new CustomEvent("speakup:avatar-updated", { detail: "" }));

    try {
      await removeAdminAvatarAction();
    } catch {
      // Non-blocking fallback
    }

    showToast("success", "Profile picture removed. Initials avatar restored.");
  };

  // 3. Edit Personal Information (Full Name & Phone)
  const handleSaveProfileInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameCheck = validateName(editName, "Full Name");
    if (!nameCheck.valid) {
      showToast("error", nameCheck.error || "Please enter a valid full name.");
      return;
    }

    const trimmedPhone = editPhone.trim();
    if (trimmedPhone) {
      const phoneCheck = validatePhone(trimmedPhone);
      if (!phoneCheck.valid) {
        showToast("error", phoneCheck.error || "Please enter a valid phone number.");
        return;
      }
    }

    setProfileSaving(true);
    try {
      const supabase = createClient();
      const trimmedName = editName.trim();

      if (userId) {
        await (supabase as any)
          .from("profiles")
          .update({
            full_name: trimmedName,
            phone: trimmedPhone || null,
          })
          .eq("id", userId);
      }

      await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          name: trimmedName,
          phone: trimmedPhone || null,
        },
      });

      setFullName(trimmedName);
      setPhone(trimmedPhone);
      localStorage.setItem("speakup_admin_name", trimmedName);
      setIsEditingProfile(false);
      showToast("success", "Personal details successfully saved.");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update profile info.");
    } finally {
      setProfileSaving(false);
    }
  };

  // 4. Change Email Flow (Connected to Supabase Auth)
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFeedback(null);

    const targetEmail = newEmail.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      setEmailFeedback({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    if (targetEmail === email.toLowerCase()) {
      setEmailFeedback({ type: "error", text: "The new email must be different from current email." });
      return;
    }

    setEmailLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ email: targetEmail });
      if (error) {
        setEmailFeedback({ type: "error", text: error.message });
      } else {
        setEmailFeedback({
          type: "success",
          text: `Verification email dispatched to ${targetEmail}. Please verify via the link sent to your inbox.`,
        });
        setNewEmail("");
      }
    } catch (err: any) {
      setEmailFeedback({ type: "error", text: err?.message || "Failed to initiate email change." });
    } finally {
      setEmailLoading(false);
    }
  };

  // 5. Change Password Flow (Masked fields, securely connected to Supabase Auth)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 8) {
      setPasswordFeedback({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", text: "New passwords do not match. Please verify." });
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await changeAdminPasswordAction(newPassword);
      if (result.success) {
        setPasswordFeedback({
          type: "success",
          text: "Password changed successfully. All other active sessions and devices have been revoked.",
        });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordFeedback({ type: "error", text: result.error || "Password change failed." });
      }
    } catch (err: any) {
      setPasswordFeedback({ type: "error", text: err?.message || "Failed to update password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const activeDisplayAvatar = pendingAvatar || avatar;

  return (
    <div className="min-h-screen pb-16">
      <AdminHeader
        title="My Profile"
        subtitle="SpeakUp Academic Administration & Access Control"
      />

      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8 space-y-8">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-display font-semibold transition-all ${
              toast.type === "success"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {toast.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{toast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-xs uppercase tracking-wider underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SECTION 1: PROFILE PICTURE EDITOR */}
        <section className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-4">
            <div className="space-y-0.5">
              <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
                Profile Picture
              </h2>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                Upload and crop your administrator avatar. Synchronized across the Admin Panel header.
              </p>
            </div>
            {pendingAvatar && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                Unsaved Changes
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Interactive Preview Circle with Zoom & Crop */}
            <div className="flex flex-col items-center justify-center p-6 bg-[#f9f5ed]/80 dark:bg-[var(--surface-low)]/50 rounded-2xl border border-[var(--surface-border)] space-y-4">
              <div
                className="w-36 h-36 aspect-square rounded-full overflow-hidden border-4 border-[#d4af37] shadow-md relative bg-black/10 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
                title="Click and drag to reposition image"
                onMouseDown={(e) => {
                  if (!activeDisplayAvatar) return;
                  setIsDraggingAvatar(true);
                  setAvatarDragStart({ x: e.clientX - avatarOffsetX, y: e.clientY - avatarOffsetY });
                }}
                onMouseMove={(e) => {
                  if (!isDraggingAvatar || !activeDisplayAvatar) return;
                  const limit = Math.max(70, 60 * avatarScale);
                  setAvatarOffsetX(Math.max(-limit, Math.min(limit, e.clientX - avatarDragStart.x)));
                  setAvatarOffsetY(Math.max(-limit, Math.min(limit, e.clientY - avatarDragStart.y)));
                }}
                onMouseUp={() => setIsDraggingAvatar(false)}
                onMouseLeave={() => setIsDraggingAvatar(false)}
                onTouchStart={(e) => {
                  if (!activeDisplayAvatar) return;
                  if (e.touches.length === 1) {
                    setIsDraggingAvatar(true);
                    setAvatarDragStart({
                      x: e.touches[0].clientX - avatarOffsetX,
                      y: e.touches[0].clientY - avatarOffsetY,
                    });
                  }
                }}
                onTouchMove={(e) => {
                  if (!isDraggingAvatar || !activeDisplayAvatar || e.touches.length !== 1) return;
                  const limit = Math.max(70, 60 * avatarScale);
                  setAvatarOffsetX(Math.max(-limit, Math.min(limit, e.touches[0].clientX - avatarDragStart.x)));
                  setAvatarOffsetY(Math.max(-limit, Math.min(limit, e.touches[0].clientY - avatarDragStart.y)));
                }}
                onTouchEnd={() => setIsDraggingAvatar(false)}
              >
                {activeDisplayAvatar ? (
                  <img
                    src={activeDisplayAvatar}
                    alt={fullName || "Admin"}
                    style={{
                      transform: `scale(${avatarScale}) translate(${avatarOffsetX}px, ${avatarOffsetY}px)`,
                      transition: isDraggingAvatar ? "none" : "transform 0.05s ease-out",
                    }}
                    className="w-full h-full aspect-square object-cover pointer-events-none select-none block"
                  />
                ) : (
                  <InitialsAvatar
                    name={fullName || "Administrator"}
                    sizeClass="w-full h-full"
                    textSizeClass="text-4xl"
                  />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-display text-[var(--text-muted)]">
                <span className="material-symbols-outlined text-[14px]">pan_tool</span>
                <span>{activeDisplayAvatar ? "Drag inside circle to reposition image" : "Upload an avatar to adjust crop/zoom"}</span>
              </div>

              {/* Zoom Controls */}
              <div className="w-full max-w-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-display text-[var(--text-muted)]">
                  <span>Zoom Level</span>
                  <span className="font-mono text-[11px] text-[#d4af37] font-bold">
                    {Math.round(avatarScale * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAvatarScale((s) => Math.max(0.5, Number((s - 0.1).toFixed(2))))}
                    className="p-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141416] text-[var(--text-main)] cursor-pointer"
                    title="Zoom Out"
                  >
                    <span className="material-symbols-outlined text-[16px]">zoom_out</span>
                  </button>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={avatarScale}
                    onChange={(e) => setAvatarScale(parseFloat(e.target.value))}
                    className="flex-1 accent-[#d4af37] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setAvatarScale((s) => Math.min(2.5, Number((s + 0.1).toFixed(2))))}
                    className="p-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141416] text-[var(--text-main)] cursor-pointer"
                    title="Zoom In"
                  >
                    <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Actions (Upload, Replace, Reset, Save, Remove) */}
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />

              <div className="space-y-1">
                <span className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                  Select Image File
                </span>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  Choose a picture from your device or photo gallery (PNG, JPG, or WEBP up to 2MB).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-main)] inline-flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#d4af37]">photo_library</span>
                  <span>{activeDisplayAvatar ? "Replace Picture" : "Choose Picture"}</span>
                </button>

                {Boolean(avatar || pendingAvatar) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarScale(1);
                      setAvatarOffsetX(0);
                      setAvatarOffsetY(0);
                    }}
                    className="px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">filter_center_focus</span>
                    <span>Center & Reset</span>
                  </button>
                )}

                {Boolean(avatar || pendingAvatar) && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Remove Picture
                  </button>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--surface-border)] flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveAvatar}
                  disabled={avatarSaving || (!pendingAvatar && avatarScale === 1)}
                  className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-50 text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
                >
                  {avatarSaving ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  )}
                  <span>{avatarSaving ? "Saving..." : "Save Changes"}</span>
                </button>

                {(pendingAvatar || avatarScale !== 1) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingAvatar(null);
                      setAvatarScale(1);
                      setAvatarOffsetX(0);
                      setAvatarOffsetY(0);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: PERSONAL INFORMATION */}
        <section className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-4">
            <div className="space-y-0.5">
              <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
                Personal Information
              </h2>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                Real account credentials loaded directly from Supabase Authentication.
              </p>
            </div>
            {!isEditingProfile && (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="px-3.5 py-1.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-main)] cursor-pointer inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-[#d4af37]">edit</span>
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfileInfo} className="space-y-4 max-w-lg">
              <div className="space-y-1">
                <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                  placeholder="Enter full name..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                  placeholder="e.g. +92 300 1234567"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-50 text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  {profileSaving && (
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  )}
                  <span>Save Info</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setEditName(fullName);
                    setEditPhone(phone);
                  }}
                  className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]/40 border border-[var(--surface-border)] space-y-1">
                <span className="text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Full Name
                </span>
                <p className="font-display text-sm font-bold text-[var(--text-main)]">
                  {fullName || "—"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]/40 border border-[var(--surface-border)] space-y-1">
                <span className="text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Email Address
                </span>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs text-[var(--text-main)] truncate">
                    {email || "—"}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider ${
                    isVerified
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  }`}>
                    {isVerified ? "Verified" : "Unverified"}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]/40 border border-[var(--surface-border)] space-y-1">
                <span className="text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Phone Number
                </span>
                <p className="font-display text-sm text-[var(--text-main)]">
                  {phone || "—"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]/40 border border-[var(--surface-border)] space-y-1">
                <span className="text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  System Role
                </span>
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">
                    {role || "ADMIN"}
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] text-[10px] font-display font-bold uppercase tracking-wider">
                    Administrator
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3: CHANGE EMAIL */}
        <section className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-[var(--surface-border)] pb-4 space-y-0.5">
            <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
              Change Email
            </h2>
            <p className="font-serif text-xs text-[var(--text-muted)]">
              Update your account email address. Supabase will send a verification confirmation link before applying the change.
            </p>
          </div>

          {emailFeedback && (
            <div
              className={`p-4 rounded-xl border text-xs font-serif ${
                emailFeedback.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
              }`}
            >
              {emailFeedback.text}
            </div>
          )}

          <form onSubmit={handleChangeEmail} className="space-y-4 max-w-lg">
            <div className="space-y-1">
              <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Current Email
              </label>
              <input
                type="text"
                disabled
                value={email}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-black/5 dark:bg-white/5 text-xs text-[var(--text-muted)] font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                New Email Address *
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g., new.admin@speakup.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-50 text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              {emailLoading && (
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>Send Verification Email</span>
            </button>
          </form>
        </section>

        {/* SECTION 4: CHANGE PASSWORD */}
        <section className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-[var(--surface-border)] pb-4 space-y-0.5">
            <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
              Change Password
            </h2>
            <p className="font-serif text-xs text-[var(--text-muted)]">
              Keep your credentials secure. Passwords are never retrievable or displayed in plaintext.
            </p>
          </div>

          {passwordFeedback && (
            <div
              className={`p-4 rounded-xl border text-xs font-serif ${
                passwordFeedback.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
              }`}
            >
              {passwordFeedback.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
            <div className="space-y-1">
              <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                New Password (min. 8 characters) *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Enter new password..."
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showNewPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password..."
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showConfirmPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-50 text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              {passwordLoading && (
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
              )}
              <span>Update Password</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
