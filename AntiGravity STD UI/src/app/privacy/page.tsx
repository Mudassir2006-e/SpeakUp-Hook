"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  getCentralPrivacyAction,
  CentralPrivacyItem,
} from "@/app/admin/privacy-actions";
import { getPublishedSocialLinksAction } from "@/app/admin/links-actions";

const FALLBACK_SECTIONS: CentralPrivacyItem[] = [
  {
    id: "priv-1",
    number: 1,
    title: "Certification Integrity & Public Registry",
    content:
      "Upon successful completion of course requirements, certificates are assigned a permanent serial code. Third-party employers may only verify certificate authenticity and completion date via our registry.",
  },
  {
    id: "priv-2",
    number: 2,
    title: "Governance Inquiries & Account Deletion",
    content:
      "Students maintain the right to review registered personal information or request data archiving upon course completion by contacting our academic administration desk at admissions@speakup.com.",
  },
];

export default function PrivacyPage() {
  const [whatsAppNumber, setWhatsAppNumber] = useState("+92 300 0000000");
  const [sections, setSections] = useState<CentralPrivacyItem[]>(FALLBACK_SECTIONS);

  useEffect(() => {
    async function loadData() {
      try {
        const [socialRes, privRes] = await Promise.all([
          getPublishedSocialLinksAction(),
          getCentralPrivacyAction(),
        ]);
        if (socialRes.success && socialRes.data?.whatsappNumber) {
          setWhatsAppNumber(socialRes.data.whatsappNumber);
        }
        if (privRes.success && Array.isArray(privRes.data) && privRes.data.length > 0) {
          setSections(privRes.data);
        }
      } catch {
        // Fallback gracefully to default sections
      }
    }
    loadData();
  }, []);

  const cleanPhone = whatsAppNumber.replace(/[^0-9]/g, "");
  const whatsAppComplianceUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hello SpeakUp Administration, I am inquiring regarding privacy, policy governance, or student compliance.")}`
    : "https://wa.me";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1 py-12 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          {/* Header Section */}
          <section className="text-center max-w-3xl mx-auto mb-16">
            {/* Main Heading enclosed in stylish rectangular rounded box */}
            <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)] mb-5">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-[0.08em] text-[var(--text-main)]">
                Privacy Policy
              </h1>
            </div>

            {/* Supporting Heading */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
              <span className="h-px w-6 sm:w-12 bg-gradient-to-r from-transparent to-[#d4af37]/60" />
              <h2 className="font-display text-base sm:text-lg md:text-xl font-semibold tracking-wide text-[#d4af37]">
                Institutional Protocols &amp; Student Compliance
              </h2>
              <span className="h-px w-6 sm:w-12 bg-gradient-to-l from-transparent to-[#d4af37]/60" />
            </div>

            <p className="font-serif text-base sm:text-lg text-[var(--text-muted)] leading-relaxed mb-8 max-w-2xl mx-auto">
              SpeakUp respects your privacy and is committed to protecting the information you provide while using our learning platform. Official institutional governance, platform usage standards, and student compliance protocols.
            </p>

            {/* Governance Metadata Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-serif text-[var(--text-muted)]">
              <div className="flex items-center gap-2 bg-[var(--surface-lowest)] px-4 py-2 rounded-lg border border-[var(--surface-border)] shadow-xs">
                <span className="material-symbols-outlined text-[#d4af37] text-[18px]">calendar_month</span>
                <span className="text-[var(--text-main)] font-semibold">Effective Academic Terms</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--surface-lowest)] px-4 py-2 rounded-lg border border-[var(--surface-border)] shadow-xs">
                <span className="material-symbols-outlined text-[#d4af37] text-[18px]">verified_user</span>
                <span className="text-[var(--text-main)] font-semibold">SpeakUp Policy Standards</span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--surface-lowest)] px-4 py-2 rounded-lg border border-[var(--surface-border)] shadow-xs">
                <span className="material-symbols-outlined text-[#d4af37] text-[18px]">shield</span>
                <span>Class Instruction Protocols</span>
              </div>
            </div>
          </section>

          {/* Dynamic Policy Sections Bento Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {sections.map((item) => (
              <div
                key={item.id || item.number}
                className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-8 shadow-xs hover:-translate-y-1 hover:border-[#d4af37]/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-6">
                    <span className="w-10 h-10 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--text-main)] font-display font-bold text-sm">
                      {String(item.number).padStart(2, "0")}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[var(--surface-low)] border border-[var(--surface-border)] font-display text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                      Section {item.number}
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-[var(--text-main)] mb-3">
                    {item.title}
                  </h3>

                  <p className="font-serif text-[14px] text-[var(--text-muted)] leading-relaxed whitespace-pre-line">
                    {item.content}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[var(--surface-border)]/50 flex items-center gap-2 text-xs font-display text-[#d4af37] font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]"></span>
                  <span>Compliance Mandatory</span>
                </div>
              </div>
            ))}
          </section>

          {/* Contact Compliance Desk */}
          <div className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-2xl p-8 md:p-10 text-center max-w-2xl mx-auto shadow-xs">
            <h3 className="font-display text-xl font-bold text-[var(--text-main)] mb-2">
              Questions regarding Privacy &amp; Policies?
            </h3>
            <p className="font-serif text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
              If you have any questions or require clarification regarding data governance, student compliance, or platform policies, contact the SpeakUp administration team on WhatsApp.
            </p>
            <a
              href={whatsAppComplianceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white font-display text-xs uppercase tracking-widest font-bold px-8 py-3.5 rounded-full transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span>Ask Our Team on WhatsApp</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
