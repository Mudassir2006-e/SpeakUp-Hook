"use client";

import React, { useEffect, useState, useMemo } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import InitialsAvatar from "@/components/InitialsAvatar";
import {
  getAdminSubmissionsListAction,
  getSubmissionByIdAction,
  gradeSubmissionAction,
  recheckSubmissionWithAiAction,
  getAssignmentsListAction,
  saveAssignmentAction,
  deleteAssignmentAction,
  toggleAssignmentLockAction,
  getAssignmentAccessSettingAction,
  setAssignmentAccessSettingAction,
  type EnrichedSubmissionItem,
} from "@/app/admin/assignment-actions";
import type { Assignment, AssignmentStatus, PracticeType, SubmissionPage } from "@/types/assignment";

interface StudentAggregate {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentNumber: string;
  enrolledCourses: string[];
  totalSubmissions: number;
  pendingCount: number;
  checkedCount: number;
  needsReviewCount: number;
  submissions: EnrichedSubmissionItem[];
}

export default function StudentAssignmentCheckerPage() {
  const [submissions, setSubmissions] = useState<EnrichedSubmissionItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Main View Tab: Student Checker vs. Manage Assignments
  const [mainView, setMainView] = useState<"checker" | "manage_assignments">("checker");

  // Global Assignment Access State (Section 7)
  const [assignmentsGlobalEnabled, setAssignmentsGlobalEnabled] = useState<boolean>(true);
  const [isTogglingAccess, setIsTogglingAccess] = useState<boolean>(false);
  const [accessSettingToast, setAccessSettingToast] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [practiceFilter, setPracticeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lockFilter, setLockFilter] = useState("all");

  // Student Detail View State (Phase 11)
  const [selectedStudent, setSelectedStudent] = useState<StudentAggregate | null>(null);

  // Review & Grading Modal State
  const [activeSubmission, setActiveSubmission] = useState<EnrichedSubmissionItem | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [adminScore, setAdminScore] = useState<number>(0);
  const [adminFeedback, setAdminFeedback] = useState<string>("");
  const [adminStatus, setAdminStatus] = useState<AssignmentStatus>("Checked");
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Lightbox & Recheck confirmation
  const [lightboxPage, setLightboxPage] = useState<SubmissionPage | null>(null);
  const [isRechecking, setIsRechecking] = useState(false);
  const [showRecheckConfirm, setShowRecheckConfirm] = useState(false);

  // Lock Confirmation State (Phase 10)
  const [pendingLockAssignment, setPendingLockAssignment] = useState<{
    id: string;
    title: string;
    targetLockedState: boolean;
  } | null>(null);
  const [isLocking, setIsLocking] = useState(false);

  // Create / Edit Assignment Modal State
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);
  const [editingAssignmentData, setEditingAssignmentData] = useState<Partial<Assignment>>({
    courseId: "A1G",
    moduleId: "mod_a1g_1",
    lessonId: "les_a1g_2",
    practiceType: "writing",
    title: "",
    instructions: "",
    questionTask: "",
    writingRequirements: "",
    maxMarks: 20,
    rubric: "",
    resubmissionAllowed: true,
    isLocked: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsRes, asgnsRes, settingRes] = await Promise.all([
        getAdminSubmissionsListAction(),
        getAssignmentsListAction(),
        getAssignmentAccessSettingAction(),
      ]);
      if (subsRes.success && subsRes.data) {
        setSubmissions(subsRes.data);
      }
      if (asgnsRes.success && asgnsRes.data) {
        setAssignments(asgnsRes.data);
      }
      if (settingRes?.success && settingRes.data) {
        setAssignmentsGlobalEnabled(settingRes.data.assignmentsEnabled);
      }
    } catch (err) {
      console.error("Failed to load assignment data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGlobalAccess = async () => {
    setIsTogglingAccess(true);
    try {
      const nextState = !assignmentsGlobalEnabled;
      const res = await setAssignmentAccessSettingAction(nextState);
      if (res.success && res.data) {
        setAssignmentsGlobalEnabled(res.data.assignmentsEnabled);
        setAccessSettingToast(res.message || (nextState ? "Assignment access enabled." : "Assignment access disabled."));
        setTimeout(() => setAccessSettingToast(null), 4000);
      }
    } catch (err) {
      console.error("Failed to toggle assignment access", err);
    } finally {
      setIsTogglingAccess(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update selectedStudent in sync when submissions refresh
  useEffect(() => {
    if (selectedStudent) {
      const updatedList = submissions.filter(
        (s) =>
          s.studentEmail.toLowerCase() === selectedStudent.studentEmail.toLowerCase() ||
          s.studentId === selectedStudent.studentId
      );
      if (updatedList.length > 0) {
        const uniqueCourses = Array.from(new Set(updatedList.map((s) => s.courseTitle || s.courseId)));
        setSelectedStudent({
          ...selectedStudent,
          enrolledCourses: uniqueCourses,
          totalSubmissions: updatedList.length,
          pendingCount: updatedList.filter((s) => s.status === "Submitted" || s.status === "Checking").length,
          checkedCount: updatedList.filter((s) => s.status === "Checked").length,
          needsReviewCount: updatedList.filter((s) => s.status === "Needs Review").length,
          submissions: updatedList,
        });
      }
    }
  }, [submissions]);

  // Assignment Lock map for quick lookup
  const assignmentLockMap = useMemo(() => {
    const map = new Map<string, boolean>();
    assignments.forEach((a) => map.set(a.id, Boolean(a.isLocked)));
    return map;
  }, [assignments]);

  // Aggregate Submissions into Student-First List (Phase 11)
  const aggregatedStudents = useMemo(() => {
    const studentMap = new Map<string, StudentAggregate>();

    submissions.forEach((sub) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        sub.studentName.toLowerCase().includes(q) ||
        sub.studentEmail.toLowerCase().includes(q) ||
        (sub.studentNumber && sub.studentNumber.toLowerCase().includes(q)) ||
        sub.assignmentTitle.toLowerCase().includes(q);

      if (!matchesSearch) return;

      if (courseFilter !== "all" && sub.courseId !== courseFilter) return;
      if (practiceFilter !== "all" && sub.practiceType !== practiceFilter) return;
      if (statusFilter !== "all" && sub.status !== statusFilter) return;

      const isAsgnLocked = assignmentLockMap.get(sub.assignmentId) || false;
      if (lockFilter === "locked" && !isAsgnLocked) return;
      if (lockFilter === "unlocked" && isAsgnLocked) return;

      const key = sub.studentEmail.toLowerCase() || sub.studentId;
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          studentId: sub.studentId,
          studentName: sub.studentName,
          studentEmail: sub.studentEmail,
          studentNumber: sub.studentNumber || "SPK-2026",
          enrolledCourses: [],
          totalSubmissions: 0,
          pendingCount: 0,
          checkedCount: 0,
          needsReviewCount: 0,
          submissions: [],
        });
      }

      const agg = studentMap.get(key)!;
      agg.submissions.push(sub);
      agg.totalSubmissions += 1;
      if (sub.status === "Submitted" || sub.status === "Checking") agg.pendingCount += 1;
      else if (sub.status === "Checked") agg.checkedCount += 1;
      else if (sub.status === "Needs Review") agg.needsReviewCount += 1;

      const courseName = sub.courseTitle || sub.courseId;
      if (!agg.enrolledCourses.includes(courseName)) {
        agg.enrolledCourses.push(courseName);
      }
    });

    return Array.from(studentMap.values());
  }, [submissions, searchQuery, courseFilter, practiceFilter, statusFilter, lockFilter, assignmentLockMap]);

  // Open Review Workspace for a submission
  const handleOpenReview = async (sub: EnrichedSubmissionItem) => {
    setSaveSuccessMsg(null);
    try {
      const res = await getSubmissionByIdAction(sub.id);
      if (res.success && res.data) {
        setActiveSubmission(res.data.submission);
        setActiveAssignment(res.data.assignment);
        setAdminScore(res.data.submission.finalScore ?? res.data.submission.aiScore ?? 0);
        setAdminFeedback(
          res.data.submission.finalFeedback ||
            res.data.submission.aiFeedback ||
            "Well structured work. Excellent demonstration of vocabulary and sentence structure."
        );
        setAdminStatus(res.data.submission.status || "Checked");
      }
    } catch (err) {
      console.error("Failed to load submission details", err);
    }
  };

  // Accept AI Grade
  const handleAcceptAiGrade = () => {
    if (!activeSubmission?.aiEvaluation) return;
    setAdminScore(activeSubmission.aiEvaluation.score);
    setAdminFeedback(activeSubmission.aiEvaluation.feedback);
    setAdminStatus(activeSubmission.aiEvaluation.needsReview ? "Needs Review" : "Checked");
  };

  // Save Final Evaluation
  const handleSaveFinalGrade = async () => {
    if (!activeSubmission) return;
    setIsSavingGrade(true);
    setSaveSuccessMsg(null);
    try {
      const res = await gradeSubmissionAction({
        submissionId: activeSubmission.id,
        finalScore: Number(adminScore),
        finalFeedback: adminFeedback,
        status: adminStatus,
        adminName: "Lead Academic Reviewer",
      });

      if (res.success && res.data) {
        setSaveSuccessMsg("Final score and evaluation saved successfully!");
        setSubmissions((prev) =>
          prev.map((s) => (s.id === activeSubmission.id ? { ...s, ...res.data! } : s))
        );
        setActiveSubmission((prev) => (prev ? { ...prev, ...res.data! } : null));
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error("Failed to save final grade", err);
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Re-check with AI
  const handleTriggerRecheck = async () => {
    if (!activeSubmission) return;
    setShowRecheckConfirm(false);
    setIsRechecking(true);
    try {
      const res = await recheckSubmissionWithAiAction(activeSubmission.id);
      if (res.success && res.data) {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === activeSubmission.id ? { ...s, ...res.data! } : s))
        );
        setActiveSubmission((prev) => (prev ? { ...prev, ...res.data! } : null));
        if (res.data.aiEvaluation) {
          setAdminScore(res.data.aiEvaluation.score);
          setAdminFeedback(res.data.aiEvaluation.feedback);
        }
      }
    } catch (err) {
      console.error("Recheck failed", err);
    } finally {
      setIsRechecking(false);
    }
  };

  // Toggle Assignment Lock with Confirmation (Phase 10)
  const handleConfirmToggleLock = async () => {
    if (!pendingLockAssignment) return;
    setIsLocking(true);
    try {
      const res = await toggleAssignmentLockAction(
        pendingLockAssignment.id,
        pendingLockAssignment.targetLockedState
      );
      if (res.success && res.data) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === pendingLockAssignment.id ? { ...a, isLocked: pendingLockAssignment.targetLockedState } : a))
        );
        if (activeAssignment && activeAssignment.id === pendingLockAssignment.id) {
          setActiveAssignment((prev) => (prev ? { ...prev, isLocked: pendingLockAssignment.targetLockedState } : null));
        }
      }
    } catch (err) {
      console.error("Failed to toggle lock", err);
    } finally {
      setIsLocking(false);
      setPendingLockAssignment(null);
    }
  };

  // Save Assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await saveAssignmentAction(editingAssignmentData as any);
      if (res.success) {
        setIsEditingAssignment(false);
        loadData();
      }
    } catch (err) {
      console.error("Failed to save assignment", err);
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    try {
      const res = await deleteAssignmentAction(id);
      if (res.success) {
        loadData();
      }
    } catch (err) {
      console.error("Failed to delete assignment", err);
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Student Assignment Checker"
        subtitle="Student-first assignment manager, holistic AI handwriting evaluation, and administrative lock controls."
      />

      {/* Main Switcher Tabs & Global Access Control (Section 7) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--surface-border)] pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold bg-[#d4af37] text-[#141416] shadow-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[17px]">group</span>
            <span>Student Submissions ({aggregatedStudents.length} Students)</span>
          </div>
        </div>

        {/* Global Assignment Access Control Pill (Section 7) */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] shadow-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                assignmentsGlobalEnabled ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <div className="text-left">
              <span className="block font-display text-[11px] uppercase tracking-wider font-bold text-[var(--text-main)]">
                Assignment Access: {assignmentsGlobalEnabled ? "Active" : "Disabled"}
              </span>
              <span className="block text-[10px] font-mono text-[var(--text-muted)]">
                {assignmentsGlobalEnabled
                  ? "Students can view and submit assignments"
                  : "All student submissions paused (data preserved)"}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={isTogglingAccess}
            onClick={handleToggleGlobalAccess}
            className={`px-3.5 py-1.5 rounded-lg font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              assignmentsGlobalEnabled
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white"
            } disabled:opacity-50`}
            title={assignmentsGlobalEnabled ? "Turn off student assignment access" : "Turn on student assignment access"}
          >
            <span className="material-symbols-outlined text-[15px]">
              {assignmentsGlobalEnabled ? "pause_circle" : "play_circle"}
            </span>
            <span>{isTogglingAccess ? "Updating..." : assignmentsGlobalEnabled ? "Disable Access" : "Enable Access"}</span>
          </button>
        </div>
      </div>

      {accessSettingToast && (
        <div className="p-3 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>{accessSettingToast}</span>
        </div>
      )}

      {/* ================= VIEW 1: STUDENT-FIRST SUBMISSIONS CHECKER ================= */}
      {mainView === "checker" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] space-y-1">
              <span className="text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold">
                Total Students
              </span>
              <div className="text-2xl font-display font-black text-[var(--text-main)]">
                {aggregatedStudents.length}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] space-y-1">
              <span className="text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold">
                Total Submissions
              </span>
              <div className="text-2xl font-display font-black text-[var(--text-main)]">
                {submissions.length}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] space-y-1">
              <span className="text-[11px] font-display uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">
                Awaiting Review
              </span>
              <div className="text-2xl font-display font-black text-amber-600 dark:text-amber-400">
                {submissions.filter((s) => s.status === "Submitted" || s.status === "Checking").length}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] space-y-1">
              <span className="text-[11px] font-display uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                Checked &amp; Graded
              </span>
              <div className="text-2xl font-display font-black text-emerald-600 dark:text-emerald-400">
                {submissions.filter((s) => s.status === "Checked").length}
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--text-muted)]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, email, student ID, or assignment..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden focus:border-[#d4af37]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden"
              >
                <option value="all">All Courses</option>
                <option value="A1G">German A1 (A1G)</option>
                <option value="grammar-a1">Grammar Mastery</option>
              </select>

              <select
                value={practiceFilter}
                onChange={(e) => setPracticeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden"
              >
                <option value="all">All Practice Types</option>
                <option value="writing">Writing Practice</option>
                <option value="reading">Reading Practice</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="Submitted">Awaiting Review</option>
                <option value="Needs Review">Needs Review</option>
                <option value="Checked">Checked</option>
              </select>

              <select
                value={lockFilter}
                onChange={(e) => setLockFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden"
              >
                <option value="all">All Locks</option>
                <option value="locked">Locked Only</option>
                <option value="unlocked">Unlocked Only</option>
              </select>
            </div>
          </div>

          {/* Student-First Table (Phase 11: One concise row per student) */}
          <div className="rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] overflow-hidden shadow-2xs">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-[#d4af37] animate-spin">
                  progress_activity
                </span>
                <p className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  Loading student submissions...
                </p>
              </div>
            ) : aggregatedStudents.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-[var(--text-muted)]">
                  person_off
                </span>
                <h4 className="font-display text-base font-bold text-[var(--text-main)]">
                  No Students Found
                </h4>
                <p className="font-serif text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  No student records match your current filter settings. Try clearing the filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-low)] border-b border-[var(--surface-border)] text-[var(--text-muted)] font-display uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-5">Student</th>
                      <th className="py-3.5 px-5">Contact Email</th>
                      <th className="py-3.5 px-5">Enrolled Courses</th>
                      <th className="py-3.5 px-5 text-center">Submissions</th>
                      <th className="py-3.5 px-5">Review Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--surface-border)] font-serif">
                    {aggregatedStudents.map((student) => (
                      <tr
                        key={student.studentEmail || student.studentId}
                        onClick={() => setSelectedStudent(student)}
                        className="hover:bg-[#d4af37]/5 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <InitialsAvatar
                              name={student.studentName}
                              sizeClass="w-9 h-9"
                              textSizeClass="text-xs"
                            />
                            <div>
                              <div className="font-display font-bold text-sm text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors">
                                {student.studentName}
                              </div>
                              <div className="font-mono text-[11px] text-[var(--text-muted)]">
                                {student.studentNumber}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5 text-[var(--text-muted)] font-mono text-[11px]">
                          {student.studentEmail}
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {student.enrolledCourses.map((c, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-[var(--surface-low)] border border-[var(--surface-border)] text-[10px] font-display font-bold text-[var(--text-main)]"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-4 px-5 text-center">
                          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-full bg-[var(--surface-low)] border border-[var(--surface-border)]">
                            {student.totalSubmissions}
                          </span>
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex flex-wrap gap-1.5">
                            {student.pendingCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                {student.pendingCount} Pending
                              </span>
                            )}
                            {student.needsReviewCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                {student.needsReviewCount} Review
                              </span>
                            )}
                            {student.checkedCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                {student.checkedCount} Checked
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(student);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-display text-xs font-bold uppercase tracking-wider bg-white dark:bg-[#1f1f26] hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] transition-all cursor-pointer shadow-2xs"
                          >
                            <span>View Details</span>
                            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= STUDENT DETAIL MODAL / DRAWER (Phase 11) ================= */}
      {selectedStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[var(--surface-border)] flex items-center justify-between gap-4 bg-[var(--surface-low)]/50">
              <div className="flex items-center gap-4">
                <InitialsAvatar
                  name={selectedStudent.studentName}
                  sizeClass="w-12 h-12"
                  textSizeClass="text-base"
                />
                <div>
                  <h3 className="font-display text-xl font-bold text-[var(--text-main)]">
                    {selectedStudent.studentName}
                  </h3>
                  <div className="flex items-center gap-2 font-mono text-xs text-[var(--text-muted)]">
                    <span>{selectedStudent.studentNumber}</span>
                    <span>•</span>
                    <span>{selectedStudent.studentEmail}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-border)] transition-colors cursor-pointer"
                title="Close Student Details"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Student Stats Summary Bar */}
            <div className="px-6 py-3 border-b border-[var(--surface-border)] bg-[var(--surface-low)]/20 flex flex-wrap items-center gap-6 text-xs font-display uppercase tracking-wider">
              <div>
                <span className="text-[var(--text-muted)]">Enrolled Courses: </span>
                <span className="font-bold text-[var(--text-main)]">{selectedStudent.enrolledCourses.length}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Total Submissions: </span>
                <span className="font-bold text-[var(--text-main)]">{selectedStudent.totalSubmissions}</span>
              </div>
              <div>
                <span className="text-amber-600 dark:text-amber-400">Awaiting Review: </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{selectedStudent.pendingCount}</span>
              </div>
              <div>
                <span className="text-emerald-600 dark:text-emerald-400">Checked: </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedStudent.checkedCount}</span>
              </div>
            </div>

            {/* Course-Grouped Assignments Section */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedStudent.enrolledCourses.map((courseName) => {
                const courseSubs = selectedStudent.submissions.filter(
                  (s) => (s.courseTitle || s.courseId) === courseName
                );

                return (
                  <div
                    key={courseName}
                    className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)]/30 overflow-hidden"
                  >
                    {/* Course Banner */}
                    <div className="px-4 py-3 bg-[var(--surface-low)] border-b border-[var(--surface-border)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[#d4af37]">menu_book</span>
                        <h4 className="font-display text-sm font-bold text-[var(--text-main)]">
                          {courseName}
                        </h4>
                      </div>
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        {courseSubs.length} Assignment{courseSubs.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {/* Assignments List under this Course */}
                    <div className="divide-y divide-[var(--surface-border)]">
                      {courseSubs.map((sub) => {
                        const isLocked = assignmentLockMap.get(sub.assignmentId) || false;

                        return (
                          <div
                            key={sub.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--surface-low)]/50 transition-colors"
                          >
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37]">
                                  {sub.practiceType.toUpperCase()}
                                </span>
                                <span className="font-mono text-xs text-[var(--text-muted)]">
                                  {sub.moduleTitle} • {sub.lessonTitle}
                                </span>
                                {isLocked && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">lock</span>
                                    <span>Locked</span>
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider border ${
                                    sub.status === "Checked"
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                      : sub.status === "Needs Review"
                                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                  }`}
                                >
                                  {sub.status}
                                </span>
                              </div>

                              <h5 className="font-display text-sm font-bold text-[var(--text-main)]">
                                {sub.assignmentTitle}
                              </h5>

                              <div className="flex flex-wrap items-center gap-4 text-xs font-serif text-[var(--text-muted)]">
                                <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                                <span>Attempt #{sub.attemptNumber || 1}</span>
                                <span>{sub.pages.length} Page{sub.pages.length === 1 ? "" : "s"}</span>
                                {sub.aiScore !== null && <span>AI Score: {sub.aiScore}/{sub.maxMarks}</span>}
                                {sub.finalScore !== null && (
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    Final Grade: {sub.finalScore}/{sub.maxMarks}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Assignment Lock Toggle (Phase 10) */}
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingLockAssignment({
                                    id: sub.assignmentId,
                                    title: sub.assignmentTitle,
                                    targetLockedState: !isLocked,
                                  })
                                }
                                className={`p-2 rounded-xl border text-xs font-display font-bold transition-all cursor-pointer ${
                                  isLocked
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
                                    : "bg-[var(--surface-low)] text-[var(--text-muted)] border-[var(--surface-border)] hover:border-[#d4af37]"
                                }`}
                                title={isLocked ? "Unlock Assignment" : "Lock Assignment"}
                              >
                                <span className="material-symbols-outlined text-[17px]">
                                  {isLocked ? "lock" : "lock_open"}
                                </span>
                              </button>

                              {/* Review & Grade Submission */}
                              <button
                                type="button"
                                onClick={() => handleOpenReview(sub)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider bg-[#d4af37] text-[#141416] hover:bg-[#b08e2b] transition-all cursor-pointer shadow-xs"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                                <span>Review &amp; Grade</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: MANAGE CURRICULAR ASSIGNMENTS ================= */}
      {mainView === "manage_assignments" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="font-serif text-sm text-[var(--text-muted)]">
              Curricular assignments attached to lessons with prompt guidelines, rubrics, and lock controls.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingAssignmentData({
                  courseId: "A1G",
                  moduleId: "mod_a1g_1",
                  lessonId: "les_a1g_2",
                  practiceType: "writing",
                  title: "",
                  instructions: "",
                  questionTask: "",
                  writingRequirements: "",
                  maxMarks: 20,
                  rubric: "",
                  resubmissionAllowed: true,
                  isLocked: false,
                });
                setIsEditingAssignment(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[17px]">add</span>
              <span>Create New Assignment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((asgn) => (
              <div
                key={asgn.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] space-y-4 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37]">
                        {asgn.practiceType.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        {asgn.courseId} • {asgn.lessonId}
                      </span>
                      {asgn.isLocked && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">lock</span>
                          <span>Locked</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-display text-base font-bold text-[var(--text-main)]">
                      {asgn.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Lock Toggle Button with Confirmation (Phase 10) */}
                    <button
                      type="button"
                      onClick={() =>
                        setPendingLockAssignment({
                          id: asgn.id,
                          title: asgn.title,
                          targetLockedState: !asgn.isLocked,
                        })
                      }
                      className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        asgn.isLocked
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          : "bg-[var(--surface-low)] text-[var(--text-muted)] border-[var(--surface-border)] hover:border-[#d4af37]"
                      }`}
                      title={asgn.isLocked ? "Unlock Assignment" : "Lock Assignment"}
                    >
                      <span className="material-symbols-outlined text-[17px]">
                        {asgn.isLocked ? "lock" : "lock_open"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingAssignmentData(asgn);
                        setIsEditingAssignment(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                      title="Edit Assignment"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAssignment(asgn.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                      title="Delete Assignment"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                <p className="font-serif text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                  {asgn.instructions}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--surface-border)] text-xs font-mono text-[var(--text-muted)]">
                  <span>Max Marks: {asgn.maxMarks}</span>
                  <span>{asgn.resubmissionAllowed ? "Resubmissions Allowed" : "Single Attempt"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= ASSIGNMENT LOCK CONFIRMATION MODAL (Phase 10) ================= */}
      {pendingLockAssignment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#16161c] border border-[var(--surface-border)] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">
                  {pendingLockAssignment.targetLockedState ? "lock" : "lock_open"}
                </span>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                  {pendingLockAssignment.targetLockedState ? "Lock Assignment?" : "Unlock Assignment?"}
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  {pendingLockAssignment.title}
                </p>
              </div>
            </div>

            <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
              {pendingLockAssignment.targetLockedState
                ? "Locking this assignment will immediately prevent students from uploading new submissions or resubmissions. All historical submissions, evaluations, and approved grades remain completely preserved."
                : "Unlocking this assignment will re-enable student submissions and resubmissions according to the normal curriculum schedule."}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setPendingLockAssignment(null)}
                disabled={isLocking}
                className="px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--surface-low)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleLock}
                disabled={isLocking}
                className={`px-5 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  pendingLockAssignment.targetLockedState
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                    : "bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] shadow-xs"
                }`}
              >
                {isLocking ? "Updating..." : pendingLockAssignment.targetLockedState ? "Confirm & Lock" : "Confirm & Unlock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REVIEW WORKSPACE MODAL ================= */}
      {activeSubmission && activeAssignment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setActiveSubmission(null)}
        >
          <div
            className="w-full max-w-6xl max-h-[95vh] bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-[var(--surface-border)] flex items-center justify-between gap-4 bg-[var(--surface-low)]/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#d4af37] text-[#141416]">
                    {activeSubmission.practiceType.toUpperCase()} SUBMISSION
                  </span>
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    {activeSubmission.courseTitle} • {activeSubmission.lessonTitle}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                  {activeSubmission.studentName} — {activeSubmission.assignmentTitle}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubmission(null)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-border)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Split Screen Workspace */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              {/* Left Column: Student Answer & Multi-Page Viewer (7 cols) */}
              <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-[var(--surface-border)] flex flex-col bg-zinc-950 p-4 overflow-y-auto">
                {/* Student Written Response */}
                {activeSubmission.studentTextAnswer && (
                  <div className="mb-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-display uppercase tracking-wider font-bold">
                      <span className="flex items-center gap-1.5 text-[#d4af37]">
                        <span className="material-symbols-outlined text-[17px]">edit_note</span>
                        <span>Student Written Response</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {activeSubmission.studentTextAnswer.length} chars
                      </span>
                    </div>
                    <div className="text-zinc-200 font-serif text-xs leading-relaxed whitespace-pre-wrap p-3 rounded-lg bg-black/40 border border-zinc-800/80">
                      {activeSubmission.studentTextAnswer}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-white text-xs mb-3 font-display uppercase tracking-wider">
                  <span>Student Uploaded Images ({activeSubmission.pages?.length || 0})</span>
                  {activeSubmission.pages?.length > 0 && (
                    <span className="font-serif text-[11px] text-zinc-400">Click any page to zoom</span>
                  )}
                </div>

                {(!activeSubmission.pages || activeSubmission.pages.length === 0) ? (
                  <div className="p-8 text-center text-zinc-500 font-serif text-xs">
                    No image attachments submitted for this assignment.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeSubmission.pages.map((page) => (
                      <div
                        key={page.pageNumber}
                        onClick={() => setLightboxPage(page)}
                        className="border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-[#d4af37] transition-all bg-zinc-900 group relative"
                      >
                        <div className="bg-zinc-800/80 px-3 py-1.5 text-zinc-300 font-mono text-[11px] flex justify-between items-center">
                          <span>Page {page.pageNumber}</span>
                          <span className="text-[10px] text-zinc-400">{(page.fileSize / 1024).toFixed(0)} KB</span>
                        </div>
                        <div className="aspect-[1/1.414] max-h-[550px] w-full flex items-center justify-center p-2">
                          <img
                            src={page.originalUrl}
                            alt={`Page ${page.pageNumber}`}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-display text-xs uppercase tracking-wider font-bold">
                          <span className="material-symbols-outlined text-xl mr-1">zoom_in</span>
                          Enlarge Page
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Evaluation & Final Grade Editor (5 cols) */}
              <div className="lg:col-span-5 flex flex-col p-6 overflow-y-auto space-y-6">
                {/* AI Evaluation Status Section */}
                {activeSubmission.aiEvaluation ? (
                  <div className="space-y-3 p-4 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#d4af37]">
                        <span className="material-symbols-outlined text-[18px]">psychology</span>
                        <span className="font-display text-xs font-bold uppercase tracking-wider">
                          AI Multimodal Evaluation
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[var(--text-main)]">
                        {activeSubmission.aiEvaluation.score} / {activeAssignment.maxMarks}
                      </span>
                    </div>

                    <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                      {activeSubmission.aiEvaluation.feedback}
                    </p>

                    {activeSubmission.aiEvaluation.mistakes && activeSubmission.aiEvaluation.mistakes.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="font-display text-[10px] uppercase tracking-wider font-bold text-rose-500">
                          Identified Corrections:
                        </span>
                        <ul className="text-xs font-serif text-[var(--text-muted)] list-disc pl-4 space-y-0.5">
                          {activeSubmission.aiEvaluation.mistakes.map((m, idx) => (
                            <li key={idx}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleAcceptAiGrade}
                        className="text-xs font-display font-bold uppercase tracking-wider text-[#d4af37] hover:underline cursor-pointer"
                      >
                        Accept Suggested AI Grade &rarr;
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowRecheckConfirm(true)}
                        disabled={isRechecking}
                        className="text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                      >
                        {isRechecking ? "Checking..." : "Re-check with AI"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                      <span className="font-display text-xs font-bold uppercase tracking-wider">
                        AI Evaluation: Not Configured (Manual Review)
                      </span>
                    </div>
                    <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                      Automated AI scoring is disabled until backend API credentials are set. Use the form below to enter manual academic feedback and grades.
                    </p>
                  </div>
                )}

                {/* Teacher / Final Grade Override Form */}
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      Final Approved Score (Max: {activeAssignment.maxMarks})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={activeAssignment.maxMarks}
                      value={adminScore}
                      onChange={(e) => setAdminScore(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-mono text-sm focus:outline-hidden focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      Review Status
                    </label>
                    <select
                      value={adminStatus}
                      onChange={(e) => setAdminStatus(e.target.value as AssignmentStatus)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden"
                    >
                      <option value="Reviewed">Reviewed &amp; Graded</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Submitted">Submitted (Pending Review)</option>
                      <option value="Revision Requested">Revision Requested</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      Instructor Evaluation Feedback (Visible to Student)
                    </label>
                    <textarea
                      rows={5}
                      value={adminFeedback}
                      onChange={(e) => setAdminFeedback(e.target.value)}
                      placeholder="Add personalized academic feedback, corrections, and words of encouragement..."
                      className="w-full px-4 py-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden focus:border-[#d4af37]"
                    />
                  </div>

                  {saveSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-serif text-xs">
                      {saveSuccessMsg}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveFinalGrade}
                      disabled={isSavingGrade}
                      className="w-full py-3 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-40 text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>{isSavingGrade ? "Saving Evaluation..." : "Save Final Evaluation"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxPage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxPage(null)}
        >
          <div className="flex justify-between items-center text-white pb-2 border-b border-white/10 shrink-0">
            <span className="font-mono text-sm">Page {lightboxPage.pageNumber}</span>
            <button
              type="button"
              onClick={() => setLightboxPage(null)}
              className="text-white hover:text-[#d4af37] p-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2 overflow-auto">
            <img
              src={lightboxPage.originalUrl}
              alt={`Page ${lightboxPage.pageNumber}`}
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Recheck Confirmation Dialog */}
      {showRecheckConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#16161c] border border-[var(--surface-border)] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-base font-bold text-[var(--text-main)]">
              Re-run AI Multimodal Evaluation?
            </h3>
            <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
              This will re-process the student&apos;s handwritten pages with the vision model. This action uses AI tokens and should be performed only when necessary.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRecheckConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--surface-low)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerRecheck}
                className="px-5 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider bg-[#d4af37] text-[#141416] hover:bg-[#b08e2b]"
              >
                Proceed with Re-check
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Assignment Modal */}
      {isEditingAssignment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsEditingAssignment(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-[var(--surface-border)]">
              <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                {editingAssignmentData.id ? "Edit Assignment" : "Create New Assignment"}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingAssignment(false)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-display font-bold uppercase text-[var(--text-muted)]">Course</label>
                  <select
                    value={editingAssignmentData.courseId}
                    onChange={(e) => setEditingAssignmentData({ ...editingAssignmentData, courseId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-serif"
                  >
                    <option value="A1G">German A1 (A1G)</option>
                    <option value="grammar-a1">Grammar Mastery (grammar-a1)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-display font-bold uppercase text-[var(--text-muted)]">Practice Type</label>
                  <select
                    value={editingAssignmentData.practiceType}
                    onChange={(e) => setEditingAssignmentData({ ...editingAssignmentData, practiceType: e.target.value as PracticeType })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-serif"
                  >
                    <option value="writing">Writing Practice</option>
                    <option value="reading">Reading Practice</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-display font-bold uppercase text-[var(--text-muted)]">Title</label>
                <input
                  type="text"
                  required
                  value={editingAssignmentData.title || ""}
                  onChange={(e) => setEditingAssignmentData({ ...editingAssignmentData, title: e.target.value })}
                  placeholder="e.g. Vorstellung und persönliche Angaben"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-serif"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-display font-bold uppercase text-[var(--text-muted)]">Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={editingAssignmentData.instructions || ""}
                  onChange={(e) => setEditingAssignmentData({ ...editingAssignmentData, instructions: e.target.value })}
                  placeholder="Instructions for students..."
                  className="w-full px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-serif"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-display font-bold uppercase text-[var(--text-muted)]">Max Marks</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={editingAssignmentData.maxMarks || 20}
                    onChange={(e) => setEditingAssignmentData({ ...editingAssignmentData, maxMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-mono"
                  />
                </div>

                <div className="space-y-1 flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-serif text-[var(--text-main)]">
                    <input
                      type="checkbox"
                      checked={Boolean(editingAssignmentData.isLocked)}
                      onChange={(e) => setEditingAssignmentData({ ...editingAssignmentData, isLocked: e.target.checked })}
                      className="rounded border-[var(--surface-border)] text-[#d4af37]"
                    />
                    <span>Lock Assignment (Block submissions)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  onClick={() => setIsEditingAssignment(false)}
                  className="px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--surface-low)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider bg-[#d4af37] text-[#141416] hover:bg-[#b08e2b]"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
