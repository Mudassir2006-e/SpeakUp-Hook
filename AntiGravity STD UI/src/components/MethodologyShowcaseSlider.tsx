"use client";

import React, { useState, useEffect } from "react";
import { MethodologyMediaItem, getPublishedMethodologyMediaAction } from "@/app/admin/methodology-actions";
import {
  LmsWorkingVideoSettings,
  getLmsWorkingVideoSettingsAction,
} from "@/app/admin/lms-working-video-actions";
import SpeakUpVideoPlayer from "@/components/SpeakUpVideoPlayer";

interface MethodologyShowcaseSliderProps {
  initialItems?: MethodologyMediaItem[];
}

const DEFAULT_INITIAL_ITEMS: MethodologyMediaItem[] = [
  {
    id: "meth-1",
    url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    title: "Interactive Lecture Classroom",
    caption: "High-definition masterclasses with granular pause control, phonetic guidance, and synchronized study notes.",
    order: 1,
  },
  {
    id: "meth-2",
    url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
    title: "Acoustic Drill & Cadence Lab",
    caption: "Precision verbal cadence drills, oral articulation directives, and self-evaluation pacing benchmarks.",
    order: 2,
  },
  {
    id: "meth-3",
    url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    title: "Executive Boardroom Simulation",
    caption: "Simulated high-pressure rhetoric scenarios and defense seminars to cement natural subconscious fluency.",
    order: 3,
  },
  {
    id: "meth-4",
    url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80",
    title: "Personalized Feedback Matrix",
    caption: "Comprehensive mentor evaluation summaries focusing on voice modulation, syntactic clarity, and rhetoric.",
    order: 4,
  },
];

export default function MethodologyShowcaseSlider({ initialItems }: MethodologyShowcaseSliderProps) {
  const [items, setItems] = useState<MethodologyMediaItem[]>(initialItems || DEFAULT_INITIAL_ITEMS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // LMS Working Video State (Requirement 2)
  const [lmsVideo, setLmsVideo] = useState<LmsWorkingVideoSettings | null>(null);
  const [activeMode, setActiveMode] = useState<"video" | "screenshots">("video");
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (!initialItems || initialItems.length === 0) {
      getPublishedMethodologyMediaAction().then((res) => {
        if (isMounted && res.success && res.data && res.data.length > 0) {
          setItems(res.data);
        }
      });
    }

    // Load LMS Working Video
    const loadVideo = () => {
      getLmsWorkingVideoSettingsAction().then((res) => {
        if (isMounted && res.success && res.data) {
          setLmsVideo(res.data);
          // If video is active and available, default to video; otherwise screenshots
          if (res.data.isActive && (res.data.videoUrl || res.data.embedUrl)) {
            setActiveMode("video");
          } else {
            setActiveMode("screenshots");
          }
        }
      });
    };

    loadVideo();

    const handleVideoUpdated = (e: Event) => {
      const custom = e as CustomEvent<LmsWorkingVideoSettings>;
      if (custom.detail) {
        setLmsVideo(custom.detail);
        if (custom.detail.isActive && (custom.detail.videoUrl || custom.detail.embedUrl)) {
          setActiveMode("video");
        }
      } else {
        loadVideo();
      }
    };

    window.addEventListener("speakup-lms-working-video-updated", handleVideoUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("speakup-lms-working-video-updated", handleVideoUpdated);
    };
  }, [initialItems]);

  const hasVideo = Boolean(lmsVideo && lmsVideo.isActive && (lmsVideo.videoUrl || lmsVideo.embedUrl));
  const hasScreenshots = Boolean(items && items.length > 0);

  if (!hasVideo && !hasScreenshots) {
    return null;
  }

  const currentItem = items[currentIndex] || items[0];
  const hasMultiple = items.length > 1;

  const handleNext = () => {
    if (isTransitioning || !hasMultiple) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setTimeout(() => setIsTransitioning(false), 260);
  };

  const handlePrev = () => {
    if (isTransitioning || !hasMultiple) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setTimeout(() => setIsTransitioning(false), 260);
  };

  return (
    <div className="w-full my-8">
      {/* Outer Showcase Container */}
      <div className="relative rounded-3xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] shadow-md overflow-hidden transition-all duration-300">
        {/* Subtle Decorative Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#d4af37]/5 dark:bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none -mt-20" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[var(--surface-high)]/40 rounded-full blur-3xl pointer-events-none -mb-20" />

        {/* Top Bar: Title & Mode Toggle / Slide Counter */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-[var(--surface-border)]/70 flex items-center justify-between gap-4 relative z-10 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#d4af37]/15 text-[#d4af37] flex items-center justify-center shrink-0 border border-[#d4af37]/30">
              <span className="material-symbols-outlined text-[20px]">laptop_mac</span>
            </span>
            <div className="min-w-0">
              <span className="font-display text-[10px] sm:text-[11px] uppercase tracking-widest text-[#8a6d1b] dark:text-[#d4af37] font-bold block">
                {activeMode === "video" && lmsVideo ? lmsVideo.badgeText || "LMS Platform Walkthrough" : "LMS Platform Walkthrough"}
              </span>
              <h4 className="font-display text-base sm:text-lg font-bold text-[var(--text-main)] truncate">
                {activeMode === "video" && lmsVideo ? lmsVideo.title || "Interactive Student LMS Interface" : currentItem?.title || "Interactive Student LMS Interface"}
              </h4>
            </div>
          </div>

          {/* Right Controls: Mode Switcher & Slide Counters */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap">
            {/* View Mode Toggle Pill (Video Walkthrough vs Interactive Screenshots) */}
            {hasVideo && hasScreenshots && (
              <div className="inline-flex items-center bg-[var(--surface-low)] p-1 rounded-2xl border border-[var(--surface-border)] shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode("video");
                  }}
                  className={`px-3 py-1.5 rounded-xl font-display text-[11px] sm:text-xs uppercase tracking-wider font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeMode === "video"
                      ? "bg-[#d4af37] text-[#141416] shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                  aria-label="View LMS video walkthrough"
                >
                  <span className="material-symbols-outlined text-[16px]">play_circle</span>
                  <span>Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMode("screenshots");
                    setIsVideoPlaying(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-display text-[11px] sm:text-xs uppercase tracking-wider font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeMode === "screenshots"
                      ? "bg-[#d4af37] text-[#141416] shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                  aria-label="View LMS interactive screenshots"
                >
                  <span className="material-symbols-outlined text-[16px]">view_carousel</span>
                  <span>Screenshots</span>
                </button>
              </div>
            )}

            {/* Slide Navigation Controls (Only when in Screenshots mode) */}
            {activeMode === "screenshots" && hasMultiple && (
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="font-mono text-xs text-[var(--text-muted)] bg-[var(--surface-low)] px-3 py-1 rounded-full border border-[var(--surface-border)] font-semibold">
                  <span className="text-[var(--text-main)] font-bold">{currentIndex + 1}</span>
                  <span className="mx-1 text-[var(--text-muted)]">/</span>
                  <span>{items.length}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-3 py-1.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] hover:bg-[var(--surface)] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 shadow-2xs"
                    aria-label="Previous methodology screenshot"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-3.5 py-1.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 shadow-2xs"
                    aria-label="Next methodology screenshot"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Presentation Canvas */}
        <div className="p-4 sm:p-6 lg:p-8 bg-black/5 dark:bg-black/30 flex items-center justify-center relative min-h-[260px] sm:min-h-[420px] lg:min-h-[500px]">
          {/* OPTION A: LMS WORKING VIDEO (Requirement 2) */}
          {activeMode === "video" && lmsVideo ? (
            <div
              className={`w-full max-w-5xl mx-auto rounded-2xl overflow-hidden border border-[var(--surface-border)] shadow-xl bg-black relative ${
                lmsVideo.aspectRatio === "9:16"
                  ? "aspect-[9/16] max-w-[360px]"
                  : lmsVideo.aspectRatio === "1:1"
                  ? "aspect-square max-w-[480px]"
                  : lmsVideo.aspectRatio === "4:3"
                  ? "aspect-[4/3] max-w-[560px]"
                  : "aspect-video"
              }`}
            >
              {!isVideoPlaying ? (
                /* Interactive Video Poster with Golden Play Badge */
                <div
                  onClick={() => setIsVideoPlaying(true)}
                  className="relative w-full h-full cursor-pointer group flex items-center justify-center overflow-hidden"
                >
                  <img
                    src={
                      lmsVideo.thumbnailUrl ||
                      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
                    }
                    alt={lmsVideo.title || "LMS Working Video"}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/30" />

                  {/* Golden Play Button Badge */}
                  <div className="relative z-10 w-20 h-20 rounded-full bg-white/95 dark:bg-[#141416]/95 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl group-hover:scale-110 group-hover:border-[#d4af37] transition-all duration-300">
                    <span
                      className="material-symbols-outlined text-[#d4af37] text-[40px] ml-1"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </div>

                  {/* Bottom Duration & Title Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 z-10 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <span className="material-symbols-outlined text-[16px]">timer</span>
                      </div>
                      <span className="font-mono text-xs font-semibold tracking-wider">
                        {lmsVideo.durationText || "LMS Video Tour"}
                      </span>
                    </div>

                    <span className="font-display text-xs uppercase tracking-widest text-[#d4af37] font-bold bg-black/60 px-3 py-1 rounded-full border border-[#d4af37]/30">
                      Click to Play
                    </span>
                  </div>
                </div>
              ) : (
                /* Active Video Player */
                <div className="w-full h-full bg-black flex items-center justify-center">
                  {lmsVideo.sourceType === "local" ? (
                    <video
                      src={lmsVideo.videoUrl}
                      poster={lmsVideo.thumbnailUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : lmsVideo.sourceType === "youtube" ? (
                    <SpeakUpVideoPlayer
                      videoUrl={lmsVideo.embedUrl}
                      title={lmsVideo.title || "How SpeakUp LMS Works"}
                      poster={lmsVideo.thumbnailUrl}
                      autoPlay={true}
                    />
                  ) : (
                    <iframe
                      src={lmsVideo.embedUrl}
                      title={lmsVideo.title || "How SpeakUp LMS Works"}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            /* OPTION B: METHODOLOGY SCREENSHOT SLIDER CANVAS */
            <div
              className={`w-full max-w-5xl mx-auto rounded-2xl overflow-hidden border border-[var(--surface-border)] shadow-xl transition-opacity duration-260 bg-[var(--surface-lowest)] ${
                isTransitioning ? "opacity-60 scale-[0.995]" : "opacity-100 scale-100"
              }`}
            >
              <img
                src={currentItem?.url}
                alt={currentItem?.title || `Methodology Showcase ${currentIndex + 1}`}
                className="w-full h-auto max-h-[620px] mx-auto block"
                style={{
                  objectFit: currentItem?.fitMode || "contain",
                  objectPosition: currentItem?.objectPosition || "center",
                }}
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* Bottom Caption & Pagination Dots */}
        <div className="px-6 sm:px-8 py-4 bg-[var(--surface-lowest)] border-t border-[var(--surface-border)]/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left relative z-10">
          <p className="font-serif text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed flex-1 max-w-3xl">
            {activeMode === "video" && lmsVideo
              ? lmsVideo.subtitle || "Discover the intuitive learning portal, synchronized lecture notes, and automated oral cadence tools."
              : currentItem?.caption || "Discover the bespoke methodology designed for high-stakes executive fluency."}
          </p>

          {/* Dots Indicator (Only when in Screenshots mode) */}
          {activeMode === "screenshots" && hasMultiple && (
            <div className="flex items-center gap-1.5 shrink-0">
              {items.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => setCurrentIndex(dotIdx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    dotIdx === currentIndex
                      ? "w-6 bg-[#d4af37]"
                      : "w-2 bg-[var(--surface-border)] hover:bg-[#d4af37]/50"
                  }`}
                  aria-label={`Jump to screenshot ${dotIdx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
