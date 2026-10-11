"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import InitialsAvatar from "@/components/InitialsAvatar";
import {
  getAdminStudentsListAction,
  approveStudentAccountAction,
  rejectStudentAccountAction,
  type AdminStudentSummary,
} from "@/app/admin/actions";
import StudentActivityModal from "@/components/admin/StudentActivityModal";
import AddStudentModal from "@/components/admin/AddStudentModal";

export default function AdminStudentsListPage() {
  const [students, setStudents] = useState<AdminStudentSummary[]>([]);
  const [selectedStudentForActivity, setSelectedStudentForActivity] = useState<AdminStudentSummary | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [addSuccessNotice, setAddSuccessNotice] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "suspended" | "rejected">("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<"all" | "active" | "expiring_soon" | "expired" | "pending" | "none">("all");
  const [durationFilter, setDurationFilter] = useState<"all" | "3" | "4" | "6">("all");
  const [expiryPeriodFilter, setExpiryPeriodFilter] = useState<"all" | "expired" | "7d" | "14d" | "30d" | "active">("all");

  const handleApproveAccount = async (studentId: string, studentName: string | null) => {
    setProcessingId(studentId);
    try {
      const res = await approveStudentAccountAction(studentId);
      if (res.success) {
        setAddSuccessNotice(`Account approved successfully for ${studentName || "student"}. An approval notification email has been dispatched.`);
        loadStudents();
      } else {
        alert(res.error || "Failed to approve student account.");
      }
    } catch (err: any) {
      alert(err?.message || "Error approving account.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectAccount = async (studentId: string, studentName: string | null) => {
    if (!confirm(`Are you sure you want to reject the account request for ${studentName || "this student"}?`)) {
      return;
    }
    setProcessingId(studentId);
    try {
      const res = await rejectStudentAccountAction(studentId);
      if (res.success) {
        setAddSuccessNotice(`Account rejected for ${studentName || "student"}. The student will be blocked from accessing protected LMS content.`);
        loadStudents();
      } else {
        alert(res.error || "Failed to reject student account.");
      }
    } catch (err: any) {
      alert(err?.message || "Error rejecting account.");
    } finally {
      setProcessingId(null);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await getAdminStudentsListAction();
      if (res.success && Array.isArray(res.data)) {
        // Defensive filter: Ensure only student accounts are populated
        const actualStudents = res.data.filter((s) => s.role !== "admin");
        setStudents(actualStudents);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error("Failed to load students:", err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const availableCourseOptions = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => {
      (s.enrolledCourses || []).forEach((c) => {
        if (c.courseId && !map.has(c.courseId.toLowerCase())) {
          map.set(c.courseId.toLowerCase(), c.courseTitle || c.courseId);
        }
      });
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Defensive filter: administrators must never appear in students table
      if (s.role === "admin") return false;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Account Status Filter
      if (statusFilter === "pending" && s.status !== "pending") return false;
      if (statusFilter === "active" && s.status !== "active" && s.status !== "approved") return false;
      if (statusFilter === "suspended" && s.status !== "suspended") return false;
      if (statusFilter === "rejected" && s.status !== "rejected") return false;

      // Course Filter
      if (courseFilter !== "all") {
        const matchesCourse = (s.enrolledCourses || []).some(
          (c) => c.courseId?.toLowerCase() === courseFilter.toLowerCase()
        );
        if (!matchesCourse) return false;
      }

      // Enrollment Status Filter
      if (enrollmentStatusFilter === "active" && (!s.activeEnrollmentsCount || s.activeEnrollmentsCount === 0)) return false;
      if (enrollmentStatusFilter === "expiring_soon" && (!s.expiringSoonCount || s.expiringSoonCount === 0)) return false;
      if (enrollmentStatusFilter === "expired" && (!s.expiredEnrollmentsCount || s.expiredEnrollmentsCount === 0)) return false;
      if (enrollmentStatusFilter === "pending" && (!s.pendingCount || s.pendingCount === 0)) return false;
      if (enrollmentStatusFilter === "none" && (s.approvedCount > 0 || s.pendingCount > 0)) return false;

      // Duration Filter
      if (durationFilter !== "all") {
        const dMonths = parseInt(durationFilter, 10);
        const matchesDuration = (s.enrolledCourses || []).some((c) => c.durationMonths === dMonths);
        if (!matchesDuration) return false;
      }

      // Expiry Period Filter
      if (expiryPeriodFilter === "expired") {
        if (!s.expiredEnrollmentsCount || s.expiredEnrollmentsCount === 0) return false;
      } else if (expiryPeriodFilter === "7d") {
        const hasWithin7d = (s.enrolledCourses || []).some(
          (c) => !c.isExpired && typeof c.daysRemaining === "number" && c.daysRemaining >= 0 && c.daysRemaining <= 7
        );
        if (!hasWithin7d) return false;
      } else if (expiryPeriodFilter === "14d") {
        const hasWithin14d = (s.enrolledCourses || []).some(
          (c) => !c.isExpired && typeof c.daysRemaining === "number" && c.daysRemaining >= 0 && c.daysRemaining <= 14
        );
        if (!hasWithin14d) return false;
      } else if (expiryPeriodFilter === "30d") {
        const hasWithin30d = (s.enrolledCourses || []).some(
          (c) => !c.isExpired && typeof c.daysRemaining === "number" && c.daysRemaining >= 0 && c.daysRemaining <= 30
        );
        if (!hasWithin30d) return false;
      } else if (expiryPeriodFilter === "active") {
        if (!s.activeEnrollmentsCount || s.activeEnrollmentsCount === 0) return false;
      }

      return true;
    });
  }, [students, searchQuery, statusFilter, courseFilter, enrollmentStatusFilter, durationFilter, expiryPeriodFilter]);

  return (
    <div>
      <AdminHeader
        title="Student Management"
        subtitle="SpeakUp Academic Administration & Access Control"
        actions={
          <button
            type="button"
            onClick={() => setIsAddStudentOpen(true)}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b5952f] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs transition-all active:scale-[0.98] inline-flex items-center gap-1.5 cursor-pointer"
            title="Manually register a new student account"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>+ Add Student</span>
          </button>
        }
      />

      <div className="p-6 sm:p-8 max-w-[1360px] mx-auto space-y-6">
        {/* Dynamic Success Notice */}
        {addSuccessNotice && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-serif text-xs leading-relaxed flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] shrink-0">check_circle</span>
              <span className="font-sans font-medium">{addSuccessNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setAddSuccessNotice(null)}
              className="text-emerald-700 dark:text-emerald-400 hover:opacity-75 cursor-pointer shrink-0 p-1"
              title="Dismiss"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
        {/* Controls Bar: Search & Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--text-muted)] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] text-[var(--text-main)] text-xs font-serif placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37]/30 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-md"
              >
                clear
              </button>
            )}
          </div>

          {/* Filter Pills & Refresh */}
          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
            <div className="flex items-center p-1 rounded-xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] shadow-2xs">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-display text-[11px] uppercase tracking-wider font-semibold transition-all active:scale-[0.98] ${
                  statusFilter === "all"
                    ? "bg-[#d4af37] text-[#141416] font-bold shadow-2xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                All ({students.length})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1.5 rounded-lg font-display text-[11px] uppercase tracking-wider font-semibold transition-all active:scale-[0.98] flex items-center gap-1.5 ${
                  statusFilter === "pending"
                    ? "bg-amber-500 text-white font-bold shadow-2xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                <span>Pending ({students.filter((s) => s.status === "pending").length})</span>
                {students.filter((s) => s.status === "pending").length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 rounded-lg font-display text-[11px] uppercase tracking-wider font-semibold transition-all active:scale-[0.98] ${
                  statusFilter === "active"
                    ? "bg-emerald-600 text-white font-bold shadow-2xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                Active ({students.filter((s) => s.status === "active" || s.status === "approved").length})
              </button>

              {students.some((s) => s.status === "suspended") && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("suspended")}
                  className={`px-3 py-1.5 rounded-lg font-display text-[11px] uppercase tracking-wider font-semibold transition-all active:scale-[0.98] ${
                    statusFilter === "suspended"
                      ? "bg-red-600 text-white font-bold shadow-2xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  Suspended ({students.filter((s) => s.status === "suspended").length})
                </button>
              )}

              {students.some((s) => s.status === "rejected") && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("rejected")}
                  className={`px-3 py-1.5 rounded-lg font-display text-[11px] uppercase tracking-wider font-semibold transition-all active:scale-[0.98] ${
                    statusFilter === "rejected"
                      ? "bg-rose-600 text-white font-bold shadow-2xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  Rejected ({students.filter((s) => s.status === "rejected").length})
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={loadStudents}
              disabled={loading}
              title="Refresh list"
              className="p-2.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#d4af37] active:scale-[0.96] transition-all cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-[#d4af37]/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                refresh
              </span>
            </button>

            {/* Quick + Add Student Button in Controls Bar */}
            <button
              type="button"
              onClick={() => setIsAddStudentOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b5952f] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-2xs transition-all active:scale-[0.98] inline-flex items-center gap-1.5 cursor-pointer"
              title="Manually register a new student account"
            >
              <span className="material-symbols-outlined text-[17px]">person_add</span>
              <span className="hidden sm:inline">+ Add Student</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Controls Bar: Course, Enrollment Access, Duration & Expiry */}
        <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] shadow-2xs text-xs font-serif">
          {/* Course Filter */}
          <div className="flex items-center gap-1.5 min-w-[160px]">
            <span className="font-display text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] shrink-0">
              Course:
            </span>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[#d4af37]"
            >
              <option value="all">All Courses</option>
              {availableCourseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Enrollment Access Status Filter */}
          <div className="flex items-center gap-1.5 min-w-[170px]">
            <span className="font-display text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] shrink-0">
              Enrollment:
            </span>
            <select
              value={enrollmentStatusFilter}
              onChange={(e) => setEnrollmentStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[#d4af37]"
            >
              <option value="all">All Access</option>
              <option value="active">Active Enrollment</option>
              <option value="expiring_soon">Expiring Soon (≤14d)</option>
              <option value="expired">Expired Access</option>
              <option value="pending">Pending Request</option>
              <option value="none">No Enrollments</option>
            </select>
          </div>

          {/* Duration Filter */}
          <div className="flex items-center gap-1.5 min-w-[140px]">
            <span className="font-display text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] shrink-0">
              Duration:
            </span>
            <select
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[#d4af37]"
            >
              <option value="all">All Durations</option>
              <option value="3">3 Months</option>
              <option value="4">4 Months</option>
              <option value="6">6 Months</option>
            </select>
          </div>

          {/* Expiry Window Filter */}
          <div className="flex items-center gap-1.5 min-w-[160px]">
            <span className="font-display text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] shrink-0">
              Expiry:
            </span>
            <select
              value={expiryPeriodFilter}
              onChange={(e) => setExpiryPeriodFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[var(--text-main)] text-xs focus:outline-none focus:border-[#d4af37]"
            >
              <option value="all">All Expiries</option>
              <option value="expired">Expired</option>
              <option value="7d">Within 7 Days</option>
              <option value="14d">Within 14 Days</option>
              <option value="30d">Within 30 Days</option>
              <option value="active">Active (&gt;30d)</option>
            </select>
          </div>

          {/* Reset All Filters button */}
          {(courseFilter !== "all" ||
            enrollmentStatusFilter !== "all" ||
            durationFilter !== "all" ||
            expiryPeriodFilter !== "all" ||
            statusFilter !== "all" ||
            searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setCourseFilter("all");
                setEnrollmentStatusFilter("all");
                setDurationFilter("all");
                setExpiryPeriodFilter("all");
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className="ml-auto text-[11px] font-display uppercase tracking-wider text-[#d4af37] hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Students Table / Empty State */}
        <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <span className="material-symbols-outlined animate-spin text-3xl text-[#d4af37]">
                progress_activity
              </span>
              <p className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Loading Registered Students...
              </p>
            </div>
          ) : students.length === 0 ? (
            /* Database Empty State */
            <div className="py-20 px-6 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#d4af37]/10 text-[#d4af37] flex items-center justify-center mx-auto border border-[#d4af37]/20">
                <span className="material-symbols-outlined text-[32px]">group_off</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                  No Registered Students Yet
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                  When students register through the authentication portal or apply for courses, their profiles will appear here for administrative management.
                </p>
              </div>
            </div>
          ) : filteredStudents.length === 0 ? (
            /* Filter/Search Empty State */
            <div className="py-16 px-6 text-center space-y-3">
              <span className="material-symbols-outlined text-3xl text-[var(--text-muted)]">
                search_off
              </span>
              <p className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                No students match your filter criteria
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCourseFilter("all");
                  setEnrollmentStatusFilter("all");
                  setDurationFilter("all");
                  setExpiryPeriodFilter("all");
                }}
                className="text-xs font-display text-[#d4af37] hover:underline font-bold uppercase tracking-wider cursor-pointer"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            /* Student List Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)] text-[10px] font-display uppercase tracking-widest text-[var(--text-muted)] font-bold">
                    <th className="py-3.5 px-6">Student</th>
                    <th className="py-3.5 px-6">Contact Details</th>
                    <th className="py-3.5 px-6">Account Status</th>
                    <th className="py-3.5 px-6">Course Access Summary</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border)] text-xs font-serif">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-[#fbf7f0]/50 dark:hover:bg-[#1a1a20] transition-colors"
                    >
                      {/* Name, Avatar & ID */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar
                            name={student.full_name || student.email}
                            avatarUrl={student.avatar_url}
                            sizeClass="w-10 h-10"
                            textSizeClass="text-xs"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <span className="font-display text-sm font-bold text-[var(--text-main)] block truncate">
                              {student.full_name || "Anonymous Scholar"}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-display uppercase font-bold tracking-wider bg-neutral-100 dark:bg-neutral-800 text-[var(--text-muted)] border border-[var(--surface-border)]">
                                {student.role || "student"}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--text-muted)] block truncate max-w-[120px]">
                                ID: {student.id.substring(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[var(--text-main)]">
                            <span className="material-symbols-outlined text-[14px] text-[var(--text-muted)]">
                              mail
                            </span>
                            <span className="font-sans text-xs">{student.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                            <span className="material-symbols-outlined text-[14px]">call</span>
                            <span className="font-sans text-xs">
                              {student.phone || "No phone provided"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Account Status */}
                      <td className="py-4 px-6">
                        {student.status === "pending" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>Pending</span>
                          </span>
                        ) : student.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>Rejected</span>
                          </span>
                        ) : student.status === "suspended" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            <span>Suspended</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      {/* Course Access Summary */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {student.activeEnrollmentsCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              title={student.minDaysRemaining !== null ? `${student.minDaysRemaining} days remaining on earliest active enrollment` : "Active"}
                            >
                              <span className="material-symbols-outlined text-[13px]">verified</span>
                              <span>
                                {student.activeEnrollmentsCount} Active
                                {student.minDaysRemaining !== null && ` (${student.minDaysRemaining}d)`}
                              </span>
                            </span>
                          )}

                          {student.expiringSoonCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                              title="Expiring within 14 days"
                            >
                              <span className="material-symbols-outlined text-[13px] animate-pulse">timer</span>
                              <span>{student.expiringSoonCount} Expiring Soon</span>
                            </span>
                          )}

                          {student.expiredEnrollmentsCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                              title="Course duration has ended"
                            >
                              <span className="material-symbols-outlined text-[13px]">history_toggle_off</span>
                              <span>{student.expiredEnrollmentsCount} Expired</span>
                            </span>
                          )}

                          {student.pendingCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                              <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                              <span>{student.pendingCount} Pending</span>
                            </span>
                          )}

                          {student.activeEnrollmentsCount === 0 &&
                            student.expiredEnrollmentsCount === 0 &&
                            student.pendingCount === 0 && (
                              <span className="text-[11px] text-[var(--text-muted)] italic font-serif">
                                No Enrollments
                              </span>
                            )}
                        </div>
                      </td>

                      {/* View Action Link */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Inline Quick Account Approval / Rejection for pending student accounts */}
                          {student.status === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveAccount(student.id, student.full_name)}
                                disabled={processingId === student.id}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display text-xs uppercase tracking-wider font-bold shadow-2xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Approve student account and dispatch confirmation email"
                              >
                                <span className="material-symbols-outlined text-[15px]">check</span>
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectAccount(student.id, student.full_name)}
                                disabled={processingId === student.id}
                                className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-display text-xs uppercase tracking-wider font-bold shadow-2xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Reject student account request"
                              >
                                <span className="material-symbols-outlined text-[15px]">close</span>
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedStudentForActivity(student)}
                            className="px-3.5 py-1.5 rounded-xl border border-[#d4af37]/40 hover:border-[#d4af37] bg-white dark:bg-[#141416] text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#d4af37]/10"
                            title="View student administrative history & activity"
                          >
                            <span className="material-symbols-outlined text-[16px] text-[#8a6d1b] dark:text-[#d4af37]">
                              manage_history
                            </span>
                            <span>History</span>
                          </button>

                          <Link
                            href={`/admin/students/${student.id}`}
                            className="px-3.5 py-1.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141416] text-[var(--text-main)] hover:text-[#8a6d1b] dark:hover:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-2xs inline-flex items-center gap-1.5"
                          >
                            <span>Manage</span>
                            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Student Activity & Telemetry Modal */}
      {selectedStudentForActivity && (
        <StudentActivityModal
          isOpen={Boolean(selectedStudentForActivity)}
          onClose={() => setSelectedStudentForActivity(null)}
          studentId={selectedStudentForActivity.id}
          studentName={selectedStudentForActivity.full_name || undefined}
          studentEmail={selectedStudentForActivity.email}
        />
      )}

      {/* Manual Student Registration Modal */}
      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onStudentCreated={(result) => {
          setAddSuccessNotice(`Student account successfully created: ${result.fullName} (${result.email})`);
          loadStudents();
          setTimeout(() => setAddSuccessNotice(null), 8000);
        }}
      />
    </div>
  );
}
