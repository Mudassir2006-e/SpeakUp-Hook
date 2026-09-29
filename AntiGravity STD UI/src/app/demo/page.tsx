"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SpeakUpVideoPlayer from "@/components/SpeakUpVideoPlayer";

interface DemoVideo {
  id: string;
  title: string;
  duration: string;
  description: string;
  thumbnail: string;
  instructor: string;
}

export default function DemoPage() {
  const [activeVideo, setActiveVideo] = useState<DemoVideo | null>(null);

  const demoVideos: DemoVideo[] = [
    {
      id: "grammar-demo",
      title: "English Grammar Mastery — A1 Demonstration",
      duration: "12:40",
      description:
        "A focused breakdown of clause coordination and eliminating common subject-verb hesitation markers in professional discourse.",
      thumbnail: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
      instructor: "Sir Mudassir Ali",
    },
    {
      id: "fluency-demo",
      title: "Speak in 30 Days — The Cadence Anchor in Action",
      duration: "15:20",
      description:
        "Watch how intentional pause timing replaces verbal crutches ('um', 'you know') to project commanding executive authority.",
      thumbnail: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
      instructor: "Sir Mudassir Ali",
    },
    {
      id: "negotiation-demo",
      title: "Executive Cross-Examination & Objection Handling",
      duration: "18:15",
      description:
        "Live seminar drill demonstrating diplomatic dissent phrasing and maintaining composure under intense stakeholder pushback.",
      thumbnail: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
      instructor: "SpeakUp Executive Faculty",
    },
  ];

  const [selectedVideo, setSelectedVideo] = useState<DemoVideo>(demoVideos[0]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1 py-12 md:py-16">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12">
          {/* Header Section */}
          <section className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)]">
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-[0.08em] text-[var(--text-main)]">
                Demo Panel
              </h1>
            </div>
          </section>

          {/* Primary Demo Player Card */}
          <section className="max-w-4xl mx-auto mb-8">
            <div
              onClick={() => setActiveVideo(selectedVideo)}
              className="group relative rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] overflow-hidden shadow-lg hover:border-[#d4af37]/60 transition-all duration-300 cursor-pointer"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--surface-low)]">
                <div
                  className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${selectedVideo.thumbnail})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20 group-hover:from-black/75 transition-colors"></div>

                {/* Central Play Badge */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-20 h-20 sm:w-22 sm:h-22 bg-white/95 dark:bg-[#141416]/95 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform backdrop-blur-md border border-[#d4af37]/50">
                    <span
                      className="material-symbols-outlined text-[#d4af37] text-4xl sm:text-5xl ml-1"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </div>
                </div>

                {/* Top Badges */}
                <div className="absolute top-5 left-5 right-5 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between z-10">
                  <span className="font-display text-[11px] sm:text-xs uppercase tracking-[0.2em] bg-[#d4af37] text-[#1a1a1a] font-bold px-4 py-1.5 rounded-full shadow-sm">
                    Masterclass Preview
                  </span>
                  <span className="font-display text-xs font-semibold bg-black/75 backdrop-blur-sm text-white px-3 py-1.5 rounded-full border border-white/20">
                    {selectedVideo.duration}
                  </span>
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="max-w-xl">
                    <span className="font-display text-xs uppercase tracking-wider text-[#d4af37] font-bold block mb-1">
                      {selectedVideo.instructor}
                    </span>
                    <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-1">
                      {selectedVideo.title}
                    </h2>
                    <p className="font-serif text-xs sm:text-sm text-white/80 line-clamp-2 leading-relaxed">
                      {selectedVideo.description}
                    </p>
                  </div>
                  <div className="shrink-0 inline-flex items-center gap-2 bg-white text-[#1a1a1a] group-hover:bg-[#d4af37] group-hover:text-white transition-colors font-display text-xs uppercase tracking-widest font-bold px-6 py-3.5 rounded-full shadow-md">
                    <span>Watch Preview</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Selector Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
              {demoVideos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setSelectedVideo(video)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                    selectedVideo.id === video.id
                      ? "bg-[var(--surface-low)] border-[#d4af37] shadow-xs ring-1 ring-[#d4af37]/40"
                      : "bg-[var(--surface-lowest)] border-[var(--surface-border)] hover:border-[#d4af37]/40"
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-xl bg-cover bg-center shrink-0 relative overflow-hidden"
                    style={{ backgroundImage: `url(${video.thumbnail})` }}
                  >
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[18px]">play_arrow</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display text-xs font-bold text-[var(--text-main)] truncate">
                      {video.title}
                    </h4>
                    <span className="font-serif text-[11px] text-[var(--text-muted)] block truncate">
                      {video.instructor} • {video.duration}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Focused Action Area: Book a Session & View Course Outline */}
          <section className="max-w-xl mx-auto text-center pt-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book-session"
                className="w-full sm:w-auto bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] font-display text-xs uppercase tracking-widest font-bold px-8 py-4 rounded-full hover:bg-[#d4af37] hover:text-white transition-all shadow-sm flex items-center justify-center gap-2.5 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span>Book a Session</span>
              </Link>
              <Link
                href="/course-outline"
                className="w-full sm:w-auto bg-[var(--surface-lowest)] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-widest font-bold px-8 py-4 rounded-full transition-all shadow-xs flex items-center justify-center gap-2.5 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px] text-[#d4af37]">menu_book</span>
                <span>View Course Outline</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Video Modal Player */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="bg-[#141416] border border-white/20 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 text-white bg-[#1a1a1e]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#d4af37]">play_circle</span>
                <div>
                  <h4 className="font-display text-sm font-bold">{activeVideo.title}</h4>
                  <span className="font-serif text-xs text-white/60">Instructor: {activeVideo.instructor}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                aria-label="Close video"
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="w-full bg-black">
              <SpeakUpVideoPlayer
                videoId="iCvmsMzlF7o"
                title={activeVideo.title}
                poster={activeVideo.thumbnail}
                autoPlay={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
