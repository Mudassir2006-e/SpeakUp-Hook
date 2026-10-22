"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { createClient } from "@/lib/supabase/client";
import {
  createLesson,
  reorderLesson,
  deleteLesson,
  updateModule,
} from "@/app/admin/actions";

interface ModuleHeader {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
}

interface CourseHeader {
  id: string;
  title: string;
  slug: string;
}

interface LessonItem {
  id: string;
  module_id: string;
  title: string;
  order_index: number;
  video_url: string | null;
  video_source: "youtube" | "google_drive" | "hosted" | "other";
  notes: string | null;
  practice_content: string | null;
  created_at: string;
}

export default function AdminModuleDetailPage() {
  const params = useParams();
  const courseId = params?.id as string;
  const moduleId = params?.moduleId as string;

  const [course, setCourse] = useState<CourseHeader | null>(null);
  const [moduleData, setModuleData] = useState<ModuleHeader | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quick Add Lesson Modal State
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [videoSource, setVideoSource] = useState<"youtube" | "google_drive" | "hosted" | "other">("youtube");
  const [videoUrl, setVideoUrl] = useState("");

  const loadData = async () => {
    if (!courseId || !moduleId) return;
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch course info
      const { data: cData } = await supabase
        .from("courses")
        .select("id, title, slug")
        .eq("id", courseId)
        .maybeSingle();
      if (cData) setCourse(cData as CourseHeader);

      // 2. Fetch module info
      const { data: mData } = await supabase
        .from("modules")
        .select("id, course_id, title, description, order_index")
        .eq("id", moduleId)
        .maybeSingle();
      if (mData) setModuleData(mData as ModuleHeader);

      // 3. Fetch lessons for this module
      const { data: lData, error: lErr } = await supabase
        .from("lessons")
        .select("id, module_id, title, order_index, video_url, video_source, notes, practice_content, created_at")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true });

      if (lErr) console.error("Error loading lessons:", lErr);
      setLessons((lData as LessonItem[]) || []);
    } catch (err) {
      console.error("Error loading module detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId, moduleId]);

  // Action: Create Lesson
  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;

    startTransition(async () => {
      const res = await createLesson(moduleId, courseId, {
        title: lessonTitle,
        video_source: videoSource,
        video_url: videoUrl.trim() || null,
      });

      if (res.success) {
        setFeedback({ type: "success", text: `Lesson "${lessonTitle}" created.` });
        setShowAddLessonModal(false);
        setLessonTitle("");
        setVideoUrl("");
        loadData();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to create lesson." });
      }
    });
  };

  // Action: Reorder Lesson (Up / Down)
  const handleReorder = (lessonId: string, direction: "up" | "down") => {
    startTransition(async () => {
      const res = await reorderLesson(lessonId, moduleId, courseId, direction);
      if (res.success) {
        loadData();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to reorder lesson." });
      }
    });
  };

  // Action: Delete Lesson
  const handleDeleteLesson = (lesson: LessonItem) => {
    if (!confirm(`Are you sure you want to delete lesson "${lesson.title}"?`)) return;

    startTransition(async () => {
      const res = await deleteLesson(lesson.id, moduleId, courseId);
      if (res.success) {
        setFeedback({ type: "success", text: `Lesson "${lesson.title}" deleted.` });
        loadData();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to delete lesson." });
      }
    });
  };

  return (
    <div>
      <AdminHeader
        title={moduleData ? `${moduleData.title} — Lessons` : "Module Lessons"}
        subtitle="SpeakUp Academic Administration & Access Control"
      />

      <div className="p-6 sm:p-8 max-w-[1360px] mx-auto space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-display uppercase tracking-wider text-[var(--text-muted)]">
          <Link
            href="/admin/courses"
            className="hover:text-[var(--text-main)] flex items-center gap-1 font-semibold"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>All Courses</span>
          </Link>
          <span>/</span>
          <Link
            href={`/admin/courses/${courseId}`}
            className="hover:text-[var(--text-main)] font-semibold truncate max-w-xs"
          >
            {course?.title || "Course"}
          </Link>
          <span>/</span>
          <Link
            href={`/admin/courses/${courseId}/modules`}
            className="hover:text-[var(--text-main)] font-semibold"
          >
            Modules
          </Link>
          <span>/</span>
          <span className="text-[#8a6d1b] dark:text-[#d4af37] font-bold truncate max-w-xs">
            {moduleData?.title || "Module"}
          </span>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-display font-semibold transition-all ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {feedback.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs uppercase tracking-wider underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Module Summary Banner */}
        {moduleData && (
          <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-display uppercase tracking-wider font-bold bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37]">
                  Module #{moduleData.order_index}
                </span>
                <span className="font-display text-xs text-[var(--text-muted)] font-semibold">
                  {lessons.length} Lesson{lessons.length === 1 ? "" : "s"}
                </span>
              </div>
              <h2 className="font-display text-xl font-bold text-[var(--text-main)] tracking-tight">
                {moduleData.title}
              </h2>
              {moduleData.description && (
                <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                  {moduleData.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setShowAddLessonModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Add Lesson</span>
              </button>
            </div>
          </div>
        )}

        {/* Lessons List / Empty State */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)]">
            <span className="material-symbols-outlined animate-spin text-3xl text-[#d4af37]">
              progress_activity
            </span>
            <p className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Loading Module Lessons...
            </p>
          </div>
        ) : lessons.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-16 text-center space-y-4 max-w-md mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#d4af37]/10 text-[#d4af37] flex items-center justify-center mx-auto border border-[#d4af37]/20">
              <span className="material-symbols-outlined text-[32px]">play_lesson</span>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                No Lessons In This Module Yet
              </h3>
              <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                Add lectures, video masterclasses, lecture notes, or interactive practice drills to this module.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddLessonModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add First Lesson</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 hover:border-[#d4af37]/40 transition-all group"
              >
                {/* Lesson Details & Reorder */}
                <div className="flex items-start gap-3.5">
                  {/* Sequence Badge & Reorder */}
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <span className="w-8 h-8 rounded-xl bg-[#fdfbf7] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-center justify-center font-display text-xs font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                      {index + 1}
                    </span>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={isPending || index === 0}
                        onClick={() => handleReorder(lesson.id, "up")}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Move Up"
                      >
                        <span className="material-symbols-outlined text-[15px]">arrow_upward</span>
                      </button>

                      <button
                        type="button"
                        disabled={isPending || index === lessons.length - 1}
                        onClick={() => handleReorder(lesson.id, "down")}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Move Down"
                      >
                        <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display text-base font-bold text-[var(--text-main)] tracking-tight">
                        {lesson.title}
                      </h4>

                      {/* Video Source Badge */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-display uppercase tracking-wider font-bold bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-muted)] border border-[var(--surface-border)] inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-[#d4af37]">
                          smart_display
                        </span>
                        <span>{lesson.video_source || "youtube"}</span>
                      </span>

                      {/* Notes & Practice Indicators */}
                      {lesson.notes && lesson.notes.trim() && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-display uppercase tracking-wider font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                          Notes Included
                        </span>
                      )}

                      {lesson.practice_content && lesson.practice_content.trim() && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-display uppercase tracking-wider font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                          Practice Drills
                        </span>
                      )}
                    </div>

                    {lesson.video_url ? (
                      <span className="font-mono text-[11px] text-[var(--text-muted)] truncate block max-w-md">
                        {lesson.video_url}
                      </span>
                    ) : (
                      <span className="font-serif text-[11px] text-[var(--text-muted)] italic block">
                        No video configured yet
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Link
                    href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
                    className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    <span>Edit Lesson Content</span>
                  </Link>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDeleteLesson(lesson)}
                    className="p-2 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-600 transition-colors cursor-pointer disabled:opacity-40"
                    title="Delete Lesson"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Add Lesson Modal */}
        {showAddLessonModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#151518] border border-[var(--surface-border)] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#d4af37] text-[20px]">
                    add_circle
                  </span>
                  <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                    Add Lesson to Module
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddLessonModal(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateLesson} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="e.g., Lesson 1: Vocal Resonators & Clarity"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                    Video Source Platform
                  </label>
                  <select
                    value={videoSource}
                    onChange={(e: any) => setVideoSource(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="youtube">YouTube (URL or embed ID)</option>
                    <option value="google_drive">Google Drive Video Link</option>
                    <option value="hosted">Direct Hosted / MP4 Video Link</option>
                    <option value="other">Other / Generic Video Source</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                    Video URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-mono focus:outline-none focus:border-[#d4af37]"
                  />
                  <p className="font-serif text-[11px] text-[var(--text-muted)] mt-1">
                    You can add or update video URLs, lecture notes, and practice drills anytime in the lesson editor.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                  <button
                    type="button"
                    onClick={() => setShowAddLessonModal(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] text-[var(--text-muted)] font-display text-xs uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !lessonTitle.trim()}
                    className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>{isPending ? "Adding..." : "Save Lesson"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
