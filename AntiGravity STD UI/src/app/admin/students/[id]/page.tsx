"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  approveCourseEnrollment,
  rejectCourseEnrollment,
  grantCourseAccess,
  revokeCourseAccess,
  suspendStudentAccount,
  reactivateStudentAccount,
  approveStudentAccountAction,
  rejectStudentAccountAction,
  getStudentAccountStatusAdmin,
  getStudentProgressAdminAction,
  getAdminStudentDetailAction,
  reviewStudentAssignmentAction,
  renewCourseEnrollmentAction,
  sendStudentPasswordResetAction,
  sendStudentPasswordSetupAction,
  StudentCourseProgressAdmin,
} from "@/app/admin/actions";
import StudentActivityModal from "@/components/admin/StudentActivityModal";
import StudentProfilePictureModal from "@/components/admin/StudentProfilePictureModal";
import InitialsAvatar from "@/components/InitialsAvatar";
import { SUPPORTED_DURATIONS } from "@/lib/enrollmentExpiry";

interface StudentProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface EnrollmentDetail {
  id: string;
  course_id: string;
  courseTitle: string;
  courseSlug: string;
  courseLevel: string;
  status: "pending" | "approved" | "rejected";
  receipt_tid: string | null;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  duration_months?: number;
  durationLabel?: string;
  expires_at?: string | null;
  daysRemaining?: number | null;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  expiryStatus?: string;
  statusLabel?: string;
  remainingLabel?: string;
}

interface AvailableCourse {
  id: string;
  title: string;
  slug: string;
  level: string;
}

export default function AdminStudentDetailPage() {
  const params = useParams();
  const studentId = params?.id as string;

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [accountStatus, setAccountStatus] = useState<"pending" | "active" | "rejected" | "suspended">("active");
  const [enrollments, setEnrollments] = useState<EnrollmentDetail[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [selectedCourseToGrant, setSelectedCourseToGrant] = useState<string>("");
  const [selectedDurationToGrant, setSelectedDurationToGrant] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [picModalOpen, setPicModalOpen] = useState(false);

  // Renewal & Extension Modal State
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [enrollmentToRenew, setEnrollmentToRenew] = useState<EnrollmentDetail | null>(null);
  const [renewalDuration, setRenewalDuration] = useState<number>(3);

  // Student Progress & Assignment Review State
  const [activeTab, setActiveTab] = useState<"enrollments" | "progress">("enrollments");
  const [progressData, setProgressData] = useState<StudentCourseProgressAdmin[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedSubForReview, setSelectedSubForReview] = useState<{
    courseId: string;
    courseTitle: string;
    lessonId: string;
    lessonTitle: string;
  } | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewScore, setReviewScore] = useState(100);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Password & Sign-in Management State
  const [passwordActionLoading, setPasswordActionLoading] = useState<"reset" | "setup" | null>(null);
  const [lastPasswordAction, setLastPasswordAction] = useState<{
    type: "reset" | "setup";
    sentAt: string;
    message: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleSendPasswordReset = async () => {
    if (!studentId) return;
    setPasswordActionLoading("reset");
    try {
      const res = await sendStudentPasswordResetAction(studentId);
      if (res.success && res.data) {
        setLastPasswordAction({
          type: "reset",
          sentAt: res.data.sentAt,
          message: `Branded password reset link dispatched to ${res.data.email}. The student can follow the link to establish their new password.`,
        });
        setFeedbackMessage({
          type: "success",
          text: `Password reset link sent successfully to ${res.data.email}.`,
        });
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to send password reset link.",
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err?.message || "Unexpected exception sending password reset link.",
      });
    } finally {
      setPasswordActionLoading(null);
    }
  };

  const handleSendPasswordSetup = async () => {
    if (!studentId) return;
    setPasswordActionLoading("setup");
    try {
      const res = await sendStudentPasswordSetupAction(studentId);
      if (res.success && res.data) {
        setLastPasswordAction({
          type: "setup",
          sentAt: res.data.sentAt,
          message: `Account setup invite dispatched to ${res.data.email}. The student can follow the link to set up their password for the first time.`,
        });
        setFeedbackMessage({
          type: "success",
          text: `Password setup link sent successfully to ${res.data.email}.`,
        });
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to send password setup link.",
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err?.message || "Unexpected exception sending setup link.",
      });
    } finally {
      setPasswordActionLoading(null);
    }
  };


  const loadData = async () => {
    if (!studentId) return;
    setLoading(true);
    setFeedbackMessage(null);

    try {
      const detailRes = await getAdminStudentDetailAction(studentId);
      if (!detailRes.success || !detailRes.data?.student) {
        console.error("Student profile not found:", detailRes.error);
        setStudent(null);
        setLoading(false);
        return;
      }

      setStudent(detailRes.data.student as StudentProfile);

      // 1b. Fetch account status (active vs suspended)
      try {
        const statusRes = await getStudentAccountStatusAdmin(studentId);
        if (statusRes.success && statusRes.status) {
          setAccountStatus(statusRes.status);
        }
      } catch {
        // Safe status check fallback
      }

      // 1c. Fetch calculated student curriculum progress
      try {
        setLoadingProgress(true);
        const progressRes = await getStudentProgressAdminAction(studentId);
        if (progressRes.success && progressRes.data?.courses) {
          setProgressData(progressRes.data.courses);
        }
      } catch (e) {
        console.error("Failed to load student progress:", e);
      } finally {
        setLoadingProgress(false);
      }

      // 2. Courses
      const coursesList = (detailRes.data.availableCourses as AvailableCourse[]) || [];
      setAvailableCourses(coursesList);
      if (coursesList.length > 0 && !selectedCourseToGrant) {
        setSelectedCourseToGrant(coursesList[0].id);
      }

      const courseMap = new Map<string, AvailableCourse>();
      coursesList.forEach((c) => courseMap.set(c.id, c));

      // 3. Enrollments for this student (preserving server-computed expiry & duration telemetry)
      const mappedEnrollments: EnrollmentDetail[] = (
        (detailRes.data.enrollments as Array<any>) || []
      ).map((e) => {
        const course = courseMap.get(e.course_id);
        return {
          id: e.id,
          course_id: e.course_id,
          courseTitle: e.courseTitle || course?.title || "Academic Curriculum Course",
          courseSlug: e.courseSlug || course?.slug || "course",
          courseLevel: e.courseLevel || course?.level || "Academic",
          status: e.status as "pending" | "approved" | "rejected",
          receipt_tid: e.receipt_tid || null,
          requested_at: e.requested_at,
          approved_at: e.approved_at || null,
          approved_by: e.approved_by || null,
          rejected_at: e.rejected_at || null,
          rejected_by: e.rejected_by || null,
          duration_months: e.duration_months,
          durationLabel: e.durationLabel,
          expires_at: e.expires_at || null,
          daysRemaining: e.daysRemaining,
          isExpired: e.isExpired,
          isExpiringSoon: e.isExpiringSoon,
          expiryStatus: e.expiryStatus,
          statusLabel: e.statusLabel,
          remainingLabel: e.remainingLabel,
        };
      });

      setEnrollments(mappedEnrollments);
    } catch (err) {
      console.error("Unexpected error in student detail load:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  // Action: Approve Request
  const handleApprove = (enrollmentId: string, durationMonths: number = 3) => {
    startTransition(async () => {
      const res = await approveCourseEnrollment(enrollmentId, studentId, durationMonths);
      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: `Course access request successfully approved with ${durationMonths} months access duration.`,
        });
        loadData();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to approve course access.",
        });
      }
    });
  };

  // Action: Reject Request
  const handleReject = (enrollmentId: string) => {
    startTransition(async () => {
      const res = await rejectCourseEnrollment(enrollmentId, studentId);
      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: "Course application rejected.",
        });
        loadData();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to reject application.",
        });
      }
    });
  };

  // Action: Manual Course Grant
  const handleManualGrant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseToGrant) return;

    startTransition(async () => {
      const res = await grantCourseAccess(studentId, selectedCourseToGrant, selectedDurationToGrant);
      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: `Course access granted directly for ${selectedDurationToGrant} months. The student can now access this course in the LMS.`,
        });
        loadData();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to grant course access.",
        });
      }
    });
  };

  // Action: Renew / Extend Course Enrollment
  const handleRenewEnrollment = (enrollment: EnrollmentDetail, durationMonths: number) => {
    startTransition(async () => {
      const res = await renewCourseEnrollmentAction({
        enrollmentId: enrollment.id,
        studentId,
        courseId: enrollment.course_id,
        durationMonths,
      });

      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: `Course access successfully extended by ${durationMonths} months without duplicate records.`,
        });
        setRenewalModalOpen(false);
        setEnrollmentToRenew(null);
        loadData();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to renew course enrollment.",
        });
      }
    });
  };

  // Action: Revoke Course Access
  const handleRevoke = (courseId: string) => {
    if (!confirm("Are you sure you want to revoke this student's access to this course? Other courses will remain unaffected.")) {
      return;
    }

    startTransition(async () => {
      const res = await revokeCourseAccess(studentId, courseId);
      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: "Course access revoked. Access to other courses remains intact.",
        });
        loadData();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to revoke course access.",
        });
      }
    });
  };

  // Action: Approve Student Account
  const handleApproveAccount = () => {
    startTransition(async () => {
      const res = await approveStudentAccountAction(studentId);
      if (res.success) {
        setAccountStatus("active");
        setFeedbackMessage({
          type: "success",
          text: "Student account approved successfully! An approval confirmation email has been dispatched.",
        });
        loadData();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to approve student account.",
        });
      }
    });
  };

  // Action: Reject Student Account
  const handleRejectAccount = () => {
    if (!window.confirm("Are you sure you want to reject this student's account? The student will be blocked from accessing protected LMS content.")) return;

    startTransition(async () => {
      const res = await rejectStudentAccountAction(studentId);
      if (res.success) {
        setAccountStatus("rejected");
        setFeedbackMessage({
          type: "success",
          text: "Student account has been rejected.",
        });
        loadData();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to reject student account.",
        });
      }
    });
  };

  // Action: Toggle Account Suspension
  const handleToggleSuspend = () => {
    const isCurrentlySuspended = accountStatus === "suspended";
    const confirmPrompt = isCurrentlySuspended
      ? "Are you sure you want to reactivate this student's account? Access to approved courses will be restored."
      : "Are you sure you want to suspend this student's account? The student will immediately be blocked from accessing the LMS and learning materials.";

    if (!window.confirm(confirmPrompt)) return;

    startTransition(async () => {
      const res = isCurrentlySuspended
        ? await reactivateStudentAccount(studentId)
        : await suspendStudentAccount(studentId);

      if (res.success) {
        setAccountStatus(isCurrentlySuspended ? "active" : "suspended");
        setFeedbackMessage({
          type: "success",
          text: isCurrentlySuspended
            ? "Student account has been reactivated successfully."
            : "Student account has been suspended. Access to all LMS resources is blocked.",
        });
        loadData();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to update student account status.",
        });
      }
    });
  };

  const handleOpenReviewModal = (sub: any, courseId: string, courseTitle: string) => {
    setSelectedSubForReview({
      courseId,
      courseTitle,
      lessonId: sub.lessonId,
      lessonTitle: sub.lessonTitle,
    });
    setReviewFeedback(sub.feedback || "");
    setReviewScore(sub.score || 100);
    setReviewModalOpen(true);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForReview || !reviewFeedback.trim()) {
      setFeedbackMessage({ type: "error", text: "Please enter feedback for the student." });
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await reviewStudentAssignmentAction({
        studentId,
        courseId: selectedSubForReview.courseId,
        courseTitle: selectedSubForReview.courseTitle,
        lessonId: selectedSubForReview.lessonId,
        lessonTitle: selectedSubForReview.lessonTitle,
        feedback: reviewFeedback.trim(),
        score: reviewScore,
      });

      if (res.success) {
        setFeedbackMessage({
          type: "success",
          text: "Assignment review recorded and course notification sent to student.",
        });
        setReviewModalOpen(false);
        loadData();
      } else {
        setFeedbackMessage({
          type: "error",
          text: res.error || "Failed to submit assignment review.",
        });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err?.message || "Failed to review assignment." });
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div>
      <AdminHeader
        title={student?.full_name ? `${student.full_name} — Details` : "Student Details"}
        subtitle="SpeakUp Academic Administration & Access Control"
      />

      <div className="p-6 sm:p-8 max-w-[1360px] mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-display uppercase tracking-wider text-[var(--text-muted)]">
          <Link
            href="/admin/students"
            className="hover:text-[var(--text-main)] flex items-center gap-1 font-semibold"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>All Students</span>
          </Link>
          <span>/</span>
          <span className="text-[#8a6d1b] dark:text-[#d4af37] font-bold truncate max-w-xs">
            {student?.full_name || student?.email || "Student Record"}
          </span>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-display font-semibold transition-all ${
              feedbackMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {feedbackMessage.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
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
              Loading Student Dossier...
            </p>
          </div>
        ) : !student ? (
          <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto border border-rose-500/20">
              <span className="material-symbols-outlined text-[28px]">person_off</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                Student Not Found
              </h3>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                No matching student profile exists with ID: {studentId}
              </p>
            </div>
            <Link
              href="/admin/students"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#d4af37] text-[#141416] font-display text-xs uppercase tracking-wider font-bold"
            >
              Return to Students
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Student Profile Dossier & Password Management */}
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-6">
                <div className="flex items-center gap-4 pb-6 border-b border-[var(--surface-border)]">
                {/* Circular Profile Picture Frame */}
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-full bg-white dark:bg-[#141416] border-2 border-[#d4af37] p-0.5 overflow-hidden shadow-md aspect-square flex items-center justify-center">
                    <InitialsAvatar
                      name={student.full_name || student.email}
                      avatarUrl={student.avatar_url}
                      sizeClass="w-full h-full"
                      textSizeClass="text-lg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPicModalOpen(true)}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] flex items-center justify-center shadow-md cursor-pointer transition-transform group-hover:scale-110"
                    title="Edit Student Profile Picture"
                  >
                    <span className="material-symbols-outlined text-[13px] block">photo_camera</span>
                  </button>
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <h2 className="font-display text-lg font-bold text-[var(--text-main)] tracking-tight truncate">
                    {student.full_name || "Anonymous Scholar"}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {accountStatus === "suspended" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>Suspended Account</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span>Active Student</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setPicModalOpen(true)}
                      className="text-[10px] font-display uppercase tracking-wider font-semibold text-[#8a6d1b] dark:text-[#d4af37] hover:underline cursor-pointer"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              </div>

              {/* Student Metadata Table */}
              <div className="space-y-4 font-serif text-xs">
                <div>
                  <span className="font-display text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold block mb-1">
                    Email Address
                  </span>
                  <div className="flex items-center gap-2 text-[var(--text-main)] font-sans">
                    <span className="material-symbols-outlined text-[15px] text-[var(--text-muted)]">
                      mail
                    </span>
                    <span>{student.email}</span>
                  </div>
                </div>

                <div>
                  <span className="font-display text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold block mb-1">
                    Phone Number
                  </span>
                  <div className="flex items-center gap-2 text-[var(--text-main)] font-sans">
                    <span className="material-symbols-outlined text-[15px] text-[var(--text-muted)]">
                      call
                    </span>
                    <span>{student.phone || "No phone provided"}</span>
                  </div>
                </div>

                <div>
                  <span className="font-display text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold block mb-1">
                    Registered On
                  </span>
                  <div className="text-[var(--text-main)] font-sans">
                    {new Date(student.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                <div>
                  <span className="font-display text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold block mb-1">
                    Account Status &amp; Controls
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)]">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-display font-bold ${
                      accountStatus === "pending"
                        ? "text-amber-600 dark:text-amber-400"
                        : accountStatus === "rejected" || accountStatus === "suspended"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        accountStatus === "pending"
                          ? "bg-amber-500"
                          : accountStatus === "rejected" || accountStatus === "suspended"
                          ? "bg-rose-500"
                          : "bg-emerald-500"
                      }`} />
                      <span>
                        {accountStatus === "pending"
                          ? "Pending Approval"
                          : accountStatus === "rejected"
                          ? "Account Rejected"
                          : accountStatus === "suspended"
                          ? "Access Suspended"
                          : "Active & Verified"}
                      </span>
                    </span>

                    <div className="flex items-center gap-2">
                      {accountStatus === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={handleApproveAccount}
                            disabled={isPending}
                            className="px-2.5 py-1.5 rounded-lg font-display text-[10px] uppercase tracking-wider font-bold cursor-pointer transition-all border bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          >
                            {isPending ? "..." : "Approve Account"}
                          </button>
                          <button
                            type="button"
                            onClick={handleRejectAccount}
                            disabled={isPending}
                            className="px-2.5 py-1.5 rounded-lg font-display text-[10px] uppercase tracking-wider font-bold cursor-pointer transition-all border bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30"
                          >
                            {isPending ? "..." : "Reject"}
                          </button>
                        </>
                      ) : accountStatus === "rejected" ? (
                        <button
                          type="button"
                          onClick={handleApproveAccount}
                          disabled={isPending}
                          className="px-2.5 py-1.5 rounded-lg font-display text-[10px] uppercase tracking-wider font-bold cursor-pointer transition-all border bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        >
                          {isPending ? "..." : "Approve Account"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleToggleSuspend}
                          disabled={isPending}
                          className={`px-3 py-1.5 rounded-lg font-display text-[10px] uppercase tracking-wider font-bold cursor-pointer transition-all border ${
                            accountStatus === "suspended"
                              ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {isPending
                            ? "Processing..."
                            : accountStatus === "suspended"
                            ? "Reactivate Account"
                            : "Suspend Account"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="font-display text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold block mb-1">
                    System User ID
                  </span>
                  <div className="font-mono text-[10px] text-[var(--text-muted)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] p-2 rounded-lg border border-[var(--surface-border)] break-all select-all">
                    {student.id}
                  </div>
                </div>

                {/* Student Navigation Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("progress");
                      const el = document.getElementById("student-details-right");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`w-full py-3 px-4 rounded-xl border font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs flex items-center justify-between cursor-pointer group ${
                      activeTab === "progress"
                        ? "bg-[#141416] text-white dark:bg-[#d4af37] dark:text-[#141416] border-[#d4af37]"
                        : "bg-[#faf8f4] dark:bg-[var(--surface-low)] hover:bg-[#d4af37] hover:text-[#141416] dark:hover:bg-[#d4af37] dark:hover:text-[#141416] border-[#d4af37]/40 text-[var(--text-main)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[18px] text-[#8a6d1b] dark:text-[#d4af37] group-hover:text-current">
                        trending_up
                      </span>
                      <span>Student Progress</span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)] group-hover:text-current">
                      arrow_forward
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivityModalOpen(true)}
                    className="w-full py-3 px-4 rounded-xl bg-[#faf8f4] dark:bg-[var(--surface-low)] hover:bg-[#d4af37] hover:text-[#141416] dark:hover:bg-[#d4af37] dark:hover:text-[#141416] border border-[#d4af37]/40 text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[18px] text-[#8a6d1b] dark:text-[#d4af37] group-hover:text-[#141416]">
                        manage_history
                      </span>
                      <span>History</span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)] group-hover:text-[#141416]">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>

              {/* Manual Course Grant Action Box */}
              <div className="pt-6 border-t border-[var(--surface-border)] space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#d4af37]">
                    add_moderator
                  </span>
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                    Manual Course Grant
                  </h3>
                </div>

                <p className="font-serif text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Directly grant access to a specific course without requiring a student-initiated application.
                </p>

                {availableCourses.length === 0 ? (
                  <div className="p-3 bg-[#fdfbf7] dark:bg-[var(--surface-low)] rounded-xl border border-[var(--surface-border)] text-[11px] text-[var(--text-muted)] italic">
                    No courses configured in the database to grant yet.
                  </div>
                ) : (
                  <form onSubmit={handleManualGrant} className="space-y-3">
                    <div>
                      <label className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-1">
                        Course Curriculum
                      </label>
                      <select
                        value={selectedCourseToGrant}
                        onChange={(e) => setSelectedCourseToGrant(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                      >
                        {availableCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} ({c.level})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-1">
                        Enrollment Duration
                      </label>
                      <select
                        value={selectedDurationToGrant}
                        onChange={(e) => setSelectedDurationToGrant(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                      >
                        {SUPPORTED_DURATIONS.map((dur) => (
                          <option key={dur.months} value={dur.months}>
                            {dur.label} ({dur.months} Months Access)
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isPending || !selectedCourseToGrant}
                      className="w-full py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>{isPending ? "Granting..." : "Grant Access"}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Password & Sign-in Section (Requirement 5) */}
            <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#d4af37]">lock_reset</span>
                  <h3 className="font-display text-sm font-bold text-[var(--text-main)]">
                    Password &amp; Sign-in
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37]">
                  Supabase Auth
                </span>
              </div>

              {/* Student Credential Summary */}
              <div className="space-y-2 p-3.5 rounded-xl bg-[#fdfbf7] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-xs font-serif">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)] font-display text-[10px] uppercase tracking-wider font-semibold">Account:</span>
                  <span className="font-sans font-bold text-[var(--text-main)]">{student.full_name || "Scholar"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)] font-display text-[10px] uppercase tracking-wider font-semibold">Email:</span>
                  <span className="font-mono text-[11px] text-[var(--text-main)] truncate max-w-[180px]">{student.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)] font-display text-[10px] uppercase tracking-wider font-semibold">Status:</span>
                  <span className={`font-display text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                    accountStatus === "suspended"
                      ? "bg-rose-500/15 text-rose-600"
                      : "bg-emerald-500/15 text-emerald-600"
                  }`}>
                    {accountStatus === "suspended" ? "Suspended" : "Active & Verified"}
                  </span>
                </div>
              </div>

              {/* Security Notice */}
              <p className="font-serif text-[11px] text-[var(--text-muted)] leading-relaxed">
                Plaintext passwords are never displayed or stored in accordance with security protocols. Reset and invitation links are cryptographically signed by Supabase Auth and valid for 24 hours.
              </p>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={passwordActionLoading !== null}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#141416] text-[#d4af37] dark:bg-[#d4af37] dark:text-[#141416] hover:opacity-90 font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {passwordActionLoading === "reset" ? (
                    <span className="w-3.5 h-3.5 border-2 border-[#d4af37] dark:border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                  )}
                  <span>Send Password Reset Link</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendPasswordSetup}
                  disabled={passwordActionLoading !== null}
                  className="w-full py-2.5 px-3 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] bg-white dark:bg-[#16161c] font-display text-xs uppercase tracking-wider font-semibold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {passwordActionLoading === "setup" ? (
                    <span className="w-3.5 h-3.5 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px] text-[#d4af37]">mail</span>
                  )}
                  <span>Send Password Setup Link (Invite)</span>
                </button>
              </div>

              {/* Activity Timestamps */}
              {lastPasswordAction && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-serif space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    <span>{lastPasswordAction.type === "reset" ? "Reset Link Dispatched" : "Setup Link Dispatched"}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{lastPasswordAction.message}</p>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">
                    Activity: {new Date(lastPasswordAction.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ({new Date(lastPasswordAction.sentAt).toLocaleDateString()})
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* Right Column: Course Access & Student Progress */}
            <div id="student-details-right" className="lg:col-span-2 space-y-6">
              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("enrollments")}
                  className={`px-5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                    activeTab === "enrollments"
                      ? "bg-[#141416] text-white dark:bg-[#d4af37] dark:text-[#141416]"
                      : "bg-white dark:bg-[#141418] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--surface-border)]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <span>Course Access &amp; Enrollments</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/10 dark:bg-black/20 font-mono">
                    {enrollments.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("progress")}
                  className={`px-5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                    activeTab === "progress"
                      ? "bg-[#141416] text-white dark:bg-[#d4af37] dark:text-[#141416]"
                      : "bg-white dark:bg-[#141418] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--surface-border)]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">trending_up</span>
                  <span>Curriculum Progress</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/10 dark:bg-black/20 font-mono">
                    {progressData.length}
                  </span>
                </button>
              </div>

              {/* TAB 1: COURSE ACCESS & ENROLLMENT HISTORY */}
              {activeTab === "enrollments" && (
                <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--surface-border)]">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[var(--text-main)] tracking-tight">
                      Course Access &amp; Enrollment History
                    </h3>
                    <p className="font-serif text-xs text-[var(--text-muted)]">
                      Course-specific security: approving or granting one course does not unlock any unrelated courses.
                    </p>
                  </div>
                  <span className="font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                    {enrollments.length} Record{enrollments.length === 1 ? "" : "s"}
                  </span>
                </div>

                {enrollments.length === 0 ? (
                  /* Empty state for student with no enrollments */
                  <div className="py-14 text-center space-y-3">
                    <span className="material-symbols-outlined text-3xl text-[var(--text-muted)]">
                      school
                    </span>
                    <h4 className="font-display text-sm font-bold text-[var(--text-main)]">
                      No Course Access Records
                    </h4>
                    <p className="font-serif text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                      This student has not yet submitted any course enrollment requests, and no manual courses have been assigned.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {enrollments.map((item) => {
                      const isCardExpired = item.status === "approved" && item.isExpired;
                      const isCardExpiringSoon = item.status === "approved" && !item.isExpired && item.isExpiringSoon;
                      const isCardActive = item.status === "approved" && !item.isExpired && !item.isExpiringSoon;

                      return (
                        <div
                          key={item.id}
                          className={`p-5 rounded-2xl border transition-all space-y-4 ${
                            item.status === "pending"
                              ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30"
                              : isCardExpired
                              ? "border-2 border-rose-500/60 bg-rose-500/10 dark:bg-rose-950/30 shadow-xs ring-1 ring-rose-500/30"
                              : isCardExpiringSoon
                              ? "bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/40"
                              : isCardActive
                              ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/25"
                              : "bg-[#fdfbf7] dark:bg-[var(--surface-low)] border-[var(--surface-border)] opacity-80"
                          }`}
                        >
                          {/* Course Header & Status */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4 className="font-display text-base font-bold text-[var(--text-main)]">
                                  {item.courseTitle}
                                </h4>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-display uppercase tracking-wider font-bold bg-[#d4af37]/20 text-[#8a6d1b] dark:text-[#d4af37]">
                                  {item.courseLevel}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-[var(--text-muted)] block">
                                Slug: {item.courseSlug}
                              </span>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {item.status === "pending" && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  <span className="material-symbols-outlined text-[15px] animate-pulse">
                                    hourglass_top
                                  </span>
                                  <span>Pending Approval</span>
                                </span>
                              )}
                              {isCardExpired && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40">
                                  <span className="material-symbols-outlined text-[15px]">
                                    event_busy
                                  </span>
                                  <span>Enrollment Expired</span>
                                </span>
                              )}
                              {isCardExpiringSoon && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                                  <span className="material-symbols-outlined text-[15px]">
                                    timer
                                  </span>
                                  <span>Expiring Soon ({item.daysRemaining !== null ? `${item.daysRemaining}d left` : "Soon"})</span>
                                </span>
                              )}
                              {isCardActive && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  <span className="material-symbols-outlined text-[15px]">
                                    verified
                                  </span>
                                  <span>Active Access ({item.daysRemaining !== null ? `${item.daysRemaining}d remaining` : "Ongoing"})</span>
                                </span>
                              )}
                              {item.status === "rejected" && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25">
                                  <span className="material-symbols-outlined text-[15px]">
                                    cancel
                                  </span>
                                  <span>Access Revoked / Rejected</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Enrollment Duration & Expiry Telemetry Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-[var(--surface-border)] font-serif text-xs text-[var(--text-muted)]">
                            <div>
                              <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">
                                {item.approved_at ? "Enrollment Start" : "Requested At"}
                              </span>
                              <span className="font-sans text-[var(--text-main)] font-medium">
                                {new Date(item.approved_at || item.requested_at).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>

                            <div>
                              <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">
                                Configured Duration
                              </span>
                              <span className="font-sans text-[var(--text-main)] font-semibold">
                                {item.durationLabel || (item.duration_months ? `${item.duration_months} Months Access` : "Standard (3 Months)")}
                              </span>
                            </div>

                            <div>
                              <span className={`font-display text-[10px] uppercase tracking-wider block font-semibold ${isCardExpired ? "text-rose-600 dark:text-rose-400" : "text-[var(--text-muted)]"}`}>
                                Access Expiry Date
                              </span>
                              <span className={`font-sans ${isCardExpired ? "text-rose-700 dark:text-rose-300 font-bold" : "text-[var(--text-main)]"}`}>
                                {item.expires_at ? new Date(item.expires_at).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }) : "Indefinite / Not Set"}
                              </span>
                            </div>

                            <div>
                              <span className={`font-display text-[10px] uppercase tracking-wider block font-semibold ${isCardExpired ? "text-rose-600 dark:text-rose-400" : "text-[var(--text-muted)]"}`}>
                                Remaining Time
                              </span>
                              <span className={`font-sans font-bold ${isCardExpired ? "text-rose-700 dark:text-rose-300" : isCardExpiringSoon ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {isCardExpired
                                  ? "0 Days (Access Ended)"
                                  : item.remainingLabel || (item.daysRemaining !== null ? `${item.daysRemaining} Days` : "Active")}
                              </span>
                            </div>

                            {item.receipt_tid && (
                              <div className="sm:col-span-2 md:col-span-4 pt-1">
                                <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">
                                  Bank Transaction ID / TID
                                </span>
                                <span className="font-mono text-xs text-[var(--text-main)] font-bold">
                                  {item.receipt_tid}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons for this Enrollment */}
                          <div className="pt-3 border-t border-[var(--surface-border)] flex items-center justify-end gap-2.5 flex-wrap">
                            {item.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleReject(item.id)}
                                  className="px-4 py-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                  <span>Reject</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleApprove(item.id, 3)}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[16px]">check</span>
                                  <span>Approve Access (3 Mo)</span>
                                </button>
                              </>
                            )}

                            {item.status === "approved" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEnrollmentToRenew(item);
                                    setRenewalDuration(item.duration_months || 3);
                                    setRenewalModalOpen(true);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                                  title="Extend access duration without creating duplicate records"
                                >
                                  <span className="material-symbols-outlined text-[16px]">autorenew</span>
                                  <span>{isCardExpired ? "Renew Access" : "Extend Access"}</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleRevoke(item.course_id)}
                                  className="px-4 py-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                  title="Revoke student access to this course without deleting account"
                                >
                                  <span className="material-symbols-outlined text-[16px]">lock</span>
                                  <span>Revoke Access</span>
                                </button>
                              </>
                            )}

                            {item.status === "rejected" && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleApprove(item.id, 3)}
                                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#8a6d1b] dark:hover:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-[16px]">replay</span>
                                <span>Re-Approve Access</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

              {/* TAB 2: STUDENT CURRICULUM PROGRESS */}
              {activeTab === "progress" && (
                <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--surface-border)]">
                    <div>
                      <h3 className="font-display text-lg font-bold text-[var(--text-main)] tracking-tight">
                        Calculated Curriculum Progress
                      </h3>
                      <p className="font-serif text-xs text-[var(--text-muted)]">
                        Real completion telemetry for assignments, videos, lessons, and modules.
                      </p>
                    </div>
                    <span className="font-display text-xs uppercase tracking-wider font-semibold text-[#8a6d1b] dark:text-[#d4af37]">
                      {progressData.length} Enrolled Course{progressData.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {loadingProgress ? (
                    <div className="py-12 text-center text-xs font-serif text-[var(--text-muted)]">
                      Calculating telemetry metrics...
                    </div>
                  ) : progressData.length === 0 ? (
                    <div className="py-14 text-center space-y-3">
                      <span className="material-symbols-outlined text-3xl text-[var(--text-muted)]">
                        trending_flat
                      </span>
                      <h4 className="font-display text-sm font-bold text-[var(--text-main)]">
                        No progress data
                      </h4>
                      <p className="font-serif text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                        This student has not yet started learning activities in their enrolled courses. Progress metrics will populate automatically as lessons and assignments are completed.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {progressData.map((course) => (
                        <div
                          key={course.courseId}
                          className="rounded-2xl border border-[var(--surface-border)] bg-[#faf8f5]/40 dark:bg-[var(--surface-low)]/20 p-5 sm:p-6 space-y-5"
                        >
                          {/* Course Header & Overall % */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <h4 className="font-display text-base sm:text-lg font-bold text-[var(--text-main)]">
                                {course.courseTitle}
                              </h4>
                              {course.lastActive && (
                                <span className="font-serif text-xs text-[var(--text-muted)] block">
                                  Last active: {new Date(course.lastActive).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] block">
                                  Overall
                                </span>
                                <span className="font-display text-xl font-extrabold text-[#d4af37]">
                                  {course.overallPercentage}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Overall Progress Bar */}
                          <div className="w-full bg-[#f0eae0] dark:bg-[var(--surface-low)] h-2 rounded-full overflow-hidden border border-[var(--surface-border)]/50">
                            <div
                              className="bg-[#d4af37] h-full rounded-full transition-all duration-500"
                              style={{ width: `${course.overallPercentage}%` }}
                            />
                          </div>

                          {/* Clean Practical Metrics Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                            {/* Assignments */}
                            <div className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                                  Assignments
                                </span>
                                {course.assignments.isDone && (
                                  <span className="material-symbols-outlined text-[16px] text-emerald-500 font-bold">
                                    check
                                  </span>
                                )}
                              </div>
                              <p className="font-mono text-base font-bold text-[var(--text-main)]">
                                {course.assignments.completed} / {course.assignments.total}
                              </p>
                            </div>

                            {/* Videos */}
                            <div className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                                  Videos
                                </span>
                                {course.videos.isDone && (
                                  <span className="material-symbols-outlined text-[16px] text-emerald-500 font-bold">
                                    check
                                  </span>
                                )}
                              </div>
                              <p className="font-mono text-base font-bold text-[var(--text-main)]">
                                {course.videos.completed} / {course.videos.total}
                              </p>
                            </div>

                            {/* Lessons */}
                            <div className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                                  Lessons
                                </span>
                                {course.lessons.isDone && (
                                  <span className="material-symbols-outlined text-[16px] text-emerald-500 font-bold">
                                    check
                                  </span>
                                )}
                              </div>
                              <p className="font-mono text-base font-bold text-[var(--text-main)]">
                                {course.lessons.completed} / {course.lessons.total}
                              </p>
                            </div>

                            {/* Modules */}
                            <div className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                                  Modules
                                </span>
                                {course.modules.isDone && (
                                  <span className="material-symbols-outlined text-[16px] text-emerald-500 font-bold">
                                    check
                                  </span>
                                )}
                              </div>
                              <p className="font-mono text-base font-bold text-[var(--text-main)]">
                                {course.modules.completed} / {course.modules.total}
                              </p>
                            </div>
                          </div>

                          {/* Assignment Submissions & Review Section (AI Checker Ready Architecture) */}
                          {course.submissions && course.submissions.length > 0 && (
                            <div className="pt-3 border-t border-[var(--surface-border)] space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px] text-[#d4af37]">
                                    rate_review
                                  </span>
                                  <h5 className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                                    Assignment Submissions &amp; Academic Reviews
                                  </h5>
                                </div>
                                <span className="text-[10px] font-serif text-[var(--text-muted)]">
                                  {course.submissions.length} submission{course.submissions.length === 1 ? "" : "s"}
                                </span>
                              </div>

                              <div className="space-y-2">
                                {course.submissions.map((sub, sIdx) => (
                                  <div
                                    key={sub.lessonId || sIdx}
                                    className="p-3.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-display text-xs font-bold text-[var(--text-main)]">
                                          {sub.lessonTitle}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded-md text-[9px] font-display uppercase tracking-wider font-bold ${
                                            sub.status === "reviewed"
                                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                          }`}
                                        >
                                          {sub.status}
                                        </span>
                                      </div>
                                      {sub.feedback && (
                                        <p className="font-serif text-xs text-[var(--text-muted)] italic">
                                          &quot;{sub.feedback}&quot;
                                        </p>
                                      )}
                                      <span className="font-mono text-[10px] text-[var(--text-muted)] block">
                                        Submitted: {new Date(sub.submittedAt).toLocaleDateString()}
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenReviewModal(sub, course.courseId, course.courseTitle)}
                                      className="px-3 py-1.5 rounded-lg border border-[#d4af37]/40 hover:bg-[#d4af37] hover:text-[#141416] text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shrink-0"
                                    >
                                      {sub.status === "reviewed" ? "Edit Feedback" : "Review & Give Feedback"}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assignment Review Modal */}
      {reviewModalOpen && selectedSubForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
              <div className="space-y-0.5">
                <h4 className="font-display text-base sm:text-lg font-bold text-[var(--text-main)]">
                  Review Assignment: {selectedSubForReview.lessonTitle}
                </h4>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  {selectedSubForReview.courseTitle} • Feedback will trigger a student course notification
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Evaluative Feedback / Guidance *
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder="Provide detailed feedback on the student's grammar accuracy, spoken pauses, or sentence restructuring..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Score / Percentage
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={reviewScore}
                  onChange={(e) => setReviewScore(Number(e.target.value))}
                  className="w-32 px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#141416] hover:bg-[#222228] dark:bg-[#d4af37] dark:hover:bg-[#e4c665] text-white dark:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingReview && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                  <span>Submit Review &amp; Notify Student</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COURSE ENROLLMENT RENEWAL / EXTENSION MODAL */}
      {renewalModalOpen && enrollmentToRenew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#d4af37]">autorenew</span>
                <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                  Renew / Extend Course Access
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRenewalModalOpen(false);
                  setEnrollmentToRenew(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-low)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs font-serif text-[var(--text-muted)]">
              <p>
                Extending enrollment for student <strong className="text-[var(--text-main)] font-sans">{student?.full_name || student?.email}</strong>:
              </p>

              <div className="p-3.5 rounded-xl bg-[#faf8f4] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] space-y-1">
                <div className="font-display font-bold text-sm text-[var(--text-main)]">
                  {enrollmentToRenew.courseTitle}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold ${enrollmentToRenew.isExpired ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {enrollmentToRenew.isExpired ? "Status: Expired" : "Status: Active"}
                  </span>
                  <span>•</span>
                  <span>Previous Expiry: {enrollmentToRenew.expires_at ? new Date(enrollmentToRenew.expires_at).toLocaleDateString() : "Indefinite"}</span>
                </div>
              </div>

              <div>
                <label className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-1.5">
                  Extension Duration
                </label>
                <select
                  value={renewalDuration}
                  onChange={(e) => setRenewalDuration(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs font-serif focus:outline-none focus:border-[#d4af37]"
                >
                  {SUPPORTED_DURATIONS.map((dur) => (
                    <option key={dur.months} value={dur.months}>
                      {dur.label} (+{dur.months} Months Access)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Renewal seamlessly extends from today (if already expired) or appends to remaining days without creating duplicate enrollment rows.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => {
                  setRenewalModalOpen(false);
                  setEnrollmentToRenew(null);
                }}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleRenewEnrollment(enrollmentToRenew, renewalDuration)}
                className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isPending && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                <span>Confirm Extension</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {student && (
        <>
          <StudentActivityModal
            isOpen={activityModalOpen}
            onClose={() => setActivityModalOpen(false)}
            studentId={student.id}
            studentName={student.full_name || undefined}
            studentEmail={student.email}
          />

          <StudentProfilePictureModal
            isOpen={picModalOpen}
            onClose={() => setPicModalOpen(false)}
            studentId={student.id}
            studentName={student.full_name || student.email}
            currentImage={student.avatar_url}
            onSaved={(newUrl) => {
              setStudent((prev) => (prev ? { ...prev, avatar_url: newUrl } : null));
              loadData();
            }}
          />
        </>
      )}
    </div>
  );
}
