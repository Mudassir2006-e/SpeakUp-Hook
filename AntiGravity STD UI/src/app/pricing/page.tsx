"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function PricingPage() {
  const [isPkr, setIsPkr] = useState<boolean>(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("advanced-strategic");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("courses");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (hash.includes("terms") || search.includes("tab=terms")) {
        setActiveSection("terms");
        setTimeout(() => {
          const el = document.getElementById("course-terms") || document.getElementById("terms-conditions");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 150);
      } else if (hash.includes("bank") || search.includes("tab=bank")) {
        setActiveSection("bank");
        setTimeout(() => {
          const el = document.getElementById("bank-details") || document.getElementById("bank");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 150);
      } else if (hash.includes("courses") || hash.includes("fees") || hash.includes("pricing")) {
        setActiveSection("courses");
        setTimeout(() => {
          const el = document.getElementById("courses");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    }
  }, []);

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const scrollTo = (id: string, sectionKey: string) => {
    setActiveSection(sectionKey);
    if (typeof window !== "undefined") {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  const pricingCourses = [
    {
      id: "executive-series",
      title: "English Grammar Mastery — A1",
      usd: 15,
      pkr: 4200,
      description: "Foundational mastery of grammatical syntax, sentence mechanics, and structured expression.",
      features: [
        "Complete 4-Module video masterclasses",
        "Curated lecture study notes PDF",
        "Interactive sentence structure drills",
        "Course completion certificate",
      ],
    },
    {
      id: "advanced-strategic",
      title: "Speak in 30 Days — Accelerated Fluency",
      usd: 25,
      pkr: 7000,
      featured: true,
      description: "Fast-track verbal articulation, rhythm cadence, and confident executive conversational rhetoric.",
      features: [
        "Intensive verbal articulation curriculum",
        "Cadence anchor & pause training",
        "Colloquial & executive idiom breakdowns",
        "Oral assessment feedback with mentor",
        "Verified credential with unique ID",
      ],
    },
    {
      id: "professional-mastery",
      title: "Strategic Negotiation & Executive Rhetoric",
      usd: 40,
      pkr: 11000,
      description: "High-stakes communication, persuasive argument structures, and commanding boardroom authority.",
      features: [
        "Boardroom conflict & persuasion strategies",
        "Cross-border executive discourse",
        "Countering objections & pressure tactics",
        "Live cohort defense session invitation",
        "Direct email advisory with Sir Mudassir",
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1 py-12 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          
          {/* ================= PAGE HEADER ================= */}
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
            <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)] mb-4">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-[0.08em] text-[var(--text-main)]">
                Pricing &amp; Enrollment
              </h1>
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3">
              <span className="h-px w-6 sm:w-12 bg-gradient-to-r from-transparent to-[#d4af37]/60" />
              <h2 className="font-display text-base sm:text-lg md:text-xl font-semibold tracking-wide text-[#d4af37]">
                Available Courses, Bank Details &amp; Institutional Terms
              </h2>
              <span className="h-px w-6 sm:w-12 bg-gradient-to-l from-transparent to-[#d4af37]/60" />
            </div>

            <p className="font-serif text-base sm:text-lg text-[var(--text-muted)] leading-relaxed max-w-2xl mx-auto">
              Transparent program tuition, verified banking channels, and institutional enrollment governance.
            </p>
          </div>

          {/* ================= SECTION NAVIGATION BAR ================= */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
            <button
              type="button"
              onClick={() => scrollTo("courses", "courses")}
              className={`px-6 py-3 rounded-full font-display text-xs sm:text-sm uppercase tracking-wider font-bold transition-all duration-200 cursor-pointer ${
                activeSection === "courses"
                  ? "bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] shadow-xs"
                  : "bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#d4af37]/40"
              }`}
            >
              Available Courses
            </button>
            <button
              type="button"
              onClick={() => scrollTo("bank-details", "bank")}
              className={`px-6 py-3 rounded-full font-display text-xs sm:text-sm uppercase tracking-wider font-bold transition-all duration-200 cursor-pointer ${
                activeSection === "bank"
                  ? "bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] shadow-xs"
                  : "bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#d4af37]/40"
              }`}
            >
              Bank Details
            </button>
            <button
              type="button"
              onClick={() => scrollTo("course-terms", "terms")}
              className={`px-6 py-3 rounded-full font-display text-xs sm:text-sm uppercase tracking-wider font-bold transition-all duration-200 cursor-pointer ${
                activeSection === "terms"
                  ? "bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] shadow-xs"
                  : "bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#d4af37]/40"
              }`}
            >
              Course Terms &amp; Conditions
            </button>
          </div>

          {/* ================= SECTION 1: AVAILABLE COURSES & PRICING ================= */}
          <section id="courses" className="mb-20 scroll-mt-28">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-[var(--surface-border)]">
              <div>
                <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37] block mb-2">
                  Tuition &amp; Curricula
                </span>
                <div className="inline-flex items-center px-6 py-2.5 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-xl shadow-xs">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                    Available Courses
                  </h2>
                </div>
              </div>

              {/* Currency Toggle */}
              <div className="flex items-center gap-3 bg-[var(--surface-low)] py-2 px-4 rounded-full border border-[var(--surface-border)] shrink-0 self-start sm:self-auto">
                <span className={`font-display text-xs font-bold uppercase tracking-wider ${!isPkr ? "text-[#d4af37]" : "text-[var(--text-muted)]"}`}>
                  USD ($)
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPkr}
                    onChange={(e) => setIsPkr(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-[var(--surface-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2.5px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#d4af37]"></div>
                </label>
                <span className={`font-display text-xs font-bold uppercase tracking-wider ${isPkr ? "text-[#d4af37]" : "text-[var(--text-muted)]"}`}>
                  PKR (Rs)
                </span>
              </div>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              {pricingCourses.map((c) => {
                const isSelected = selectedCourseId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCourseId(c.id)}
                    className={`bg-[var(--surface-lowest)] rounded-2xl p-7 flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "border-2 border-[#d4af37] ring-1 ring-[#d4af37]/50 shadow-md"
                        : "border border-[var(--surface-border)] hover:border-[#d4af37]/50 shadow-xs"
                    }`}
                  >
                    <div>
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "border-[#d4af37] bg-[#d4af37]"
                                : "border-[var(--surface-border)] bg-transparent"
                            }`}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#1a1a1a]" />
                            )}
                          </span>
                          <span className={`font-display text-[11px] uppercase tracking-wider font-bold ${isSelected ? "text-[#d4af37]" : "text-[var(--text-muted)]"}`}>
                            {isSelected ? "Selected Course" : "Click to Select"}
                          </span>
                        </div>

                        {c.featured && (
                          <span className="bg-[#d4af37]/15 text-[#d4af37] font-display text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border border-[#d4af37]/30">
                            Recommended
                          </span>
                        )}
                      </div>

                      {/* Course Title */}
                      <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--text-main)] mb-2 min-h-[52px] leading-snug">
                        {c.title}
                      </h3>

                      <p className="font-serif text-xs text-[var(--text-muted)] mb-5 leading-relaxed min-h-[36px]">
                        {c.description}
                      </p>

                      {/* Price Section */}
                      <div className="mb-6 pb-6 border-b border-[var(--surface-border)]">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-3xl sm:text-4xl font-extrabold text-[var(--text-main)] tracking-tight">
                            {isPkr ? `Rs ${c.pkr.toLocaleString()}` : `$${c.usd}`}
                          </span>
                          <span className="font-serif text-xs text-[var(--text-muted)] uppercase tracking-wider">
                            / Full Term
                          </span>
                        </div>
                      </div>

                      {/* Feature List */}
                      <div className="space-y-3 mb-8">
                        <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                          Included Curriculum:
                        </span>
                        {c.features.map((feat, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm font-serif text-[var(--text-main)] leading-snug">
                            <span className="material-symbols-outlined text-[#d4af37] text-[18px] shrink-0 mt-0.5">
                              check_circle
                            </span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Enrollment Action Button */}
                    <div>
                      <Link
                        href={`/auth/register?course=${c.id}`}
                        onClick={() => setSelectedCourseId(c.id)}
                        className={`w-full text-center py-3.5 rounded-full font-display text-xs uppercase tracking-widest font-bold block transition-all duration-200 shadow-xs ${
                          isSelected
                            ? "bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white"
                            : "border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] bg-[var(--surface-low)]"
                        }`}
                      >
                        Enroll in Course
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Direct Study Material Notice */}
            <div className="mt-8 bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-center gap-5 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">workspace_premium</span>
              </div>
              <div className="text-center sm:text-left">
                <h4 className="font-display text-sm sm:text-base font-bold text-[var(--text-main)] mb-1">
                  Official Academic Material Delivery
                </h4>
                <p className="font-serif text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                  Comprehensive lecture notes and official course book PDFs are curated and delivered directly to enrolled students by academic administration upon bank receipt verification.
                </p>
              </div>
            </div>
          </section>

          {/* ================= SECTION 2: BANK DETAILS ================= */}
          <section id="bank-details" className="mb-16 scroll-mt-28 bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-6 sm:p-8 lg:p-10 shadow-xs">
            <div id="bank" className="scroll-mt-28" />
            <div className="mb-8 pb-4 border-b border-[var(--surface-border)]">
              <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37] block mb-2">
                Institutional Accounts
              </span>
              <div className="inline-flex items-center px-6 py-2.5 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-xl shadow-xs">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                  Bank Details
                </h2>
              </div>
            </div>

            {/* Essential Bank Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-8">
              {/* Account 1: Meezan Bank */}
              <div className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl p-5 sm:p-6 space-y-4 font-serif">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
                  <h3 className="font-display text-base sm:text-lg font-bold text-[var(--text-main)]">
                    Meezan Bank
                  </h3>
                  <span className="font-display text-[10px] uppercase tracking-wider text-[#d4af37] font-bold px-2.5 py-0.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30">
                    Primary Account
                  </span>
                </div>

                <div>
                  <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block mb-1">
                    Account Title
                  </span>
                  <span className="font-bold text-[var(--text-main)] text-sm sm:text-base font-display">
                    SPEAKUP EXECUTIVE EDUCATION
                  </span>
                </div>

                <div>
                  <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block mb-1">
                    Bank / Payment Channel
                  </span>
                  <span className="text-[var(--text-main)] text-sm">
                    Meezan Bank Limited
                  </span>
                </div>

                <div className="pt-2 border-t border-[var(--surface-border)]/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                      IBAN / Account Number
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy("PK64MEZN0001040105829103", "meezan")}
                      className="font-display text-[11px] uppercase tracking-wider text-[#d4af37] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedKey === "meezan" ? "check" : "content_copy"}
                      </span>
                      <span>{copiedKey === "meezan" ? "Copied" : "Copy IBAN"}</span>
                    </button>
                  </div>
                  <span className="font-mono text-sm sm:text-base font-bold text-[var(--text-main)] tracking-wider select-all block bg-[var(--surface-lowest)] px-3 py-2 rounded-lg border border-[var(--surface-border)]">
                    PK64MEZN0001040105829103
                  </span>
                </div>
              </div>

              {/* Account 2: Standard Chartered */}
              <div className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl p-5 sm:p-6 space-y-4 font-serif">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
                  <h3 className="font-display text-base sm:text-lg font-bold text-[var(--text-main)]">
                    Standard Chartered Bank
                  </h3>
                  <span className="font-display text-[10px] uppercase tracking-wider text-[#d4af37] font-bold px-2.5 py-0.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30">
                    Secondary Account
                  </span>
                </div>

                <div>
                  <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block mb-1">
                    Account Title
                  </span>
                  <span className="font-bold text-[var(--text-main)] text-sm sm:text-base font-display">
                    SPEAKUP EXECUTIVE EDUCATION
                  </span>
                </div>

                <div>
                  <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block mb-1">
                    Bank / Payment Channel
                  </span>
                  <span className="text-[var(--text-main)] text-sm">
                    Standard Chartered Bank
                  </span>
                </div>

                <div className="pt-2 border-t border-[var(--surface-border)]/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                      IBAN / Account Number
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy("PK36SCBL0000001124890201", "scb")}
                      className="font-display text-[11px] uppercase tracking-wider text-[#d4af37] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedKey === "scb" ? "check" : "content_copy"}
                      </span>
                      <span>{copiedKey === "scb" ? "Copied" : "Copy IBAN"}</span>
                    </button>
                  </div>
                  <span className="font-mono text-sm sm:text-base font-bold text-[var(--text-main)] tracking-wider select-all block bg-[var(--surface-lowest)] px-3 py-2 rounded-lg border border-[var(--surface-border)]">
                    PK36SCBL0000001124890201
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Payment Proof area with informational note */}
            <div className="pt-4 border-t border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="font-serif text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-xl">
                After completing your payment, please send your payment receipt/proof via WhatsApp for record verification.
              </p>
              <a
                href="https://wa.me"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center justify-center gap-2.5 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all font-display text-xs uppercase tracking-widest font-bold px-7 py-3.5 rounded-full shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                <span>Submit Payment Proof</span>
              </a>
            </div>
          </section>

          {/* ================= SECTION 3: COURSE TERMS & CONDITIONS ================= */}
          <section id="course-terms" className="scroll-mt-28 bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-6 sm:p-8 lg:p-10 shadow-xs">
            <div id="terms-conditions" className="scroll-mt-28" />
            <div className="mb-8 pb-4 border-b border-[var(--surface-border)]">
              <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[#d4af37] block mb-2">
                Institutional Agreement
              </span>
              <div className="inline-flex items-center px-6 py-2.5 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-xl shadow-xs">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                  Course Terms &amp; Conditions
                </h2>
              </div>
            </div>

            {/* Terms List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-8">
              {/* Term 1 */}
              <div className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl p-5 sm:p-6 space-y-2">
                <h3 className="font-display text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                  <span className="text-[#d4af37] font-bold">01.</span>
                  <span>Individual Student License &amp; Credentials</span>
                </h3>
                <p className="font-serif text-[13px] sm:text-[14px] text-[var(--text-muted)] leading-relaxed">
                  Course access is strictly individual and non-transferable. Sharing credentials, lecture recordings, or course notes with third parties violates institutional policy and results in immediate access revocation without refund.
                </p>
              </div>

              {/* Term 2 */}
              <div className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl p-5 sm:p-6 space-y-2">
                <h3 className="font-display text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                  <span className="text-[#d4af37] font-bold">02.</span>
                  <span>Verification &amp; Course Unlocking</span>
                </h3>
                <p className="font-serif text-[13px] sm:text-[14px] text-[var(--text-muted)] leading-relaxed">
                  Email verification confirms your student account. Course material unlocking is executed individually by academic administration upon receipt verification, ensuring structured progress control.
                </p>
              </div>

              {/* Term 3 */}
              <div className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl p-5 sm:p-6 space-y-2">
                <h3 className="font-display text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                  <span className="text-[#d4af37] font-bold">03.</span>
                  <span>Certification Standards</span>
                </h3>
                <p className="font-serif text-[13px] sm:text-[14px] text-[var(--text-muted)] leading-relaxed">
                  Official certificates of completion are issued only when a student achieves a minimum 80% completion metric on course modules and completes the practical capstone assignment or oral defense seminar.
                </p>
              </div>

              {/* Term 4 */}
              <div className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl p-5 sm:p-6 space-y-2">
                <h3 className="font-display text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                  <span className="text-[#d4af37] font-bold">04.</span>
                  <span>Refund Policy</span>
                </h3>
                <p className="font-serif text-[13px] sm:text-[14px] text-[var(--text-muted)] leading-relaxed">
                  Due to the proprietary nature of our curated PDFs and recorded masterclasses, enrollment fees are non-refundable once portal credentials and curriculum materials have been accessed.
                </p>
              </div>
            </div>

            {/* Bottom Governance and Action Bar */}
            <div className="pt-4 border-t border-[var(--surface-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-display text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                Governance Code: SPK-TRM-2026
              </span>
              <Link
                href="/auth/register"
                className="bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all font-display text-xs uppercase tracking-widest font-bold px-7 py-3 rounded-full shadow-xs"
              >
                Register
              </Link>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
