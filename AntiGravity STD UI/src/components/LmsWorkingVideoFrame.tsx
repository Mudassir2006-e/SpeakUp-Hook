"use client";

import React, { useState, useEffect } from "react";
import {
  LmsWorkingVideoSettings,
  getLmsWorkingVideoSettingsAction,
} from "@/app/admin/lms-working-video-actions";
import SpeakUpVideoPlayer from "@/components/SpeakUpVideoPlayer";

export default function LmsWorkingVideoFrame() {
  const [videoSettings, setVideoSettings] = useState<LmsWorkingVideoSettings | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = () => {
      getLmsWorkingVideoSettingsAction().then((res) => {
        if (isMounted && res.success && res.data) {
          setVideoSettings(res.data);
        }
      });
    };

    fetchSettings();

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<LmsWorkingVideoSettings>;
      if (custom.detail) {
        setVideoSettings(custom.detail);
      } else {
        fetchSettings();
      }
    };

    window.addEventListener("speakup-lms-working-video-updated", handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("speakup-lms-working-video-updated", handleUpdate);
    };
  }, []);

  const defaultThumb = "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80";
  const posterUrl = videoSettings?.thumbnailUrl || defaultThumb;
  const hasVideo = Boolean(videoSettings && videoSettings.isActive && (videoSettings.videoUrl || videoSettings.embedUrl));

  return (
    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden shadow-xl border border-[var(--surface-border)] relative bg-black group">
      {!isPlaying ? (
        <div
          onClick={() => {
            if (hasVideo) setIsPlaying(true);
          }}
          className={`w-full h-full relative ${hasVideo ? "cursor-pointer" : ""}`}
        >
          {/* Thumbnail / Poster */}
          <div
            className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{
              backgroundImage: `url('${posterUrl}')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Central Golden Play Button (when video is configured) */}
          {hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-xl group-hover:scale-110 group-hover:border-[#d4af37] transition-all duration-300">
                <span
                  className="material-symbols-outlined text-[#d4af37] text-[36px] sm:text-[42px] ml-1"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </div>
            </div>
          )}

          {/* Bottom Overlay Info */}
          <div className="absolute bottom-5 left-5 right-5 text-white z-10 flex items-center justify-between">
            <div>
              <span className="font-display text-[11px] uppercase tracking-widest bg-[#d4af37] text-[#1a1a1a] px-3 py-1 rounded-full font-bold inline-block mb-1 shadow-xs">
                {videoSettings?.badgeText || "LMS Platform Walkthrough"}
              </span>
              <p className="font-serif text-xs sm:text-sm opacity-90 line-clamp-1">
                {videoSettings?.title || "Explore How the SpeakUp LMS Works"}
              </p>
            </div>

            {hasVideo && videoSettings?.durationText && (
              <span className="hidden sm:inline-block font-mono text-[11px] bg-black/60 px-2.5 py-1 rounded-full border border-white/20">
                {videoSettings.durationText}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Video Player Frame */
        <div className="w-full h-full bg-black flex items-center justify-center">
          {videoSettings?.sourceType === "local" ? (
            <video
              src={videoSettings.videoUrl}
              poster={posterUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : videoSettings?.sourceType === "youtube" ? (
            <SpeakUpVideoPlayer
              videoUrl={videoSettings.embedUrl}
              title={videoSettings.title || "How LMS Works"}
              poster={posterUrl}
              autoPlay={true}
            />
          ) : (
            <iframe
              src={videoSettings?.embedUrl}
              title={videoSettings?.title || "How LMS Works Video"}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}
        </div>
      )}
    </div>
  );
}
