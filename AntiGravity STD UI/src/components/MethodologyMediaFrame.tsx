"use client";

import React, { useState, useEffect } from "react";
import { MethodologyMediaItem, getPublishedMethodologyMediaAction } from "@/app/admin/methodology-actions";

export default function MethodologyMediaFrame() {
  const [items, setItems] = useState<MethodologyMediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getPublishedMethodologyMediaAction().then((res) => {
      if (isMounted) {
        setLoading(false);
        if (res.success && res.data && res.data.length > 0) {
          setItems(res.data);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fallback default image if none published yet
  const fallbackItem: MethodologyMediaItem = {
    id: "default-meth",
    url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
    title: "Executive Atmosphere",
    caption: "High-engagement seminar room simulation where real-world articulation habits are forged.",
    order: 1,
  };

  const activeItems = items.length > 0 ? items : [fallbackItem];
  const currentItem = activeItems[currentIndex] || activeItems[0];
  const hasMultiple = activeItems.length > 1;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeItems.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeItems.length) % activeItems.length);
  };

  return (
    <div className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-[var(--surface-border)] bg-[var(--surface-low)] group ${loading ? "animate-pulse" : ""}`}>
      {/* Background Showcase Image */}
      <img
        src={currentItem.url}
        alt={currentItem.title || "Methodology Media"}
        className="w-full h-full transition-transform duration-700 group-hover:scale-105"
        style={{
          objectFit: currentItem.fitMode || "cover",
          objectPosition: currentItem.objectPosition || "center",
        }}
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

      {/* Slide Navigation Arrows (when multiple items exist) */}
      {hasMultiple && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-[#d4af37] text-white hover:text-[#141416] flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs border border-white/20 active:scale-95"
            aria-label="Previous slide"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="font-mono text-[11px] font-bold text-white bg-black/60 px-2.5 py-1 rounded-full border border-white/20">
            {currentIndex + 1}/{activeItems.length}
          </span>
          <button
            type="button"
            onClick={handleNext}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-[#d4af37] text-white hover:text-[#141416] flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs border border-white/20 active:scale-95"
            aria-label="Next slide"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      )}

      {/* Bottom Info Overlay */}
      <div className="absolute bottom-5 left-5 right-5 text-white z-10">
        <span className="font-display text-[11px] uppercase tracking-widest bg-[#d4af37] text-[#1a1a1a] px-3 py-1 rounded-full font-bold inline-block mb-1.5 shadow-xs">
          LMS
        </span>
        {currentItem.caption && !/screenshot|upload\s*\d|id[:_]/i.test(currentItem.caption) && (
          <p className="font-serif text-xs sm:text-sm opacity-90 line-clamp-2 leading-relaxed">
            {currentItem.caption}
          </p>
        )}

        {/* Slide Indicator Dots */}
        {hasMultiple && (
          <div className="flex items-center gap-1.5 mt-2.5">
            {activeItems.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex ? "w-5 bg-[#d4af37]" : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
