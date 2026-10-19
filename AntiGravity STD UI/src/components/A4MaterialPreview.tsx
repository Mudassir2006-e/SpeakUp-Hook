"use client";

import React, { useState } from "react";

export interface LearningMaterialItem {
  id: string;
  url: string;
  name: string;
  type: "image" | "pdf" | "video" | "document" | "url";
  size?: number;
}

interface A4MaterialPreviewProps {
  materials?: LearningMaterialItem[];
  fallbackUrl?: string;
  fallbackName?: string;
  title?: string;
  className?: string;
  watermarkText?: string;
}

export default function A4MaterialPreview({
  materials = [],
  fallbackUrl,
  fallbackName,
  title = "Learning Material Document",
  className = "",
  watermarkText = "SpeakUp Certified Study Material",
}: A4MaterialPreviewProps) {
  // Normalize items
  const items: LearningMaterialItem[] =
    materials.length > 0
      ? materials
      : fallbackUrl
      ? [
          {
            id: "fb_1",
            url: fallbackUrl,
            name: fallbackName || "Course Lecture Document",
            type: fallbackUrl.toLowerCase().endsWith(".pdf")
              ? "pdf"
              : fallbackUrl.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/)
              ? "video"
              : "image",
          },
        ]
      : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreenModal, setFullscreenModal] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const activeItem = items[Math.min(activeIndex, items.length - 1)];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Multi-item Pagination / Page Selector Tabs */}
      {items.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="font-display text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mr-1">
              Pages / Items:
            </span>
            {items.map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#d4af37] text-[#141416] shadow-2xs"
                      : "bg-white dark:bg-[#18181c] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#d4af37]/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {item.type === "pdf"
                      ? "picture_as_pdf"
                      : item.type === "video"
                      ? "videocam"
                      : "description"}
                  </span>
                  <span>
                    {item.name ? item.name : `Page ${idx + 1}`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--text-muted)]">
            <span>{activeIndex + 1}</span>
            <span>/</span>
            <span>{items.length}</span>
          </div>
        </div>
      )}

      {/* A4 Paper Document Concept Container */}
      <div className="relative mx-auto max-w-[720px] w-full rounded-2xl border-2 border-[#d4af37]/40 dark:border-[#d4af37]/30 bg-white dark:bg-[#15151a] shadow-lg overflow-hidden transition-all duration-200">
        {/* Document Header - Authentic Formal Institutional Header */}
        <div className="px-5 py-3.5 border-b border-[var(--surface-border)] bg-[#faf8f5]/90 dark:bg-[var(--surface-low)]/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                {activeItem.type === "pdf"
                  ? "picture_as_pdf"
                  : activeItem.type === "video"
                  ? "play_circle"
                  : "menu_book"}
              </span>
            </span>
            <div className="min-w-0">
              <h4 className="font-display text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">
                {activeItem.name || title}
              </h4>
              <p className="font-serif text-[10.5px] text-[var(--text-muted)] truncate">
                {title} • {watermarkText}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {activeItem.type === "pdf" && (
              <a
                href={activeItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#d4af37]/15 hover:bg-[#d4af37] text-[#8a6d1b] dark:text-[#d4af37] hover:text-[#141416] border border-[#d4af37]/30 font-display text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                <span>Open PDF</span>
              </a>
            )}

            <a
              href={activeItem.url}
              download={activeItem.name || "speakup-material"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1a1a20] hover:bg-[#faf8f5] text-[var(--text-main)] border border-[var(--surface-border)] hover:border-[#d4af37] font-display text-[11px] uppercase tracking-wider font-semibold transition-all cursor-pointer shadow-2xs"
              title="Download or open original file"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              <span className="hidden sm:inline">Save</span>
            </a>
          </div>
        </div>

        {/* Document Body Stage - Proportioned like standard A4 Sheet */}
        <div className="p-4 sm:p-6 bg-[#fcfbfa] dark:bg-[#121216] min-h-[360px] flex flex-col justify-center items-center">
          {/* IMAGE (Scanned notes, handwritten notes, textbook pages, worksheets) */}
          {activeItem.type === "image" && (
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-h-[750px] overflow-hidden rounded-xl border border-[var(--surface-border)] shadow-xs bg-white dark:bg-[#18181e] flex items-center justify-center relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeItem.url}
                  alt={activeItem.name || "Lecture Learning Material"}
                  className="w-full h-auto max-h-[750px] object-contain select-none"
                  loading="lazy"
                />

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-2xs pointer-events-none">
                  <span className="px-4 py-2 rounded-xl bg-white/95 dark:bg-[#141418]/95 text-[var(--text-main)] font-display text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#d4af37]">zoom_in</span>
                    <span>High-Resolution Document</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PDF DOCUMENT (Textbooks, worksheets, handouts) */}
          {activeItem.type === "pdf" && (
            <div className="w-full space-y-4">
              <div className="w-full h-[520px] rounded-xl border border-[var(--surface-border)] shadow-xs bg-white dark:bg-[#18181e] overflow-hidden relative">
                <iframe
                  src={`${activeItem.url}#toolbar=1&navpanes=0`}
                  title={activeItem.name || "PDF Document"}
                  className="w-full h-full border-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/25 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-[var(--text-main)] font-serif">
                  <span className="material-symbols-outlined text-[#d4af37] text-[18px]">verified</span>
                  <span>Official printable PDF learning document</span>
                </div>
                <a
                  href={activeItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-[#d4af37] text-[#141416] font-display text-[11px] uppercase tracking-wider font-bold transition-all hover:bg-[#b08e2b]"
                >
                  Full Screen View
                </a>
              </div>
            </div>
          )}

          {/* VIDEO CLIP */}
          {activeItem.type === "video" && (
            <div className="w-full aspect-video rounded-xl overflow-hidden border border-[var(--surface-border)] shadow-xs bg-black">
              <video
                src={activeItem.url}
                controls
                className="w-full h-full object-contain"
                preload="metadata"
              >
                Your browser does not support HTML5 video preview.
              </video>
            </div>
          )}

          {/* DOCUMENT / URL */}
          {(activeItem.type === "document" || activeItem.type === "url") && (
            <div className="w-full max-w-md p-6 rounded-2xl border-2 border-dashed border-[#d4af37]/40 bg-white dark:bg-[#18181e] text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#d4af37]/15 text-[#d4af37] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-2xl">attachment</span>
              </div>
              <div className="space-y-1">
                <h5 className="font-display text-sm font-bold text-[var(--text-main)]">
                  {activeItem.name || "Course Attachment"}
                </h5>
                <p className="font-serif text-xs text-[var(--text-muted)] break-all">
                  {activeItem.url}
                </p>
              </div>
              <div className="pt-2">
                <a
                  href={activeItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span>Access Material Link</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Document Footer Bar */}
        <div className="px-5 py-2.5 border-t border-[var(--surface-border)] bg-[#faf8f5]/90 dark:bg-[var(--surface-low)]/80 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]"></span>
            <span>A4 Document Preview</span>
          </span>
          <span>{watermarkText}</span>
        </div>
      </div>
    </div>
  );
}
