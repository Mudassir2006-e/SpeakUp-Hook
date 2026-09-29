"use client";

import React, { useState } from "react";
import Link from "next/link";
import LmsProfileDropdown from "@/components/LmsProfileDropdown";

interface EnrolledCourse {
  id: string;
  title: string;
  lastAccessed: string;
  status: "In Progress" | "Completed";
  progress: number;
  description: string;
  image: string;
}

export default function EnrolledCoursesPage() {
  const [filter, setFilter] = useState<"all" | "in-progress" | "completed">("in-progress");

  const enrolledCourses: EnrolledCourse[] = [
    {
      id: "grammar-a1",
      title: "English Grammar Mastery — A1",
      lastAccessed: "2 days ago",
      status: "In Progress",
      progress: 35,
      description:
        "Foundational English grammar focusing on sentence structure, essential vocabulary, and fundamental communicative competence for academic environments.",
      image:
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "speak-30",
      title: "Speak in 30 Days — Fluency & Cadence",
      lastAccessed: "Yesterday",
      status: "In Progress",
      progress: 15,
      description:
        "Intensive verbal articulation, idiomatic expressions, conversational reflexes, and phonetics training designed for accelerated professional speaking.",
      image:
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  const filtered = enrolledCourses.filter((c) => {
    if (filter === "in-progress") return c.status === "In Progress";
    if (filter === "completed") return c.status === "Completed";
    return true;
  });

  return (
    <div className="max-w-[1300px] mx-auto space-y-8 py-4">
      {/* Top Header Section with Title on Left and Profile Picture alongside Mudassir Ali on Right */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 pt-2 border-b border-[var(--surface-border)]">
        <div className="space-y-1">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
            Enrolled Courses
          </h1>
          <p className="font-serif text-base sm:text-lg text-[var(--text-muted)]">
            Manage your active academic progress, review study notes, and continue learning.
          </p>
        </div>

        {/* Top-Right Profile Display: Circular Profile Picture matching Dashboard */}
        <div className="shrink-0 self-start sm:self-center">
          <LmsProfileDropdown />
        </div>
      </section>

      {/* Filter Tabs Bar (Crisp light & dark surfaces) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setFilter("in-progress")}
          className={`px-5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
            filter === "in-progress"
              ? "bg-[#d4af37] text-[#141416] shadow-xs"
              : "bg-white dark:bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
          }`}
        >
          <span>In Progress</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-black/10 dark:bg-black/20 font-mono font-bold">
            {enrolledCourses.filter((c) => c.status === "In Progress").length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setFilter("completed")}
          className={`px-5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
            filter === "completed"
              ? "bg-[#d4af37] text-[#141416] shadow-xs"
              : "bg-white dark:bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
          }`}
        >
          <span>Completed</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-black/10 dark:bg-black/20 font-mono font-bold">
            0
          </span>
        </button>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((course) => (
          <div
            key={course.id}
            className="bg-white dark:bg-[#141418]/60 rounded-2xl border border-[var(--surface-border)] shadow-xs hover:shadow-md hover:border-[#d4af37]/60 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
          >
            <div>
              {/* Image Banner with Access Granted Badge */}
              <div className="relative h-48 w-full overflow-hidden bg-[#f0eae0] dark:bg-[var(--surface-low)]">
                <div
                  className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url(${course.image})` }}
                />
                <div className="absolute inset-0 bg-black/20"></div>

                <div className="absolute top-3 right-3 bg-white/95 dark:bg-[#141418]/95 backdrop-blur-sm border border-[var(--surface-border)] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                  <span className="material-symbols-outlined text-[#d4af37] text-[15px]">lock_open</span>
                  <span className="font-display text-[10px] font-bold tracking-wider uppercase text-[#d4af37]">
                    Access Granted
                  </span>
                </div>
              </div>

              {/* Body Details */}
              <div className="p-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="bg-[#d4af37]/20 text-[#141416] dark:text-[#d4af37] font-display text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
                    Active
                  </span>
                  <span className="font-serif text-xs text-[var(--text-muted)]">
                    Last accessed: {course.lastAccessed}
                  </span>
                </div>

                <h2 className="font-display text-xl font-bold text-[var(--text-main)] mb-2 group-hover:text-[#d4af37] transition-colors leading-snug">
                  {course.title}
                </h2>

                <p className="font-serif text-[14px] text-[var(--text-muted)] leading-relaxed line-clamp-3">
                  {course.description}
                </p>
              </div>
            </div>

            {/* Progress Metric & Continue CTA */}
            <div className="p-6 pt-0 mt-auto">
              <div className="pt-4 border-t border-[var(--surface-border)] space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-display uppercase tracking-wider font-semibold">
                    <span className="text-[var(--text-muted)]">Progress</span>
                    <span className="text-[#d4af37] font-bold">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-[#f0eae0] dark:bg-[var(--surface-low)] h-1.5 rounded-full overflow-hidden border border-[var(--surface-border)]/50">
                    <div
                      className="bg-[#d4af37] h-full rounded-full"
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                </div>

                <Link
                  href="/lms/learn"
                  className="w-full py-3.5 px-4 bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs font-bold rounded-xl uppercase tracking-widest transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Continue Course</span>
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
