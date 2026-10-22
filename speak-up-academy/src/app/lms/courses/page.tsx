"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LmsProfileDropdown from "@/components/LmsProfileDropdown";
import { useCmsContent } from "@/lib/cms/useCmsContent";
import {
  getStudentProgressAction,
  getCourseNotificationsAction,
  markNotificationReadAction,
  CourseNotification,
} from "@/app/lms/actions";
import { createClient } from "@/lib/supabase/client";
import { getUnifiedCourseById } from "@/config/unifiedCourses";
import AdminPreviewBanner from "@/components/lms/AdminPreviewBanner";

interface EnrolledCourse {
  id: string;
  title: string;
  lastAccessed: string;
  status: "In Progress" | "Completed";
  progress: number;
  description: string;
  image: string;
}

export default function EnrolledCoursesPage() {
  const cms = useCmsContent("enrolled-courses");
  const [filter, setFilter] = useState<"all" | "in-progress" | "completed">("in-progress");
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [notifications, setNotifications] = useState<CourseNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const email = user?.email || "";
        setUserEmail(email);

        const res = await getStudentProgressAction();
        let courseList: EnrolledCourse[] = [];

        if (res.success && res.data?.courses) {
          const courseEntries = Object.values(res.data.courses);
          courseList = courseEntries.map((c) => {
            const canonical = getUnifiedCourseById(c.courseId);
            return {
              id: c.courseId,
              title: canonical?.title || c.courseTitle,
              lastAccessed: c.lastAccessedAt ? new Date(c.lastAccessedAt).toLocaleDateString() : "Recently",
              status: c.progressPercentage >= 100 ? "Completed" : "In Progress",
              progress: c.progressPercentage,
              description: canonical?.description || `${c.completedLessons.length} of ${c.totalLessons} lessons completed.`,
              image: canonical?.image || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
            };
          });
          setEnrolledCourses(courseList);
        } else {
          setEnrolledCourses([]);
        }

        // Fetch course-specific notifications for courses the student is enrolled in
        const enrolledIds = courseList.map((c) => c.id);
        if (enrolledIds.length > 0) {
          const notifRes = await getCourseNotificationsAction(enrolledIds, email);
          if (notifRes.success) {
            setNotifications(notifRes.data || []);
          }
        } else {
          setNotifications([]);
        }
      } catch (err) {
        console.error("Failed to load enrolled courses & notifications:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    window.addEventListener("speakup-central-courses-updated", loadData);
    return () => {
      window.removeEventListener("speakup-central-courses-updated", loadData);
    };
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const filtered = enrolledCourses.filter((c) => {
    if (filter === "in-progress") return c.status === "In Progress";
    if (filter === "completed") return c.status === "Completed";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-[1300px] mx-auto space-y-8 py-4">
      {/* Administrator Live Preview Notice */}
      <AdminPreviewBanner />

      {/* Top Header Section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 pt-2 border-b border-[var(--surface-border)]">
        <div className="space-y-1">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
            {cms.header?.heading || "Enrolled Courses"}
          </h1>
          <p className="font-serif text-base sm:text-lg text-[var(--text-muted)]">
            {cms.header?.subheading || "Manage your active academic progress, review study notes, and track course updates."}
          </p>
        </div>

        <div className="shrink-0 self-start sm:self-center">
          <LmsProfileDropdown variant="header" />
        </div>
      </section>

      {/* ================= COURSE NOTIFICATIONS SECTION ================= */}
      <section className="rounded-2xl bg-white dark:bg-[#141418]/60 border border-[var(--surface-border)] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-[#d4af37]">notifications</span>
            <h2 className="font-display text-base sm:text-lg font-bold text-[var(--text-main)]">
              Course Notifications &amp; Feedback
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#d4af37] text-[#141416] text-[10px] font-mono font-bold">
                {unreadCount} new
              </span>
            )}
          </div>
          <span className="text-xs font-serif text-[var(--text-muted)]">
            Scoped to your enrolled curriculum
          </span>
        </div>

        {loading ? (
          <div className="py-4 text-center text-xs font-serif text-[var(--text-muted)]">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-6 text-center space-y-1.5">
            <span className="material-symbols-outlined text-[28px] text-[var(--text-muted)] block mx-auto">
              notifications_paused
            </span>
            <p className="font-display text-sm font-semibold text-[var(--text-main)]">
              No notifications
            </p>
            <p className="font-serif text-xs text-[var(--text-muted)]">
              You are all caught up with announcements and assignment feedback for your enrolled courses.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scroll pr-1">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  notif.read
                    ? "bg-[#faf8f5]/60 dark:bg-[var(--surface-low)]/30 border-[var(--surface-border)] opacity-75"
                    : "bg-[#fdfaf3] dark:bg-[#d4af37]/5 border-[#d4af37]/35 shadow-2xs"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`material-symbols-outlined text-[20px] mt-0.5 ${
                      notif.type === "feedback_received" || notif.type === "assignment_reviewed"
                        ? "text-blue-500"
                        : notif.type === "assignment_added"
                        ? "text-purple-500"
                        : notif.type === "video_added"
                        ? "text-emerald-500"
                        : "text-[#d4af37]"
                    }`}
                  >
                    {notif.type === "feedback_received" || notif.type === "assignment_reviewed"
                      ? "rate_review"
                      : notif.type === "assignment_added"
                      ? "assignment"
                      : notif.type === "video_added"
                      ? "play_circle"
                      : "campaign"}
                  </span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] font-display text-[9px] uppercase tracking-wider font-bold">
                        {notif.courseTitle}
                      </span>
                      <h4 className="font-display text-xs sm:text-sm font-bold text-[var(--text-main)]">
                        {notif.title}
                      </h4>
                    </div>
                    <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="font-mono text-[10px] text-[var(--text-muted)] block pt-0.5">
                      {new Date(notif.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!notif.read && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(notif.id)}
                    className="shrink-0 p-1.5 rounded-lg text-xs font-display text-[var(--text-muted)] hover:text-[#d4af37] cursor-pointer"
                    title="Mark as read"
                  >
                    <span className="material-symbols-outlined text-[16px]">done</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setFilter("in-progress")}
          className={`px-5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
            filter === "in-progress"
              ? "bg-[#d4af37] text-[#141416] shadow-xs"
              : "bg-white dark:bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
          }`}
        >
          <span>In Progress</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-black/10 dark:bg-black/20 font-mono font-bold">
            {enrolledCourses.filter((c) => c.status === "In Progress").length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setFilter("completed")}
          className={`px-5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer ${
            filter === "completed"
              ? "bg-[#d4af37] text-[#141416] shadow-xs"
              : "bg-white dark:bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
          }`}
        >
          <span>Completed</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-black/10 dark:bg-black/20 font-mono font-bold">
            {enrolledCourses.filter((c) => c.status === "Completed").length}
          </span>
        </button>
      </div>

      {/* Course Cards Grid */}
      {loading ? (
        <div className="py-12 text-center font-serif text-sm text-[var(--text-muted)]">
          Loading your enrolled courses...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#141418]/60 rounded-2xl border border-[var(--surface-border)] p-12 text-center max-w-lg mx-auto shadow-xs space-y-3">
          <span className="material-symbols-outlined text-4xl text-[#d4af37] mb-1 block">
            school
          </span>
          <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
            No courses available
          </h3>
          <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
            You do not currently have any approved course enrollments. Request admission from the course catalog to start learning.
          </p>
          <div className="pt-2">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#141416] text-white dark:bg-[#d4af37] dark:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs"
            >
              Browse Available Courses
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-[#141418]/60 rounded-2xl border border-[var(--surface-border)] shadow-xs hover:shadow-md hover:border-[#d4af37]/60 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Image Banner */}
                <div className="relative h-48 w-full overflow-hidden bg-[#f0eae0] dark:bg-[var(--surface-low)]">
                  <div
                    className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{ backgroundImage: `url(${course.image})` }}
                  />
                  <div className="absolute inset-0 bg-black/20"></div>

                  <div className="absolute top-3 right-3 bg-white/95 dark:bg-[#141418]/95 backdrop-blur-sm border border-[var(--surface-border)] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                    <span className="material-symbols-outlined text-[#d4af37] text-[15px]">lock_open</span>
                    <span className="font-display text-[10px] font-bold tracking-wider uppercase text-[#d4af37]">
                      Access Granted
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-6">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="bg-[#d4af37]/20 text-[#141416] dark:text-[#d4af37] font-display text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
                      Active
                    </span>
                    <span className="font-serif text-xs text-[var(--text-muted)]">
                      Last accessed: {course.lastAccessed}
                    </span>
                  </div>

                  <h2 className="font-display text-xl font-bold text-[var(--text-main)] mb-2 group-hover:text-[#d4af37] transition-colors leading-snug">
                    {course.title}
                  </h2>

                  <p className="font-serif text-[14px] text-[var(--text-muted)] leading-relaxed line-clamp-3">
                    {course.description}
                  </p>
                </div>
              </div>

              {/* Progress Metric & Continue CTA */}
              <div className="p-6 pt-0 mt-auto">
                <div className="pt-4 border-t border-[var(--surface-border)] space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-display uppercase tracking-wider font-semibold">
                      <span className="text-[var(--text-muted)]">Progress</span>
                      <span className="text-[#d4af37] font-bold">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-[#f0eae0] dark:bg-[var(--surface-low)] h-1.5 rounded-full overflow-hidden border border-[var(--surface-border)]/50">
                      <div
                        className="bg-[#d4af37] h-full rounded-full"
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <Link
                    href={`/lms/learn?course=${course.id}`}
                    className="w-full py-3.5 px-4 bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs font-bold rounded-xl uppercase tracking-widest transition-all shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>Continue Course</span>
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
