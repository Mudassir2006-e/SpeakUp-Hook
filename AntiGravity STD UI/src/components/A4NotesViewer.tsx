"use client";

import React, { useState, useEffect, useRef } from "react";

interface A4NotesViewerProps {
  pages: string[];
  title?: string;
  watermarkText?: string;
}

export default function A4NotesViewer({
  pages,
  title = "Lecture Notes Document",
  watermarkText,
}: A4NotesViewerProps) {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  // Touch gesture support for mobile/tablet swipe
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Normalize pages array, filtering out empty strings
  const validPages = pages.filter((p) => Boolean(p && p.trim()));
  const totalPages = validPages.length;

  useEffect(() => {
    // Reset to page 0 when pages change
    setCurrentPage(0);
  }, [pages]);

  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [currentPage, validPages]);

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swiped Left -> Next page
      handleNext();
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Previous page
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (totalPages === 0) {
    return null;
  }

  const currentUrl = validPages[currentPage];

  return (
    <div className="space-y-4">
      {/* Header bar: Document Title & Page Count indicator */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#d4af37]">menu_book</span>
          <h4 className="font-display text-sm font-bold tracking-tight text-[var(--text-main)]">
            A4 Study Notes &amp; Course Documents
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[var(--surface-low)] text-[#8a6d1b] dark:text-[#d4af37] border border-[var(--surface-border)]">
              Page {currentPage + 1} / {totalPages}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-low)] hover:bg-[#d4af37]/15 hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            title="Open Fullscreen High-Resolution Viewer"
            aria-label="Fullscreen Notes Viewer"
          >
            <span className="material-symbols-outlined text-[17px]">zoom_in</span>
          </button>
        </div>
      </div>

      {/* Portrait A4 Frame Container (Paper-like aesthetic) */}
      <div className="relative mx-auto w-full max-w-2xl">
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-full aspect-[1/1.414] rounded-2xl bg-[#ffffff] dark:bg-[#18181c] border-2 border-[var(--surface-border)] shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col items-center justify-center group"
        >
          {/* Subtle Paper Texture Top Border Accent */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent pointer-events-none" />

          {/* Loading Skeleton */}
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--surface-low)] text-[var(--text-muted)] animate-pulse">
              <span className="material-symbols-outlined text-4xl text-[#d4af37] animate-spin">
                progress_activity
              </span>
              <span className="font-display text-xs uppercase tracking-wider font-bold">
                Rendering A4 Page {currentPage + 1}...
              </span>
            </div>
          )}

          {/* Error State */}
          {imgError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-[var(--text-muted)] bg-[var(--surface-low)]">
              <span className="material-symbols-outlined text-4xl text-rose-500">error</span>
              <p className="font-display text-sm font-bold text-[var(--text-main)]">
                Unable to display note page
              </p>
              <p className="font-serif text-xs max-w-xs">
                The image resource could not be loaded or is unavailable.
              </p>
            </div>
          )}

          {/* Actual Document Page Image (Strict Object-Contain preserving aspect ratio & legibility) */}
          <img
            src={currentUrl}
            alt={`${title} - Page ${currentPage + 1}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              setImgLoaded(true);
              setImgError(true);
            }}
            className={`w-full h-full object-contain p-2 sm:p-4 select-none transition-opacity duration-200 ${
              imgLoaded && !imgError ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
          />

          {/* Bottom Right Watermark Stamp for Academic Integrity */}
          {watermarkText && (
            <div className="absolute bottom-3 right-3 pointer-events-none select-none text-[9px] font-mono text-zinc-500/50 dark:text-zinc-400/40 bg-white/70 dark:bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
              {watermarkText}
            </div>
          )}

          {/* In-frame Hover Pagination Chevrons (Desktop convenience) */}
          {totalPages > 1 && (
            <>
              {currentPage > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-black/80 hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] shadow-md border border-[var(--surface-border)] items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Previous Page"
                  aria-label="Previous Page"
                >
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
              )}

              {currentPage < totalPages - 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-black/80 hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] shadow-md border border-[var(--surface-border)] items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Next Page"
                  aria-label="Next Page"
                >
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Bottom Navigation Bar (Visible only when multiple pages exist) */}
        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between px-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentPage === 0}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                currentPage === 0
                  ? "opacity-40 cursor-not-allowed bg-[var(--surface-low)] text-[var(--text-muted)] border border-[var(--surface-border)]"
                  : "bg-white dark:bg-[#141418] hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] shadow-xs"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Previous Page</span>
            </button>

            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--text-main)]">
              <span className="text-[#8a6d1b] dark:text-[#d4af37] font-display">Page</span>
              <span className="px-2 py-0.5 rounded-md bg-[var(--surface-low)] border border-[var(--surface-border)]">
                {currentPage + 1}
              </span>
              <span className="text-[var(--text-muted)]">/</span>
              <span>{totalPages}</span>
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentPage === totalPages - 1}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                currentPage === totalPages - 1
                  ? "opacity-40 cursor-not-allowed bg-[var(--surface-low)] text-[var(--text-muted)] border border-[var(--surface-border)]"
                  : "bg-white dark:bg-[#141418] hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] shadow-xs"
              }`}
            >
              <span>Next Page</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen High-Resolution Zoom Lightbox */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Top Controls Bar */}
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#d4af37] text-2xl">description</span>
              <div>
                <h3 className="font-display text-sm font-bold">{title}</h3>
                <p className="font-mono text-xs text-zinc-400">
                  Page {currentPage + 1} of {totalPages}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentPage === 0}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white transition-colors cursor-pointer"
                    title="Previous Page"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={currentPage === totalPages - 1}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white transition-colors cursor-pointer"
                    title="Next Page"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-2 cursor-pointer"
                title="Close Viewer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Body Image Area */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-2">
            <img
              src={currentUrl}
              alt={`${title} - Page ${currentPage + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
