"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getCentralBenefitsAction, CentralBenefitItem } from "@/app/admin/benefits-actions";

export default function BenefitsPage() {
  const [benefits, setBenefits] = useState<CentralBenefitItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getCentralBenefitsAction().then((res) => {
      if (isMounted) {
        setLoading(false);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setBenefits(res.data.filter((b) => b.isPublished));
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const fallbackBenefits: CentralBenefitItem[] = [
    { id: "b1", title: "Recorded Classes", description: "On-Demand Curriculum: Access executive-level lessons across all time zones with our secure, high-definition digital library.", icon: "video_library", order: 1, isPublished: true, updatedAt: "" },
    { id: "b2", title: "Practice Material", description: "Strategic Practice Assets: Access a curated suite of technical resources and case studies designed for immediate professional application.", icon: "menu_book", order: 2, isPublished: true, updatedAt: "" },
    { id: "b3", title: "Live Classes", description: "Executive Sessions: Participate in immersive, high-stakes simulations and live rhetorical drills for real-time linguistic refinement.", icon: "live_tv", order: 3, isPublished: true, updatedAt: "" },
    { id: "b4", title: "Personal Guidance", description: "Bespoke Mentorship: Receive dedicated, one-on-one strategic guidance tailored to your specific leadership trajectory and professional objectives.", icon: "psychology", order: 4, isPublished: true, updatedAt: "" },
    { id: "b5", title: "Discussion Group", description: "Executive Peer Network: Engage with a global cohort of high-achieving professionals in a secure environment for collaborative growth.", icon: "groups", order: 5, isPublished: true, updatedAt: "" },
    { id: "b6", title: "Direct Teacher Access", description: "Direct Pedagogical Access: Maintain an open line of communication with our expert faculty for precise, nuanced clarification on complex concepts.", icon: "school", order: 6, isPublished: true, updatedAt: "" },
    { id: "b7", title: "Structured Notes", description: "Institutional Summaries: Receive authoritative, professionally structured dossiers summarizing key architectural principles from every module.", icon: "description", order: 7, isPublished: true, updatedAt: "" },
  ];

  const activeBenefits = benefits.length > 0 ? benefits : fallbackBenefits;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1 py-12 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          {/* Header Badge */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)] mb-5">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-[0.08em] text-[var(--text-main)]">
                Institutional Advantages
              </h1>
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3">
              <span className="h-px w-6 sm:w-12 bg-gradient-to-r from-transparent to-[#d4af37]/60" />
              <h2 className="font-display text-lg sm:text-xl md:text-2xl font-semibold tracking-wide text-[#d4af37]">
                The SpeakUp System Benefits
              </h2>
              <span className="h-px w-6 sm:w-12 bg-gradient-to-l from-transparent to-[#d4af37]/60" />
            </div>

            <p className="font-serif text-[15px] sm:text-base text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
              Explore the comprehensive pedagogical tools, live masterclass access, and personal mentoring advantages included with every SpeakUp enrollment.
            </p>
          </div>

          {/* Benefits Grid */}
          <section className="mb-20">
            {loading ? (
              <div className="py-20 text-center text-sm font-serif text-[var(--text-muted)] flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg animate-spin text-[#d4af37]">
                  progress_activity
                </span>
                <span>Loading benefits...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeBenefits.map((b) => (
                  <div
                    key={b.id}
                    className="bg-[var(--surface-lowest)] p-8 rounded-2xl border border-[var(--surface-border)] hover:border-[#d4af37]/40 shadow-xs flex flex-col items-start transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mb-6 bg-[var(--surface-low)]">
                      <span className="material-symbols-outlined text-[26px]">
                        {b.icon || "verified"}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-[var(--text-main)] mb-2">
                      {b.title}
                    </h3>
                    <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Action CTAs */}
          <section className="text-center pt-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/courses"
                className="bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white font-display text-xs uppercase tracking-widest font-bold px-8 py-3.5 rounded-full transition-all shadow-xs"
              >
                Explore Courses
              </Link>
              <Link
                href="/book-session"
                className="bg-[var(--surface-low)] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-widest font-bold px-7 py-3.5 rounded-full transition-all"
              >
                Book a Session
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
