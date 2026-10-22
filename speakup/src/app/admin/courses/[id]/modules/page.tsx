"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { createClient } from "@/lib/supabase/client";
import {
  createModule,
  updateModule,
  reorderModule,
  deleteModule,
} from "@/app/admin/actions";

interface ModuleRecord {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  lesson_count: number;
}

interface CourseHeaderInfo {
  id: string;
  title: string;
  slug: string;
  level: string;
}

export default function AdminCourseModulesPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const [course, setCourse] = useState<CourseHeaderInfo | null>(null);
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create Module Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Edit Module Modal State
  const [editingModule, setEditingModule] = useState<ModuleRecord | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const loadData = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch course details
      const { data: courseData } = await supabase
        .from("courses")
        .select("id, title, slug, level")
        .eq("id", courseId)
        .maybeSingle();

      if (courseData) {
        setCourse(courseData as CourseHeaderInfo);
      }

      // 2. Fetch modules for this course
      const { data: modulesData, error: modulesErr } = await supabase
        .from("modules")
        .select("id, course_id, title, description, order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (modulesErr) {
        console.error("Error loading modules:", modulesErr);
      }

      const rawModules = (modulesData as any[]) || [];

      // 3. Fetch lesson counts per module
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("id, module_id");

      const lessonCounts = new Map<string, number>();
      ((lessonsData as any[]) || []).forEach((l) => {
        lessonCounts.set(l.module_id, (lessonCounts.get(l.module_id) || 0) + 1);
      });

      const list: ModuleRecord[] = rawModules.map((m) => ({
        id: m.id,
        course_id: m.course_id,
        title: m.title,
        description: m.description || "",
        order_index: m.order_index,
        lesson_count: lessonCounts.get(m.id) || 0,
      }));

      setModules(list);
    } catch (err) {
      console.error("Unexpected error in modules load:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  // Action: Create Module
  const handleCreateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    startTransition(async () => {
      const res = await createModule(courseId, {
        title: newTitle,
        description: newDescription,
      });

      if (res.success) {
        setFeedback({ type: "success", text: `Module "${newTitle}" created.` });
        setShowCreateModal(false);
        setNewTitle("");
        setNewDescription("");
        loadData();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to create module." });
      }
    });
  };

  // Action: Edit Module
  const handleStartEdit = (mod: ModuleRecord) => {
    setEditingModule(mod);
    setEditTitle(mod.title);
    setEditDescription(mod.description);
  };

  const handleUpdateModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule || !editTitle.trim()) return;

    startTransition(async () => {
      const res = await updateModule(editingModule.id, courseId, {
        title: editTitle,
        description: editDescription,
      });

      if (res.success) {
        setFeedback({ type: "success", text: `Module updated.` });
        setEditingModule(null);
        loadData();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update module." });
      }
    });
  };

  // Action: Reorder Module (Up / Down)
  const handleReorder = (moduleId: string, direction: "up" | "down") => {
    startTransition(async () => {
      const res = await reorderModule(moduleId, courseId, direction);
      if (res.success) {
        loadData();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to reorder module." });
      }
    });
  };

  // Action: Delete Module
  const handleDeleteModule = (mod: ModuleRecord) => {
    if (mod.lesson_count > 0) {
      const confirmed = confirm(
        `Warning: This module contains ${mod.lesson_count} lesson(s). Deleting this module will delete all associated lessons. Do you wish to proceed?`
      );
      if (!confirmed) return;

      startTransition(async () => {
        const res = await deleteModule(mod.id, courseId, true);
        if (res.success) {
          setFeedback({ type: "success", text: `Module "${mod.title}" and its lessons deleted.` });
          loadData();
        } else {
          setFeedback({ type: "error", text: res.error || "Failed to delete module." });
        }
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete module "${mod.title}"?`)) return;

    startTransition(async () => {
      const res = await deleteModule(mod.id, courseId, false);
      if (res.success) {
        setFeedback({ type: "success", text: `Module "${mod.title}" deleted.` });
        loadData();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to delete module." });
      }
    });
  };

  return (
    <div>
      <AdminHeader
        title={course ? `${course.title} — Curriculum Modules` : "Course Curriculum Modules"}
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
          <span className="text-[#8a6d1b] dark:text-[#d4af37] font-bold">Modules</span>
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

        {/* Action Header Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <span className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Configured Modules: {modules.length}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer shadow-2xs"
              title="Refresh Modules"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                refresh
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setShowCreateModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Add Module</span>
            </button>
          </div>
        </div>

        {/* Modules List / Empty State */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)]">
            <span className="material-symbols-outlined animate-spin text-3xl text-[#d4af37]">
              progress_activity
            </span>
            <p className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Loading Modules...
            </p>
          </div>
        ) : modules.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-16 text-center space-y-4 max-w-md mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#d4af37]/10 text-[#d4af37] flex items-center justify-center mx-auto border border-[#d4af37]/20">
              <span className="material-symbols-outlined text-[32px]">view_module</span>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                No Modules Added Yet
              </h3>
              <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                This course does not have any modules configured. Add the first module to start organizing learning lessons.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Create First Module</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((mod, index) => (
              <div
                key={mod.id}
                className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 hover:border-[#d4af37]/40 transition-all"
              >
                {/* Module Ordering & Info */}
                <div className="flex items-start gap-4">
                  {/* Sequence Badge & Reorder Controls */}
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <span className="w-8 h-8 rounded-xl bg-[#fdfbf7] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-center justify-center font-display text-xs font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                      {index + 1}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isPending || index === 0}
                        onClick={() => handleReorder(mod.id, "up")}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Move Up"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                      </button>

                      <button
                        type="button"
                        disabled={isPending || index === modules.length - 1}
                        onClick={() => handleReorder(mod.id, "down")}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                        title="Move Down"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-base font-bold text-[var(--text-main)] tracking-tight">
                        {mod.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                        {mod.lesson_count} Lesson{mod.lesson_count === 1 ? "" : "s"}
                      </span>
                    </div>

                    {mod.description && (
                      <p className="font-serif text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {mod.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Link
                    href={`/admin/courses/${courseId}/modules/${mod.id}`}
                    className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">play_lesson</span>
                    <span>Manage Lessons</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleStartEdit(mod)}
                    className="p-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                    title="Edit Module Details"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDeleteModule(mod)}
                    className="p-2 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-600 transition-colors cursor-pointer disabled:opacity-40"
                    title="Delete Module"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Module Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#151518] border border-[var(--surface-border)] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#d4af37] text-[20px]">
                    add_circle
                  </span>
                  <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                    Add Module
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateModule} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                    Module Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Module 1: The Foundations of Articulation"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Key concepts covered in this module..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] text-[var(--text-muted)] font-display text-xs uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !newTitle.trim()}
                    className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>{isPending ? "Creating..." : "Save Module"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Module Modal */}
        {editingModule && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#151518] border border-[var(--surface-border)] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#d4af37] text-[20px]">edit</span>
                  <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                    Edit Module Details
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleUpdateModule} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                    Module Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                  <button
                    type="button"
                    onClick={() => setEditingModule(null)}
                    className="px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] text-[var(--text-muted)] font-display text-xs uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !editTitle.trim()}
                    className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>{isPending ? "Saving..." : "Update Module"}</span>
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
