"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  getPublicPublishedReviewsAction,
  submitStudentReviewAction,
  CentralReview,
} from "@/app/admin/review-actions";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<CentralReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form State
  const [shareName, setShareName] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareCourse, setShareCourse] = useState("English Grammar Mastery — A1");
  const [shareRating, setShareRating] = useState(5);
  const [shareReview, setShareReview] = useState("");

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await getPublicPublishedReviewsAction();
      if (res.success && res.data) {
        setReviews(res.data);
      }
    } catch (err) {
      console.error("Failed to load published reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await submitStudentReviewAction({
        student_name: shareName,
        student_email: shareEmail,
        program: shareCourse,
        rating: shareRating,
        review_text: shareReview,
      });

      if (res.success) {
        setSubmitted(true);
        // Clear form
        setShareName("");
        setShareEmail("");
        setShareReview("");
        setShareRating(5);
      } else {
        setSubmitError(res.error || "Failed to submit review.");
      }
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1 py-12 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          {/* Header */}
          <header className="text-center mb-10 max-w-3xl mx-auto">
            {/* Main Heading enclosed in stylish rectangular rounded box */}
            <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)] mb-5">
              <span className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold uppercase tracking-[0.12em] text-[var(--text-main)]">
                Review Panel
              </span>
            </div>
            <p className="font-serif text-lg sm:text-xl text-[var(--text-main)] leading-relaxed mb-3">
              Alumni Testimonials &amp;{" "}
              <span className="italic font-serif text-[#8a6d1b] dark:text-[#d4af37]">
                Executive Trajectories
              </span>
            </p>
            <p className="font-serif text-lg md:text-xl text-[var(--text-muted)] leading-relaxed mb-6">
              Read firsthand accounts from our alumni who have elevated their professional trajectory through SpeakUp&apos;s executive English programs.
            </p>

            {/* Established Share Your Experience Action */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setShareModalOpen(true);
                  setSubmitted(false);
                  setSubmitError(null);
                }}
                className="inline-flex items-center gap-2 bg-[var(--surface-low)] hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#1a1a1a] border border-[#d4af37] font-display text-[13px] sm:text-sm uppercase tracking-wider font-bold px-8 py-3.5 rounded-full transition-all duration-300 shadow-xs cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[19px] text-[#d4af37]">rate_review</span>
                <span>Share Your Experience</span>
              </button>
            </div>
          </header>

          {/* Reviews Grid or Empty State */}
          {loading ? (
            <div className="p-16 text-center text-[var(--text-muted)] font-serif text-base">
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-[var(--surface-lowest)] rounded-3xl p-12 sm:p-16 border border-[var(--surface-border)] text-center max-w-2xl mx-auto space-y-4 mb-16 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-[var(--surface-low)] border border-[var(--surface-border)] text-[#d4af37] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[32px]">rate_review</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-[var(--text-main)]">
                No reviews yet.
              </h3>
              <p className="font-serif text-base text-[var(--text-muted)] leading-relaxed">
                When students complete their programs and submit feedback, approved testimonials will appear here on the alumni roll. Be the first to share your journey!
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShareModalOpen(true);
                    setSubmitted(false);
                  }}
                  className="inline-flex items-center gap-2 border border-[#d4af37] text-[var(--text-main)] hover:bg-[#d4af37] hover:text-white px-6 py-3 rounded-full font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_comment</span>
                  <span>Submit the First Review</span>
                </button>
              </div>
            </div>
          ) : (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {reviews.map((r, idx) => {
                const isFeatured = idx === 0 && reviews.length > 2;

                return (
                  <article
                    key={r.id || idx}
                    className={`bg-[var(--surface-lowest)] rounded-2xl p-8 border border-[var(--surface-border)] shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between ${
                      isFeatured ? "md:col-span-2 lg:col-span-2 relative overflow-hidden" : ""
                    }`}
                  >
                    {isFeatured && (
                      <div className="absolute top-0 right-0 w-36 h-36 bg-[#d4af37]/10 rounded-bl-full pointer-events-none"></div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className="material-symbols-outlined text-[#d4af37] opacity-60 text-3xl block"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          format_quote
                        </span>
                        <div className="flex items-center gap-0.5 text-[#d4af37]">
                          {[...Array(r.rating || 5)].map((_, i) => (
                            <span
                              key={i}
                              className="material-symbols-outlined text-[18px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                      <p
                        className={`font-serif text-[var(--text-main)] leading-relaxed mb-6 ${
                          isFeatured ? "text-lg md:text-xl" : "text-base"
                        }`}
                      >
                        &quot;{r.review_text}&quot;
                      </p>
                    </div>
                    <div className="border-t border-[var(--surface-border)] pt-4 mt-auto flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-bold text-[var(--text-main)] uppercase tracking-wider">
                          {r.student_name}
                        </h3>
                        <p className="font-serif text-xs text-[var(--text-muted)] mt-0.5">{r.program}</p>
                      </div>
                      <span className="font-display text-[11px] uppercase tracking-wider font-bold text-[#d4af37] border border-[#d4af37]/35 bg-[var(--surface-low)] px-2.5 py-1 rounded-md shrink-0">
                        Verified Alumni
                      </span>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {/* Bottom Action */}
          <div className="text-center bg-[var(--surface-low)] border border-[#d4af37]/30 rounded-2xl p-10 max-w-2xl mx-auto shadow-xs">
            <h3 className="font-display text-2xl font-bold text-[var(--text-main)] mb-3">
              Begin Your Own Transformation
            </h3>
            <p className="font-serif text-[var(--text-muted)] text-base mb-6 leading-relaxed">
              Schedule a diagnostic session or reserve your seat for the upcoming 2026 cohort.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/book-session"
                className="bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all font-display text-xs uppercase tracking-widest font-bold px-8 py-4 rounded-full shadow-xs"
              >
                Book a Free Session
              </Link>
              <Link
                href="/courses"
                className="border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-widest font-bold px-8 py-4 rounded-full transition-all"
              >
                Explore Courses
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Share Your Experience Modal */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-lg w-full p-8 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--surface-border)] mb-5">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#d4af37] text-[22px]">rate_review</span>
                <h3 className="font-display text-xl font-bold text-[var(--text-main)]">
                  Share Your Experience
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                aria-label="Close modal"
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {submitError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-500/30 text-red-700 dark:text-red-300 text-xs font-serif">
                {submitError}
              </div>
            )}

            {!submitted ? (
              <form onSubmit={handleShareSubmit} className="space-y-4 font-serif">
                <div>
                  <label className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={shareName}
                    onChange={(e) => setShareName(e.target.value)}
                    placeholder="e.g. Tariq Mehmood"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] focus:outline-none focus:border-[#d4af37] text-sm"
                  />
                </div>

                <div>
                  <label className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] focus:outline-none focus:border-[#d4af37] text-sm"
                  />
                </div>

                <div>
                  <label className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-1.5">
                    Enrolled Program
                  </label>
                  <select
                    value={shareCourse}
                    onChange={(e) => setShareCourse(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] focus:outline-none focus:border-[#d4af37] text-sm cursor-pointer"
                  >
                    <option value="English Grammar Mastery — A1">English Grammar Mastery — A1</option>
                    <option value="Speak in 30 Days — Fluency">Speak in 30 Days — Fluency</option>
                    <option value="Strategic Negotiation & Persuasion">Strategic Negotiation &amp; Persuasion</option>
                    <option value="Professional Executive Series">Professional Executive Series</option>
                  </select>
                </div>

                <div>
                  <label className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-1.5">
                    Rating (1 to 5 Stars)
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setShareRating(s)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-[24px] ${
                            s <= shareRating ? "text-[#d4af37]" : "text-[var(--surface-border)]"
                          }`}
                        >
                          star
                        </span>
                      </button>
                    ))}
                    <span className="font-mono text-xs text-[var(--text-muted)] ml-2">
                      {shareRating} / 5
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-1.5">
                    Your Testimonial *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={shareReview}
                    onChange={(e) => setShareReview(e.target.value)}
                    placeholder="Describe how the curriculum or Sir Mudassir's pedagogy elevated your cadence and communication..."
                    className="w-full px-4 py-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-main)] focus:outline-none focus:border-[#d4af37] text-sm resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-full bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] font-display text-xs uppercase tracking-widest font-bold hover:bg-[#d4af37] hover:text-white transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? "Submitting for Moderation..." : "Submit Alumni Experience"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 space-y-4 font-serif">
                <div className="w-14 h-14 rounded-full bg-green-500/10 text-green-600 border border-green-500/30 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[32px]">check</span>
                </div>
                <h4 className="font-display text-xl font-bold text-[var(--text-main)]">
                  Thank You for Sharing
                </h4>
                <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
                  Your feedback has been received and will be reviewed by academic administration for inclusion on the alumni roll.
                </p>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => setShareModalOpen(false)}
                    className="px-8 py-2.5 rounded-full border border-[var(--surface-border)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold hover:bg-[var(--surface-low)] cursor-pointer"
                  >
                    Close
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
