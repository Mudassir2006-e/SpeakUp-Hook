"use client";

import React, { useEffect, useState, useMemo } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  getAdminCourseRequestsAction,
  approveCourseRequestAction,
  rejectCourseRequestAction,
  AdminCourseRequest,
} from "@/app/admin/actions";

export default function AdminCourseRequestsPage() {
  const [requests, setRequests] = useState<AdminCourseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await getAdminCourseRequestsAction();
      if (res.success && res.data) {
        setRequests(res.data);
      } else {
        showToast("error", res.error || "Failed to load course requests.");
      }
    } catch {
      showToast("error", "Unexpected error loading course requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id: string, courseTitle: string) => {
    setActionLoadingId(id);
    try {
      const res = await approveCourseRequestAction(id);
      if (res.success) {
        showToast("success", `Request approved for ${courseTitle}. Student notified.`);
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: "approved", approvedAt: new Date().toISOString() }
              : r
          )
        );
      } else {
        showToast("error", res.error || "Failed to approve request.");
      }
    } catch {
      showToast("error", "Error approving course request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string, courseTitle: string) => {
    setActionLoadingId(id);
    try {
      const res = await rejectCourseRequestAction(id);
      if (res.success) {
        showToast("success", `Request rejected for ${courseTitle}.`);
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: "rejected", rejectedAt: new Date().toISOString() }
              : r
          )
        );
      } else {
        showToast("error", res.error || "Failed to reject request.");
      }
    } catch {
      showToast("error", "Error rejecting course request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Distinct filter option values derived from data
  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.courseTitle) set.add(r.courseTitle);
    });
    return Array.from(set).sort();
  }, [requests]);

  const availableLevels = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.level) set.add(r.level);
    });
    return Array.from(set).sort();
  }, [requests]);

  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.language) set.add(r.language);
    });
    return Array.from(set).sort();
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      // Course filter
      if (courseFilter !== "all" && r.courseTitle !== courseFilter) return false;
      // Level filter
      if (levelFilter !== "all" && r.level !== levelFilter) return false;
      // Language filter
      if (languageFilter !== "all" && r.language !== languageFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = r.studentName?.toLowerCase().includes(q);
        const matchesEmail = r.studentEmail?.toLowerCase().includes(q);
        const matchesPhone = r.studentPhone?.toLowerCase().includes(q);
        const matchesCourse = r.courseTitle?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesCourse && !matchesPhone) return false;
      }
      return true;
    });
  }, [requests, statusFilter, courseFilter, levelFilter, languageFilter, searchQuery]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [requests]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#faf8f5] dark:bg-[#0c0c0e]">
      <AdminHeader
        title="Course Requests"
        subtitle="Manage and verify student enrollment applications with granular course, level, and language tracking"
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-display uppercase tracking-wider font-bold ${
              toast.type === "success"
                ? "bg-emerald-950 text-emerald-200 border-emerald-500/50"
                : "bg-rose-950 text-rose-200 border-rose-500/50"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {toast.type === "success" ? "check_circle" : "error"}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[var(--text-muted)]">
              <span className="font-display text-[11px] uppercase tracking-wider font-semibold">
                Total Requests
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#d4af37]">format_list_numbered</span>
            </div>
            <p className="font-display text-2xl font-black text-[var(--text-main)]">
              {metrics.total}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#141416] border border-amber-500/30 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
              <span className="font-display text-[11px] uppercase tracking-wider font-semibold">
                Pending Verification
              </span>
              <span className="material-symbols-outlined text-[20px]">pending_actions</span>
            </div>
            <p className="font-display text-2xl font-black text-amber-600 dark:text-amber-400">
              {metrics.pending}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#141416] border border-emerald-500/30 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
              <span className="font-display text-[11px] uppercase tracking-wider font-semibold">
                Approved Access
              </span>
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
            <p className="font-display text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.approved}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#141416] border border-rose-500/30 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
              <span className="font-display text-[11px] uppercase tracking-wider font-semibold">
                Rejected / Revoked
              </span>
              <span className="material-symbols-outlined text-[20px]">cancel</span>
            </div>
            <p className="font-display text-2xl font-black text-rose-600 dark:text-rose-400">
              {metrics.rejected}
            </p>
          </div>
        </div>

        {/* Filters and Controls Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3.5 top-3 text-[18px] text-[var(--text-muted)]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, email, or course..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#faf8f5] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[#d4af37] focus:outline-none transition-colors"
              />
            </div>

            {/* Quick Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All", count: metrics.total },
                { id: "pending", label: "Pending", count: metrics.pending },
                { id: "approved", label: "Approved", count: metrics.approved },
                { id: "rejected", label: "Rejected", count: metrics.rejected },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setStatusFilter(btn.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === btn.id
                      ? "bg-[#d4af37] text-[#141416] font-bold shadow-xs"
                      : "border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#d4af37]"
                  }`}
                >
                  <span>{btn.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
                    {btn.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Granular Dropdown Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[var(--surface-border)]/60">
            {/* Course Filter */}
            <div>
              <label className="block text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] mb-1 font-semibold">
                Filter by Course
              </label>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[#faf8f5] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
              >
                <option value="all">All Courses</option>
                {availableCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Level Filter */}
            <div>
              <label className="block text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] mb-1 font-semibold">
                Filter by Level
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[#faf8f5] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
              >
                <option value="all">All Levels</option>
                {availableLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Filter */}
            <div>
              <label className="block text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] mb-1 font-semibold">
                Filter by Language
              </label>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[#faf8f5] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
              >
                <option value="all">All Languages</option>
                {availableLanguages.map((lng) => (
                  <option key={lng} value={lng}>
                    {lng}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Requests Table & Cards View */}
        <div className="rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#141416] shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <span className="material-symbols-outlined text-4xl text-[#d4af37] animate-spin">
                progress_activity
              </span>
              <p className="font-display text-sm font-semibold text-[var(--text-main)]">
                Loading course enrollment requests...
              </p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <span className="material-symbols-outlined text-5xl text-[var(--text-muted)]">
                inbox
              </span>
              <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                No course requests match your filters
              </h3>
              <p className="font-serif text-xs text-[var(--text-muted)] max-w-md mx-auto">
                {requests.length === 0
                  ? "When students submit enrollment requests from their student dashboard, they will appear here for verification and approval."
                  : "Try clearing your search query or selecting 'All' in the filters above."}
              </p>
              {(statusFilter !== "all" || courseFilter !== "all" || levelFilter !== "all" || languageFilter !== "all" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setCourseFilter("all");
                    setLevelFilter("all");
                    setLanguageFilter("all");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 rounded-xl border border-[#d4af37] text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--surface-border)] bg-[#faf8f5]/60 dark:bg-[var(--surface-low)]/50">
                    <th className="p-4 text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Student
                    </th>
                    <th className="p-4 text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Requested Course
                    </th>
                    <th className="p-4 text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Level &amp; Language
                    </th>
                    <th className="p-4 text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Request Date
                    </th>
                    <th className="p-4 text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Status
                    </th>
                    <th className="p-4 text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border)]">
                  {filteredRequests.map((req) => {
                    const isActing = actionLoadingId === req.id;
                    return (
                      <tr
                        key={req.id}
                        className="hover:bg-[#faf8f5]/40 dark:hover:bg-[var(--surface-low)]/30 transition-colors"
                      >
                        {/* Student */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center font-display font-bold text-xs text-[#8a6d1b] dark:text-[#d4af37] shrink-0">
                              {(req.studentName?.[0] || req.studentEmail?.[0] || "S").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-display text-xs font-bold text-[var(--text-main)] truncate">
                                {req.studentName}
                              </p>
                              <p className="font-serif text-[11px] text-[var(--text-muted)] truncate">
                                {req.studentEmail}
                              </p>
                              {req.studentPhone && (
                                <p className="font-mono text-[10px] text-[#8a6d1b] dark:text-[#d4af37] flex items-center gap-1 mt-0.5">
                                  <span className="material-symbols-outlined text-[12px]">call</span>
                                  <span>{req.studentPhone}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Requested Course */}
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <p className="font-display text-xs font-bold text-[var(--text-main)]">
                              {req.courseTitle}
                            </p>
                            <span className="font-mono text-[10px] text-[var(--text-muted)]">
                              ID: {req.courseId}
                            </span>
                          </div>
                        </td>

                        {/* Level & Language */}
                        <td className="p-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/30">
                              {req.level || "A1"}
                            </span>
                            <span className="px-2 py-0.5 rounded-md font-display text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25">
                              {req.language || "German"}
                            </span>
                          </div>
                        </td>

                        {/* Request Date */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <p className="font-mono text-xs text-[var(--text-main)]">
                              {new Date(req.requestedAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            <p className="font-mono text-[10px] text-[var(--text-muted)]">
                              {new Date(req.requestedAt).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-4 whitespace-nowrap">
                          {req.status === "pending" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Pending
                            </span>
                          )}
                          {req.status === "approved" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              Approved
                            </span>
                          )}
                          {req.status === "rejected" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                              <span className="material-symbols-outlined text-[13px]">cancel</span>
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {req.status === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isActing}
                                  onClick={() => handleApprove(req.id, req.courseTitle)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display text-[11px] uppercase tracking-wider font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                                >
                                  {isActing ? (
                                    <span className="material-symbols-outlined text-[14px] animate-spin">
                                      progress_activity
                                    </span>
                                  ) : (
                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                  )}
                                  <span>Approve</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isActing}
                                  onClick={() => handleReject(req.id, req.courseTitle)}
                                  className="px-3 py-1.5 rounded-xl border border-rose-500/40 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-display text-[11px] uppercase tracking-wider font-bold inline-flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[14px]">close</span>
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : req.status === "approved" ? (
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleReject(req.id, req.courseTitle)}
                                className="px-2.5 py-1 rounded-lg border border-[var(--surface-border)] hover:border-rose-500 text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 font-display text-[10px] uppercase tracking-wider font-semibold transition-all cursor-pointer"
                                title="Revoke access"
                              >
                                <span>Revoke</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleApprove(req.id, req.courseTitle)}
                                className="px-2.5 py-1 rounded-lg border border-[var(--surface-border)] hover:border-emerald-500 text-[var(--text-muted)] hover:text-emerald-600 dark:hover:text-emerald-400 font-display text-[10px] uppercase tracking-wider font-semibold transition-all cursor-pointer"
                                title="Re-approve access"
                              >
                                <span>Approve</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
