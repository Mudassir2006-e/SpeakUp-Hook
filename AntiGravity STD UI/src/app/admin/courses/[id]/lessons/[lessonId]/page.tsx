"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { createClient } from "@/lib/supabase/client";
import { updateLesson, deleteLesson } from "@/app/admin/actions";
import {
  getAssignmentsListAction,
  saveAssignmentAction,
  deleteAssignmentAction,
} from "@/app/admin/assignment-actions";
import {
  getLessonLinkAction,
  saveLessonLinkAction,
  deleteLessonLinkAction,
} from "@/app/admin/lesson-link-actions";
import type { Assignment, PracticeType } from "@/types/assignment";

interface LessonDetail {
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

interface ParentModule {
  id: string;
  title: string;
  course_id: string;
}

interface ParentCourse {
  id: string;
  title: string;
  slug: string;
}

export default function AdminLessonEditorPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;
  const lessonId = params?.lessonId as string;

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [parentModule, setParentModule] = useState<ParentModule | null>(null);
  const [parentCourse, setParentCourse] = useState<ParentCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [videoSource, setVideoSource] = useState<"youtube" | "google_drive" | "hosted" | "other">("youtube");
  const [videoUrl, setVideoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [practiceContent, setPracticeContent] = useState("");

  // Attached Assignment State
  const [attachedAssignment, setAttachedAssignment] = useState<Assignment | null>(null);
  const [hasAssignment, setHasAssignment] = useState(false);
  const [asgnTitle, setAsgnTitle] = useState("");
  const [asgnType, setAsgnType] = useState<PracticeType>("writing");
  const [asgnInstructions, setAsgnInstructions] = useState("");
  const [asgnTask, setAsgnTask] = useState("");
  const [asgnMaxMarks, setAsgnMaxMarks] = useState(20);
  const [asgnRubric, setAsgnRubric] = useState("");
  const [isSavingAsgn, setIsSavingAsgn] = useState(false);
  const [asgnMsg, setAsgnMsg] = useState<string | null>(null);

  // Resource Link Button State
  const [linkEnabled, setLinkEnabled] = useState(false);
  const [linkText, setLinkText] = useState("Open Learning Resource");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDesc, setLinkDesc] = useState("");
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [linkFeedback, setLinkFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadLesson = async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Fetch lesson
      const { data: lData, error: lErr } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .maybeSingle();

      if (lErr || !lData) {
        console.error("Lesson not found:", lErr);
        setLesson(null);
        setLoading(false);
        return;
      }

      const l = lData as LessonDetail;
      setLesson(l);
      setTitle(l.title);
      setVideoSource(l.video_source || "youtube");
      setVideoUrl(l.video_url || "");
      setNotes(l.notes || "");
      setPracticeContent(l.practice_content || "");

      // 2. Fetch parent module
      const { data: mData } = await supabase
        .from("modules")
        .select("id, title, course_id")
        .eq("id", l.module_id)
        .maybeSingle();
      if (mData) {
        const mod = mData as ParentModule;
        setParentModule(mod);

        // 3. Fetch parent course
        const { data: cData } = await supabase
          .from("courses")
          .select("id, title, slug")
          .eq("id", mod.course_id)
          .maybeSingle();
        if (cData) setParentCourse(cData as ParentCourse);
      }

      // 4. Fetch attached assignment
      const asgnsRes = await getAssignmentsListAction({ lessonId });
      if (asgnsRes.success && asgnsRes.data && asgnsRes.data.length > 0) {
        const found = asgnsRes.data[0];
        setAttachedAssignment(found);
        setHasAssignment(true);
        setAsgnTitle(found.title);
        setAsgnType(found.practiceType);
        setAsgnInstructions(found.instructions);
        setAsgnTask(found.questionTask || "");
        setAsgnMaxMarks(found.maxMarks || 20);
        setAsgnRubric(found.rubric || "");
      } else {
        setAttachedAssignment(null);
        setHasAssignment(false);
      }

      // 5. Fetch link button configuration
      const linkRes = await getLessonLinkAction(courseId, l.module_id, lessonId);
      if (linkRes.success && linkRes.data) {
        setLinkEnabled(Boolean(linkRes.data.enabled));
        setLinkText(linkRes.data.text || "Open Learning Resource");
        setLinkUrl(linkRes.data.url || "");
        setLinkDesc(linkRes.data.description || "");
      } else {
        setLinkEnabled(false);
        setLinkText("Open Learning Resource");
        setLinkUrl("");
        setLinkDesc("");
      }
    } catch (err) {
      console.error("Failed to load lesson:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLink = async () => {
    if (!parentModule || !lesson) return;
    setIsSavingLink(true);
    setLinkFeedback(null);
    try {
      const res = await saveLessonLinkAction(courseId, parentModule.id, lesson.id, {
        enabled: linkEnabled,
        text: linkText,
        url: linkUrl,
        description: linkDesc,
      });

      if (res.success && res.data) {
        setLinkFeedback({ type: "success", text: "Resource Link Button successfully saved and updated!" });
        setLinkUrl(res.data.url);
      } else {
        setLinkFeedback({ type: "error", text: res.error || "Failed to save link button." });
      }
    } catch (err: any) {
      setLinkFeedback({ type: "error", text: err?.message || "An unexpected error occurred while saving." });
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleDeleteLink = async () => {
    if (!window.confirm("Are you sure you want to delete and remove this link button?")) return;
    if (!parentModule || !lesson) return;
    setIsSavingLink(true);
    setLinkFeedback(null);
    try {
      const res = await deleteLessonLinkAction(courseId, parentModule.id, lesson.id);
      if (res.success) {
        setLinkEnabled(false);
        setLinkUrl("");
        setLinkDesc("");
        setLinkText("Open Learning Resource");
        setLinkFeedback({ type: "success", text: "Link button removed from this lesson." });
      } else {
        setLinkFeedback({ type: "error", text: res.error || "Failed to remove link button." });
      }
    } catch (err: any) {
      setLinkFeedback({ type: "error", text: err?.message || "Failed to delete link button." });
    } finally {
      setIsSavingLink(false);
    }
  };

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !lesson) return;

    startTransition(async () => {
      const res = await updateLesson(lesson.id, lesson.module_id, courseId, {
        title,
        video_source: videoSource,
        video_url: videoUrl.trim() || null,
        notes,
        practice_content: practiceContent,
      });

      if (res.success) {
        setFeedback({ type: "success", text: "Lesson content successfully saved." });
        loadLesson();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update lesson." });
      }
    });
  };

  const handleDelete = () => {
    if (!lesson) return;
    if (!confirm(`Are you sure you want to permanently delete lesson "${lesson.title}"?`)) return;

    startTransition(async () => {
      const res = await deleteLesson(lesson.id, lesson.module_id, courseId);
      if (res.success) {
        if (parentModule) {
          router.push(`/admin/courses/${courseId}/modules/${parentModule.id}`);
        } else {
          router.push(`/admin/courses/${courseId}/modules`);
        }
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to delete lesson." });
      }
    });
  };

  // Helper to extract clean YouTube embed URL for preview
  const getEmbedUrl = (url: string, source: string): string | null => {
    if (!url || source !== "youtube") return null;
    try {
      if (url.includes("youtu.be/")) {
        const id = url.split("youtu.be/")[1]?.split("?")[0];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
      if (url.includes("watch?v=")) {
        const id = url.split("watch?v=")[1]?.split("&")[0];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
      if (url.includes("embed/")) {
        return url;
      }
    } catch {
      return null;
    }
    return null;
  };

  const embedUrl = getEmbedUrl(videoUrl, videoSource);

  return (
    <div>
      <AdminHeader
        title={lesson ? `${lesson.title} — Content Editor` : "Lesson Editor"}
        subtitle="SpeakUp Academic Administration & Access Control"
      />

      <div className="p-6 sm:p-8 max-w-[1360px] mx-auto space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-display uppercase tracking-wider text-[var(--text-muted)] flex-wrap">
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
            {parentCourse?.title || "Course"}
          </Link>
          <span>/</span>
          {parentModule && (
            <>
              <Link
                href={`/admin/courses/${courseId}/modules/${parentModule.id}`}
                className="hover:text-[var(--text-main)] font-semibold truncate max-w-xs"
              >
                {parentModule.title}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-[#8a6d1b] dark:text-[#d4af37] font-bold truncate max-w-xs">
            {lesson?.title || "Lesson Editor"}
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
          <div className="py-24 flex flex-col items-center justify-center space-y-3 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)]">
            <span className="material-symbols-outlined animate-spin text-3xl text-[#d4af37]">
              progress_activity
            </span>
            <p className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Loading Lesson Content...
            </p>
          </div>
        ) : !lesson ? (
          <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto border border-rose-500/20">
              <span className="material-symbols-outlined text-[28px]">error</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                Lesson Not Found
              </h3>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                No matching lesson could be located with ID: {lessonId}
              </p>
            </div>
            <Link
              href={`/admin/courses/${courseId}/modules`}
              className="inline-block px-5 py-2.5 rounded-xl bg-[#d4af37] text-[#141416] font-display text-xs uppercase tracking-wider font-bold"
            >
              Return to Modules
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left 2 Cols: Main Content (Title, Video, Notes, Practice) */}
              <div className="lg:col-span-2 space-y-6">
                {/* 1. Basic Lesson Title */}
                <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--surface-border)]">
                    <span className="material-symbols-outlined text-[#d4af37] text-[20px]">
                      title
                    </span>
                    <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                      Lesson Title &amp; Hierarchy
                    </h3>
                  </div>

                  <div>
                    <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                      Lesson Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Lesson 1: Acoustic Resonance & Speech Rhythm"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-sm font-serif focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                {/* 2. Video Source Management */}
                <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--surface-border)]">
                    <span className="material-symbols-outlined text-[#d4af37] text-[20px]">
                      smart_display
                    </span>
                    <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                      Masterclass Video Source
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                        Video Platform *
                      </label>
                      <select
                        value={videoSource}
                        onChange={(e: any) => setVideoSource(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                      >
                        <option value="youtube">YouTube</option>
                        <option value="google_drive">Google Drive</option>
                        <option value="hosted">Direct Hosted / MP4</option>
                        <option value="other">Other / Generic Link</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                        Video URL / Stream Link
                      </label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder={
                          videoSource === "youtube"
                            ? "https://www.youtube.com/watch?v=..."
                            : videoSource === "google_drive"
                            ? "https://drive.google.com/file/d/.../view"
                            : "https://your-domain.com/video.mp4"
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-mono focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>
                  </div>

                  {/* YouTube Embed Preview */}
                  {embedUrl && (
                    <div className="mt-3 space-y-2">
                      <span className="text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                        Live Embed Preview
                      </span>
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-[var(--surface-border)] shadow-xs">
                        <iframe
                          src={embedUrl}
                          title="YouTube Video Preview"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Lesson Notes (Curated Lecture Notes) */}
                <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#d4af37] text-[20px]">
                        menu_book
                      </span>
                      <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                        Lesson Notes &amp; Lecture Material
                      </h3>
                    </div>
                    <span className="text-[11px] font-serif text-[var(--text-muted)]">
                      Displayed on student Notes tab
                    </span>
                  </div>

                  <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                    Provide detailed lecture summaries, phonetic breakdowns, grammatical rules, and reference examples for scholars.
                  </p>

                  <textarea
                    rows={8}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter curated lecture notes, bullet points, and key takeaways..."
                    className="w-full p-4 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37] leading-relaxed"
                  />
                </div>

                {/* 4. Interactive Practice Content */}
                <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#d4af37] text-[20px]">
                        record_voice_over
                      </span>
                      <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                        Interactive Practice Drills
                      </h3>
                    </div>
                    <span className="text-[11px] font-serif text-[var(--text-muted)]">
                      Displayed on student Practice tab
                    </span>
                  </div>

                  <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                    Define articulation prompts, speech cadence drills, and practice sentence exercises for scholar voice recording.
                  </p>

                  <textarea
                    rows={6}
                    value={practiceContent}
                    onChange={(e) => setPracticeContent(e.target.value)}
                    placeholder="e.g., Practice sentences, articulation exercises, and vocal cadence drills..."
                    className="w-full p-4 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37] leading-relaxed"
                  />
                </div>

                {/* 5. Optional Attached Assignment */}
                <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#d4af37] text-[20px]">
                        assignment
                      </span>
                      <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                        Lesson Assignment (Optional)
                      </h3>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-display uppercase tracking-wider font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasAssignment}
                        onChange={(e) => setHasAssignment(e.target.checked)}
                        className="rounded border-[var(--surface-border)] text-[#d4af37] focus:ring-[#d4af37]"
                      />
                      <span>Enable Assignment</span>
                    </label>
                  </div>

                  <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                    Attach a real language-learning assignment (Reading or Writing) to this lesson. Students will be able to upload multiple handwritten pages for AI and teacher grading.
                  </p>

                  {hasAssignment && (
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                            Practice Type
                          </label>
                          <select
                            value={asgnType}
                            onChange={(e) => setAsgnType(e.target.value as PracticeType)}
                            className="w-full p-2.5 text-xs rounded-xl bg-[#fdfbf7] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-main)]"
                          >
                            <option value="writing">Writing</option>
                            <option value="reading">Reading</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                            Maximum Marks
                          </label>
                          <input
                            type="number"
                            min={5}
                            max={100}
                            value={asgnMaxMarks}
                            onChange={(e) => setAsgnMaxMarks(Number(e.target.value))}
                            className="w-full p-2.5 text-xs font-mono font-bold rounded-xl bg-[#fdfbf7] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-main)]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                          Assignment Title
                        </label>
                        <input
                          type="text"
                          value={asgnTitle}
                          onChange={(e) => setAsgnTitle(e.target.value)}
                          placeholder="e.g. Vorstellung und persönliche Angaben"
                          className="w-full p-2.5 text-xs rounded-xl bg-[#fdfbf7] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-main)]"
                        />
                      </div>

                      <div>
                        <label className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                          Step-by-Step Instructions
                        </label>
                        <textarea
                          rows={3}
                          value={asgnInstructions}
                          onChange={(e) => setAsgnInstructions(e.target.value)}
                          placeholder="Provide clear steps for the student..."
                          className="w-full p-2.5 text-xs font-serif rounded-xl bg-[#fdfbf7] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-main)]"
                        />
                      </div>

                      <div>
                        <label className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                          Specific Question / Task Prompts
                        </label>
                        <textarea
                          rows={3}
                          value={asgnTask}
                          onChange={(e) => setAsgnTask(e.target.value)}
                          placeholder="Specific questions or task requirements..."
                          className="w-full p-2.5 text-xs font-serif rounded-xl bg-[#fdfbf7] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-main)]"
                        />
                      </div>

                      <div>
                        <label className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                          Grading Rubric
                        </label>
                        <textarea
                          rows={2}
                          value={asgnRubric}
                          onChange={(e) => setAsgnRubric(e.target.value)}
                          placeholder="Criteria for scoring (e.g. Grammar: 6P, Vocabulary: 5P, Structure: 5P)..."
                          className="w-full p-2.5 text-xs font-serif rounded-xl bg-[#fdfbf7] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-main)]"
                        />
                      </div>

                      {asgnMsg && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-display">
                          {asgnMsg}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        {attachedAssignment && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm("Are you sure you want to delete this assignment?")) return;
                              await deleteAssignmentAction(attachedAssignment.id);
                              setAttachedAssignment(null);
                              setHasAssignment(false);
                              setAsgnMsg("Assignment deleted.");
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-display text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            Delete Assignment
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isSavingAsgn || !asgnTitle.trim()}
                          onClick={async () => {
                            if (!parentCourse || !parentModule) return;
                            setIsSavingAsgn(true);
                            setAsgnMsg(null);
                            const res = await saveAssignmentAction({
                              id: attachedAssignment?.id,
                              courseId: parentCourse.id,
                              moduleId: parentModule.id,
                              lessonId: lessonId,
                              practiceType: asgnType,
                              title: asgnTitle,
                              instructions: asgnInstructions,
                              questionTask: asgnTask,
                              maxMarks: Number(asgnMaxMarks),
                              rubric: asgnRubric,
                            });
                            if (res.success && res.data) {
                              setAttachedAssignment(res.data);
                              setAsgnMsg("Assignment successfully attached and saved!");
                            }
                            setIsSavingAsgn(false);
                          }}
                          className="ml-auto px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {isSavingAsgn ? "Saving Assignment..." : "Save Assignment"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Resource Link Button Configuration */}
                <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--surface-border)] gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[#d4af37] text-[22px]">
                        link
                      </span>
                      <div>
                        <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                          Resource Link Button (Optional)
                        </h3>
                        <p className="font-serif text-xs text-[var(--text-muted)]">
                          Configure an external study resource, reference link, or practice document for scholars.
                        </p>
                      </div>
                    </div>

                    {/* Enable / Disable Toggle Switch */}
                    <label className="inline-flex items-center gap-2 cursor-pointer self-start sm:self-center select-none">
                      <input
                        type="checkbox"
                        checked={linkEnabled}
                        onChange={(e) => setLinkEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-[var(--surface-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d4af37] relative"></div>
                      <span className="font-display text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                        {linkEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                  </div>

                  {/* Settings Form */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                          Button Text *
                        </label>
                        <input
                          type="text"
                          value={linkText}
                          onChange={(e) => setLinkText(e.target.value)}
                          placeholder="e.g. Open Learning Resource"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                          Link / Destination URL *
                        </label>
                        <input
                          type="text"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="e.g. https://example.com/resource"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-mono focus:outline-none focus:border-[#d4af37]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-display uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1">
                        Optional Short Description
                      </label>
                      <input
                        type="text"
                        value={linkDesc}
                        onChange={(e) => setLinkDesc(e.target.value)}
                        placeholder="e.g. Comprehensive grammar reference guide & exercise sheet (PDF)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    {/* Live Preview Box */}
                    <div className="p-4 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)]/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)]">
                          Student LMS Live Preview
                        </span>
                        {linkUrl && (
                          <a
                            href={linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-display text-[#d4af37] hover:underline"
                          >
                            <span>Test Link in New Tab</span>
                            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                          </a>
                        )}
                      </div>

                      {linkEnabled && linkUrl ? (
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <a
                            href={linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.preventDefault()}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-display uppercase tracking-wider font-bold bg-[#d4af37] text-[#141416] shadow-xs cursor-pointer group"
                          >
                            <span className="material-symbols-outlined text-[17px]">open_in_new</span>
                            <span>{linkText.trim() || "Open Learning Resource"}</span>
                          </a>
                          {linkDesc && (
                            <span className="text-xs text-[var(--text-muted)] font-serif italic max-w-sm">
                              {linkDesc}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs font-serif italic text-[var(--text-muted)] py-1">
                          {linkEnabled
                            ? "Provide a valid URL above to preview the button."
                            : "Button is currently disabled and hidden from students."}
                        </p>
                      )}
                    </div>

                    {/* Feedback Toast/Message */}
                    {linkFeedback && (
                      <div
                        className={`p-3 rounded-xl text-xs font-display flex items-center gap-2 ${
                          linkFeedback.type === "success"
                            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {linkFeedback.type === "success" ? "check_circle" : "error"}
                        </span>
                        <span>{linkFeedback.text}</span>
                      </div>
                    )}

                    {/* Actions: Save & Delete */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={handleDeleteLink}
                        disabled={isSavingLink}
                        className="px-3.5 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        Delete / Remove Link
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveLink}
                        disabled={isSavingLink}
                        className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        <span>{isSavingLink ? "Saving Link..." : "Save Link Button"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Actions & Safety Controls */}
              <div className="space-y-6">
                {/* Save Changes Card */}
                <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 shadow-xs space-y-4">
                  <span className="font-display text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold block">
                    Save Lesson Updates
                  </span>

                  <button
                    type="submit"
                    disabled={isPending || !title.trim()}
                    className="w-full py-3 px-5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>{isPending ? "Saving..." : "Save Lesson Content"}</span>
                  </button>

                  <p className="font-serif text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
                    Changes are saved directly to the Supabase database and instantly available to enrolled students.
                  </p>
                </div>

                {/* Lesson Context Information */}
                <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 shadow-xs space-y-3 font-serif text-xs">
                  <span className="font-display text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold block">
                    Lesson Metadata
                  </span>

                  <div className="space-y-2 text-[var(--text-muted)]">
                    <div className="flex items-center justify-between">
                      <span>Sequence Order:</span>
                      <span className="font-mono font-bold text-[var(--text-main)]">#{lesson.order_index}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Video Platform:</span>
                      <span className="font-sans font-bold text-[var(--text-main)] capitalize">{videoSource}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Created On:</span>
                      <span className="font-sans text-[var(--text-main)]">{new Date(lesson.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Danger Zone: Delete Lesson */}
                <div className="rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 p-6 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    <span className="font-display text-xs font-bold uppercase tracking-wider">
                      Delete Lesson
                    </span>
                  </div>

                  <p className="font-serif text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Permanently removes this lesson, its video association, lecture notes, and practice drills from the module.
                  </p>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleDelete}
                    className="w-full py-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-40"
                  >
                    Delete Lesson Permanently
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
