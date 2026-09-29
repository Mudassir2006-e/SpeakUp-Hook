"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface CourseItem {
  id: string;
  title: string;
  badge: "Available" | "Popular" | "Waitlist";
  description: string;
  image: string;
  duration: string;
  level: string;
}

const courses: CourseItem[] = [
  {
    id: "grammar-a1",
    title: "English Grammar Mastery — A1",
    badge: "Available",
    description:
      "Master the foundational structures of spoken and written English. Perfect for establishing an authoritative communicative foundation with structural confidence.",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    duration: "6 Weeks",
    level: "Foundational",
  },
  {
    id: "speak-30",
    title: "Speak in 30 Days — Fluency & Cadence",
    badge: "Popular",
    description:
      "Intensive verbal articulation, eliminating conversational pauses and filler words, and training acoustic cadence for high-stakes meetings and formal defenses.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    duration: "4 Weeks",
    level: "Accelerated",
  },
  {
    id: "strategic-negotiation",
    title: "Strategic Negotiation & Persuasion",
    badge: "Available",
    description:
      "Advanced linguistic tactics for cross-border transactions, executive conflict resolution, and steering high-stakes corporate discourse.",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80",
    duration: "8 Weeks",
    level: "Executive",
  },
  {
    id: "professional-mastery",
    title: "Professional Executive Series",
    badge: "Available",
    description:
      "Comprehensive curriculum integrating formal rhetoric, board reporting, articulate spontaneous replies, and boardroom influence.",
    image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
    duration: "10 Weeks",
    level: "Advanced",
  },
  {
    id: "global-leadership",
    title: "Global Leadership Intensive",
    badge: "Waitlist",
    description:
      "Immersive capstone cohort program focused on keynote address delivery, speech crafting, and international diplomacy communication.",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    duration: "12 Weeks",
    level: "Elite Capstone",
  },
];

export default function CoursesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1 py-12 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          {/* Header Section */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            {/* Main Heading enclosed in stylish rectangular rounded box */}
            <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)] mb-5">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-[0.08em] text-[var(--text-main)]">
                Course Panel
              </h1>
            </div>

            {/* Subheading with stylish flanking accents */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3">
              <span className="h-px w-6 sm:w-12 bg-gradient-to-r from-transparent to-[#d4af37]/60" />
              <h2 className="font-display text-lg sm:text-xl md:text-2xl font-semibold tracking-wide text-[#d4af37]">
                Executive English Programs &amp; Pathways
              </h2>
              <span className="h-px w-6 sm:w-12 bg-gradient-to-l from-transparent to-[#d4af37]/60" />
            </div>

            <p className="font-serif text-base sm:text-lg text-[var(--text-muted)] leading-relaxed max-w-2xl mx-auto">
              Master global leadership through rigorous, focused curricula designed for ambitious professionals. Discover our structured pathways to articulate authority.
            </p>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl overflow-hidden shadow-xs hover:border-[#d4af37]/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Card Image Banner */}
                  <div className="h-48 w-full relative overflow-hidden bg-[var(--surface-low)]">
                    <div
                      className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${course.image})` }}
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                    <div className="absolute top-4 left-4">
                      <span
                        className={`font-display text-xs uppercase tracking-wider font-bold px-3.5 py-1 rounded-full shadow-xs ${
                          course.badge === "Popular"
                            ? "bg-[#d4af37] text-[#1a1a1a]"
                            : course.badge === "Waitlist"
                            ? "bg-[var(--surface-lowest)] text-[var(--text-muted)]"
                            : "bg-[var(--surface-lowest)] text-[#d4af37]"
                        }`}
                      >
                        {course.badge}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-3 text-xs sm:text-[13px] font-display uppercase tracking-widest text-[var(--text-muted)] mb-3">
                      <span>{course.duration}</span>
                      <span>•</span>
                      <span className="text-[#d4af37] font-semibold">{course.level}</span>
                    </div>

                    <h3 className="font-display text-xl font-bold text-[var(--text-main)] mb-3 leading-snug group-hover:text-[#d4af37] transition-colors">
                      {course.title}
                    </h3>

                    <p className="font-serif text-[14px] text-[var(--text-muted)] leading-relaxed line-clamp-3">
                      {course.description}
                    </p>
                  </div>
                </div>

                {/* Footer Action: Full Width, Cleanly Aligned Course Outline Button */}
                <div className="p-6 pt-0">
                  <div className="pt-4 border-t border-[var(--surface-border)]">
                    <Link
                      href={`/course-outline?course=${course.id}`}
                      className="w-full block text-center py-3.5 rounded-full border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-[13px] sm:text-[14px] uppercase tracking-wider font-bold transition-all shadow-xs active:scale-95"
                    >
                      Course Outline
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Course Duration Access Note */}
          <div className="text-center mb-10">
            <p className="font-serif text-sm sm:text-base text-[var(--text-muted)] italic">
              Note: Courses with a 3-month duration include 6 months of total access. Courses with a 2-month duration include 4 months of total access.
            </p>
          </div>

          {/* Established Course Panel Workflow */}
          <div className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-2xl p-8 md:p-12 text-center flex flex-col items-center gap-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <p className="font-serif text-base sm:text-lg text-[var(--text-muted)] italic">
                Check the institutional advantages
              </p>
              <Link
                href="/lms-journey#benefits"
                className="bg-transparent text-[#d4af37] border border-[#d4af37] font-display text-sm uppercase tracking-widest px-8 py-2.5 rounded-full hover:bg-[#d4af37] hover:text-[#1a1a1a] transition-all duration-300 font-bold shadow-xs active:scale-95"
              >
                Benefits
              </Link>
            </div>

            <p className="font-serif text-base text-[var(--text-muted)] italic">
              Visit the Methodology section to know how our system and teachers work.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/pricing"
                className="w-full sm:w-auto bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] border-2 border-[#d4af37] font-display text-[13px] sm:text-[14px] uppercase tracking-widest px-10 py-4 rounded-full hover:bg-[#d4af37] hover:text-white transition-all duration-300 font-bold shadow-xs active:scale-95 text-center"
              >
                Pricing &amp; Enrollment
              </Link>
              <Link
                href="/pricing?tab=terms#terms-conditions"
                className="w-full sm:w-auto border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-[13px] sm:text-[14px] uppercase tracking-widest px-10 py-4 rounded-full transition-all duration-300 font-bold shadow-xs bg-[var(--surface-lowest)] active:scale-95 text-center"
              >
                Course Terms &amp; Conditions
              </Link>
            </div>

            <p className="font-display text-[11px] text-[var(--text-muted)] uppercase tracking-widest pt-4 border-t border-[var(--surface-border)] w-full max-w-2xl">
              Please ensure you have read our Terms &amp; Conditions and Policies in the{" "}
              <Link href="/privacy" className="text-[#d4af37] underline hover:text-[#b08e2b]">
                Privacy section
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
