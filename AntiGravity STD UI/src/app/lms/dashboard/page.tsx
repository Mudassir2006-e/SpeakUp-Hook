"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LmsProfileDropdown from "@/components/LmsProfileDropdown";
import { useCmsContent } from "@/lib/cms/useCmsContent";
import {
  getStudentProgressAction,
  submitStudentCourseRequestAction,
  getStudentAccountInfoForRequestAction,
  CourseProgressData,
} from "@/app/lms/actions";
import { createClient } from "@/lib/supabase/client";
import { getUnifiedCourseById, getUnifiedCourses } from "@/config/unifiedCourses";
import AdminPreviewBanner from "@/components/lms/AdminPreviewBanner";

export default function DashboardPage() {
  const cms = useCmsContent("dashboard");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");

  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [associatedCourses, setAssociatedCourses] = useState<
    Array<{
      id: string;
      title: string;
      level?: string;
      status: "not_requested" | "pending" | "approved" | "rejected" | "expired";
      requestedAt?: string;
      approvedAt?: string;
      expiresAt?: string;
      daysRemaining?: number | null;
      durationMonths?: number;
    }>
  >([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [submittedCourseTitles, setSubmittedCourseTitles] = useState<string[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [enrolledCoursesProgress, setEnrolledCoursesProgress] = useState<CourseProgressData[]>([]);
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const [allCentralCourses, setAllCentralCourses] = useState(() => getUnifiedCourses());

  useEffect(() => {
    let isMounted = true;
    async function loadStudentData() {
      try {
        if (typeof window !== "undefined" && window.location.search.includes("preview=admin")) {
          setIsAdminPreview(true);
        }

        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && isMounted) {
          const appMetaRole = (user.app_metadata?.role as string) || null;
          setStudentEmail(user.email || "");
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("full_name, role")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.role === "admin" || appMetaRole === "admin") {
            setIsAdminPreview(true);
          }

          const resolvedName =
            profile?.full_name ||
            (user.user_metadata?.full_name as string) ||
            (user.user_metadata?.name as string) ||
            "";

          setStudentName(resolvedName);
        }

        // Fetch persistent progress and strictly enrolled/approved courses from Supabase
        const progressRes = await getStudentProgressAction();
        if (isMounted && progressRes.success && progressRes.data?.courses) {
          const list = Object.values(progressRes.data.courses);
          setEnrolledCoursesProgress(list);
        }

        // Fetch student course request statuses (pending, approved, rejected)
        const accRes = await getStudentAccountInfoForRequestAction();
        if (isMounted && accRes.success && accRes.data) {
          setAssociatedCourses(accRes.data.associatedCourses || []);
          if (accRes.data.studentPhone) {
            setStudentPhone(accRes.data.studentPhone);
          }
        }
      } catch {
        // Fallback
      }
    }

    loadStudentData();

    const handleUpdate = () => {
      loadStudentData();
      setAllCentralCourses(getUnifiedCourses());
    };

    window.addEventListener("speakup_student_name_updated", handleUpdate);
    window.addEventListener("speakup:progress-updated", handleUpdate);
    window.addEventListener("speakup-central-courses-updated", handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("speakup_student_name_updated", handleUpdate);
      window.removeEventListener("speakup:progress-updated", handleUpdate);
      window.removeEventListener("speakup-central-courses-updated", handleUpdate);
    };
  }, []);

  const openAccessModal = async (initialCourseId?: string) => {
    setIsAccessModalOpen(true);
    setRequestError(null);
    setModalSuccess(false);
    setModalLoading(false);

    try {
      const accRes = await getStudentAccountInfoForRequestAction();
      if (accRes.success && accRes.data) {
        setStudentName(accRes.data.studentName);
        setStudentEmail(accRes.data.studentEmail);
        setStudentPhone(accRes.data.studentPhone);
        setAssociatedCourses(accRes.data.associatedCourses);

        if (initialCourseId) {
          setSelectedCourseIds([initialCourseId]);
        } else {
          // Select associated courses that aren't yet approved
          const pendingOrNew = accRes.data.associatedCourses
            .filter((c) => c.status !== "approved")
            .map((c) => c.id);
          if (pendingOrNew.length > 0) {
            setSelectedCourseIds(pendingOrNew);
          } else if (accRes.data.associatedCourses.length > 0) {
            setSelectedCourseIds([accRes.data.associatedCourses[0].id]);
          }
        }
      }
    } catch {
      // Continue with available state
    }
  };

  const handleRequestSubmit = async () => {
    if (selectedCourseIds.length === 0) {
      setRequestError("Please select at least one course associated with your account.");
      return;
    }

    setModalLoading(true);
    setRequestError(null);
    try {
      const coursesToSubmit = associatedCourses
        .filter((c) => selectedCourseIds.includes(c.id))
        .map((c) => ({
          courseId: c.id,
          courseTitle: c.title,
          level: c.level,
        }));

      const res = await submitStudentCourseRequestAction({
        courses: coursesToSubmit,
      });

      if (res.success) {
        setSubmittedCourseTitles(coursesToSubmit.map((c) => c.courseTitle || c.courseId));
        setModalSuccess(true);
        // Refresh enrolled progress
        const progressRes = await getStudentProgressAction();
        if (progressRes.success && progressRes.data?.courses) {
          setEnrolledCoursesProgress(Object.values(progressRes.data.courses));
        }
      } else {
        setRequestError(res.error || "Failed to submit request.");
      }
    } catch {
      setRequestError("Unexpected error submitting request.");
    } finally {
      setModalLoading(false);
    }
  };

  const pendingRequests = associatedCourses.filter((c) => c.status === "pending");
  const rejectedRequests = associatedCourses.filter((c) => c.status === "rejected");

  return (
    <div className="max-w-[1240px] mx-auto space-y-8 py-4">
      {/* Administrator Live Preview Notice */}
      <AdminPreviewBanner />

      {/* ================= 1. REFINED TOP WELCOME AREA ================= */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[var(--surface-border)]">
        {/* Left Side: Prominent Welcome Heading & Subheading */}
        <div className="space-y-1.5">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
            {cms.welcome?.greetingPrefix || "Welcome back"}, {studentName}
          </h1>
          <p className="font-serif text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
            {cms.welcome?.portalTagline || "Continue your active course and pick up where you left off."}
          </p>
        </div>

        {/* Right Side: ONLY the Profile Picture (No student name beside it on Dashboard) */}
        <div className="shrink-0 self-start sm:self-center">
          <LmsProfileDropdown variant="dashboard" />
        </div>
      </section>

      {/* ================= COURSE ACCESS REQUESTS STATUS (PENDING / REJECTED) ================= */}
      {(pendingRequests.length > 0 || rejectedRequests.length > 0) && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#d4af37]">assignment_turned_in</span>
              <h2 className="font-display text-base sm:text-lg font-bold text-[var(--text-main)]">
                Course Access Status
              </h2>
            </div>
            <span className="font-serif text-xs text-[var(--text-muted)]">
              Admissions verification updates
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((c) => (
              <div
                key={`pending-${c.id}`}
                className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10 p-5 space-y-2.5 relative overflow-hidden shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold text-[var(--text-main)] truncate">
                    {c.title}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-display font-bold uppercase tracking-wider shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Pending Review
                  </span>
                </div>
                <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                  Your request has been submitted and is currently awaiting an administrator&apos;s decision. You will receive an official notification once your access is approved.
                </p>
                {c.requestedAt && (
                  <p className="font-mono text-[10px] text-[var(--text-muted)]">
                    Submitted: {new Date(c.requestedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}

            {rejectedRequests.map((c) => (
              <div
                key={`rejected-${c.id}`}
                className="rounded-2xl border-2 border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10 p-5 space-y-2.5 relative overflow-hidden shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold text-[var(--text-main)] truncate">
                    {c.title}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-display font-bold uppercase tracking-wider shrink-0">
                    Request Declined
                  </span>
                </div>
                <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                  Access to this specific course was not approved by administration. Please contact the admissions desk for guidance or select another registered course.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => openAccessModal(c.id)}
                    className="px-3.5 py-1.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-[11px] font-display font-semibold text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    <span>Re-request Access</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= ACTIVE ENROLLED COURSES (STUDENTS SEE ONLY THEIR ENROLLED COURSES) ================= */}
      {enrolledCoursesProgress.length > 0 ? (
        <section className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-b from-[#d4af37]/15 to-[#d4af37]/5 border border-[#d4af37]/50 rounded-xl shadow-2xs self-start">
              <span className="material-symbols-outlined text-[17px] text-[#8a6d1b] dark:text-[#d4af37]">school</span>
              <span className="font-display text-xs uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                My Enrolled Courses ({enrolledCoursesProgress.length})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => openAccessModal()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#151518] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-[#d4af37]">add_circle</span>
                <span>Request Another Course</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {enrolledCoursesProgress.map((course) => (
              <div
                key={course.courseId}
                className="rounded-2xl bg-white dark:bg-[#151518]/95 border-2 border-[#d4af37]/50 hover:border-[#d4af37] p-6 sm:p-7 md:p-8 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6 group"
              >
                <div className="space-y-3 max-w-2xl flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                      Certified Curriculum
                    </span>
                    <span className="text-[var(--text-muted)]/30">•</span>
                    <span className="inline-flex items-center gap-1.5 font-display text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Enrolled &amp; Active
                    </span>
                    <span className="text-[var(--text-muted)]/30">•</span>
                    <span className="font-mono text-[11px] font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                      {course.progressPercentage}% Completed
                    </span>
                  </div>

                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors leading-snug tracking-tight">
                      {getUnifiedCourseById(course.courseId)?.title || course.courseTitle}
                    </h2>
                    <p className="font-serif text-[13.5px] sm:text-sm text-[var(--text-muted)] mt-1">
                      {getUnifiedCourseById(course.courseId)?.description || `${course.completedLessons.length} of ${course.totalLessons} lessons completed. Pick up your masterclasses and practical drills where you left off.`}
                    </p>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-2 rounded-full bg-[var(--surface-low)] border border-[var(--surface-border)] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#d4af37] to-[#e5c56b] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, course.progressPercentage)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center md:self-center">
                  <Link
                    href={`/lms/learn?course=${course.courseId}&lesson=${course.lastLessonId || "l01"}`}
                    className="w-full md:w-auto px-7 py-3.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                  >
                    <span>Continue Learning</span>
                    <span className="material-symbols-outlined text-[18px]">play_circle</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        /* ================= APPROPRIATE EMPTY STATE WHEN NO APPROVED ENROLLMENTS ================= */
        <section className="pt-4">
          <div className="rounded-2xl border-2 border-dashed border-[var(--surface-border)] bg-white dark:bg-[#151518]/90 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center mx-auto text-[#d4af37]">
              <span className="material-symbols-outlined text-3xl">school</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-[var(--text-main)]">
                {pendingRequests.length > 0
                  ? "Enrollment Request Under Review"
                  : "No Enrolled Courses Found"}
              </h3>
              <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed max-w-md mx-auto">
                {pendingRequests.length > 0
                  ? "Your course access request is currently being reviewed by the SpeakUp administration. Once approved, your curriculum masterclasses will unlock immediately."
                  : "You currently do not have access to any active courses. Once your course registration or enrollment request is approved by the SpeakUp administration, your course materials will appear here."}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => openAccessModal()}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">lock_open</span>
                <span>
                  {pendingRequests.length > 0 ? "View Request Status" : "Request Course Access"}
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ================= REQUEST ACCESS MODAL ================= */}
      {isAccessModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsAccessModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#16161c] border border-[var(--surface-border)] dark:border-[#d4af37]/30 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {!modalSuccess ? (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-[var(--surface-border)]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#d4af37]">lock_open</span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                        Request Course Access
                      </h3>
                      <p className="font-serif text-xs text-[var(--text-muted)] mt-0.5">
                        Submit verification for your registered curriculum courses
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAccessModalOpen(false)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {requestError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-serif">
                    {requestError}
                  </div>
                )}

                <div className="space-y-5">
                  {/* Automatically Retrieved Student Information (Read-only, from Supabase) */}
                  <div className="space-y-3 p-4 rounded-xl bg-[#faf8f5] dark:bg-[var(--surface-low)]/50 border border-[var(--surface-border)]">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[10px] uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">verified_user</span>
                        <span>Student Identity (Authenticated Account)</span>
                      </span>
                      <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                        Auto-Retrieved
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1 font-semibold">
                          Student Name
                        </span>
                        <div className="px-3 py-2 bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-xl font-serif text-xs text-[var(--text-main)] font-semibold select-none">
                          {studentName || "Registered Scholar"}
                        </div>
                      </div>

                      <div>
                        <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1 font-semibold">
                          Student Email
                        </span>
                        <div className="px-3 py-2 bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-xl font-serif text-xs text-[var(--text-main)] truncate select-none">
                          {studentEmail || "—"}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] block mb-1 font-semibold">
                          Student Number / Phone
                        </span>
                        <div className="px-3 py-2 bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-xl font-mono text-xs text-[var(--text-main)] select-none">
                          {studentPhone || "Registered on file"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Course Restriction: Show Only Registered/Associated Course(s) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] block font-semibold">
                        Registered Course(s) for Access
                      </label>
                      <span className="font-serif text-[11px] text-[var(--text-muted)]">
                        Restricted to your account
                      </span>
                    </div>

                    {associatedCourses.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-[var(--surface-border)] text-center text-xs font-serif text-[var(--text-muted)]">
                        No registered courses currently detected. Contact admissions to link your course.
                      </div>
                    ) : associatedCourses.length === 1 ? (
                      /* Single Associated Course (e.g. Student registered for A1G) */
                      <div className="p-4 rounded-xl border-2 border-[#d4af37]/60 bg-[#d4af37]/5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#d4af37] text-[18px]">school</span>
                            <span className="font-display text-sm font-bold text-[var(--text-main)]">
                              {associatedCourses[0].title}
                            </span>
                          </div>
                          {associatedCourses[0].status === "approved" ? (
                            <span className="font-display text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Approved &amp; Active
                            </span>
                          ) : associatedCourses[0].status === "pending" ? (
                            <span className="font-display text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              Pending Review
                            </span>
                          ) : associatedCourses[0].status === "rejected" ? (
                            <span className="font-display text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                              Request Declined
                            </span>
                          ) : (
                            <span className="font-display text-[10px] uppercase font-bold text-[#8a6d1b] dark:text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded-full border border-[#d4af37]/20">
                              Ready to Request
                            </span>
                          )}
                        </div>
                        <p className="font-serif text-[11px] text-[var(--text-muted)] leading-relaxed">
                          This request will be registered specifically for <strong>{associatedCourses[0].title}</strong>.
                        </p>
                      </div>
                    ) : (
                      /* Multiple Associated Courses (e.g. Student registered for A1G + A2G) */
                      <div className="space-y-2">
                        <p className="font-serif text-xs text-[var(--text-muted)]">
                          Select the registered course(s) to request. Each course will generate a separate, distinct request record for administration:
                        </p>
                        <div className="space-y-2">
                          {associatedCourses.map((c) => {
                            const isSelected = selectedCourseIds.includes(c.id);
                            const isApproved = c.status === "approved";
                            return (
                              <label
                                key={c.id}
                                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                  isApproved
                                    ? "opacity-75 cursor-default bg-[var(--surface-lowest)] border-[var(--surface-border)]"
                                    : isSelected
                                    ? "border-[#d4af37] bg-[#d4af37]/10 cursor-pointer"
                                    : "border-[var(--surface-border)] bg-[var(--surface-lowest)] hover:border-[#d4af37]/50 cursor-pointer"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isApproved}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedCourseIds((prev) => [...prev, c.id]);
                                      } else {
                                        setSelectedCourseIds((prev) => prev.filter((id) => id !== c.id));
                                      }
                                    }}
                                    className="w-4 h-4 accent-[#d4af37] rounded disabled:opacity-40"
                                  />
                                  <div>
                                    <p className="font-display text-xs font-bold text-[var(--text-main)]">
                                      {c.title}
                                    </p>
                                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                      {c.level || "Standard Curriculum"}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  {isApproved ? (
                                    <span className="font-display text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                      Approved &amp; Active
                                    </span>
                                  ) : c.status === "pending" ? (
                                    <span className="font-display text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                      Pending Review
                                    </span>
                                  ) : c.status === "rejected" ? (
                                    <span className="font-display text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                      Request Declined
                                    </span>
                                  ) : (
                                    <span className="font-display text-[10px] uppercase font-bold text-[#8a6d1b] dark:text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded-full border border-[#d4af37]/20">
                                      Ready to Request
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-xl flex items-start gap-2.5 pt-2.5">
                      <span className="material-symbols-outlined text-[#d4af37] text-[17px] shrink-0 mt-0.5">info</span>
                      <p className="font-serif text-xs text-[var(--text-main)] leading-relaxed">
                        Requests are submitted as separate course records and routed directly to the SpeakUp Admin Panel for immediate review.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAccessModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-[var(--surface-border)] font-display text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={modalLoading || selectedCourseIds.length === 0}
                    onClick={handleRequestSubmit}
                    className="flex-1 py-3 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {modalLoading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {selectedCourseIds.length > 1
                            ? `Submit ${selectedCourseIds.length} Requests`
                            : "Submit Request"}
                        </span>
                        <span className="material-symbols-outlined text-[16px]">send</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Success Confirmation */
              <div className="text-center py-6 space-y-4 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
                <h4 className="font-display text-xl font-bold text-[var(--text-main)]">
                  Course Request Submitted!
                </h4>
                <div className="space-y-1">
                  <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                    Our academic admissions desk has received your separate request(s) for:
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                    {submittedCourseTitles.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/30 text-xs font-display font-bold text-[#8a6d1b] dark:text-[#d4af37]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="font-serif text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  Each requested course appears individually on the admin dashboard and will be unlocked upon verification.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccessModalOpen(false);
                      setModalSuccess(false);
                    }}
                    className="px-8 py-3 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-widest font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
