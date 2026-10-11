"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { createClient } from "@/lib/supabase/client";
import { updateCourse, toggleCoursePublished, deleteCourse } from "@/app/admin/actions";

interface CourseDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  is_published: boolean;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminCourseSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [moduleCount, setModuleCount] = useState<number>(0);
  const [enrollmentCount, setEnrollmentCount] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [level, setLevel] = useState("A1 — Foundations");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const loadCourse = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch course details
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .maybeSingle();

      if (error || !data) {
        console.error("Course not found:", error);
        setCourse(null);
        setLoading(false);
        return;
      }

      const c = data as CourseDetail;
      setCourse(c);
      setTitle(c.title);
      setSlug(c.slug);
      setLevel(c.level || "A1 — Foundations");
      setDescription(c.description || "");
      setThumbnailUrl(c.thumbnail_url || "");
      setIsPublished(!!c.is_published);

      // 2. Fetch module count
      const { count: mCount } = await supabase
        .from("modules")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId);
      setModuleCount(mCount ?? 0);

      // 3. Fetch enrollment count
      const { count: eCount } = await supabase
        .from("course_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId);
      setEnrollmentCount(eCount ?? 0);
    } catch (err) {
      console.error("Failed to load course:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;

    startTransition(async () => {
      const res = await updateCourse(courseId, {
        title,
        slug,
        level,
        description,
        thumbnail_url: thumbnailUrl || null,
        is_published: isPublished,
      });

      if (res.success) {
        setFeedback({ type: "success", text: "Course settings successfully updated." });
        loadCourse();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update course." });
      }
    });
  };

  const handleTogglePublish = () => {
    startTransition(async () => {
      const nextStatus = !isPublished;
      const res = await toggleCoursePublished(courseId, nextStatus);
      if (res.success) {
        setIsPublished(nextStatus);
        setFeedback({
          type: "success",
          text: `Course is now ${nextStatus ? "Published" : "Draft"}.`,
        });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update status." });
      }
    });
  };

  const handleDelete = () => {
    if (enrollmentCount > 0) {
      alert(`Cannot delete this course: There are ${enrollmentCount} active student enrollment records associated with it.`);
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteCourse(courseId);
      if (res.success) {
        router.push("/admin/courses");
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to delete course." });
      }
    });
  };

  return (
    <div>
      <AdminHeader
        title={course ? `${course.title} — Settings` : "Course Settings"}
        subtitle="SpeakUp Academic Administration & Access Control"
      />

      <div className="p-6 sm:p-8 max-w-[1360px] mx-auto space-y-8">
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
          <span className="text-[#8a6d1b] dark:text-[#d4af37] font-bold truncate max-w-xs">
            {course?.title || "Course Settings"}
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

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <span className="material-symbols-outlined animate-spin text-3xl text-[#d4af37]">
              progress_activity
            </span>
            <p className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Loading Course Details...
            </p>
          </div>
        ) : !course ? (
          <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto border border-rose-500/20">
              <span className="material-symbols-outlined text-[28px]">error</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                Course Not Found
              </h3>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                No course exists with the requested identifier.
              </p>
            </div>
            <Link
              href="/admin/courses"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#d4af37] text-[#141416] font-display text-xs uppercase tracking-wider font-bold"
            >
              Return to Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left 2 Cols: Edit Form */}
            <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--surface-border)]">
                <div>
                  <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                    Edit Course Information
                  </h3>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    Update fundamental title, level tag, catalog slug, and syllabus overview.
                  </p>
                </div>

                <Link
                  href={`/admin/courses/${courseId}/modules`}
                  className="px-4 py-2 rounded-xl bg-[#fdfbf7] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#8a6d1b] dark:hover:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">view_module</span>
                  <span>Manage Modules ({moduleCount})</span>
                </Link>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                      URL Slug *
                    </label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-mono focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                      Curriculum Level *
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                    >
                      <option value="A1">A1</option>
                      <option value="A2">A2</option>
                      <option value="B1">B1</option>
                      <option value="B2">B2</option>
                      <option value="C1">C1</option>
                      <option value="C2">C2</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                    Course Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37] leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                    Thumbnail Image URL
                  </label>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--surface-border)]">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="coursePublished"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="w-4 h-4 rounded text-[#d4af37] focus:ring-[#d4af37] cursor-pointer"
                    />
                    <label
                      htmlFor="coursePublished"
                      className="text-xs font-serif text-[var(--text-main)] cursor-pointer select-none"
                    >
                      Published in catalog (visible to scholars)
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || !title.trim() || !slug.trim()}
                    className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>{isPending ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Status & Operational Controls */}
            <div className="space-y-6">
              {/* Publishing Status Box */}
              <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 shadow-xs space-y-4">
                <span className="font-display text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold block">
                  Publishing Status
                </span>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#fdfbf7] dark:bg-[var(--surface-low)] border border-[var(--surface-border)]">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isPublished ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                    <span className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      {isPublished ? "Live Published" : "Draft Mode"}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleTogglePublish}
                    className="px-3 py-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] font-display text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer disabled:opacity-50"
                  >
                    {isPublished ? "Unpublish" : "Publish"}
                  </button>
                </div>

                <p className="font-serif text-[11px] text-[var(--text-muted)] leading-relaxed">
                  {isPublished
                    ? "This course is listed in the student catalog. Enrolled students with approved access can access course modules and lessons."
                    : "This course is in Draft mode. Scholars cannot see it in the catalog until an administrator publishes it."}
                </p>
              </div>

              {/* Quick Curriculum Navigation Card */}
              <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 shadow-xs space-y-4">
                <span className="font-display text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold block">
                  Curriculum Architecture
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-serif text-[var(--text-muted)]">
                    <span>Configured Modules:</span>
                    <span className="font-bold text-[var(--text-main)] font-sans">{moduleCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-serif text-[var(--text-muted)]">
                    <span>Active Enrollments:</span>
                    <span className="font-bold text-[var(--text-main)] font-sans">{enrollmentCount}</span>
                  </div>
                </div>

                <Link
                  href={`/admin/courses/${courseId}/modules`}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs text-center flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">menu_book</span>
                  <span>Manage Modules &amp; Lessons</span>
                </Link>
              </div>

              {/* Danger Zone: Delete Course */}
              <div className="rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <span className="font-display text-xs font-bold uppercase tracking-wider">
                    Delete Course
                  </span>
                </div>
                <p className="font-serif text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Permanently deletes this course and its associated modules and lessons. This action requires zero active enrollments.
                </p>
                <button
                  type="button"
                  disabled={isPending || enrollmentCount > 0}
                  onClick={handleDelete}
                  className="w-full py-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {enrollmentCount > 0 ? "Blocked: Active Enrollments Exist" : "Delete Course Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
