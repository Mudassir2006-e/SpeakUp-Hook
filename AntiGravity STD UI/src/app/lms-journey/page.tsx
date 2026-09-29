"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function LMSJourneyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1 py-12 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          {/* Header Badge */}
          <div className="text-center mb-16">
            {/* Main Heading enclosed in stylish rectangular rounded box */}
            <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)] mb-5">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-[0.08em] text-[var(--text-main)]">
                LMS Journey
              </h1>
            </div>

            {/* Subheading with stylish flanking accents */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3">
              <span className="h-px w-6 sm:w-12 bg-gradient-to-r from-transparent to-[#d4af37]/60" />
              <h2 className="font-display text-lg sm:text-xl md:text-2xl font-semibold tracking-wide text-[#d4af37]">
                The Architecture of Your Excellence
              </h2>
              <span className="h-px w-6 sm:w-12 bg-gradient-to-l from-transparent to-[#d4af37]/60" />
            </div>

            <p className="font-serif text-lg md:text-xl text-[var(--text-muted)] max-w-3xl mx-auto leading-relaxed">
              Embark on a meticulously curated path to linguistic mastery. Our methodology transforms executive English education into a seamless journey of intellectual growth, ensuring every milestone is met with precision and sophistication.
            </p>
          </div>

          {/* Hero Bento Section */}
          <section className="mb-20 rounded-2xl bg-[var(--surface-low)] border border-[var(--surface-border)] p-8 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-xs">
            <div className="lg:col-span-6 space-y-6">
              <span className="font-display text-xs uppercase tracking-[0.25em] text-[#d4af37] font-bold">
                Student Experience Philosophy
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-main)] leading-tight">
                Designed for Focused Cognitive Retention
              </h2>
              <p className="font-serif text-[16px] text-[var(--text-muted)] leading-relaxed">
                Traditional generic learning portals overwhelm students with clutter, gamified badges, and distraction. SpeakUp strips away superfluous noise in favor of a calm, editorial study sanctuary centered strictly on verbal cadence, clear grammar syntax, and structured practice.
              </p>
              <div className="pt-2 flex flex-wrap gap-4">
                <Link
                  href="/book-session"
                  className="inline-block bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all font-display text-sm uppercase tracking-wider font-bold px-8 py-3.5 rounded-full shadow-xs"
                >
                  Book a Session
                </Link>
                <Link
                  href="/course-outline"
                  className="inline-block bg-transparent border border-[#d4af37] hover:bg-[#d4af37] text-[#d4af37] hover:text-[#1a1a1a] transition-all font-display text-sm uppercase tracking-wider font-bold px-8 py-3.5 rounded-full shadow-xs"
                >
                  View Courses
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="w-full aspect-[4/3] rounded-xl overflow-hidden shadow-xl border border-[var(--surface-border)] relative">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80')",
                  }}
                />
              </div>
            </div>
          </section>

          {/* Access & Approval Architecture Bento Grid */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <span className="font-display text-sm sm:text-base uppercase tracking-[0.25em] text-[#d4af37] font-bold block mb-3">
                Structured Governance
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-main)]">
                The Foundation: Access &amp; Approval
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Account Verification */}
              <div className="bg-[var(--surface-lowest)] p-8 md:p-10 rounded-2xl border border-[var(--surface-border)] shadow-xs hover:border-[#d4af37]/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-center justify-center text-[#d4af37]">
                      <span className="material-symbols-outlined text-[26px]">mark_email_read</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-[var(--text-main)] uppercase tracking-wider">
                      1. Account Verification
                    </h3>
                  </div>
                  <p className="font-serif text-base text-[var(--text-muted)] leading-relaxed mb-6">
                    Automated 6-digit email OTP verification that confirms your student identity and grants immediate access to the platform dashboard. Individual courses remain locked until verified enrollment.
                  </p>
                  <ul className="space-y-3 font-serif text-sm text-[var(--text-main)]">
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#d4af37] text-[18px]">check</span>
                      <span>Instant numeric OTP code delivery</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#d4af37] text-[18px]">check</span>
                      <span>Access to student profile &amp; upcoming curricula</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#d4af37] text-[18px]">check</span>
                      <span>Protects your learning telemetry and records</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Individual Course Approval */}
              <div className="bg-[var(--surface-lowest)] p-8 md:p-10 rounded-2xl border border-[var(--surface-border)] shadow-xs hover:border-[#d4af37]/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-center justify-center text-[#d4af37]">
                      <span className="material-symbols-outlined text-[26px]">verified_user</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-[var(--text-main)] uppercase tracking-wider">
                      2. Individual Course Approval
                    </h3>
                  </div>
                  <p className="font-serif text-base text-[var(--text-muted)] leading-relaxed mb-6">
                    Administration verifies enrollment payments and approves courses individually. For instance, your Grammar course can be active while advanced modules remain locked, ensuring tailored pace and structured mastery.
                  </p>
                  <ul className="space-y-3 font-serif text-sm text-[var(--text-main)]">
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#d4af37] text-[18px]">check</span>
                      <span>Administrative receipt verification</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#d4af37] text-[18px]">check</span>
                      <span>One-click &apos;Request Access&apos; modal in student dashboard</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#d4af37] text-[18px]">check</span>
                      <span>Unlocks Videos, Study Notes, and Practice Drills</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Three-Tiered Learning Engine Preview */}
          <section className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-2xl p-8 md:p-12 mb-16 shadow-xs">
            <div className="text-center mb-12">
              <span className="font-display text-xs uppercase tracking-[0.25em] text-[#d4af37] font-bold block mb-2">
                Inside Each Course
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-main)]">
                The Three Learning Pillars
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[var(--surface-lowest)] p-6 rounded-2xl border border-[var(--surface-border)] shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-[#d4af37]/15 text-[#d4af37] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[26px]">play_circle</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)] mb-2">
                  1. Video Masterclasses
                </h3>
                <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                  16:9 studio lectures with playback speed controls (1.0x–2.0x), replay controls, progress scrubbers, and full transcripts.
                </p>
              </div>

              <div className="bg-[var(--surface-lowest)] p-6 rounded-2xl border border-[var(--surface-border)] shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-[#d4af37]/15 text-[#d4af37] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[26px]">description</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)] mb-2">
                  2. Curated Study Notes
                </h3>
                <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                  Structured lecture summaries, cadence anchor rules, and one-click &apos;Copy Notes&apos; functionality for quick review before meetings.
                </p>
              </div>

              <div className="bg-[var(--surface-lowest)] p-6 rounded-2xl border border-[var(--surface-border)] shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-[#d4af37]/15 text-[#d4af37] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[26px]">edit_note</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)] mb-2">
                  3. Practice Drills &amp; Assignments
                </h3>
                <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                  Sentence construction exercises, spoken cadence pacing prompts, and interactive assignment submission directly inside the LMS.
                </p>
              </div>
            </div>
          </section>

          {/* Institutional Advantages — BENEFITS */}
          <section id="benefits" className="mb-20 scroll-mt-28">
            <div className="text-center mb-12">
              <span className="font-display text-xs uppercase tracking-[0.25em] text-[#d4af37] font-bold block mb-3">
                Institutional Advantages
              </span>
              <div className="inline-block px-8 py-2.5 border border-[#d4af37]/40 rounded-full bg-[var(--surface-low)] shadow-xs mb-4">
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-widest text-[var(--text-main)]">
                  BENEFITS
                </h2>
              </div>
              <div className="h-0.5 w-20 bg-[#d4af37] mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-[var(--surface-lowest)] p-8 rounded-2xl border border-[var(--surface-border)] hover:border-[#d4af37]/40 shadow-xs flex flex-col items-start transition-all">
                <div className="w-12 h-12 rounded-xl border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mb-6 bg-[var(--surface-low)]">
                  <span className="material-symbols-outlined text-[26px]">video_library</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)] mb-2">Recorded Classes</h3>
                <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                  On-Demand Curriculum: Access executive-level lessons across all time zones with our secure, high-definition digital library.
                </p>
              </div>

              <div className="bg-[var(--surface-lowest)] p-8 rounded-2xl border border-[var(--surface-border)] hover:border-[#d4af37]/40 shadow-xs flex flex-col items-start transition-all">
                <div className="w-12 h-12 rounded-xl border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mb-6 bg-[var(--surface-low)]">
                  <span className="material-symbols-outlined text-[26px]">menu_book</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)] mb-2">Practice Material</h3>
                <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                  Strategic Practice Assets: Access a curated suite of technical resources and case studies designed for immediate professional application.
                </p>
              </div>

              <div className="bg-[var(--surface-lowest)] p-8 rounded-2xl border border-[var(--surface-border)] hover:border-[#d4af37]/40 shadow-xs flex flex-col items-start transition-all">
                <div className="w-12 h-12 rounded-xl border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mb-6 bg-[var(--surface-low)]">
                  <span className="material-symbols-outlined text-[26px]">live_tv</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)] mb-2">Live Classes</h3>
                <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                  Executive Sessions: Participate in immersive, high-stakes simulations and live rhetorical drills for real-time linguistic refinement.
                </p>
              </div>

              <div className="bg-[var(--surface-lowest)] p-8 rounded-2xl border border-[var(--surface-border)] hover:border-[#d4af37]/40 shadow-xs flex flex-col items-start transition-all">
                <div className="w-12 h-12 rounded-xl border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mb-6 bg-[var(--surface-low)]">
                  <span className="material-symbols-outlined text-[26px]">psychology</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)] mb-2">Personal Guidance</h3>
                <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                  Bespoke Mentorship: Receive dedicated, one-on-one strategic guidance tailored to your specific leadership trajectory and professional objectives.
                </p>
              </div>

              <div className="bg-[var(--surface-lowest)] p-8 rounded-2xl border border-[var(--surface-border)] hover:border-[#d4af37]/40 shadow-xs flex flex-col items-start transition-all">
                <div className="w-12 h-12 rounded-xl border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mb-6 bg-[var(--surface-low)]">
                  <span className="material-symbols-outlined text-[26px]">groups</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)] mb-2">Discussion Group</h3>
                <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                  Executive Peer Network: Engage with a global cohort of high-achieving professionals in a secure environment for collaborative growth.
                </p>
              </div>

              <div className="bg-[var(--surface-lowest)] p-8 rounded-2xl border border-[var(--surface-border)] hover:border-[#d4af37]/40 shadow-xs flex flex-col items-start transition-all">
                <div className="w-12 h-12 rounded-xl border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mb-6 bg-[var(--surface-low)]">
                  <span className="material-symbols-outlined text-[26px]">school</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)] mb-2">Direct Teacher Access</h3>
                <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                  Direct Pedagogical Access: Maintain an open line of communication with our expert faculty for precise, nuanced clarification on complex concepts.
                </p>
              </div>

              <div className="bg-[var(--surface-lowest)] p-8 rounded-2xl border border-[var(--surface-border)] hover:border-[#d4af37]/40 shadow-xs flex flex-col items-start md:col-span-2 lg:col-span-1 transition-all">
                <div className="w-12 h-12 rounded-xl border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mb-6 bg-[var(--surface-low)]">
                  <span className="material-symbols-outlined text-[26px]">description</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)] mb-2">Structured Notes</h3>
                <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                  Institutional Summaries: Receive authoritative, professionally structured dossiers summarizing key architectural principles from every module.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
