"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import { getAdminDashboardMetricsAction, AdminDashboardMetrics } from "@/app/admin/actions";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics>({
    totalStudents: 0,
    accountStatuses: {
      active: 0,
      pending: 0,
      suspended: 0,
      rejected: 0,
    },
    studentsWithValidEnrollment: 0,
    pendingRequests: 0,
    activeEnrollments: 0,
    expiredEnrollments: 0,
    totalCourses: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const res = await getAdminDashboardMetricsAction();
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    } catch (err) {
      console.error("Failed to load admin metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const cards = [
    {
      title: "Total Students",
      value: metrics.totalStudents,
      description: `${metrics.accountStatuses.active} Active • ${metrics.accountStatuses.pending} Pending • ${metrics.accountStatuses.suspended} Suspended`,
      icon: "group",
      status: "Student Accounts",
      link: "/admin/students",
      linkText: "View Students",
      accent: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Enrolled Students",
      value: metrics.studentsWithValidEnrollment,
      description: "Scholars with currently valid, active course access",
      icon: "school",
      status: "Unique Active Learners",
      link: "/admin/students",
      linkText: "Active Roster",
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Course Enrollments",
      value: metrics.activeEnrollments,
      description: `${metrics.activeEnrollments} Active • ${metrics.expiredEnrollments} Expired`,
      icon: "verified_user",
      status: metrics.expiredEnrollments > 0 ? `${metrics.expiredEnrollments} Expired` : "All Current",
      link: "/admin/students",
      linkText: "Manage Access",
      accent: "text-[#d4af37]",
      bg: "bg-[#d4af37]/15",
      border: "border-[#d4af37]/30",
      badge: metrics.expiredEnrollments > 0 ? `${metrics.expiredEnrollments} Expired` : undefined,
    },
    {
      title: "Pending Course Requests",
      value: metrics.pendingRequests,
      description: "Applications awaiting review (status = pending)",
      icon: "pending_actions",
      status: "Enrollment Requests",
      link: "/admin/course-requests",
      linkText: "Review Requests",
      accent: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      badge: metrics.pendingRequests > 0 ? "Action Needed" : undefined,
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Dashboard Overview"
        subtitle="SpeakUp Academic Administration & Access Control"
      />

      <div className="p-6 sm:p-8 max-w-[1360px] mx-auto space-y-8">
        {/* Welcome Banner */}
        <section className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                Live Supabase Connected
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)] tracking-tight">
              Administrative Command Center
            </h2>
            <p className="font-serif text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
              Real-time summary of student accounts, course access requests, and academic curricula from the Supabase backend.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={loadMetrics}
              className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                refresh
              </span>
              <span>Refresh Metrics</span>
            </button>
          </div>
        </section>

        {/* 4 Summary Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#d4af37]/50 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg} ${card.accent} border ${card.border}`}>
                  <span className="material-symbols-outlined text-[24px]">
                    {card.icon}
                  </span>
                </div>
                {card.badge && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                    {card.badge}
                  </span>
                )}
              </div>

              <div>
                <span className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                  {card.title}
                </span>
                <div className="font-display text-3xl sm:text-4xl font-extrabold text-[var(--text-main)] tracking-tight mt-1">
                  {loading ? (
                    <span className="inline-block w-8 h-8 rounded-md bg-[var(--surface-low)] animate-pulse"></span>
                  ) : (
                    card.value
                  )}
                </div>
                <p className="font-serif text-xs text-[var(--text-muted)] mt-1">
                  {card.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--surface-border)] flex items-center justify-between text-xs font-display font-semibold">
                <span className="text-[var(--text-muted)] font-normal text-[11px]">{card.status}</span>
                <Link
                  href={card.link}
                  className="text-[#8a6d1b] dark:text-[#d4af37] hover:underline inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                >
                  <span>{card.linkText}</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))}
        </section>

        {/* Content & Curriculum Management Section (Four Preparation Buttons) */}
        <section className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--surface-border)] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d4af37] text-[20px]">tune</span>
                <h3 className="font-display text-base sm:text-lg font-bold text-[var(--text-main)]">
                  Content & Curriculum Management
                </h3>
              </div>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                Direct access to website structure, academic courses, module outlines, and frequently asked questions.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] self-start sm:self-center font-mono">
              Preparation View
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Edit Website */}
            <Link
              href="/admin/edit"
              className="p-5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[#f9f5ed]/50 dark:bg-[var(--surface-low)]/30 hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">edit</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)] group-hover:text-[#d4af37] group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors">
                  Edit Website
                </h4>
                <p className="font-serif text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                  Inspect public website pages, authentication views, and student LMS portals.
                </p>
              </div>
            </Link>

            {/* 2. Edit Courses */}
            <Link
              href="/admin/edit-courses"
              className="p-5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[#f9f5ed]/50 dark:bg-[var(--surface-low)]/30 hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">menu_book</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)] group-hover:text-[#d4af37] group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors">
                  Edit Courses
                </h4>
                <p className="font-serif text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                  Overview of academic courses, levels, and catalog records.
                </p>
              </div>
            </Link>

            {/* 3. Edit Course Outline */}
            <Link
              href="/admin/edit-course-outline"
              className="p-5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[#f9f5ed]/50 dark:bg-[var(--surface-low)]/30 hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">format_list_bulleted</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)] group-hover:text-[#d4af37] group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors">
                  Edit Course Outline
                </h4>
                <p className="font-serif text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                  Examine modular lesson structures, week-by-week cadence, and syllabus topics.
                </p>
              </div>
            </Link>

            {/* 4. Edit FAQs */}
            <Link
              href="/admin/edit-faqs"
              className="p-5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[#f9f5ed]/50 dark:bg-[var(--surface-low)]/30 hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">quiz</span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)] group-hover:text-[#d4af37] group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors">
                  Edit FAQs
                </h4>
                <p className="font-serif text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                  Inspect institutional questions, tuition answers, and academic guidelines.
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* Operational Guidance Panel */}
        <section className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--surface-border)]">
            <span className="material-symbols-outlined text-[#d4af37] text-[20px]">info</span>
            <h3 className="font-display text-base font-bold text-[var(--text-main)]">
              Admin Access &amp; Course Security Workflow
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-serif text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
            <div className="p-4 rounded-xl bg-[#f9f5ed]/80 dark:bg-[var(--surface-low)]/50 border border-[var(--surface-border)] space-y-1.5">
              <span className="font-display text-[11px] uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-bold block">
                1. Single Door Entry
              </span>
              <p>
                Admins log in using the existing website sign-in form. Verified credentials load the admin role from the database, unlocking access to this panel.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#f9f5ed]/80 dark:bg-[var(--surface-low)]/50 border border-[var(--surface-border)] space-y-1.5">
              <span className="font-display text-[11px] uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-bold block">
                2. Explicit Course Grants
              </span>
              <p>
                Registration does not automatically give access to every course. Review incoming student requests or grant access to specific courses on the Students page.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#f9f5ed]/80 dark:bg-[var(--surface-low)]/50 border border-[var(--surface-border)] space-y-1.5">
              <span className="font-display text-[11px] uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-bold block">
                3. Database Level Security
              </span>
              <p>
                Row Level Security strictly guards modules, lessons, and unpublished courses. Unauthorized accounts are blocked at the database engine level.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
