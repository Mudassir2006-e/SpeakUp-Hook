"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getCentralCoursesAction, getCourseCurriculumAction } from "@/app/admin/cms-actions";

interface LessonData {
  id: string;
  title: string;
  duration?: string;
  video_url?: string;
  notes?: string;
  practice?: string;
  assignment_title?: string;
  assignment_instructions?: string;
}

interface ModuleData {
  id: string;
  title: string;
  duration?: string;
  description?: string;
  order_index?: number;
  lessons?: LessonData[];
}

function CourseOutlineContent() {
  const searchParams = useSearchParams();
  const courseParam = searchParams.get("course")?.toLowerCase() || "";

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch real central courses
  useEffect(() => {
    async function loadCourses() {
      setLoadingCourses(true);
      try {
        const res = await getCentralCoursesAction();
        if (res.success && res.data && res.data.length > 0) {
          const publishedCourses = res.data.filter((c: any) => c.status === "published");
          const listToUse = publishedCourses.length > 0 ? publishedCourses : res.data;
          setCourses(listToUse);

          // Find course matching URL param or default to first
          const matched = courseParam
            ? listToUse.find(
                (c: any) =>
                  c.id.toLowerCase() === courseParam ||
                  c.slug?.toLowerCase() === courseParam ||
                  c.title.toLowerCase().includes(courseParam)
              )
            : null;

          const activeId = matched ? matched.id : listToUse[0]?.id || "";
          setSelectedCourseId(activeId);
        } else {
          setCourses([]);
          setSelectedCourseId("");
          setModules([]);
        }
      } catch (err) {
        console.error("Failed to load courses for outline:", err);
      } finally {
        setLoadingCourses(false);
      }
    }
    loadCourses();
  }, [courseParam]);

  // Load curriculum when selectedCourseId changes
  useEffect(() => {
    if (!selectedCourseId) return;

    async function loadCurriculum() {
      setLoadingCurriculum(true);
      try {
        const res = await getCourseCurriculumAction(selectedCourseId);
        if (res.success && res.data) {
          const mods = res.data.modules || [];
          setModules(mods);

          // Expand first 2 modules by default
          const initialExpanded: Record<string, boolean> = {};
          mods.slice(0, 2).forEach((m: any, idx: number) => {
            initialExpanded[m.id || idx] = true;
          });
          setExpandedModules(initialExpanded);
        } else {
          setModules([]);
        }
      } catch (err) {
        console.error("Failed to load curriculum:", err);
        setModules([]);
      } finally {
        setLoadingCurriculum(false);
      }
    }
    loadCurriculum();
  }, [selectedCourseId]);

  const activeCourse = courses.find((c) => c.id === selectedCourseId);

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  return (
    <div className="max-w-[1140px] mx-auto px-6 md:px-12 py-10">
      {/* Top Header Card */}
      <section className="mb-10 bg-[var(--surface-lowest)] border border-[var(--surface-border)] dark:border-white/10 p-8 md:p-12 shadow-xs rounded-2xl relative z-20">
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#d4af37]/5 dark:bg-[#d4af37]/10 rounded-full blur-3xl -mr-20 -mt-20" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center mb-6">
          <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)] mb-5">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-[var(--text-main)] font-extrabold tracking-[0.08em] uppercase">
              Course Outline
            </h1>
          </div>

          {activeCourse ? (
            <div className="flex items-center justify-center gap-3 sm:gap-4 my-2">
              <span className="h-px w-6 sm:w-12 bg-gradient-to-r from-transparent to-[#d4af37]/60" />
              <h2 className="font-display text-lg sm:text-xl md:text-2xl text-[#d4af37] font-semibold tracking-wide">
                {activeCourse.title.toLowerCase().endsWith("course")
                  ? activeCourse.title
                  : `${activeCourse.title} Course`}
              </h2>
              <span className="h-px w-6 sm:w-12 bg-gradient-to-l from-transparent to-[#d4af37]/60" />
            </div>
          ) : !loadingCourses && (
            <div className="py-4">
              <h2 className="font-display text-xl text-[var(--text-muted)] font-semibold">
                No courses available
              </h2>
            </div>
          )}
        </div>

        <div className="relative z-10 w-full h-px bg-[var(--surface-border)] my-6" />

        {/* Course Track Selector */}
        {courses.length > 0 && (
          <div className="relative z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-auto" ref={dropdownRef}>
              <label
                htmlFor="course-selector-btn"
                className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 text-left"
              >
                Select Course Track
              </label>
              <button
                id="course-selector-btn"
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
                className="w-full sm:w-[380px] bg-[var(--surface-low)] hover:bg-[var(--surface)] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] px-4 py-3 rounded-xl flex items-center justify-between shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
              >
                <div className="flex items-center gap-3 truncate text-left">
                  <span className="w-8 h-8 rounded-lg bg-[#d4af37]/15 text-[#d4af37] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">school</span>
                  </span>
                  <div className="truncate">
                    <div className="font-display text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">
                      {activeCourse?.title || "Choose a Course"}
                    </div>
                    <div className="font-serif text-[11px] text-[var(--text-muted)] truncate">
                      {activeCourse?.level || `${activeCourse?.duration_weeks || 4} Weeks Track`}
                    </div>
                  </div>
                </div>
                <span
                  className={`material-symbols-outlined text-[20px] text-[var(--text-muted)] transition-transform duration-200 shrink-0 ml-2 ${
                    dropdownOpen ? "rotate-180 text-[#d4af37]" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 top-full mt-2 w-full sm:w-[440px] max-h-[380px] overflow-y-auto custom-scroll rounded-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 focus:outline-none"
                >
                  <div className="px-3 py-1.5 text-[10px] font-display uppercase tracking-widest font-bold text-[#d4af37] border-b border-[var(--surface-border)] mb-1">
                    Available Programs
                  </div>
                  {courses.map((c) => {
                    const isSel = selectedCourseId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={isSel}
                        onClick={() => {
                          setSelectedCourseId(c.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                          isSel
                            ? "bg-[#d4af37]/15 text-[var(--text-main)] font-bold border border-[#d4af37]/40"
                            : "hover:bg-[var(--surface-low)] text-[var(--text-main)]"
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-display text-xs sm:text-[13px] font-bold text-[var(--text-main)]">
                            {c.title}
                          </div>
                          <div className="font-serif text-[11px] text-[var(--text-muted)]">
                            {c.level || `${c.duration_weeks || 4} Weeks`}
                          </div>
                        </div>
                        {isSel && (
                          <span className="material-symbols-outlined text-[#d4af37] text-[18px] shrink-0">
                            check
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Active Syllabus Tag */}
            {activeCourse && (
              <div className="hidden sm:flex items-center gap-2 self-end mb-1">
                <span className="font-display text-xs text-[var(--text-muted)]">Selected Track:</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-low)] text-xs font-display font-bold text-[#d4af37] border border-[#d4af37]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]"></span>
                  <span>{activeCourse.title}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Main Content Area */}
      {loadingCourses ? (
        <div className="p-16 text-center text-sm font-serif text-[var(--text-muted)]">
          Loading curriculum...
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-low)] border border-[var(--surface-border)] text-[#d4af37] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[32px]">school</span>
          </div>
          <h3 className="font-display text-2xl font-bold text-[var(--text-main)]">
            No courses available
          </h3>
          <p className="font-serif text-base text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
            There are currently no courses in the academic curriculum. Please check back later or contact administration.
          </p>
        </div>
      ) : loadingCurriculum ? (
        <div className="p-16 text-center text-sm font-serif text-[var(--text-muted)]">
          Loading course structure...
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] p-12 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[var(--surface-low)] border border-[var(--surface-border)] text-[#d4af37] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[28px]">format_list_bulleted</span>
          </div>
          <h4 className="font-display text-xl font-bold text-[var(--text-main)]">
            Curriculum Under Assembly
          </h4>
          <p className="font-serif text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
            The detailed curriculum syllabus for {activeCourse?.title} is being finalized.
          </p>
        </div>
      ) : (
        /* Accordion Modules */
        <div className="space-y-5 mb-16">
          {modules.map((module, idx) => {
            const modId = module.id || String(idx);
            const isExpanded = !!expandedModules[modId];
            const numStr = String(idx + 1).padStart(2, "0");

            return (
              <div
                key={modId}
                className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] dark:border-white/10 rounded-2xl overflow-hidden shadow-xs hover:border-[#d4af37]/40 dark:hover:border-[#d4af37]/50 transition-colors"
              >
                {/* Module Bar */}
                <div
                  onClick={() => toggleModule(modId)}
                  className="p-5 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none bg-[var(--surface-lowest)] hover:bg-[var(--surface-low)]/40 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] dark:border-white/10 text-[#d4af37] font-display font-bold text-lg flex items-center justify-center shrink-0">
                      {numStr}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--text-main)]">
                          {module.title}
                        </h3>
                      </div>
                      {module.description && (
                        <p className="font-serif text-sm sm:text-[14.5px] text-[var(--text-muted)] max-w-xl leading-relaxed">
                          {module.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                    <span
                      className={`material-symbols-outlined text-[20px] text-[var(--text-muted)] transition-transform duration-200 ${
                        isExpanded ? "rotate-180 text-[#d4af37]" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Lessons Expanded Content */}
                {isExpanded && module.lessons && module.lessons.length > 0 && (
                  <div className="border-t border-[var(--surface-border)] p-5 md:p-7 space-y-4 bg-[var(--surface-low)]/20">
                    <div className="grid grid-cols-1 gap-3">
                      {module.lessons.map((lesson, lesIdx) => (
                        <div
                          key={lesson.id || lesIdx}
                          className="p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                                {lesIdx + 1}.
                              </span>
                              <h5 className="font-display text-sm font-bold text-[var(--text-main)]">
                                {lesson.title}
                              </h5>
                            </div>
                            {lesson.notes && (
                              <p className="font-serif text-xs text-[var(--text-muted)] line-clamp-2">
                                {lesson.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 text-[11px] font-display font-bold text-[#8a6d1b] dark:text-[#d4af37] uppercase tracking-wider shadow-2xs">
                              Included LMS
                            </span>
                            {lesson.video_url && (
                              <span className="material-symbols-outlined text-[16px] text-emerald-500" title="Includes Video">
                                videocam
                              </span>
                            )}
                            {lesson.assignment_title && (
                              <span className="material-symbols-outlined text-[16px] text-purple-500" title="Includes Assignment">
                                assignment
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CTA Box */}
      <div className="text-center bg-[var(--surface-low)] border border-[#d4af37]/30 rounded-2xl p-10 max-w-2xl mx-auto shadow-xs">
        <h3 className="font-display text-2xl font-bold text-[var(--text-main)] mb-3">
          Book a Session
        </h3>
        <p className="font-serif text-[var(--text-muted)] text-base mb-6 leading-relaxed">
          Schedule a personalized academic consultation to evaluate course placement and reserve your cohort seat.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/book-session"
            className="bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all font-display text-xs uppercase tracking-widest font-bold px-8 py-4 rounded-full shadow-xs active:scale-95"
          >
            Book a Session
          </Link>
          <Link
            href="/pricing"
            className="border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-widest font-bold px-8 py-4 rounded-full transition-all"
          >
            View Course Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CourseOutlinePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<div className="p-16 text-center text-sm font-serif">Loading...</div>}>
          <CourseOutlineContent />
        </Suspense>
      </main>
    </div>
  );
}
