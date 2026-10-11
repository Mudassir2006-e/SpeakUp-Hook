"use client";

import React, { useState, useEffect } from "react";
import {
  MethodologyVideoSettings,
  getMethodologyVideoSettingsAction,
} from "@/app/admin/methodology-video-actions";

export default function MethodologyVideoFrame() {
  const [video, setVideo] = useState<MethodologyVideoSettings | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getMethodologyVideoSettingsAction().then((res) => {
      if (isMounted) {
        setLoading(false);
        if (res.success && res.data) {
          setVideo(res.data);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full aspect-video rounded-2xl bg-[var(--surface-low)] border border-[var(--surface-border)] animate-pulse flex items-center justify-center">
        <span className="material-symbols-outlined text-[32px] text-[#d4af37]/40 animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  // Graceful fallback when no video configured or video is deactivated
  if (!video || !video.isActive || !video.embedUrl) {
    return (
      <div className="w-full rounded-2xl bg-[var(--surface-low)] border border-[var(--surface-border)] p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-[24px]">smart_display</span>
        </div>
        <h4 className="font-display text-base font-bold text-[var(--text-main)]">
          Guided Walkthrough Video
        </h4>
        <p className="font-serif text-xs text-[var(--text-muted)] max-w-md mx-auto">
          The guided methodology and LMS enrollment walkthrough video will be available shortly. Contact the academic team for immediate assistance.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header Label */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-1">
          <div>
            <span className="font-display text-xs uppercase tracking-[0.25em] text-[#d4af37] font-bold block mb-1">
              {video.badgeText || "Guided Walkthrough"}
            </span>
            <h3 className="font-display text-2xl font-bold text-[var(--text-main)]">
              {video.title || "How SpeakUp System Works"}
            </h3>
          </div>
          {video.durationText && (
            <span className="self-start sm:self-end px-3 py-1 rounded-full bg-[var(--surface-low)] border border-[var(--surface-border)] text-[11px] font-mono text-[var(--text-muted)]">
              {video.durationText}
            </span>
          )}
        </div>

        {video.subtitle && (
          <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
            {video.subtitle}
          </p>
        )}

        {/* Video Thumbnail & Frame Container */}
        <div
          onClick={() => setModalOpen(true)}
          className="relative w-full aspect-video rounded-2xl overflow-hidden group cursor-pointer bg-black shadow-2xl border border-[var(--surface-border)] hover:border-[#d4af37]/60 transition-all duration-300"
        >
          <img
            src={video.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"}
            alt={video.title || "Methodology Guided Video"}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

          {/* Central Play Button */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-18 h-18 sm:w-20 sm:h-20 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 group-hover:border-[#d4af37] transition-all duration-300">
              <span
                className="material-symbols-outlined text-[#d4af37] text-[36px] sm:text-[40px] ml-1"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
            </div>
          </div>

          {/* Bottom Overlay Info */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-display uppercase tracking-widest font-bold">
                LMS System &amp; Enrollment Guide
              </span>
            </div>
            <span className="text-[11px] font-display uppercase tracking-widest bg-[#d4af37] text-[#1a1a1a] font-bold px-3 py-1 rounded-full">
              Watch Guide
            </span>
          </div>
        </div>
      </div>

      {/* Video Playback Modal */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          >
            <div className="flex items-center justify-between px-5 py-3 bg-[#141416] border-b border-white/10 text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d4af37] text-lg">smart_display</span>
                <span className="font-display text-xs uppercase tracking-wider font-bold">
                  {video.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="relative w-full aspect-video bg-black">
              {video.sourceType === "local" ? (
                <video src={video.embedUrl} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <iframe
                  src={video.embedUrl}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
