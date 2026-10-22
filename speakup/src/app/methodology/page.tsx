"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useCmsContent } from "@/lib/cms/useCmsContent";
import MethodologyMediaFrame from "@/components/MethodologyMediaFrame";
import MethodologyVideoFrame from "@/components/MethodologyVideoFrame";

export default function MethodologyPage() {
  const cms = useCmsContent("methodology");
  const stages = [
    {
      num: "1",
      name: "Learn",
      icon: "menu_book",
      desc: "Acquire foundational grammar, syntax structures, and high-level executive vocabulary through rigorous, high-definition masterclasses.",
    },
    {
      num: "2",
      name: "Practice",
      icon: "edit_note",
      desc: "Apply concepts immediately through contextual sentence creation, speech pacing drills, and interactive exercises in the student LMS.",
    },
    {
      num: "3",
      name: "Communicate",
      icon: "forum",
      desc: "Engage in simulated high-pressure boardroom scenarios, impromptu discourse, and defense seminars to cement subconscious reflexes.",
    },
    {
      num: "4",
      name: "Get Feedback",
      icon: "feedback",
      desc: "Receive granular, actionable corrections from Sir Mudassir Ali and our senior mentors on pronunciation, pause control, and rhetoric.",
    },
    {
      num: "5",
      name: "Improve",
      icon: "trending_up",
      desc: "Iterate continuously on identified blind spots, solidifying commanding mastery before unlocking advanced certifications.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1 pt-6 md:pt-10 pb-12 md:pb-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          {/* Header Badge & Exactly 5 Buttons */}
          <div className="text-center mb-16">
            {/* Main Heading enclosed in stylish rectangular rounded box */}
            <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)] mb-8">
              <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold uppercase tracking-[0.12em] text-[var(--text-main)]">
                Methodology Panel
              </h1>
            </div>

            {/* EXACTLY FIVE BUTTONS */}
            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
              <Link
                href="/about"
                className="font-display text-[13px] sm:text-[14px] uppercase tracking-wider bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-main)] px-8 py-3.5 hover:border-[#d4af37] hover:text-[#d4af37] transition-all duration-300 rounded-full font-bold shadow-xs active:scale-95"
              >
                About
              </Link>
              <Link
                href="/reviews"
                className="font-display text-[13px] sm:text-[14px] uppercase tracking-wider bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-main)] px-8 py-3.5 hover:border-[#d4af37] hover:text-[#d4af37] transition-all duration-300 rounded-full font-bold shadow-xs active:scale-95"
              >
                Reviews
              </Link>
              <Link
                href="/faq"
                className="font-display text-[13px] sm:text-[14px] uppercase tracking-wider bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-main)] px-8 py-3.5 hover:border-[#d4af37] hover:text-[#d4af37] transition-all duration-300 rounded-full font-bold shadow-xs active:scale-95"
              >
                FAQs
              </Link>
              <Link
                href="/demo"
                className="font-display text-[13px] sm:text-[14px] uppercase tracking-wider bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-main)] px-8 py-3.5 hover:border-[#d4af37] hover:text-[#d4af37] transition-all duration-300 rounded-full font-bold shadow-xs active:scale-95"
              >
                Demo
              </Link>
              <Link
                href="/lms-journey"
                className="font-display text-[13px] sm:text-[14px] uppercase tracking-wider bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-main)] px-8 py-3.5 hover:border-[#d4af37] hover:text-[#d4af37] transition-all duration-300 rounded-full font-bold shadow-xs active:scale-95"
              >
                LMS Journey
              </Link>
            </div>
          </div>

          {/* Hero Section */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
            <div className="lg:col-span-6 space-y-6">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-main)] leading-[1.1]">
                {cms.header?.heading ? (
                  cms.header.heading
                ) : (
                  <>
                    How We Help You <br />
                    <span className="text-[#d4af37] italic font-serif font-light">Become Fluent</span>
                  </>
                )}
              </h1>
              <p className="font-serif text-lg md:text-xl text-[var(--text-muted)] leading-relaxed">
                {cms.header?.subheading || "Discover a structured, proven methodology designed for high-achieving professionals. We blend academic rigor with practical application to ensure authoritative mastery of the English language."}
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href="/lms-journey"
                  className="font-display text-sm uppercase tracking-wider bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] px-8 py-3.5 hover:bg-[#d4af37] hover:text-white transition-all duration-300 font-bold rounded-full shadow-xs"
                >
                  See How LMS Works
                </Link>
                <Link
                  href="/courses"
                  className="font-display text-sm uppercase tracking-wider bg-transparent border border-[#d4af37] hover:bg-[#d4af37] text-[#d4af37] hover:text-[#1a1a1a] px-8 py-3.5 transition-all duration-300 font-bold rounded-full shadow-xs"
                >
                  Explore Courses
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <MethodologyMediaFrame />
            </div>
          </section>

          {/* 5-Stage Cyclical Teaching Methodology */}
          <section className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-2xl p-8 md:p-12 mb-20 shadow-xs">
            <div className="text-center mb-14">
              <span className="font-display text-xs uppercase tracking-[0.25em] text-[#d4af37] font-bold block mb-2">
                Five-Stage Cyclical Progression
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-main)] mb-3">
                Our Teaching Methodology
              </h2>
              <p className="font-serif text-[var(--text-muted)] max-w-2xl mx-auto italic text-base">
                A recursive loop ensuring deep grammatical internalization and effortless spontaneous application.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {stages.map((stg) => (
                <div
                  key={stg.num}
                  className="bg-[var(--surface-lowest)] p-6 rounded-2xl border border-[var(--surface-border)] hover:border-[#d4af37]/60 hover:shadow-md transition-all duration-300 group flex flex-col justify-between h-full"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-center justify-center mb-5 group-hover:bg-[#d4af37] group-hover:text-white transition-colors duration-300 text-[var(--text-main)]">
                      <span className="material-symbols-outlined text-[24px]">{stg.icon}</span>
                    </div>
                    <div className="mb-3">
                      <span className="font-display text-xs font-bold text-[#d4af37] block mb-1">
                        0{stg.num}.
                      </span>
                      <h3 className="font-display text-sm lg:text-base font-bold text-[var(--text-main)] uppercase tracking-wider leading-snug">
                        {stg.name}
                      </h3>
                    </div>
                    <p className="font-serif text-[13px] sm:text-[14px] text-[var(--text-muted)] leading-[1.65]">
                      {stg.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Guided LMS Video Section (Req 3) */}
          <section className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-2xl p-8 md:p-12 mb-20 shadow-xs">
            <MethodologyVideoFrame />
          </section>

          {/* Still Have Questions Support Section */}
          <section className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-8 md:p-12 text-center shadow-xs">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-main)] mb-4">
              Still Have Questions? We&apos;re Here to Help.
            </h2>
            <p className="font-serif text-lg text-[var(--text-muted)] max-w-3xl mx-auto leading-relaxed mb-8">
              Still unsure about how the courses or LMS work? You can explore our FAQs, watch the free guided video demo, or speak directly with our academic advisors.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/book-session"
                className="bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white font-display text-xs uppercase tracking-widest font-bold px-8 py-3.5 rounded-full transition-all shadow-xs"
              >
                Book a Session
              </Link>
              <Link
                href="/demo"
                className="bg-[var(--surface-low)] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-widest font-bold px-7 py-3.5 rounded-full transition-all"
              >
                Watch Free Demo
              </Link>
              <Link
                href="/faq"
                className="bg-[var(--surface-low)] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-widest font-bold px-7 py-3.5 rounded-full transition-all"
              >
                Explore FAQs
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
