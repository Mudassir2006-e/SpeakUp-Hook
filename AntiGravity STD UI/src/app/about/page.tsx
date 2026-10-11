"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useCmsContent } from "@/lib/cms/useCmsContent";
import defaultTeachers from "@/config/central-teachers.json";
import type { CentralTeacherItem, FounderTeacherPhotoData } from "@/app/admin/teachers-actions";

export default function AboutPage() {
  const cms = useCmsContent("about");
  const [teachers, setTeachers] = useState<CentralTeacherItem[]>(defaultTeachers as CentralTeacherItem[]);
  const [founderPhoto, setFounderPhoto] = useState<FounderTeacherPhotoData | null>(null);

  useEffect(() => {
    import("@/app/admin/teachers-actions").then(({ getCentralTeachersAction, getFounderTeacherPhotoAction }) => {
      getCentralTeachersAction()
        .then((res) => {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            setTeachers(res.data.filter((t) => t.isPublished));
          }
        })
        .catch(() => {});

      getFounderTeacherPhotoAction()
        .then((res) => {
          if (res.success && res.data) {
            setFounderPhoto(res.data);
          }
        })
        .catch(() => {});
    });
  }, []);

  const effectivePhotoUrl = founderPhoto?.photoUrl || cms.founder?.portraitImage || cms.founder?.avatarUrl || "";

  useEffect(() => {
    const scrollToFaculty = () => {
      if (typeof window !== "undefined" && window.location.hash === "#faculty") {
        const el = document.getElementById("faculty");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    scrollToFaculty();
    const timer = setTimeout(scrollToFaculty, 150);
    window.addEventListener("hashchange", scrollToFaculty);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", scrollToFaculty);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1 pt-8 sm:pt-12 pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          {/* Header Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)]">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-[0.08em] text-[var(--text-main)]">
                About Panel
              </h1>
            </div>
          </div>

          {/* Hero Section: Sir Mudassir Ali */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
            <div className="lg:col-span-7 order-2 lg:order-1">
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-main)] mb-6 leading-[1.1]">
                {cms.founder?.headline ? (
                  cms.founder.headline
                ) : (
                  <>
                    The Visionary Behind <br />
                    <span className="text-[#d4af37] italic font-serif font-light">Linguistic Excellence</span>
                  </>
                )}
              </h2>
              <p className="font-serif text-lg md:text-xl text-[var(--text-muted)] mb-8 leading-relaxed">
                {cms.founder?.bioParagraph1 || "Elevating executive communication through a refined, disciplined approach. Discover the philosophy and dedication that drives SpeakUp's bespoke language mastery programs."}
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <span className="text-[#d4af37] font-display text-xs sm:text-sm tracking-widest uppercase font-bold">
                  {cms.founder?.title || "Founder & Lead Coach"}
                </span>
                <Link
                  href={cms.founder?.bookSessionButtonLink || "/book-session"}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] font-display text-[12px] uppercase tracking-wider font-bold hover:bg-[#d4af37] hover:text-white transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  <span>{cms.founder?.bookSessionButtonText || "Book Session with Sir Mudassir"}</span>
                </Link>
              </div>

              {/* Optional Compact Teacher Feature Banner */}
              {(() => {
                const featured = teachers.find((t) => t.isPublished && t.featuredOnAboutBanner);
                if (!featured) return null;
                return (
                  <div className="mt-6 p-4 rounded-2xl border border-[#d4af37]/35 bg-gradient-to-r from-[var(--surface-lowest)] to-[var(--surface-low)] flex items-center gap-4 shadow-xs max-w-xl">
                    <div className="w-14 h-14 rounded-xl border border-[#d4af37]/40 bg-[var(--surface-lowest)] overflow-hidden shrink-0 flex items-center justify-center">
                      {featured.avatarUrl ? (
                        <img
                          src={featured.avatarUrl}
                          alt={featured.name}
                          className="w-full h-full"
                          style={{
                            objectFit: featured.avatarFitMode || "cover",
                            objectPosition: featured.avatarPosition || "center",
                          }}
                        />
                      ) : (
                        <span className="font-display font-bold text-sm text-[#d4af37]">
                          {featured.initials || featured.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[9px] uppercase tracking-wider font-extrabold text-[#d4af37] bg-[#d4af37]/15 px-2 py-0.5 rounded-full">
                          Featured Faculty Mentor
                        </span>
                        {featured.subject && (
                          <span className="font-serif text-[11px] text-[var(--text-muted)] truncate">
                            {featured.subject}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-sm font-bold text-[var(--text-main)] truncate">
                        {featured.name} <span className="font-serif text-xs font-normal text-[var(--text-muted)]">— {featured.title}</span>
                      </h3>
                      <p className="font-serif text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {featured.description}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Founder Portrait (Section 8: Real Teacher Photo or Clean Fallback) */}
            <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full overflow-hidden border-4 border-[var(--surface-border)] shadow-2xl p-2 bg-[var(--surface-lowest)] flex items-center justify-center">
                {effectivePhotoUrl ? (
                  <div
                    className="w-full h-full rounded-full overflow-hidden"
                    style={{
                      transform: `scale(${founderPhoto?.zoom || 1}) translate(${founderPhoto?.posX || 0}px, ${founderPhoto?.posY || 0}px)`,
                    }}
                  >
                    <img
                      src={effectivePhotoUrl}
                      alt={cms.founder?.founderName || "Sir Mudassir Ali"}
                      className="w-full h-full rounded-full"
                      style={{
                        objectFit: founderPhoto?.fitMode || "cover",
                        objectPosition: founderPhoto?.position || "center",
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-[var(--surface-low)] flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)] space-y-2">
                    <span className="material-symbols-outlined text-5xl text-[#d4af37]/60">person</span>
                    <span className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-main)]">
                      {cms.founder?.founderName || "Sir Mudassir Ali"}
                    </span>
                    <span className="font-serif text-xs text-[var(--text-muted)]">
                      {cms.founder?.title || "Founder & Lead Coach"}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full border border-[#d4af37]/30 pointer-events-none"></div>
              </div>
            </div>
          </div>

          {/* Biography & Philosophy Section */}
          <section className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-2xl p-8 md:p-12 mb-20 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-4 flex flex-col justify-start">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--text-main)] mb-2">
                  {cms.founder?.founderName || "Sir Mudassir Ali"}
                </h2>
                <p className="font-display text-[12px] text-[#d4af37] uppercase tracking-widest font-bold mb-4">
                  {cms.founder?.title || "Founder & Lead Coach"}
                </p>
                <div className="h-1 w-14 bg-[#d4af37] mb-6"></div>
                <div className="space-y-2 text-sm font-serif text-[var(--text-muted)]">
                  <p>• {cms.philosophy?.pillar1Title ? `${cms.philosophy.pillar1Title}: ${cms.philosophy.pillar1Text}` : "Over a decade of specialized executive training"}</p>
                  <p>• {cms.philosophy?.pillar2Title ? `${cms.philosophy.pillar2Title}: ${cms.philosophy.pillar2Text}` : "Former advisory counsel for multinational leadership"}</p>
                  <p>• {cms.philosophy?.pillar3Title ? `${cms.philosophy.pillar3Title}: ${cms.philosophy.pillar3Text}` : "Pioneer of the Cognitive Cadence Method"}</p>
                </div>
              </div>

              <div className="md:col-span-8 font-serif text-[16px] md:text-[17px] text-[var(--text-main)] space-y-5 leading-relaxed">
                <p>
                  {cms.founder?.bioParagraph1 || "With over a decade of dedicated experience in executive coaching, Sir Mudassir Ali has redefined the landscape of professional English education. His approach transcends traditional grammar and vocabulary, focusing instead on the strategic nuances of high-stakes communication."}
                </p>
                <p>
                  {cms.founder?.bioParagraph2 || "Having mentored leaders across global industries, he identified a critical gap: the need for a practical, context-driven mastery of English that empowers professionals to command boardrooms, negotiate with authority, and articulate complex visions with unwavering clarity."}
                </p>
                <p>
                  His philosophy of &quot;Practical English&quot; is the cornerstone of SpeakUp. It is an immersive methodology designed to transform linguistic competence into a profound executive presence, ensuring that every word spoken resonates with intent, prestige, and persuasive momentum.
                </p>
              </div>
            </div>
          </section>

          {/* Distinguished Faculty Section */}
          <section id="faculty" className="mb-16 scroll-mt-24">
            <div className="flex flex-col items-center text-center mb-12">
              <div className="inline-flex items-center px-8 py-3 rounded-full border border-[#d4af37]/40 bg-[var(--surface-low)] shadow-xs mb-4">
                <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[var(--text-main)]">
                  Academic Faculty
                </h2>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#d4af37] tracking-tight mb-3">
                Our Distinguished Mentors &amp; Scholars
              </h3>
              <p className="font-serif text-[var(--text-muted)] max-w-xl text-base leading-relaxed">
                Working in tandem with Sir Mudassir Ali, our elite educators bring world-class linguistic pedagogy, executive presence, and dedicated one-on-one mentorship.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {teachers.map((mentor) => (
                <div
                  key={mentor.id}
                  className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-6 shadow-xs hover:border-[#d4af37]/50 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#1a1a1a] dark:bg-[#d4af37] text-[#d4af37] dark:text-[#1a1a1a] flex items-center justify-center font-display font-bold text-lg border border-[#d4af37]/40 shrink-0">
                      {mentor.initials || mentor.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-[var(--text-main)]">{mentor.name}</h3>
                      <p className="font-display text-[11px] text-[#d4af37] uppercase tracking-wider font-semibold">
                        {mentor.title}
                      </p>
                    </div>
                  </div>
                  <p className="font-serif text-[14px] text-[var(--text-muted)] leading-relaxed">
                    {mentor.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Associated Benefits & Institutional Advantages */}
          <section className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-2xl p-8 md:p-12 mb-16 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="space-y-2 text-center md:text-left">
              <span className="font-display text-xs uppercase tracking-widest text-[#d4af37] font-bold block">
                Institutional Advantages
              </span>
              <h3 className="font-display text-2xl font-bold text-[var(--text-main)]">
                The Full Benefits of the SpeakUp System
              </h3>
              <p className="font-serif text-[var(--text-muted)] text-[15px] max-w-xl leading-relaxed">
                Discover our curated suite of recorded masterclasses, interactive cadence drills, and bespoke mentorship sessions inside the student LMS.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 shrink-0 justify-center">
              <Link
                href="/lms-journey#benefits"
                className="bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all font-display text-xs uppercase tracking-widest font-bold px-8 py-3.5 rounded-full shadow-xs active:scale-95"
              >
                Explore Benefits
              </Link>
              <Link
                href="/course-outline"
                className="border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] bg-[var(--surface-lowest)] font-display text-xs uppercase tracking-widest font-bold px-7 py-3.5 rounded-full transition-all active:scale-95"
              >
                View Course Outline
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
