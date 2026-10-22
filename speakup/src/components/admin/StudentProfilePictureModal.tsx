"use client";

import React, { useState, useRef, useEffect } from "react";
import { updateStudentAvatarAdmin } from "@/app/admin/actions";

interface StudentProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  currentImage?: string | null;
  onSaved?: (newUrl: string) => void;
}

export default function StudentProfilePictureModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  currentImage,
  onSaved,
}: StudentProfilePictureModalProps) {
  const [imageSrc, setImageSrc] = useState<string>(currentImage || "");
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewCanvasUrl, setPreviewCanvasUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setImageSrc(currentImage || "");
    setZoom(1);
    setPosX(0);
    setPosY(0);
    setErrorMsg(null);
  }, [currentImage, isOpen]);

  // Update canvas cropped preview in real-time
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 360;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    const imgAspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
    let drawWidth = size * zoom;
    let drawHeight = (size / imgAspect) * zoom;
    if (imgAspect < 1) {
      drawHeight = size * zoom;
      drawWidth = size * imgAspect * zoom;
    }

    const drawX = (size - drawWidth) / 2 + (posX * size) / 100;
    const drawY = (size - drawHeight) / 2 + (posY * size) / 100;

    try {
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      const dataUrl = canvas.toDataURL("image/png");
      setPreviewCanvasUrl(dataUrl);
    } catch {
      setPreviewCanvasUrl(null);
    }
  }, [imageSrc, zoom, posX, posY, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Please select a valid image file (JPG, PNG, WEBP).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("Image file size should not exceed 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setZoom(1);
          setPosX(0);
          setPosY(0);
          setErrorMsg(null);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.6));

  const maxOffset = Math.max(90, 80 * zoom);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - posX, y: e.clientY - posY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = Math.max(Math.min(e.clientX - dragStart.x, maxOffset), -maxOffset);
    const newY = Math.max(Math.min(e.clientY - dragStart.y, maxOffset), -maxOffset);
    setPosX(newX);
    setPosY(newY);
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - posX, y: e.touches[0].clientY - posY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const newX = Math.max(Math.min(e.touches[0].clientX - dragStart.x, maxOffset), -maxOffset);
    const newY = Math.max(Math.min(e.touches[0].clientY - dragStart.y, maxOffset), -maxOffset);
    setPosX(newX);
    setPosY(newY);
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const finalUrl = previewCanvasUrl || imageSrc;
      const res = await updateStudentAvatarAdmin(studentId, finalUrl);
      if (res.success) {
        if (onSaved) onSaved(finalUrl);
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to update student profile picture.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving profile picture.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-student-pic-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#16161c] text-[var(--text-main)] border border-[var(--surface-border)] rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">crop</span>
            </div>
            <div>
              <h3 id="edit-student-pic-title" className="font-display text-base font-bold text-[var(--text-main)]">
                Student Profile Picture Editor
              </h3>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                {studentName} • Zoom, pan, and fit to circular frame
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-border)]/40 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Interactive Workspace */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          {/* Left: Drag / Pan Interactive Box with Circular Overlay */}
          <div className="flex flex-col items-center">
            <span className="font-display text-[11px] uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-bold mb-2">
              Pan &amp; Position Area
            </span>

            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className="w-52 h-52 rounded-2xl bg-black/85 border-2 border-[#d4af37]/60 relative overflow-hidden flex items-center justify-center cursor-move select-none shadow-inner touch-none group"
              title="Click and drag to position picture inside circle"
            >
              {/* Circular Target Overlay Boundary Guide */}
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-[#d4af37] rounded-full m-2 z-10 shadow-2xl" />

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Profile Crop Target"
                crossOrigin="anonymous"
                className="max-w-none transition-transform pointer-events-none"
                style={{
                  transform: `translate(${posX}px, ${posY}px) scale(${zoom})`,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                onLoad={() => {
                  // Trigger canvas update on load
                  setZoom((z) => z);
                }}
              />
            </div>
            <span className="font-serif text-[11px] text-[var(--text-muted)] mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">drag_indicator</span>
              <span>Click &amp; drag inside circular guide to pan</span>
            </span>
          </div>

          {/* Right: Live Circular Avatar Preview & Zoom Controls */}
          <div className="flex flex-col space-y-4">
            {/* Live Circular Output Display */}
            <div className="flex items-center gap-3.5 pb-3 border-b border-[var(--surface-border)]">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#d4af37] p-0.5 bg-white dark:bg-[#141416] shadow-md shrink-0 aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewCanvasUrl || imageSrc}
                  alt="Preview"
                  className="w-full h-full rounded-full object-cover aspect-square block"
                />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="font-display text-xs font-bold text-[var(--text-main)] block">
                  Circular Frame Fit
                </span>
                <span className="font-serif text-[11px] text-[var(--text-muted)] block leading-tight">
                  Auto-fits without stretching or distortion across all portals
                </span>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-display">
                <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                  Zoom Level
                </span>
                <span className="font-mono text-xs text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="w-8 h-8 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141418] text-[var(--text-main)] flex items-center justify-center font-bold text-base cursor-pointer shadow-2xs"
                  title="Zoom Out"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0.6"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-[#d4af37] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="w-8 h-8 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141418] text-[var(--text-main)] flex items-center justify-center font-bold text-base cursor-pointer shadow-2xs"
                  title="Zoom In"
                >
                  +
                </button>
              </div>
            </div>

            {/* Position Reset Button */}
            {(posX !== 0 || posY !== 0 || zoom !== 1) && (
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPosX(0);
                  setPosY(0);
                }}
                className="self-start text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                <span>Reset Framing</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--surface-border)]">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px] text-[#d4af37]">upload</span>
              <span>Upload Picture</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Save Picture</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
