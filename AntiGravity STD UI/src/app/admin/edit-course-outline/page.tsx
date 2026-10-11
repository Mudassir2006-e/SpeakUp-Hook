"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  getCentralCoursesAction,
  getCourseCurriculumAction,
  addCourseModuleAction,
  updateCourseModuleAction,
  deleteCourseModuleAction,
  reorderCourseModulesAction,
  saveCourseLessonAction,
  deleteCourseLessonAction,
  reorderCourseLessonsAction,
} from "../cms-actions";

export default function AdminEditCourseOutlinePage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [modules, setModules] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<{ id?: string; title: string; description: string } | null>(null);

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [activeModuleIdForLesson, setActiveModuleIdForLesson] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<{
    id?: string;
    title: string;
    duration: string;
    video_url: string;
    notes: string;
    practice: string;
    assignment_title: string;
    assignment_instructions: string;
    link_button_text?: string;
    link_button_url?: string;
    link_button_description?: string;
    link_button_enabled?: boolean;
  } | null>(null);

  const [savingAction, setSavingAction] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  // Load Courses
  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await getCentralCoursesAction();
      if (res.success && res.data) {
        setCourses(res.data);
        if (res.data.length > 0) {
          // If current selectedCourseId is not valid, default to first course
          if (!selectedCourseId || !res.data.some((c: any) => c.id === selectedCourseId)) {
            setSelectedCourseId(res.data[0].id);
          }
        } else {
          setSelectedCourseId("");
          setModules([]);
        }
      } else {
        showToast("error", res.error || "Failed to load courses.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load courses.");
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Load Curriculum for Selected Course
  const loadCurriculum = async (courseId: string) => {
    if (!courseId) {
      setModules([]);
      return;
    }
    setLoadingCurriculum(true);
    try {
      const res = await getCourseCurriculumAction(courseId);
      if (res.success && res.data) {
        setModules(res.data.modules || []);
      } else {
        setModules([]);
      }
    } catch (err) {
      console.error("Failed to load curriculum:", err);
      setModules([]);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadCurriculum(selectedCourseId);
    }
  }, [selectedCourseId]);

  const activeCourse = courses.find((c) => c.id === selectedCourseId);

  // Module Handlers
  const handleOpenAddModule = () => {
    setEditingModule({
      title: `Module ${modules.length + 1}`,
      description: "",
    });
    setModuleModalOpen(true);
  };

  const handleOpenEditModule = (mod: any) => {
    setEditingModule({
      id: mod.id,
      title: mod.title,
      description: mod.description || "",
    });
    setModuleModalOpen(true);
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule || !editingModule.title.trim()) {
      showToast("error", "Module title is required.");
      return;
    }

    setSavingAction(true);
    try {
      if (editingModule.id) {
        const res = await updateCourseModuleAction(
          selectedCourseId,
          editingModule.id,
          editingModule.title,
          editingModule.description
        );
        if (res.success) {
          showToast("success", "Module updated.");
          setModuleModalOpen(false);
          await loadCurriculum(selectedCourseId);
        } else {
          showToast("error", res.error || "Failed to update module.");
        }
      } else {
        const res = await addCourseModuleAction(
          selectedCourseId,
          editingModule.title,
          editingModule.description
        );
        if (res.success) {
          showToast("success", "Module created.");
          setModuleModalOpen(false);
          await loadCurriculum(selectedCourseId);
        } else {
          showToast("error", res.error || "Failed to add module.");
        }
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to save module.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm("Are you sure you want to delete this module and its lessons?")) {
      return;
    }

    try {
      const res = await deleteCourseModuleAction(selectedCourseId, moduleId);
      if (res.success) {
        showToast("success", "Module deleted.");
        await loadCurriculum(selectedCourseId);
      } else {
        showToast("error", res.error || "Failed to delete module.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to delete module.");
    }
  };

  const handleMoveModule = async (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= modules.length) return;

    const newModules = [...modules];
    const temp = newModules[index];
    newModules[index] = newModules[targetIdx];
    newModules[targetIdx] = temp;

    setModules(newModules);
    try {
      await reorderCourseModulesAction(
        selectedCourseId,
        newModules.map((m) => m.id)
      );
      showToast("success", "Modules reordered.");
    } catch {
      showToast("error", "Failed to reorder modules.");
      await loadCurriculum(selectedCourseId);
    }
  };

  // Lesson Handlers
  const handleOpenAddLesson = (moduleId: string) => {
    setActiveModuleIdForLesson(moduleId);
    const mod = modules.find((m) => m.id === moduleId);
    const lessonCount = mod?.lessons?.length || 0;
    setEditingLesson({
      title: `Lesson ${lessonCount + 1}: `,
      duration: "Included LMS",
      video_url: "",
      notes: "",
      practice: "",
      assignment_title: "",
      assignment_instructions: "",
      link_button_text: "Open Learning Resource",
      link_button_url: "",
      link_button_description: "",
      link_button_enabled: false,
    });
    setLessonModalOpen(true);
  };

  const handleOpenEditLesson = (moduleId: string, lesson: any) => {
    setActiveModuleIdForLesson(moduleId);
    setEditingLesson({
      id: lesson.id,
      title: lesson.title,
      duration: lesson.duration || "Included LMS",
      video_url: lesson.video_url || "",
      notes: lesson.notes || "",
      practice: lesson.practice || "",
      assignment_title: lesson.assignment_title || "",
      assignment_instructions: lesson.assignment_instructions || "",
      link_button_text: lesson.link_button?.text || lesson.link_button_text || "Open Learning Resource",
      link_button_url: lesson.link_button?.url || lesson.link_button_url || "",
      link_button_description: lesson.link_button?.description || lesson.link_button_description || "",
      link_button_enabled: lesson.link_button?.enabled ?? lesson.link_button_enabled ?? false,
    });
    setLessonModalOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleIdForLesson || !editingLesson || !editingLesson.title.trim()) {
      showToast("error", "Lesson title is required.");
      return;
    }

    setSavingAction(true);
    try {
      const res = await saveCourseLessonAction(selectedCourseId, activeModuleIdForLesson, {
        id: editingLesson.id,
        title: editingLesson.title,
        duration: editingLesson.duration,
        video_url: editingLesson.video_url,
        notes: editingLesson.notes,
        practice: editingLesson.practice,
        assignment_title: editingLesson.assignment_title,
        assignment_instructions: editingLesson.assignment_instructions,
        link_button_text: editingLesson.link_button_text,
        link_button_url: editingLesson.link_button_url,
        link_button_description: editingLesson.link_button_description,
        link_button_enabled: editingLesson.link_button_enabled,
      });

      if (res.success) {
        showToast("success", editingLesson.id ? "Lesson updated." : "Lesson added.");
        setLessonModalOpen(false);
        await loadCurriculum(selectedCourseId);
      } else {
        showToast("error", res.error || "Failed to save lesson.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to save lesson.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!window.confirm("Are you sure you want to delete this lesson?")) {
      return;
    }

    try {
      const res = await deleteCourseLessonAction(selectedCourseId, moduleId, lessonId);
      if (res.success) {
        showToast("success", "Lesson deleted.");
        await loadCurriculum(selectedCourseId);
      } else {
        showToast("error", res.error || "Failed to delete lesson.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to delete lesson.");
    }
  };

  const handleMoveLesson = async (moduleId: string, lessonIndex: number, direction: "up" | "down") => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod || !Array.isArray(mod.lessons)) return;

    const targetIdx = direction === "up" ? lessonIndex - 1 : lessonIndex + 1;
    if (targetIdx < 0 || targetIdx >= mod.lessons.length) return;

    const newLessons = [...mod.lessons];
    const temp = newLessons[lessonIndex];
    newLessons[lessonIndex] = newLessons[targetIdx];
    newLessons[targetIdx] = temp;

    const newModules = modules.map((m) => (m.id === moduleId ? { ...m, lessons: newLessons } : m));
    setModules(newModules);

    try {
      await reorderCourseLessonsAction(
        selectedCourseId,
        moduleId,
        newLessons.map((l) => l.id)
      );
      showToast("success", "Lessons reordered.");
    } catch {
      showToast("error", "Failed to reorder lessons.");
      await loadCurriculum(selectedCourseId);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#faf8f5] dark:bg-[#0c0c0e]">
      <AdminHeader
        title="Course Outline"
        subtitle="Manage course curriculum: Modules, Lessons, Notes, and Assignments"
      />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Toast */}
        {toast && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between shadow-md transition-all ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-950/40 border-red-500/30 text-red-800 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px]">
                {toast.type === "success" ? "check_circle" : "error"}
              </span>
              <span className="font-display text-sm font-semibold">{toast.text}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-current opacity-70 hover:opacity-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* ================= SECTION 1: COURSE SELECTOR ================= */}
        <div className="bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
                <span className="font-display text-xs uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                  Course Outline Selector
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                Course Outline
              </h2>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                Select a course from the list below to switch and view its isolated curriculum. Course settings remain separate in Courses management.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/courses"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white hover:bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px] text-[#d4af37]">school</span>
                <span>Manage Courses</span>
              </Link>
              <Link
                href="/course-outline"
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>View Public Outline</span>
              </Link>
            </div>
          </div>

          {/* Course Selector Dropdown & Switcher */}
          {loadingCourses ? (
            <div className="py-4 text-xs font-serif text-[var(--text-muted)]">Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#f9f5ed]/50 dark:bg-[var(--surface-low)]/40 border border-dashed border-[var(--surface-border)] space-y-2">
              <span className="material-symbols-outlined text-[32px] text-[var(--text-muted)]">school</span>
              <p className="font-display text-sm font-bold text-[var(--text-main)]">No courses available</p>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                Create a course in Courses management first to begin organizing its outline.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/courses"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141416] text-white dark:bg-[#d4af37] dark:text-[#141416] font-display text-xs uppercase tracking-wider font-bold"
                >
                  Create Course
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-[var(--surface-border)]">
              {/* Dropdown Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] shrink-0">
                  Switch Active Course:
                </label>
                <div className="relative flex-1 max-w-md">
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-[#d4af37]/60 bg-white dark:bg-[#141418] text-[var(--text-main)] font-display text-sm font-bold focus:outline-none focus:border-[#d4af37] shadow-xs cursor-pointer"
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} ({course.level || "Curriculum"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Course Switcher Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {courses.map((course) => {
                  const isSelected = course.id === selectedCourseId;
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => setSelectedCourseId(course.id)}
                      className={`px-3.5 py-2 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                        isSelected
                          ? "bg-[#141416] text-white dark:bg-[#d4af37] dark:text-[#141416] ring-2 ring-[#d4af37]/50"
                          : "bg-white dark:bg-[#141418] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--surface-border)] hover:border-[#d4af37]/60"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isSelected ? "check_circle" : "menu_book"}
                      </span>
                      <span>{course.title}</span>
                      {course.level && (
                        <span className="text-[10px] opacity-75 font-mono">
                          [{course.level}]
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ================= SECTION 2: CURRICULUM WORKSPACE ================= */}
        {selectedCourseId && activeCourse && (
          <div className="space-y-6">
            {/* Active Course Banner */}
            <div className="bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] font-display text-[10px] uppercase tracking-wider font-bold border border-[#d4af37]/30">
                    {activeCourse.level || "Academic Series"}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-mono">
                    ID: {activeCourse.id}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-bold text-[var(--text-main)]">
                  {activeCourse.title} — Modules &amp; Lessons
                </h3>
                <p className="font-serif text-sm text-[var(--text-muted)] max-w-3xl">
                  {activeCourse.description || "Course outline and module syllabus."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModule}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#141416] hover:bg-[#222228] dark:bg-[#d4af37] dark:hover:bg-[#e4c665] text-white dark:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Add Module</span>
              </button>
            </div>

            {/* Modules List */}
            {loadingCurriculum ? (
              <div className="p-12 text-center text-sm font-serif text-[var(--text-muted)]">
                Loading curriculum for {activeCourse.title}...
              </div>
            ) : modules.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-12 text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[28px]">format_list_bulleted</span>
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h4 className="font-display text-lg font-bold text-[var(--text-main)]">
                    No Modules Defined Yet
                  </h4>
                  <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                    This course has no modules. Define its curriculum structure without affecting any other courses.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOpenAddModule}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white hover:bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#d4af37]">add</span>
                    <span>Add First Module</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {modules.map((mod, modIdx) => (
                  <div
                    key={mod.id || modIdx}
                    className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] shadow-xs overflow-hidden"
                  >
                    {/* Module Header Bar */}
                    <div className="p-5 sm:p-6 bg-[#f9f5ed]/40 dark:bg-[var(--surface-low)]/40 border-b border-[var(--surface-border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#141416] text-white dark:bg-[#d4af37] dark:text-[#141416] font-display text-[10px] uppercase tracking-wider font-bold">
                            Module {modIdx + 1}
                          </span>
                          <h4 className="font-display text-lg font-bold text-[var(--text-main)]">
                            {mod.title}
                          </h4>
                        </div>
                        {mod.description && (
                          <p className="font-serif text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                            {mod.description}
                          </p>
                        )}
                      </div>

                      {/* Module Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Reorder Up/Down */}
                        <button
                          type="button"
                          disabled={modIdx === 0}
                          onClick={() => handleMoveModule(modIdx, "up")}
                          className="p-1.5 rounded-lg border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 cursor-pointer"
                          title="Move Module Up"
                        >
                          <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                        </button>
                        <button
                          type="button"
                          disabled={modIdx === modules.length - 1}
                          onClick={() => handleMoveModule(modIdx, "down")}
                          className="p-1.5 rounded-lg border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 cursor-pointer"
                          title="Move Module Down"
                        >
                          <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                        </button>

                        {/* Edit Module */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModule(mod)}
                          className="p-1.5 rounded-lg border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[#d4af37] hover:bg-white dark:hover:bg-[var(--surface-low)] transition-all cursor-pointer"
                          title="Edit Module Details"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>

                        {/* Add Lesson */}
                        <button
                          type="button"
                          onClick={() => handleOpenAddLesson(mod.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141416] text-white dark:bg-[#d4af37] dark:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          <span>Add Lesson</span>
                        </button>

                        {/* Delete Module */}
                        <button
                          type="button"
                          onClick={() => handleDeleteModule(mod.id)}
                          className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                          title="Delete Module"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Lessons Under Module */}
                    <div className="p-5 sm:p-6 space-y-3">
                      {!mod.lessons || mod.lessons.length === 0 ? (
                        <div className="p-6 text-center border border-dashed border-[var(--surface-border)] rounded-xl text-xs font-serif text-[var(--text-muted)]">
                          No lessons added to this module yet. Click &quot;Add Lesson&quot; to attach video lessons, notes, and assignments.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {mod.lessons.map((les: any, lesIdx: number) => (
                            <div
                              key={les.id || lesIdx}
                              className="p-4 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37]/40 bg-[#fbf9f6] dark:bg-[var(--surface-low)]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                            >
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                                    {lesIdx + 1}.
                                  </span>
                                  <h5 className="font-display text-sm font-bold text-[var(--text-main)]">
                                    {les.title}
                                  </h5>
                                  {les.duration && (
                                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                      ({les.duration})
                                    </span>
                                  )}
                                </div>

                                {/* Content tags: Video, Notes, Practice, Assignment */}
                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-display uppercase tracking-wider font-semibold">
                                  {les.video_url ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                      <span className="material-symbols-outlined text-[14px]">videocam</span>
                                      Video Attached
                                    </span>
                                  ) : (
                                    <span className="text-[var(--text-muted)]">No video</span>
                                  )}

                                  {les.notes && (
                                    <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                      <span className="material-symbols-outlined text-[14px]">description</span>
                                      Notes
                                    </span>
                                  )}

                                  {les.assignment_title && (
                                    <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                      <span className="material-symbols-outlined text-[14px]">assignment</span>
                                      Assignment
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Lesson Controls */}
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                <button
                                  type="button"
                                  disabled={lesIdx === 0}
                                  onClick={() => handleMoveLesson(mod.id, lesIdx, "up")}
                                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-20 cursor-pointer"
                                  title="Move Lesson Up"
                                >
                                  <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={lesIdx === mod.lessons.length - 1}
                                  onClick={() => handleMoveLesson(mod.id, lesIdx, "down")}
                                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-20 cursor-pointer"
                                  title="Move Lesson Down"
                                >
                                  <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditLesson(mod.id, les)}
                                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[#d4af37] cursor-pointer"
                                  title="Edit Lesson Content"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLesson(mod.id, les.id)}
                                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
                                  title="Delete Lesson"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal: Add/Edit Module */}
        {moduleModalOpen && editingModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-4">
                <h4 className="font-display text-lg font-bold text-[var(--text-main)]">
                  {editingModule.id ? "Edit Module" : "Add Module / Week"}
                </h4>
                <button
                  type="button"
                  onClick={() => setModuleModalOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveModule} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Module Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingModule.title}
                    onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                    placeholder="e.g., Module 1: Foundations & Syntax"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Module Description
                  </label>
                  <textarea
                    rows={3}
                    value={editingModule.description}
                    onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                    placeholder="Summary of core competencies and grammar concepts..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                  <button
                    type="button"
                    onClick={() => setModuleModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="px-5 py-2.5 rounded-xl bg-[#141416] hover:bg-[#222228] dark:bg-[#d4af37] dark:hover:bg-[#e4c665] text-white dark:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {savingAction ? "Saving..." : editingModule.id ? "Update Module" : "Create Module"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add/Edit Lesson */}
        {lessonModalOpen && editingLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-4">
                <h4 className="font-display text-lg font-bold text-[var(--text-main)]">
                  {editingLesson.id ? "Edit Lesson Content" : "Add Lesson to Module"}
                </h4>
                <button
                  type="button"
                  onClick={() => setLessonModalOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveLesson} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      Lesson Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingLesson.title}
                      onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                      placeholder="e.g., Lesson 1: Introduction to Grammar"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      Lesson Duration
                    </label>
                    <input
                      type="text"
                      value={editingLesson.duration}
                      onChange={(e) => setEditingLesson({ ...editingLesson, duration: e.target.value })}
                      placeholder="e.g., Included LMS"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Video URL (YouTube or Direct Video Stream)
                  </label>
                  <input
                    type="url"
                    value={editingLesson.video_url}
                    onChange={(e) => setEditingLesson({ ...editingLesson, video_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Lesson Academic Notes / Handout
                  </label>
                  <textarea
                    rows={3}
                    value={editingLesson.notes}
                    onChange={(e) => setEditingLesson({ ...editingLesson, notes: e.target.value })}
                    placeholder="Key concepts, vocabulary rules, and study guidelines..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="border-t border-[var(--surface-border)] pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#d4af37]">assignment</span>
                    <span className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      Assignment &amp; Practice Drills
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
                      Assignment Title
                    </label>
                    <input
                      type="text"
                      value={editingLesson.assignment_title}
                      onChange={(e) => setEditingLesson({ ...editingLesson, assignment_title: e.target.value })}
                      placeholder="e.g., Sentence Reconstruction Drill 1"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
                      Assignment Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={editingLesson.assignment_instructions}
                      onChange={(e) => setEditingLesson({ ...editingLesson, assignment_instructions: e.target.value })}
                      placeholder="Instructions for the student submission..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="border-t border-[var(--surface-border)] pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#d4af37]">link</span>
                      <span className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        Resource Link Button (Optional)
                      </span>
                    </div>

                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(editingLesson.link_button_enabled)}
                        onChange={(e) =>
                          setEditingLesson({
                            ...editingLesson,
                            link_button_enabled: e.target.checked,
                          })
                        }
                        className="rounded border-[var(--surface-border)] text-[#d4af37] focus:ring-[#d4af37]"
                      />
                      <span className="font-display text-[11px] font-bold text-[var(--text-main)] uppercase tracking-wider">
                        {editingLesson.link_button_enabled ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
                        Button Text
                      </label>
                      <input
                        type="text"
                        value={editingLesson.link_button_text || ""}
                        onChange={(e) =>
                          setEditingLesson({ ...editingLesson, link_button_text: e.target.value })
                        }
                        placeholder="Open Learning Resource"
                        className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
                        Link URL (http:// or https://)
                      </label>
                      <input
                        type="text"
                        value={editingLesson.link_button_url || ""}
                        onChange={(e) =>
                          setEditingLesson({ ...editingLesson, link_button_url: e.target.value })
                        }
                        placeholder="https://example.com/resource"
                        className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-transparent text-xs font-mono text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
                      Optional Short Description
                    </label>
                    <input
                      type="text"
                      value={editingLesson.link_button_description || ""}
                      onChange={(e) =>
                        setEditingLesson({ ...editingLesson, link_button_description: e.target.value })
                      }
                      placeholder="e.g. Reference grammar guide & external drills"
                      className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-transparent text-xs text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  {editingLesson.link_button_enabled && editingLesson.link_button_url && (
                    <div className="p-3 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)]/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider font-bold bg-[#d4af37] text-[#141416]">
                          <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                          <span>{editingLesson.link_button_text?.trim() || "Open Learning Resource"}</span>
                        </span>
                        {editingLesson.link_button_description && (
                          <span className="text-[11px] text-[var(--text-muted)] font-serif italic truncate max-w-xs">
                            {editingLesson.link_button_description}
                          </span>
                        )}
                      </div>
                      <a
                        href={editingLesson.link_button_url.startsWith("http") ? editingLesson.link_button_url : `https://${editingLesson.link_button_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-display text-[#d4af37] hover:underline shrink-0"
                      >
                        Test Link
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                  <button
                    type="button"
                    onClick={() => setLessonModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="px-5 py-2.5 rounded-xl bg-[#141416] hover:bg-[#222228] dark:bg-[#d4af37] dark:hover:bg-[#e4c665] text-white dark:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {savingAction ? "Saving..." : editingLesson.id ? "Update Lesson" : "Add Lesson"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
