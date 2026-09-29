"use client";

import React, { useState, useEffect } from "react";
import LmsProfileDropdown from "@/components/LmsProfileDropdown";

export default function DashboardPage() {
  const [studentName, setStudentName] = useState("Mudassir Ali");
  const [studentEmail, setStudentEmail] = useState("mudassir.ali@gmail.com");

  const [accessModalCourse, setAccessModalCourse] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("speakup_student_name");
    if (savedName) setStudentName(savedName);

    const savedEmail = localStorage.getItem("speakup_student_email");
    if (savedEmail) setStudentEmail(savedEmail);

    const handleNameUpdate = () => {
      const updated = localStorage.getItem("speakup_student_name");
      if (updated) setStudentName(updated);
    };

    const handleEmailUpdate = () => {
      const updatedEmail = localStorage.getItem("speakup_student_email");
      if (updatedEmail) setStudentEmail(updatedEmail);
    };

    window.addEventListener("speakup_student_name_updated", handleNameUpdate);
    window.addEventListener("speakup_student_email_updated", handleEmailUpdate);

    return () => {
      window.removeEventListener("speakup_student_name_updated", handleNameUpdate);
      window.removeEventListener("speakup_student_email_updated", handleEmailUpdate);
    };
  }, []);

  const openAccessModal = (courseName: string) => {
    setAccessModalCourse(courseName);
    setModalSuccess(false);
    setModalLoading(false);
  };

  const handleRequestSubmit = () => {
    setModalLoading(true);
    setTimeout(() => {
      setModalLoading(false);
      setModalSuccess(true);
    }, 600);
  };

  return (
    <div className="max-w-[1240px] mx-auto space-y-8 py-4">
      {/* ================= 1. REFINED TOP WELCOME AREA ================= */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[var(--surface-border)]">
        {/* Left Side: Prominent Welcome Heading & Subheading */}
        <div className="space-y-1.5">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
            Welcome back, {studentName}
          </h1>
          <p className="font-serif text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
            Continue your active course and pick up where you left off.
          </p>
        </div>

        {/* Right Side: ONLY the Profile Picture (No student name beside it on Dashboard) */}
        <div className="shrink-0 self-start sm:self-center">
          <LmsProfileDropdown variant="dashboard" />
        </div>
      </section>

      {/* ================= 2. REFINED THREE MAIN HORIZONTALLY RECTANGULAR CARDS ================= */}
      <section className="space-y-5 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Rounded rectangular panel heading treatment */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/40 rounded-xl shadow-2xs self-start">
            <span className="material-symbols-outlined text-[17px] text-[#d4af37]">calendar_month</span>
            <span className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
              Available &amp; Upcoming Courses
            </span>
          </div>
          <span className="font-serif text-xs text-[var(--text-muted)]">
            Available courses accept administrative unlock requests
          </span>
        </div>

        {/* Horizontally Rectangular Layout: Spatially balanced, wide proportions with ample breathing room */}
        {/* Long Rounded Rectangular Course Cards */}
        <div className="space-y-4">
          {/* Card 1: Speak in 30 Days — Fluency (Available Course) */}
          <div className="rounded-2xl bg-white dark:bg-[#151518]/90 border border-[var(--surface-border)] hover:border-[#d4af37]/50 p-6 sm:p-7 md:p-8 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                  Accelerated Cohort
                </span>
                <span className="text-[var(--text-muted)]/30">•</span>
                <span className="inline-flex items-center gap-1.5 font-display text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Available Course
                </span>
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors leading-snug tracking-tight">
                Speak in 30 Days — Fluency
              </h2>
              <p className="font-serif text-[13.5px] sm:text-sm text-[var(--text-muted)] leading-relaxed">
                Intensive verbal articulation, idiomatic reflexes, and cadence training designed for high-stakes speaking environments.
              </p>
            </div>

            <div className="shrink-0 flex items-center md:self-center">
              <button
                type="button"
                onClick={() => openAccessModal("Speak in 30 Days — Fluency & Cadence")}
                className="w-full md:w-auto px-6 py-3 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[#f9f5ed] hover:bg-[#d4af37] dark:bg-[var(--surface-low)] dark:hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <span>Request Access</span>
                <span className="material-symbols-outlined text-[16px]">lock_open</span>
              </button>
            </div>
          </div>

          {/* Card 2: Strategic Negotiation & Persuasion (Executive Course) */}
          <div className="rounded-2xl bg-white dark:bg-[#151518]/90 border border-[var(--surface-border)] hover:border-[#d4af37]/50 p-6 sm:p-7 md:p-8 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                  Executive Series
                </span>
                <span className="text-[var(--text-muted)]/30">•</span>
                <span className="inline-flex items-center gap-1.5 font-display text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Available Course
                </span>
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors leading-snug tracking-tight">
                Strategic Negotiation &amp; Persuasion
              </h2>
              <p className="font-serif text-[13.5px] sm:text-sm text-[var(--text-muted)] leading-relaxed">
                Advanced cross-cultural persuasion rhetoric, executive pushback defense, and high-pressure concession language.
              </p>
            </div>

            <div className="shrink-0 flex items-center md:self-center">
              <button
                type="button"
                onClick={() => openAccessModal("Strategic Negotiation & Persuasion")}
                className="w-full md:w-auto px-6 py-3 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[#f9f5ed] hover:bg-[#d4af37] dark:bg-[var(--surface-low)] dark:hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <span>Request Access</span>
                <span className="material-symbols-outlined text-[16px]">lock_open</span>
              </button>
            </div>
          </div>

          {/* Card 3: German Language Mastery — A1 (CFAP A1 Pathway / Upcoming Course) */}
          <div className="rounded-2xl bg-white/80 dark:bg-[#141417]/80 border border-[var(--surface-border)]/80 p-6 sm:p-7 md:p-8 shadow-2xs transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                  CFAP A1 Pathway
                </span>
                <span className="text-[var(--text-muted)]/30">•</span>
                <span className="inline-flex items-center gap-1.5 font-display text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] bg-[var(--surface-low)] px-2.5 py-0.5 rounded-full border border-[var(--surface-border)]">
                  <span className="material-symbols-outlined text-[13px] text-[var(--text-muted)]">schedule</span>
                  Upcoming Course
                </span>
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)] leading-snug tracking-tight">
                German Language Mastery — A1
              </h2>
              <p className="font-serif text-[13.5px] sm:text-sm text-[var(--text-muted)] leading-relaxed">
                Foundational German grammar, phonetics, and conversational articulation structured for academic and Goethe certification.
              </p>
            </div>

            <div className="shrink-0 flex items-center md:self-center">
              <span className="w-full md:w-auto px-5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed]/80 dark:bg-[var(--surface-low)]/60 text-[var(--text-muted)] font-display text-xs uppercase tracking-wider font-semibold inline-flex items-center justify-center gap-2 select-none">
                <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)]">hourglass_top</span>
                <span>Upcoming • Not Available</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= REQUEST ACCESS MODAL ================= */}
      {accessModalCourse && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setAccessModalCourse(null)}
        >
          <div
            className="bg-white dark:bg-[#16161c] border border-[var(--surface-border)] dark:border-[#d4af37]/30 rounded-2xl max-w-lg w-full p-8 shadow-2xl relative overflow-hidden space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {!modalSuccess ? (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-[var(--surface-border)]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#d4af37]">lock_open</span>
                    <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                      Request Course Access
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccessModalCourse(null)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                      Course Selected
                    </span>
                    <div className="p-3.5 bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl font-display font-bold text-sm text-[var(--text-main)]">
                      {accessModalCourse}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                        Student Name
                      </span>
                      <div className="p-3 bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl font-serif text-sm text-[var(--text-main)]">
                        {studentName}
                      </div>
                    </div>
                    <div>
                      <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                        Email Address
                      </span>
                      <div className="p-3 bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl font-serif text-sm text-[var(--text-main)] truncate">
                        {studentEmail}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#d4af37] text-[20px] shrink-0 mt-0.5">info</span>
                    <p className="font-serif text-xs text-[var(--text-main)] leading-relaxed">
                      Requests are verified within a few hours upon receipt confirmation. For expedited verification, you can also reach our admissions desk.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAccessModalCourse(null)}
                    className="flex-1 py-3 rounded-xl border border-[var(--surface-border)] font-display text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={modalLoading}
                    onClick={handleRequestSubmit}
                    className="flex-1 py-3 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {modalLoading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Request</span>
                        <span className="material-symbols-outlined text-[16px]">send</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Success Confirmation */
              <div className="text-center py-6 space-y-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
                <h4 className="font-display text-xl font-bold text-[var(--text-main)]">
                  Request Submitted Successfully!
                </h4>
                <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                  Our academic admissions team has received your access application for <strong className="text-[var(--text-main)]">{accessModalCourse}</strong> and will unlock your access shortly.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setAccessModalCourse(null)}
                    className="px-8 py-3 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-widest font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
