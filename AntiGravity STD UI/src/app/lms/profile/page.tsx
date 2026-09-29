"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ProfilePictureModal from "../ProfilePictureModal";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80";

interface EnrolledCourseItem {
  id: string;
  title: string;
  status: string;
}

export default function ProfilePage() {
  const [profilePic, setProfilePic] = useState<string>(DEFAULT_AVATAR);
  const [editPicModalOpen, setEditPicModalOpen] = useState(false);
  const [selectedImageForAdjustment, setSelectedImageForAdjustment] = useState<string | null>(null);

  // Dynamic student information
  const [studentName, setStudentName] = useState("Mudassir Ali");
  const [studentEmail, setStudentEmail] = useState("mudassir.ali@gmail.com");
  const [studentPhone, setStudentPhone] = useState("+92 300 1234567");

  // Dynamic active courses from enrollment data
  const [activeCourses, setActiveCourses] = useState<EnrolledCourseItem[]>([
    { id: "grammar-a1", title: "English Grammar Mastery — A1", status: "Active" },
    { id: "speak-30", title: "Speak in 30 Days — Fluency & Cadence", status: "Active" },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedPic = localStorage.getItem("speakup_profile_pic");
    if (savedPic) setProfilePic(savedPic);

    const savedName = localStorage.getItem("speakup_student_name");
    if (savedName) setStudentName(savedName);

    const savedEmail = localStorage.getItem("speakup_student_email");
    if (savedEmail) {
      setStudentEmail(savedEmail);
    } else {
      localStorage.setItem("speakup_student_email", "mudassir.ali@gmail.com");
    }

    const savedPhone = localStorage.getItem("speakup_student_phone");
    if (savedPhone) setStudentPhone(savedPhone);

    const savedCourses = localStorage.getItem("speakup_enrolled_courses");
    if (savedCourses) {
      try {
        const parsed = JSON.parse(savedCourses);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveCourses(parsed);
        }
      } catch (err) {
        console.error("Failed to parse enrolled courses", err);
      }
    }

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedImageForAdjustment(event.target.result as string);
          setEditPicModalOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleSaveProfilePic = (newPic: string) => {
    setProfilePic(newPic);
    localStorage.setItem("speakup_profile_pic", newPic);
    window.dispatchEvent(new Event("speakup_profile_pic_updated"));
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
          {/* Photo and Identity (Repositioned Change Photo button naturally centered and aligned) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-[var(--surface-border)]/50">
            {/* Hidden file input for Change Photo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              {/* Profile Photo Display with interactive hover */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[#d4af37] p-1 bg-white dark:bg-[var(--surface-lowest)] relative shadow-md cursor-pointer hover:ring-3 hover:ring-[#d4af37]/30 transition-all group shrink-0"
                title="Click to change profile picture"
              >
                <div
                  className="w-full h-full rounded-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{
                    backgroundImage: `url('${profilePic}')`,
                  }}
                />
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-full text-white">
                  <span className="material-symbols-outlined text-[22px]">photo_camera</span>
                  <span className="font-display text-[9px] uppercase font-bold mt-0.5">Change</span>
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="font-display text-2xl font-bold text-[var(--text-main)] leading-tight">
                  {studentName}
                </h2>
                <p className="font-serif text-sm text-[var(--text-muted)]">
                  Registered Student
                </p>
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-display font-semibold pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Active Account Status</span>
                </div>
              </div>
            </div>

            {/* Change Photo Button: Naturally aligned with profile picture */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 cursor-pointer font-display text-xs uppercase tracking-wider text-[var(--text-main)] hover:text-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] px-5 py-2.5 rounded-xl transition-all bg-white hover:bg-[#d4af37] dark:bg-[var(--surface-low)] dark:hover:bg-[#d4af37] shadow-xs font-bold shrink-0 self-center"
            >
              <span className="material-symbols-outlined text-[18px] text-[#d4af37]">photo_camera</span>
              <span>Change Photo</span>
            </button>
          </div>

          {/* Refined Read-Only Account & Enrollment Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-display text-xs uppercase tracking-[0.14em] text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                Account &amp; Enrollment Credentials
              </h3>
              <span className="text-[11px] font-display font-semibold text-[var(--text-muted)] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Verified Records</span>
              </span>
            </div>

            {/* Prominent Student Name Card */}
            <div className="rounded-xl p-5 bg-[#fbf9f4] dark:bg-[var(--surface-low)]/70 border border-[#d4af37]/35 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="font-display text-[10px] uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-bold block">
                  Student Name
                </span>
                <span className="font-display font-extrabold text-xl sm:text-2xl text-[var(--text-main)] tracking-tight block">
                  {studentName}
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
                  {studentEmail}
                </p>
              </div>

              <div className="rounded-xl p-4.5 bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]/40 border border-[var(--surface-border)]/80 space-y-1">
                <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                  Phone Number
                </span>
                <p className="font-sans text-sm sm:text-[15px] text-[var(--text-main)] font-medium">
                  {studentPhone}
                </p>
              </div>
            </div>

            {/* Active Enrolled Courses */}
            <div className="rounded-xl p-4.5 bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]/40 border border-[var(--surface-border)]/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                  Active Courses
                </span>
                <span className="text-xs text-[var(--text-muted)] font-sans">
                  {activeCourses.length} active cohort{activeCourses.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-2">
                {activeCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-[var(--surface-lowest)] border border-[var(--surface-border)]/70"
                  >
                    <span className="font-display font-bold text-sm sm:text-[15px] text-[var(--text-main)]">
                      {course.title}
                    </span>
                    <span className="text-[11px] font-display uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                      • Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Status Indicator */}
            <div className="rounded-xl p-3.5 bg-[#f9f5ed]/40 dark:bg-[var(--surface-low)]/30 border border-[var(--surface-border)]/60 flex items-center justify-between">
              <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Account Status
              </span>
              <div className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Active &amp; Verified</span>
              </div>
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
