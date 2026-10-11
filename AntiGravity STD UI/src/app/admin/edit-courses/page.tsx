"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import { createClient } from "@/lib/supabase/client";
import { getCentralCoursesAction } from "@/app/admin/cms-actions";
import { getAllCentralCourses } from "@/config/unifiedCourses";

interface CourseRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  is_published: boolean;
  thumbnail_url: string | null;
  created_at: string;
}

export default function EditCoursesPreparationPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await getCentralCoursesAction();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const loaded: CourseRecord[] = res.data.map((c: any) => ({
          id: c.id,
          slug: c.slug || c.id,
          title: c.title,
          description: c.description || "",
          level: c.level || "A1",
          is_published: c.status === "published",
          thumbnail_url: c.image || null,
          created_at: c.created_at || new Date().toISOString(),
        }));
        setCourses(loaded);
        if (loaded.length > 0) {
          setSelectedCourse(loaded[0]);
        }
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("courses")
        .select("id, slug, title, description, level, is_published, thumbnail_url, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading courses:", error);
      }

      const loaded = (data as unknown as CourseRecord[]) || [];
      if (loaded.length > 0) {
        setCourses(loaded);
        setSelectedCourse(loaded[0]);
      } else {
        const fallback = getAllCentralCourses().map((c) => ({
          id: c.id,
          slug: c.slug,
          title: c.title,
          description: c.description,
          level: c.level || "A1",
          is_published: c.status === "published",
          thumbnail_url: c.image || null,
          created_at: c.created_at,
        }));
        setCourses(fallback);
        if (fallback.length > 0) setSelectedCourse(fallback[0]);
      }
    } catch (err) {
      console.error("Error in loadCourses:", err);
      const fallback = getAllCentralCourses().map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        level: c.level || "A1",
        is_published: c.status === "published",
        thumbnail_url: c.image || null,
        created_at: c.created_at,
      }));
      setCourses(fallback);
      if (fallback.length > 0) setSelectedCourse(fallback[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  return (
    <div>
      <AdminHeader
        title="Edit Courses"
        subtitle="SpeakUp Academic Administration & Access Control"
      />

      <div className="p-6 sm:p-8 max-w-[1360px] mx-auto space-y-8">
        {/* Intro Banner */}
        <section className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
              <span className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                Academic Course Catalog
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)] tracking-tight">
              Course Selection & Inspection
            </h2>
            <p className="font-serif text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
              Browse actual courses registered in the Supabase academic catalog. Select a course to review its configuration. Editing forms and publishing operations are reserved for the next phase.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={loadCourses}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer shadow-2xs inline-flex items-center gap-2 font-display text-xs uppercase tracking-wider font-semibold"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                refresh
              </span>
              <span>Refresh Courses</span>
            </button>
          </div>
        </section>

        {/* 3 Core Academic Content Pages */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Courses Page */}
          <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#d4af37]/60 transition-all">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">school</span>
              </div>
              <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                Courses
              </h3>
              <span className="font-mono text-xs text-[#8a6d1b] dark:text-[#d4af37] block">
                /courses
              </span>
              <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                Live catalog displaying certified language cohorts, CEFR levels, and prospective enrollment options.
              </p>
            </div>
            <div className="pt-3 border-t border-[var(--surface-border)]">
              <Link
                href="/courses"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Open Live Courses</span>
              </Link>
            </div>
          </div>

          {/* 2. Course Pricing Page */}
          <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#d4af37]/60 transition-all">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">payments</span>
              </div>
              <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                Course Pricing
              </h3>
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400 block">
                /pricing
              </span>
              <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                Live fee structures, bank transfer routing (Meezan Bank, Raast), installment guidelines, and scholar policies.
              </p>
            </div>
            <div className="pt-3 border-t border-[var(--surface-border)]">
              <Link
                href="/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Open Live Pricing</span>
              </Link>
            </div>
          </div>

          {/* 3. Course Outline Page */}
          <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#d4af37]/60 transition-all">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">menu_book</span>
              </div>
              <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                Course Outline
              </h3>
              <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 block">
                /course-outline
              </span>
              <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                Detailed weekly curriculum modules, speech cadence milestones, and final oral evaluation criteria.
              </p>
            </div>
            <div className="pt-3 border-t border-[var(--surface-border)]">
              <Link
                href="/course-outline"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Open Live Course Outline</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Content Layout */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)]">
            <span className="material-symbols-outlined animate-spin text-[#d4af37] text-3xl">
              progress_activity
            </span>
            <p className="font-serif text-sm text-[var(--text-muted)]">
              Loading academic courses from Supabase...
            </p>
          </div>
        ) : courses.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-8">
            <div className="w-14 h-14 rounded-2xl bg-[#d4af37]/10 text-[#d4af37] flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">menu_book</span>
            </div>
            <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
              No Courses Found in Database
            </h3>
            <p className="font-serif text-sm text-[var(--text-muted)] max-w-md">
              The Supabase database currently does not return any active courses.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Courses Selection List */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)]">
                <span className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">
                  Existing Academic Courses ({courses.length})
                </span>
                <span className="font-serif text-xs text-[var(--text-muted)]">
                  Click a course to inspect
                </span>
              </div>

              <div className="space-y-3">
                {courses.map((course) => {
                  const isSelected = selectedCourse?.id === course.id;
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => setSelectedCourse(course)}
                      className={`w-full text-left p-4 sm:p-5 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                        isSelected
                          ? "bg-[#d4af37]/10 dark:bg-[#d4af37]/15 border-[#d4af37] shadow-xs ring-1 ring-[#d4af37]/40"
                          : "bg-white dark:bg-[#141418] border-[var(--surface-border)] hover:border-[#d4af37]/60 hover:bg-[#f9f5ed]/40 dark:hover:bg-[#1a1a20]"
                      }`}
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? "bg-[#d4af37] text-[#141416] border-[#d4af37]"
                              : "bg-[var(--surface-low)] text-[var(--text-muted)] border-[var(--surface-border)]"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[22px]">
                            school
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/25">
                              {course.level || "Curriculum"}
                            </span>
                            <span className="font-mono text-[11px] text-[var(--text-muted)]">
                              /{course.slug}
                            </span>
                          </div>
                          <h3 className="font-display text-base font-bold text-[var(--text-main)] truncate mt-1">
                            {course.title}
                          </h3>
                          <p className="font-serif text-xs text-[var(--text-muted)] line-clamp-2 mt-1">
                            {course.description || "No description provided."}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider ${
                            course.is_published
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                              : "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/25"
                          }`}
                        >
                          {course.is_published ? "Published" : "Draft"}
                        </span>
                        <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)]">
                          chevron_right
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Selected Course Preparation View */}
            <div className="lg:col-span-5 sticky top-28">
              {selectedCourse ? (
                <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--surface-border)]">
                    <div>
                      <span className="font-display text-[10px] uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                        Course Preparation View
                      </span>
                      <h3 className="font-display text-xl font-bold text-[var(--text-main)] mt-0.5">
                        {selectedCourse.title}
                      </h3>
                    </div>

                    <a
                      href={`/courses/${selectedCourse.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                      title="View course on public website in new tab"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        open_in_new
                      </span>
                    </a>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-[var(--surface-low)]/50 border border-[var(--surface-border)]">
                      <span className="font-display text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block">
                        CEFR Level
                      </span>
                      <span className="font-display font-bold text-[var(--text-main)] mt-0.5 block">
                        {selectedCourse.level || "Standard"}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--surface-low)]/50 border border-[var(--surface-border)]">
                      <span className="font-display text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block">
                        Catalog Status
                      </span>
                      <span
                        className={`font-display font-bold mt-0.5 block ${
                          selectedCourse.is_published
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {selectedCourse.is_published ? "Live / Published" : "Draft"}
                      </span>
                    </div>
                  </div>

                  {/* Course Slug & ID */}
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-lg bg-[var(--surface-low)]/30 border border-[var(--surface-border)]">
                      <span className="font-display text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block">
                        URL Slug
                      </span>
                      <span className="font-mono text-xs text-[var(--text-main)] mt-0.5 block">
                        {selectedCourse.slug}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--surface-low)]/30 border border-[var(--surface-border)]">
                      <span className="font-display text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block">
                        Database Identifier
                      </span>
                      <span className="font-mono text-[11px] text-[var(--text-muted)] mt-0.5 block truncate">
                        {selectedCourse.id}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <span className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Curriculum Description
                    </span>
                    <p className="font-serif text-xs sm:text-sm text-[var(--text-main)] leading-relaxed">
                      {selectedCourse.description || "No description currently recorded in the database."}
                    </p>
                  </div>

                  {/* Preparation Notice */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-display text-xs font-bold">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      <span>Preparation Mode</span>
                    </div>
                    <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                      Editing forms, syllabus modification, and publish buttons are deliberately disabled during this step. Full course authoring will be integrated in subsequent phases.
                    </p>
                  </div>

                  {/* Back Link */}
                  <div className="pt-2">
                    <Link
                      href="/admin/dashboard"
                      className="w-full py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-center font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors block"
                    >
                      ← Back to Dashboard
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-8 text-center text-xs text-[var(--text-muted)]">
                  Select a course from the list to inspect its configuration.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
