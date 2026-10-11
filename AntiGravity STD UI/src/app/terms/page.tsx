"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useCmsContent } from "@/lib/cms/useCmsContent";
import { getCentralTermsAction, type CentralTermItem } from "@/app/admin/terms-actions";

export default function TermsAndConditionsPage() {
  const cms = useCmsContent("terms");
  const [terms, setTerms] = useState<CentralTermItem[]>([]);

  useEffect(() => {
    getCentralTermsAction().then((res) => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setTerms(res.data);
      }
    });
  }, []);

  const fallbackTerms: CentralTermItem[] = [
    {
      id: "term-1",
      number: 1,
      title: cms.terms_list?.term1Title || "Individual Student License & Credentials",
      content:
        cms.terms_list?.term1Text ||
        "Course access is strictly individual and non-transferable. Sharing credentials, lecture recordings, or course notes with third parties violates institutional policy and results in immediate access revocation without refund.",
    },
    {
      id: "term-2",
      number: 2,
      title: cms.terms_list?.term2Title || "Verification & Course Unlocking",
      content:
        cms.terms_list?.term2Text ||
        "Email verification confirms your student account. Course material unlocking is executed individually by academic administration upon receipt verification, ensuring structured progress control.",
    },
    {
      id: "term-3",
      number: 3,
      title: cms.terms_list?.term3Title || "Certification Standards",
      content:
        cms.terms_list?.term3Text ||
        "Official certificates of completion are issued only when a student achieves a minimum 80% completion metric on course modules and completes the practical capstone assignment or oral defense seminar.",
    },
    {
      id: "term-4",
      number: 4,
      title: cms.terms_list?.term4Title || "Refund Policy",
      content:
        cms.terms_list?.term4Text ||
        "Due to the proprietary nature of our curated PDFs and recorded masterclasses, enrollment fees are non-refundable once portal credentials and curriculum materials have been accessed.",
    },
  ];

  const displayedTerms = terms.length > 0 ? terms : fallbackTerms;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1 py-12 md:py-20">
        <div className="max-w-[1000px] mx-auto px-6 md:px-12 space-y-12">
          {/* Header Badge */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)]">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-[0.08em] text-[var(--text-main)]">
                {cms.header?.pageHeading || "Course Terms & Conditions"}
              </h1>
            </div>

            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#d4af37]/60" />
              <span className="font-display text-xs uppercase tracking-[0.2em] text-[#d4af37] font-bold">
                {cms.header?.badgeText || "Institutional Agreement"}
              </span>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#d4af37]/60" />
            </div>

            <p className="font-serif text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
              {cms.header?.subheading || "Institutional guidelines, academic access policies, and student governance regulations."}
            </p>
          </div>

          {/* Terms Content Box */}
          <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-6 sm:p-10 shadow-xs space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {displayedTerms.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl p-5 sm:p-6 space-y-2"
                >
                  <h2 className="font-display text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                    <span className="text-[#d4af37] font-bold">
                      {String(idx + 1).padStart(2, "0")}.
                    </span>
                    <span>{item.title}</span>
                  </h2>
                  <p className="font-serif text-[13px] sm:text-[14px] text-[var(--text-muted)] leading-relaxed">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom Governance and Action Bar */}
            <div className="pt-6 border-t border-[var(--surface-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-display text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                {cms.governance?.governanceCode || "Governance Code: SPK-TRM-2026"}
              </span>
              <div className="flex items-center gap-3">
                <Link
                  href="/pricing?tab=terms"
                  className="px-5 py-2.5 rounded-full border border-[var(--surface-border)] hover:border-[#d4af37] text-xs font-display uppercase tracking-wider font-bold transition-all"
                >
                  View in Tuition Schedule
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all font-display text-xs uppercase tracking-widest font-bold px-7 py-2.5 rounded-full shadow-xs"
                >
                  {cms.governance?.registerButtonText || "Register"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
