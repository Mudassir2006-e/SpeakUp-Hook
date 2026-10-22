"use client";

import React, { useState, useRef, useEffect } from "react";
import type {
  Assignment,
  AssignmentSubmission,
  SubmissionPage,
  AssignmentStatus,
} from "@/types/assignment";
import {
  uploadAssignmentPagesAction,
  submitStudentAssignmentAction,
} from "@/app/lms/assignment-actions";

interface StudentAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment;
  submission: AssignmentSubmission | null;
  onSubmissionSuccess: (newSubmission: AssignmentSubmission) => void;
  courseTitle?: string;
  lessonTitle?: string;
}

export default function StudentAssignmentModal({
  isOpen,
  onClose,
  assignment,
  submission,
  onSubmissionSuccess,
  courseTitle,
  lessonTitle,
}: StudentAssignmentModalProps) {
  // Staged pages for new submission or resubmission
  const [pages, setPages] = useState<SubmissionPage[]>([]);
  const [studentTextAnswer, setStudentTextAnswer] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"task" | "submit" | "result" | "history">("task");
  const [selectedPreviewPage, setSelectedPreviewPage] = useState<SubmissionPage | null>(null);
  const [isResubmittingMode, setIsResubmittingMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (submission) {
      setStudentTextAnswer(submission.studentTextAnswer || "");
      if (
        submission.status === "Checked" ||
        submission.status === "Reviewed" ||
        submission.status === "Needs Review" ||
        submission.status === "Under Review" ||
        submission.status === "Submitted"
      ) {
        setActiveTab("result");
      } else {
        setActiveTab("submit");
      }
    } else {
      setActiveTab("task");
      setPages([]);
      setStudentTextAnswer("");
    }
  }, [submission, isOpen]);

  if (!isOpen) return null;

  // Handle uploading files (up to 6 images, JPG/JPEG/PNG)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);

    if (pages.length + files.length > 6) {
      setUploadError(`You can attach a maximum of 6 images in total (currently ${pages.length} attached).`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 5 * 1024 * 1024) {
        setUploadError(`File "${files[i].name}" exceeds the 5 MB limit per image.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    setIsUploading(true);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await uploadAssignmentPagesAction(formData);
      if (!res.success || !res.data) {
        setUploadError(res.error || "Failed to upload images.");
      } else {
        const currentLength = pages.length;
        const newPages = res.data.map((p, idx) => ({
          ...p,
          pageNumber: currentLength + idx + 1,
        }));
        setPages((prev) => [...prev, ...newPages]);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error uploading files.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Reorder page up
  const movePageUp = (index: number) => {
    if (index === 0) return;
    const updated = [...pages];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setPages(updated.map((p, i) => ({ ...p, pageNumber: i + 1 })));
  };

  // Reorder page down
  const movePageDown = (index: number) => {
    if (index >= pages.length - 1) return;
    const updated = [...pages];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setPages(updated.map((p, i) => ({ ...p, pageNumber: i + 1 })));
  };

  // Remove a page
  const removePage = (index: number) => {
    const updated = pages.filter((_, i) => i !== index);
    setPages(updated.map((p, i) => ({ ...p, pageNumber: i + 1 })));
  };

  // Submit assignment (written answer and/or images)
  const handleSubmitAssignment = async () => {
    const hasText = Boolean(studentTextAnswer.trim());
    const hasPages = pages.length > 0;

    if (!hasText && !hasPages) {
      setUploadError("Please provide your written answer or attach an image before submitting.");
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    try {
      const res = await submitStudentAssignmentAction({
        assignmentId: assignment.id,
        courseId: assignment.courseId,
        moduleId: assignment.moduleId,
        lessonId: assignment.lessonId,
        practiceType: assignment.practiceType,
        studentTextAnswer: studentTextAnswer.trim(),
        pages,
        isResubmission: isResubmittingMode,
      });

      if (!res.success || !res.data) {
        setUploadError(res.error || "Failed to submit assignment.");
      } else {
        onSubmissionSuccess(res.data);
        setIsResubmittingMode(false);
        setActiveTab("result");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Submission encountered an error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStatus: AssignmentStatus = submission?.status || "Not Submitted";

  const getStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case "Checked":
      case "Reviewed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Reviewed
          </span>
        );
      case "Under Review":
      case "Needs Review":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-bold uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Under Review
          </span>
        );
      case "Revision Requested":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-bold uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            Revision Requested
          </span>
        );
      case "Submitted":
      case "Checking":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Submitted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-bold uppercase tracking-wider bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
            Not Started
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#141418] text-[var(--text-main)] border border-[var(--surface-border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--surface-low)]/40">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-display font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/30">
                {assignment.practiceType.toUpperCase()} ASSIGNMENT
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Max Marks: {assignment.maxMarks}
              </span>
              {assignment.isLocked && (
                <span className="text-[11px] font-display font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">lock</span>
                  <span>Locked</span>
                </span>
              )}
              {getStatusBadge(currentStatus)}
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight">
              {assignment.title}
            </h2>
            <p className="font-serif text-xs text-[var(--text-muted)]">
              {courseTitle ? `${courseTitle} • ` : ""}
              {lessonTitle || assignment.lessonId}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-border)]/50 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[var(--surface-border)] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("task")}
            className={`pb-3 px-3 text-xs font-display uppercase tracking-wider font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === "task"
                ? "border-[#d4af37] text-[#d4af37]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            Instructions & Task
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("submit")}
            className={`pb-3 px-3 text-xs font-display uppercase tracking-wider font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "submit"
                ? "border-[#d4af37] text-[#d4af37]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            <span>Submission & Pages</span>
            {pages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#d4af37] text-[#141416]">
                {pages.length}
              </span>
            )}
          </button>

          {submission && (
            <button
              type="button"
              onClick={() => setActiveTab("result")}
              className={`pb-3 px-3 text-xs font-display uppercase tracking-wider font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "result"
                  ? "border-[#d4af37] text-[#d4af37]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <span>Feedback & Evaluation</span>
              {submission.finalScore !== null && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                  {submission.finalScore}/{assignment.maxMarks}
                </span>
              )}
            </button>
          )}

          {submission?.history && submission.history.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`pb-3 px-3 text-xs font-display uppercase tracking-wider font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === "history"
                  ? "border-[#d4af37] text-[#d4af37]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              Attempts ({submission.history.length + 1})
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scroll">
          {/* ================= TAB 1: INSTRUCTIONS & TASK ================= */}
          {activeTab === "task" && (
            <div className="space-y-6">
              {/* Context Callout */}
              {assignment.contextText && (
                <div className="p-4 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/25 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#d4af37] text-[20px] shrink-0 mt-0.5">
                    info
                  </span>
                  <div className="text-sm font-serif leading-relaxed text-[var(--text-main)]">
                    <span className="font-display font-bold uppercase tracking-wider text-xs block text-[#8a6d1b] dark:text-[#d4af37] mb-0.5">
                      Curricular Context
                    </span>
                    {assignment.contextText}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="space-y-2">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Step-by-Step Instructions
                </h3>
                <div className="font-serif text-[15px] sm:text-base leading-relaxed text-[var(--text-main)] bg-[var(--surface-low)]/40 p-4 rounded-xl border border-[var(--surface-border)] whitespace-pre-line">
                  {assignment.instructions}
                </div>
              </div>

              {/* Question / Task */}
              {assignment.questionTask && (
                <div className="space-y-2">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37]">
                    Assignment Task / Question
                  </h3>
                  <div className="font-serif text-[15px] sm:text-base leading-relaxed text-[var(--text-main)] bg-amber-500/5 dark:bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 whitespace-pre-line">
                    {assignment.questionTask}
                  </div>
                </div>
              )}

              {/* Requirements & Guidance Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assignment.writingRequirements && (
                  <div className="p-4 rounded-xl bg-[var(--surface-low)]/40 border border-[var(--surface-border)] space-y-1.5">
                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#d4af37]">edit_note</span>
                      Writing Requirements
                    </h4>
                    <p className="font-serif text-xs leading-relaxed text-[var(--text-main)] whitespace-pre-line">
                      {assignment.writingRequirements}
                    </p>
                  </div>
                )}

                {assignment.rubric && (
                  <div className="p-4 rounded-xl bg-[var(--surface-low)]/40 border border-[var(--surface-border)] space-y-1.5">
                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-emerald-500">grading</span>
                      Grading Criteria & Rubric
                    </h4>
                    <p className="font-serif text-xs leading-relaxed text-[var(--text-main)] whitespace-pre-line">
                      {assignment.rubric}
                    </p>
                  </div>
                )}
              </div>

              {/* Word & Time Guidance */}
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[var(--text-muted)]">
                {assignment.timeGuidance && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#d4af37]">schedule</span>
                    <span>Estimated Time: {assignment.timeGuidance}</span>
                  </div>
                )}
                {assignment.wordCountGuidance && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#d4af37]">text_fields</span>
                    <span>Word Guidance: {assignment.wordCountGuidance}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-500">collections</span>
                  <span>Multiple Pages Supported (1, 2, 3, 5, 6+ pages)</span>
                </div>
              </div>

              {/* Action Button: Start / Go to Submission */}
              <div className="pt-4 border-t border-[var(--surface-border)] flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab("submit")}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold bg-[#d4af37] text-[#141416] hover:bg-[#e4c665] transition-all cursor-pointer shadow-sm"
                >
                  <span>
                    {submission && (submission.status === "Checked" || submission.status === "Needs Review")
                      ? "View My Submission"
                      : "Proceed to Upload Pages"}
                  </span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 2: SUBMISSION & PAGES ================= */}
          {activeTab === "submit" && (
            <div className="space-y-6">
              {/* Submission Notice for Checked Submissions */}
              {submission && !isResubmittingMode && (
                <div className="p-4 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
                      <span>Submitted on {new Date(submission.submittedAt).toLocaleDateString()}</span>
                      {getStatusBadge(submission.status)}
                    </h4>
                    <p className="font-serif text-xs text-[var(--text-muted)] mt-0.5">
                      {submission.pages.length} page(s) uploaded in Attempt #{submission.attemptNumber || 1}.
                    </p>
                  </div>

                  {assignment.resubmissionAllowed && !assignment.isLocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsResubmittingMode(true);
                        setPages([]);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider bg-white dark:bg-[#1f1f26] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                      <span>Resubmit Assignment</span>
                    </button>
                  )}
                </div>
              )}

              {/* Assignment-Level Lock Notice (Phase 10) */}
              {assignment.isLocked && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-serif flex items-start gap-3">
                  <span className="material-symbols-outlined text-[22px] text-amber-600 dark:text-amber-400 shrink-0">
                    lock
                  </span>
                  <div>
                    <h5 className="font-display font-bold uppercase tracking-wider text-xs">
                      Assignment Locked by Instructor
                    </h5>
                    <p className="mt-1 leading-relaxed text-[var(--text-muted)]">
                      Submissions for this assignment are currently locked. New uploads cannot be submitted at this time. All existing submissions, evaluations, and final grades remain securely preserved.
                    </p>
                  </div>
                </div>
              )}

              {/* Written Response / Answer Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[17px] text-[#d4af37]">edit_note</span>
                    <span>Written Response / Answer</span>
                  </label>
                  {(!submission || isResubmittingMode) && (
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {studentTextAnswer.length} characters
                    </span>
                  )}
                </div>

                {(!submission || isResubmittingMode) ? (
                  <textarea
                    rows={6}
                    value={studentTextAnswer}
                    onChange={(e) => setStudentTextAnswer(e.target.value)}
                    placeholder="Type or paste your complete assignment answer here..."
                    className="w-full p-4 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-sm leading-relaxed focus:outline-none focus:border-[#d4af37] transition-all"
                  />
                ) : (
                  <div className="p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)]/50 text-[var(--text-main)] font-serif text-sm leading-relaxed whitespace-pre-wrap">
                    {submission.studentTextAnswer || "(No written text entered — submitted via image attachments)"}
                  </div>
                )}
              </div>

              {/* Upload Dropzone (active when not locked and not yet submitted OR in resubmission mode) */}
              {!assignment.isLocked && (!submission || isResubmittingMode) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[17px] text-[#d4af37]">add_photo_alternate</span>
                      <span>Attach Handwritten Work / Images (Optional)</span>
                    </label>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {pages.length} / 6 images attached
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      if (pages.length >= 6) {
                        setUploadError("Maximum 6 images limit reached.");
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    className={`border-2 border-dashed border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)]/40 hover:bg-[#d4af37]/5 transition-all rounded-2xl p-7 text-center cursor-pointer group ${
                      pages.length >= 6 ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <div className="w-12 h-12 mx-auto rounded-2xl bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[26px]">upload_file</span>
                    </div>

                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)] mt-2.5">
                      {pages.length >= 6 ? "Maximum Limit of 6 Images Reached" : "Select or Drop Images to Attach"}
                    </h4>
                    <p className="font-serif text-xs text-[var(--text-muted)] max-w-md mx-auto mt-1">
                      Attach photos of handwritten work from your phone or computer. All images will be reviewed together.
                    </p>
                    <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--surface-border)]/40 text-[10px] font-mono text-[var(--text-muted)]">
                      <span>JPG, JPEG, PNG • Max 5 MB per image • Max 6 images</span>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="p-3 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center gap-3 text-xs font-display">
                      <span className="material-symbols-outlined text-[18px] text-[#d4af37] animate-spin">
                        progress_activity
                      </span>
                      <span>Uploading & validating images securely...</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-serif flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">error</span>
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Display of Pages */}
              {((!submission || isResubmittingMode ? pages : submission.pages).length > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[17px] text-[#d4af37]">photo_library</span>
                      <span>
                        Uploaded Pages ({(!submission || isResubmittingMode ? pages : submission.pages).length})
                      </span>
                    </h4>
                    <span className="text-[11px] font-serif text-[var(--text-muted)]">
                      All pages are evaluated together as ONE continuous submission
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {(!submission || isResubmittingMode ? pages : submission.pages).map((page, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)]/50 p-3 space-y-2.5 relative group overflow-hidden"
                      >
                        {/* Page Header */}
                        <div className="flex items-center justify-between text-xs font-display font-bold">
                          <span className="px-2 py-0.5 rounded-md bg-[#d4af37] text-[#141416] text-[11px] uppercase tracking-wider">
                            Page {page.pageNumber || idx + 1}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            {page.fileSize ? `${(page.fileSize / 1024).toFixed(0)} KB` : "Uploaded"}
                          </span>
                        </div>

                        {/* Thumbnail */}
                        <div
                          onClick={() => setSelectedPreviewPage(page)}
                          className="h-44 rounded-lg bg-black/10 dark:bg-black/30 overflow-hidden cursor-pointer relative flex items-center justify-center border border-[var(--surface-border)]/60 group-hover:border-[#d4af37] transition-all"
                        >
                          <img
                            src={page.optimizedUrl || page.originalUrl}
                            alt={`Assignment Page ${page.pageNumber || idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-display font-semibold">
                            <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                            <span>Expand</span>
                          </div>
                        </div>

                        {/* Controls for Staged Pages (Reorder / Remove) */}
                        {(!submission || isResubmittingMode) && (
                          <div className="flex items-center justify-between pt-1 border-t border-[var(--surface-border)]/50">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => movePageUp(idx)}
                                title="Move Page Earlier"
                                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-border)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                              </button>
                              <button
                                type="button"
                                disabled={idx === pages.length - 1}
                                onClick={() => movePageDown(idx)}
                                title="Move Page Later"
                                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-border)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removePage(idx)}
                              title="Remove Page"
                              className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Action Bar */}
              {(!submission || isResubmittingMode) && (
                <div className="pt-4 border-t border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs font-serif text-[var(--text-muted)]">
                    {pages.length} page(s) ready for AI multimodal assessment.
                  </div>

                  <div className="flex items-center gap-3">
                    {isResubmittingMode && (
                      <button
                        type="button"
                        onClick={() => setIsResubmittingMode(false)}
                        className="px-4 py-2 rounded-xl text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                      >
                        Cancel Resubmission
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={pages.length === 0 || isSubmitting}
                      onClick={handleSubmitAssignment}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold bg-[#d4af37] text-[#141416] hover:bg-[#e4c665] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="material-symbols-outlined text-[18px] animate-spin">
                            progress_activity
                          </span>
                          <span>Analyzing All Pages...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">send</span>
                          <span>Submit Assignment</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: EVALUATION & RESULT ================= */}
          {activeTab === "result" && submission && (
            <div className="space-y-6">
              {/* Unconfigured AI / Pending Instructor Review State */}
              {submission.finalScore === null && !submission.aiEvaluation ? (
                <div className="space-y-4">
                  <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4">
                    <span className="material-symbols-outlined text-[28px] text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                      smart_toy
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-display text-sm font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                          AI evaluation is not enabled yet
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                          Pending Instructor Review
                        </span>
                      </div>
                      <p className="font-serif text-xs leading-relaxed text-[var(--text-main)]">
                        Automated AI evaluation is currently locked until instructor credentials are configured. Your assignment submission has been securely delivered to your academic instructor for manual evaluation.
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-[var(--surface-low)]/50 border border-[var(--surface-border)] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-display font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Submission Status
                      </span>
                      {getStatusBadge(submission.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                      <span>Submitted On</span>
                      <span>{new Date(submission.submittedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                      <span>Attempt Number</span>
                      <span>Attempt #{submission.attemptNumber || 1}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Score Showcase Hero */}
                  <div className="rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-[#d4af37]/15 via-[#d4af37]/5 to-transparent border border-[#d4af37]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xs">
                    <div className="space-y-1">
                      <span className="text-[11px] font-display uppercase tracking-widest font-extrabold text-[#8a6d1b] dark:text-[#d4af37]">
                        Official Evaluation Result
                      </span>
                      <h3 className="font-display text-2xl font-black text-[var(--text-main)]">
                        {assignment.title}
                      </h3>
                      {submission.adminReviewedAt ? (
                        <p className="font-serif text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Reviewed by {submission.adminReviewedBy || "Course Teacher"} on{" "}
                          {new Date(submission.adminReviewedAt).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="font-serif text-xs text-[var(--text-muted)]">
                          Evaluated as a complete {submission.pages?.length || 0}-page submission.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-6 self-start sm:self-auto">
                      <div className="text-right">
                        <span className="block text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)]">
                          Final Score
                        </span>
                        <span className="font-display text-3xl sm:text-4xl font-black text-[#d4af37]">
                          {submission.finalScore !== null ? submission.finalScore : "--"}
                          <span className="text-lg text-[var(--text-muted)] font-normal">
                            /{assignment.maxMarks}
                          </span>
                        </span>
                      </div>

                      {submission.finalScore !== null && submission.finalScore !== undefined && (
                        <div className="w-16 h-16 rounded-2xl bg-[#d4af37]/20 border border-[#d4af37]/40 flex flex-col items-center justify-center">
                          <span className="font-display text-base font-black text-[#8a6d1b] dark:text-[#d4af37]">
                            {Math.round((submission.finalScore / assignment.maxMarks) * 100)}%
                          </span>
                          <span className="text-[9px] font-mono text-[var(--text-muted)]">
                            GRADE
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Notice if Needs Review */}
                  {submission.status === "Needs Review" && (
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                      <span className="material-symbols-outlined text-blue-500 text-[20px] shrink-0 mt-0.5">
                        visibility
                      </span>
                      <div className="space-y-1">
                        <h4 className="font-display text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          Manual Review in Progress
                        </h4>
                        <p className="font-serif text-xs leading-relaxed text-[var(--text-main)]">
                          {submission.aiEvaluation?.reviewReason ||
                            "This submission is awaiting instructor review. Your grade will update once your instructor finishes evaluation."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Feedback Breakdown */}
                  <div className="space-y-3">
                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {submission.adminReviewedAt ? "Teacher / Instructor Remarks" : "Evaluation Feedback"}
                    </h4>
                    <div className="p-5 rounded-xl bg-[var(--surface-low)]/50 border border-[var(--surface-border)] font-serif text-[15px] sm:text-base leading-relaxed text-[var(--text-main)] whitespace-pre-wrap">
                      {submission.finalFeedback || submission.aiFeedback || "Review pending."}
                    </div>
                  </div>
                </>
              )}

              {/* Strengths & Improvements Grid */}
              {submission.aiEvaluation && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Strengths */}
                  {submission.aiEvaluation.strengths && submission.aiEvaluation.strengths.length > 0 && (
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/25 space-y-2">
                      <h4 className="font-display text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Strengths Observed
                      </h4>
                      <ul className="space-y-1.5 font-serif text-xs leading-relaxed text-[var(--text-main)]">
                        {submission.aiEvaluation.strengths.map((str, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Areas for Improvement */}
                  {submission.aiEvaluation.improvements && submission.aiEvaluation.improvements.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/25 space-y-2">
                      <h4 className="font-display text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                        Areas for Improvement
                      </h4>
                      <ul className="space-y-1.5 font-serif text-xs leading-relaxed text-[var(--text-main)]">
                        {submission.aiEvaluation.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Grammar & Spelling Specific Corrections */}
              {submission.aiEvaluation?.mistakes && submission.aiEvaluation.mistakes.length > 0 && (
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/25 space-y-2">
                  <h4 className="font-display text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">spellcheck</span>
                    Grammar & Syntax Adjustments
                  </h4>
                  <ul className="space-y-1 font-serif text-xs leading-relaxed text-[var(--text-main)]">
                    {submission.aiEvaluation.mistakes.map((m, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resubmit CTA if allowed */}
              {assignment.resubmissionAllowed && (
                <div className="pt-4 border-t border-[var(--surface-border)] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResubmittingMode(true);
                      setActiveTab("submit");
                      setPages([]);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold bg-white dark:bg-[#1f1f26] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                    <span>Submit New Attempt</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 4: ATTEMPTS HISTORY ================= */}
          {activeTab === "history" && submission?.history && (
            <div className="space-y-4">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Previous Submissions History
              </h4>
              <div className="space-y-3">
                {submission.history.map((att, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[var(--surface-low)]/50 border border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xs font-bold uppercase tracking-wider">
                          Attempt #{att.attemptNumber}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          {new Date(att.submittedAt).toLocaleString()}
                        </span>
                        {getStatusBadge(att.status)}
                      </div>
                      <p className="font-serif text-xs text-[var(--text-muted)] mt-1">
                        {att.pages?.length || 0} page(s) • Final Score: {att.finalScore ?? "--"}/{assignment.maxMarks}
                      </p>
                    </div>

                    <div className="text-xs font-serif text-[var(--text-main)] max-w-sm truncate">
                      {att.finalFeedback || att.aiFeedback || "No feedback"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Page Image Lightbox */}
      {selectedPreviewPage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedPreviewPage(null)}
        >
          <div
            className="max-w-5xl max-h-[90vh] flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white text-xs font-display px-2">
              <span className="font-bold uppercase tracking-wider">
                Page {selectedPreviewPage.pageNumber} — Full Resolution View
              </span>
              <button
                type="button"
                onClick={() => setSelectedPreviewPage(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            <img
              src={selectedPreviewPage.originalUrl || selectedPreviewPage.optimizedUrl}
              alt={`Page ${selectedPreviewPage.pageNumber}`}
              className="max-h-[82vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
