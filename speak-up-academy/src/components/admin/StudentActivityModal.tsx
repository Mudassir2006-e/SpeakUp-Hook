"use client";

import React, { useState, useEffect } from "react";
import {
  getStudentActivityDossier,
  type StudentActivityDossier,
  type StudentActivityItem,
} from "@/app/admin/actions";

interface StudentActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
}

export default function StudentActivityModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  studentEmail,
}: StudentActivityModalProps) {
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<StudentActivityDossier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "previous-day" | "today" | "device">("all");
  const [copiedIp, setCopiedIp] = useState(false);

  useEffect(() => {
    if (!isOpen || !studentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getStudentActivityDossier(studentId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setDossier(res.data);
        } else {
          setError(res.error || "Failed to retrieve student activity.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Error retrieving activity.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const handleCopyIp = (ip: string) => {
    if (!ip || ip.includes("Not recorded")) return;
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const currentDisplayList: StudentActivityItem[] = (() => {
    if (!dossier) return [];
    if (activeTab === "today") return dossier.todayActivity;
    if (activeTab === "previous-day") return dossier.previousDayActivity;
    return dossier.activityHistory;
  })();

  const displayName = dossier?.studentName || studentName || "Student";
  const displayEmail = dossier?.studentEmail || studentEmail || "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-activity-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#141418] text-[var(--text-main)] border border-[var(--surface-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--surface-border)] bg-[#faf8f4] dark:bg-[#18181e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">manage_history</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="student-activity-title" className="font-display text-base sm:text-lg font-bold text-[var(--text-main)] leading-tight">
                  Student History &amp; Activity
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/30">
                  Admin Only
                </span>
              </div>
              <p className="font-serif text-xs text-[var(--text-muted)] truncate max-w-md">
                {displayName} • {displayEmail}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-border)]/40 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <span className="material-symbols-outlined animate-spin text-3xl text-[#d4af37]">
                progress_activity
              </span>
              <p className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Gathering student activity and session telemetry...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-center space-y-2">
              <span className="material-symbols-outlined text-3xl">error</span>
              <h4 className="font-display text-sm font-bold">Failed to Load Activity</h4>
              <p className="font-serif text-xs">{error}</p>
            </div>
          ) : dossier ? (
            <>
              {/* Quick Telemetry Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Last Active */}
                <div className="rounded-xl p-4 bg-[#fbf9f4] dark:bg-[var(--surface-low)]/50 border border-[var(--surface-border)] space-y-1">
                  <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                    Last Active
                  </span>
                  <p className="font-display text-sm font-bold text-[var(--text-main)] truncate">
                    {dossier.lastActiveRelative}
                  </p>
                  <p className="font-mono text-[10px] text-[var(--text-muted)]">
                    {dossier.lastActiveFormatted}
                  </p>
                </div>

                {/* Password Update Timestamp */}
                <div className="rounded-xl p-4 bg-[#fbf9f4] dark:bg-[var(--surface-low)]/50 border border-[var(--surface-border)] space-y-1">
                  <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                    Previous Password Update
                  </span>
                  <p className="font-sans text-xs font-semibold text-[var(--text-main)] line-clamp-2">
                    {dossier.passwordUpdatedAt}
                  </p>
                  <span className="font-serif text-[10px] text-[var(--text-muted)] block">
                    Verified security record
                  </span>
                </div>

                {/* Client IP Address */}
                <div className="rounded-xl p-4 bg-[#fbf9f4] dark:bg-[var(--surface-low)]/50 border border-[var(--surface-border)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Student IP Address
                    </span>
                    {!dossier.ipAddress.includes("Not recorded") && (
                      <button
                        type="button"
                        onClick={() => handleCopyIp(dossier.ipAddress)}
                        className="text-[10px] text-[#8a6d1b] dark:text-[#d4af37] hover:underline cursor-pointer"
                        title="Copy IP address"
                      >
                        {copiedIp ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                  <p className="font-mono text-xs font-bold text-[var(--text-main)] truncate">
                    {dossier.ipAddress}
                  </p>
                  <span className="font-serif text-[10px] text-[var(--text-muted)] block">
                    Last active IP address
                  </span>
                </div>

                {/* Device & Mobile Badge */}
                <div className="rounded-xl p-4 bg-[#fbf9f4] dark:bg-[var(--surface-low)]/50 border border-[var(--surface-border)] space-y-1">
                  <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                    Device Classification
                  </span>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {dossier.isMobile ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                        <span className="material-symbols-outlined text-[12px]">smartphone</span>
                        <span>Mobile Device</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                        <span className="material-symbols-outlined text-[12px]">laptop_mac</span>
                        <span>Desktop / Laptop</span>
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-[11px] text-[var(--text-muted)] truncate pt-0.5">
                    {dossier.deviceInfo}
                  </p>
                </div>
              </div>

              {/* Navigation View Tabs */}
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className={`px-3.5 py-1.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                      activeTab === "all"
                        ? "bg-[#d4af37] text-[#141416] font-bold shadow-xs"
                        : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-low)]"
                    }`}
                  >
                    <span>All Activity</span>
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-black/15 font-mono">
                      {dossier.activityHistory.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("today")}
                    className={`px-3.5 py-1.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                      activeTab === "today"
                        ? "bg-[#d4af37] text-[#141416] font-bold shadow-xs"
                        : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-low)]"
                    }`}
                  >
                    <span>Today</span>
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-black/15 font-mono">
                      {dossier.todayActivity.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("previous-day")}
                    className={`px-3.5 py-1.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                      activeTab === "previous-day"
                        ? "bg-[#d4af37] text-[#141416] font-bold shadow-xs"
                        : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-low)]"
                    }`}
                  >
                    <span>Previous Day</span>
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-black/15 font-mono">
                      {dossier.previousDayActivity.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("device")}
                    className={`px-3.5 py-1.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                      activeTab === "device"
                        ? "bg-[#d4af37] text-[#141416] font-bold shadow-xs"
                        : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-low)]"
                    }`}
                  >
                    <span>Login &amp; Device Info</span>
                  </button>
                </div>
              </div>

              {/* Tab 1, 2, 3: Activity Timeline */}
              {activeTab !== "device" && (
                <div className="space-y-3">
                  {currentDisplayList.length === 0 ? (
                    <div className="py-12 text-center space-y-2 border border-dashed border-[var(--surface-border)] rounded-2xl p-6">
                      <span className="material-symbols-outlined text-3xl text-[var(--text-muted)]">
                        history_toggle_off
                      </span>
                      <h4 className="font-display text-sm font-bold text-[var(--text-main)]">
                        {activeTab === "today"
                          ? "No Activity Recorded Today"
                          : activeTab === "previous-day"
                          ? "No Activity Recorded on Previous Day"
                          : "No Student Activity Recorded Yet"}
                      </h4>
                      <p className="font-serif text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                        Historical activity is logged in real-time as the student logs in and navigates the LMS.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {currentDisplayList.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 sm:p-4 rounded-xl border border-[var(--surface-border)] bg-[#fdfbf7] dark:bg-[var(--surface-low)]/40 hover:border-[#d4af37]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#1a1a20] border border-[var(--surface-border)] text-[#d4af37] flex items-center justify-center shrink-0 mt-0.5">
                              {item.type === "login" && (
                                <span className="material-symbols-outlined text-[16px]">key</span>
                              )}
                              {item.type === "registration" && (
                                <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                              )}
                              {item.type === "lms_session" && (
                                <span className="material-symbols-outlined text-[16px]">school</span>
                              )}
                              {item.type === "enrollment_request" && (
                                <span className="material-symbols-outlined text-[16px]">assignment</span>
                              )}
                              {item.type === "enrollment_approved" && (
                                <span className="material-symbols-outlined text-[16px] text-emerald-500">verified</span>
                              )}
                              {item.type === "enrollment_rejected" && (
                                <span className="material-symbols-outlined text-[16px] text-rose-500">cancel</span>
                              )}
                            </div>

                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-display text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">
                                  {item.title}
                                </h4>
                                {item.badge && (
                                  <span className="px-2 py-0.2 rounded-md text-[9px] font-display uppercase tracking-wider font-bold bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37]">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="font-serif text-xs text-[var(--text-muted)]">
                                {item.details}
                              </p>
                              {item.ip && (
                                <span className="font-mono text-[10px] text-[var(--text-muted)] block">
                                  IP: {item.ip}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            <span className="font-sans text-xs font-semibold text-[var(--text-main)] block">
                              {new Date(item.timestamp).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="font-mono text-[10px] text-[var(--text-muted)] block">
                              {new Date(item.timestamp).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Login & Device Detailed Telemetry View */}
              {activeTab === "device" && (
                <div className="rounded-2xl border border-[var(--surface-border)] p-6 bg-[#fbf9f4] dark:bg-[var(--surface-low)]/40 space-y-6">
                  <div className="space-y-1">
                    <h4 className="font-display text-sm font-bold uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37]">
                      Detailed Device &amp; Connection Telemetry
                    </h4>
                    <p className="font-serif text-xs text-[var(--text-muted)]">
                      Captured during student sign-in and real-time LMS learning sessions.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white dark:bg-[#16161c] border border-[var(--surface-border)] space-y-1">
                      <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                        IP Address
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-[var(--text-main)]">
                          {dossier.ipAddress}
                        </span>
                        {!dossier.ipAddress.includes("Not recorded") && (
                          <button
                            type="button"
                            onClick={() => handleCopyIp(dossier.ipAddress)}
                            className="px-2.5 py-1 rounded-lg border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider hover:border-[#d4af37] cursor-pointer"
                          >
                            {copiedIp ? "Copied" : "Copy IP"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-[#16161c] border border-[var(--surface-border)] space-y-1">
                      <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                        Device Type &amp; Mobile Status
                      </span>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="material-symbols-outlined text-[18px] text-[#d4af37]">
                          {dossier.isMobile ? "smartphone" : "computer"}
                        </span>
                        <span className="font-sans text-xs font-bold text-[var(--text-main)]">
                          {dossier.isMobile ? "Mobile Device (Smartphone / Tablet)" : "Desktop / Laptop Workstation"}
                        </span>
                      </div>
                      <p className="font-serif text-[11px] text-[var(--text-muted)]">
                        {dossier.deviceInfo}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-[#16161c] border border-[var(--surface-border)] space-y-1">
                      <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                        Browser &amp; User Agent
                      </span>
                      <p className="font-sans text-xs font-bold text-[var(--text-main)]">
                        {dossier.browserInfo}
                      </p>
                      <span className="font-serif text-[11px] text-[var(--text-muted)] block">
                        Standard Web Rendering Engine
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-[#16161c] border border-[var(--surface-border)] space-y-1">
                      <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                        Authentication Handshake Timestamp
                      </span>
                      <p className="font-sans text-xs font-bold text-[var(--text-main)]">
                        {dossier.loginDateTime}
                      </p>
                      <span className="font-serif text-[11px] text-[var(--text-muted)] block">
                        Recorded via Supabase Auth
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--surface-border)] bg-[#faf8f4] dark:bg-[#18181e] shrink-0">
          <span className="font-serif text-xs text-[var(--text-muted)] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#d4af37]">security</span>
            <span>Admin-only view • Completely hidden from student LMS</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#141416] hover:bg-[#d4af37] hover:text-[#141416] dark:bg-[#d4af37] dark:text-[#141416] text-white font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
