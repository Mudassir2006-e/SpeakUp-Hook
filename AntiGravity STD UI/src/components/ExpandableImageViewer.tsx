"use client";

import React, { useState, useEffect } from "react";

interface ExpandableImageViewerProps {
  src: string;
  alt?: string;
  caption?: string;
  className?: string;
}

export default function ExpandableImageViewer({
  src,
  alt = "Course Material Document",
  caption,
  className = "",
}: ExpandableImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!src || hasError) {
    return null;
  }

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.min(2.5, prev + 0.25));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.max(0.75, prev - 0.25));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1);
  };

  return (
    <>
      {/* Standard In-Page Document Preview Frame (Preserves Aspect Ratio & Allows Scrolling) */}
      <div
        className={`rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] overflow-hidden shadow-xs space-y-2 p-3 ${className}`}
      >
        <div className="flex items-center justify-between px-1 py-1 text-xs">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-display uppercase tracking-wider text-[11px] font-bold">
            <span className="material-symbols-outlined text-[16px] text-[#d4af37]">photo_library</span>
            <span>{caption || "Document / Visual Resource"}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setZoomLevel(1);
              setIsOpen(true);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] font-display text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer shadow-2xs"
            title="Open document full size"
          >
            <span className="material-symbols-outlined text-[14px]">fullscreen</span>
            <span>View Full Size</span>
          </button>
        </div>

        {/* Scrollable preview box for tall/A4 portrait documents */}
        <div
          onClick={() => {
            setZoomLevel(1);
            setIsOpen(true);
          }}
          className="relative max-h-[460px] overflow-y-auto overflow-x-hidden rounded-xl bg-black/5 dark:bg-black/40 border border-[var(--surface-border)]/60 p-2 sm:p-4 flex items-center justify-center cursor-zoom-in group custom-scroll"
          title="Click to view full size"
        >
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="max-w-full h-auto object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.01]"
            style={{ maxHeight: "420px" }}
          />

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors rounded-xl pointer-events-none flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 backdrop-blur-xs text-white px-3.5 py-1.5 rounded-full font-display text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-lg">
              <span className="material-symbols-outlined text-[15px]">zoom_in</span>
              <span>Click to Enlarge</span>
            </div>
          </div>
        </div>

        <p className="font-serif text-[11px] text-[var(--text-muted)] text-center italic">
          Tip: Click the image or "View Full Size" above to read and inspect this document at high resolution.
        </p>
      </div>

      {/* Full Size Document Modal Viewer */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          {/* Top Control Bar */}
          <div
            className="p-4 border-b border-white/15 bg-black/70 backdrop-blur-md flex items-center justify-between text-white gap-4 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="material-symbols-outlined text-[20px] text-[#d4af37]">menu_book</span>
              <span className="font-display text-sm font-bold truncate">
                {caption || alt || "Full-Resolution Learning Document"}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.75}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer transition-colors"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>

              <span className="font-mono text-xs px-2 select-none">
                {Math.round(zoomLevel * 100)}%
              </span>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2.5}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer transition-colors"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-display text-xs uppercase font-bold cursor-pointer transition-colors hidden sm:inline-flex"
                title="Reset Zoom"
              >
                Reset
              </button>

              <div className="h-6 w-px bg-white/20 mx-1" />

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white cursor-pointer transition-colors"
                title="Close Viewer (Esc)"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Large Scrollable Canvas (Preserves Aspect Ratio, Never Distorts or Crops) */}
          <div
            className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="transition-transform duration-150 flex items-center justify-center max-w-full"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center top" }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={src}
                alt={alt}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/20 select-none bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
