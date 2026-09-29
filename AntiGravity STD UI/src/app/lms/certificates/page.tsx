"use client";

import React, { useState } from "react";
import Link from "next/link";
import LmsProfileDropdown from "@/components/LmsProfileDropdown";

export default function CertificatesPage() {
  const [selectedCert, setSelectedCert] = useState<string | null>(null);

  const certificates = [
    {
      id: "grammar-a1",
      title: "English Grammar Mastery — A1",
      code: "SPK-ENG-A1-2026",
      status: "In Progress (35%)",
      isLocked: true,
      description:
        "Official SpeakUp Academic Certificate verifying CEFR A1 syntax, sentence architecture, and phonetics cadence.",
      unlockCondition: "Complete all 4 modules and practical oral defense seminar to unlock.",
    },
    {
      id: "speak-30",
      title: "Speak in 30 Days — Fluency & Cadence",
      code: "SPK-FL-30-2026",
      status: "Upcoming Cohort",
      isLocked: true,
      description:
        "Executive vocal articulation and verbal spontaneity certificate for business meetings and defenses.",
      unlockCondition: "Available upon cohort enrollment and graduation assessment.",
    },
  ];

  return (
    <div className="max-w-[1300px] mx-auto space-y-8 py-4">
      {/* Top Header Section with Title on Left and Profile Picture alongside Mudassir Ali on Right */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 pt-2 border-b border-[var(--surface-border)]">
        <div className="space-y-1">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
            Academic Certificates
          </h1>
          <p className="font-serif text-base sm:text-lg text-[var(--text-muted)]">
            Verified institutional certifications, completion milestones, and graduation credentials.
          </p>
        </div>

        {/* Top-Right Profile Display: Circular Profile Picture matching Dashboard */}
        <div className="shrink-0 self-start sm:self-center">
          <LmsProfileDropdown />
        </div>
      </section>

      {/* Certificates Cards Grid (Adapts to both Light and Dark Themes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className="rounded-2xl bg-white dark:bg-[#141418]/60 border border-[var(--surface-border)] hover:border-[#d4af37]/60 p-6 sm:p-8 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between space-y-6 group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[26px]">workspace_premium</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display uppercase tracking-wider font-bold bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-[var(--text-muted)] border border-[var(--surface-border)]">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  <span>{cert.status}</span>
                </span>
              </div>

              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-semibold">
                  {cert.code}
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors leading-snug mt-1">
                  {cert.title}
                </h2>
              </div>

              <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                {cert.description}
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--surface-border)] space-y-3">
              <div className="p-3.5 rounded-xl bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#d4af37] shrink-0 mt-0.5">info</span>
                <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                  {cert.unlockCondition}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCert(cert.title)}
                className="w-full py-3 px-4 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white hover:bg-[#f9f5ed] dark:bg-[var(--surface-lowest)] dark:hover:bg-[var(--surface-low)] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>View Criteria</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Criteria Info Modal */}
      {selectedCert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cert-criteria-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedCert(null)}
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
                  <h3 id="cert-criteria-title" className="font-display text-base font-bold text-[var(--text-main)] leading-tight tracking-tight">
                    Certification Policy
                  </h3>
                  <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                    SpeakUp Academic Credentials
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                aria-label="Close modal"
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-[var(--surface-low)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="bg-[#f9f5ed]/80 dark:bg-[var(--surface-low)]/70 border border-[var(--surface-border)] rounded-xl p-4.5 mb-5 shadow-inner">
              <p className="font-serif text-[13.5px] sm:text-[14px] text-[var(--text-main)] leading-relaxed">
                Your certificate for <strong className="text-[#8a6d1b] dark:text-[#d4af37] font-semibold">{selectedCert}</strong> will be unlocked upon reaching 100% course completion and completing your mentor-evaluated capstone articulation drill. Once unlocked, verified digital credentials will be sent to your registered email and WhatsApp.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
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
