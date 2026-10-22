"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  getAdminReviewsAction,
  moderateReviewAction,
  CentralReview,
} from "../review-actions";

type FilterTab = "all" | "pending" | "accepted" | "published" | "rejected";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<CentralReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await getAdminReviewsAction();
      if (res.success && res.data) {
        setReviews(res.data);
      } else {
        showToast("error", res.error || "Failed to load reviews.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleModerate = async (
    reviewId: string,
    action: "accept" | "publish" | "unpublish" | "reject" | "delete"
  ) => {
    if (action === "delete") {
      if (!window.confirm("Are you sure you want to permanently delete this student review?")) {
        return;
      }
    }

    setActionLoadingId(reviewId);
    try {
      const res = await moderateReviewAction(reviewId, action);
      if (res.success) {
        const labels: Record<string, string> = {
          accept: "Review accepted.",
          publish: "Review published to public website.",
          unpublish: "Review unpublished.",
          reject: "Review rejected.",
          delete: "Review deleted.",
        };
        showToast("success", labels[action] || "Action completed.");
        await loadReviews();
      } else {
        showToast("error", res.error || "Failed to perform moderation action.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Action failed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const pendingCount = reviews.filter((r) => r.status === "pending").length;
  const publishedCount = reviews.filter((r) => r.status === "published").length;
  const acceptedCount = reviews.filter((r) => r.status === "accepted").length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#faf8f5] dark:bg-[#0c0c0e]">
      <AdminHeader
        title="Student Reviews Moderation"
        subtitle="Review, approve, and publish verified student testimonials to the public website"
      />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between shadow-md transition-all ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-950/40 border-red-500/30 text-red-800 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px]">
                {toast.type === "success" ? "check_circle" : "error"}
              </span>
              <span className="font-display text-sm font-semibold">{toast.text}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-current opacity-70 hover:opacity-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Informational Banner */}
        <div className="bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
              <span className="font-display text-xs uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                Editorial Moderation Pipeline
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)]">
              Incoming Student Testimonials
            </h2>
            <p className="font-serif text-sm text-[var(--text-muted)] max-w-2xl">
              Reviews submitted by students are queued as pending. Only reviews with status <span className="font-semibold text-emerald-600 dark:text-emerald-400">&quot;Published&quot;</span> are visible on the public website.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 text-center">
              <span className="font-mono text-lg font-bold text-amber-700 dark:text-amber-400 block leading-none">
                {pendingCount}
              </span>
              <span className="font-display text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-300 font-semibold">
                Pending
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 text-center">
              <span className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400 block leading-none">
                {publishedCount}
              </span>
              <span className="font-display text-[10px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-semibold">
                Live Public
              </span>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--surface-border)]">
          {(
            [
              { key: "all", label: "All Reviews", count: reviews.length },
              { key: "pending", label: "Pending", count: pendingCount },
              { key: "accepted", label: "Accepted", count: acceptedCount },
              { key: "published", label: "Published (Live)", count: publishedCount },
              { key: "rejected", label: "Rejected", count: reviews.filter((r) => r.status === "rejected").length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl font-display text-xs uppercase tracking-wider font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                filter === tab.key
                  ? "bg-[#141416] text-white dark:bg-[#d4af37] dark:text-[#141416] shadow-xs"
                  : "bg-white dark:bg-[#141418] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--surface-border)]"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  filter === tab.key
                    ? "bg-white/20 dark:bg-black/20 text-current"
                    : "bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-[var(--text-muted)]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Reviews List or Empty State */}
        {loading ? (
          <div className="p-12 text-center text-[var(--text-muted)] font-serif text-sm">
            Loading student reviews...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-12 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">rate_review</span>
            </div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--text-main)]">
              No reviews yet.
            </h3>
            <p className="font-serif text-sm text-[var(--text-muted)] max-w-md mx-auto">
              {filter === "all"
                ? "When enrolled students submit testimonials through the public website, they will appear here for editorial moderation."
                : `No reviews found with status "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((rev) => {
              const isActionLoading = actionLoadingId === rev.id;

              return (
                <div
                  key={rev.id}
                  className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] hover:border-[#d4af37]/50 p-6 shadow-xs transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                          {rev.student_name}
                        </h3>
                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold border ${
                            rev.status === "published"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : rev.status === "accepted"
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-500/30"
                              : rev.status === "rejected"
                              ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-500/30"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {rev.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono">
                        <span>{rev.student_email}</span>
                        <span>•</span>
                        <span>{rev.program}</span>
                        <span>•</span>
                        <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Star Rating Display */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`material-symbols-outlined text-[18px] ${
                            star <= rev.rating ? "text-[#d4af37]" : "text-[var(--surface-border)]"
                          }`}
                        >
                          star
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Review Text */}
                  <blockquote className="font-serif text-sm sm:text-base text-[var(--text-main)] leading-relaxed italic bg-[#f9f5ed]/50 dark:bg-[var(--surface-low)]/50 p-4 rounded-xl border border-[var(--surface-border)]">
                    &quot;{rev.review_text}&quot;
                  </blockquote>

                  {/* Moderation Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--surface-border)]">
                    <div className="text-[11px] font-display text-[var(--text-muted)]">
                      {rev.status === "published"
                        ? "Currently LIVE on public website."
                        : rev.status === "accepted"
                        ? "Accepted by moderator. Click Publish to make visible on public website."
                        : rev.status === "rejected"
                        ? "Rejected from publication."
                        : "Awaiting administrator decision."}
                    </div>

                    <div className="flex items-center gap-2">
                      {rev.status === "pending" && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleModerate(rev.id, "accept")}
                          className="px-3.5 py-1.5 rounded-lg border border-blue-500/40 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          Accept
                        </button>
                      )}

                      {rev.status !== "published" && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleModerate(rev.id, "publish")}
                          className="px-3.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600 hover:bg-emerald-700 text-white font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                        >
                          Publish
                        </button>
                      )}

                      {rev.status === "published" && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleModerate(rev.id, "unpublish")}
                          className="px-3.5 py-1.5 rounded-lg border border-[var(--surface-border)] bg-white hover:bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer disabled:opacity-50"
                        >
                          Unpublish
                        </button>
                      )}

                      {rev.status !== "rejected" && rev.status !== "published" && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleModerate(rev.id, "reject")}
                          className="px-3.5 py-1.5 rounded-lg border border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-display text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleModerate(rev.id, "delete")}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer disabled:opacity-50"
                        title="Delete Review"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
