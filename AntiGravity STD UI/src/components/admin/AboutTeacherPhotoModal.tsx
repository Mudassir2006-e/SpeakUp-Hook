"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FounderTeacherPhotoData,
  getFounderTeacherPhotoAction,
  saveFounderTeacherPhotoAction,
  deleteFounderTeacherPhotoAction,
  uploadTeacherAvatarAction,
} from "@/app/admin/teachers-actions";

interface AboutTeacherPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function AboutTeacherPhotoModal({
  isOpen,
  onClose,
  onSaved,
}: AboutTeacherPhotoModalProps) {
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [zoom, setZoom] = useState<number>(1);
  const [posX, setPosX] = useState<number>(0);
  const [posY, setPosY] = useState<number>(0);
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");
  const [position, setPosition] = useState<"center" | "top" | "bottom">("center");

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Upload & Save state
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Deletion prompt state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFrameRef = useRef<HTMLDivElement>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getFounderTeacherPhotoAction();
      if (res.success && res.data) {
        setPhotoUrl(res.data.photoUrl || "");
        setZoom(res.data.zoom || 1);
        setPosX(res.data.posX || 0);
        setPosY(res.data.posY || 0);
        setFitMode(res.data.fitMode || "cover");
        setPosition(res.data.position || "center");
      }
    } catch {
      showToast("error", "Failed to load teacher picture data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showToast("error", "Please select a supported image file (JPEG, PNG, or WebP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast("error", "Image file exceeds maximum allowed size of 8 MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadTeacherAvatarAction(formData);

      if (res.success && res.url) {
        setPhotoUrl(res.url);
        setZoom(1);
        setPosX(0);
        setPosY(0);
        setFitMode("cover");
        setPosition("center");
        showToast("success", "Picture uploaded successfully! Adjust framing and save.");
      } else {
        showToast("error", res.error || "Failed to upload image.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Mouse / Pointer dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!photoUrl) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - posX, y: e.clientY - posY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = Math.max(-50, Math.min(50, e.clientX - dragStart.x));
    const newY = Math.max(-50, Math.min(50, e.clientY - dragStart.y));
    setPosX(Math.round(newX));
    setPosY(Math.round(newY));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset adjustments
  const handleResetAdjustments = () => {
    setZoom(1);
    setPosX(0);
    setPosY(0);
    setFitMode("cover");
    setPosition("center");
    showToast("success", "Adjustments reset to defaults.");
  };

  // Delete picture
  const handleDeletePicture = async () => {
    setSaving(true);
    try {
      const res = await deleteFounderTeacherPhotoAction();
      if (res.success) {
        setPhotoUrl("");
        setZoom(1);
        setPosX(0);
        setPosY(0);
        setFitMode("cover");
        setPosition("center");
        setShowDeleteConfirm(false);
        showToast("success", "Teacher photo removed. Frame restored to clean fallback.");
        if (onSaved) onSaved();
      } else {
        showToast("error", res.error || "Failed to remove photo.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Error deleting photo.");
    } finally {
      setSaving(false);
    }
  };

  // Save changes
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const res = await saveFounderTeacherPhotoAction({
        photoUrl,
        zoom,
        posX,
        posY,
        fitMode,
        position,
      });

      if (res.success) {
        showToast("success", "Teacher profile picture saved and published to About page!");
        if (onSaved) onSaved();
      } else {
        showToast("error", res.error || "Failed to save teacher photo.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Error saving changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl text-[#d4af37]">badge</span>
            <div>
              <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                About Page — Teacher Photo &amp; Framing Editor
              </h3>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                Upload real teacher picture, preview framing, crop/drag position, and zoom.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`p-3 rounded-xl border text-xs font-display font-semibold flex items-center gap-2 animate-in fade-in shrink-0 ${
              toast.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {toast.type === "success" ? "check_circle" : "error"}
            </span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-5">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)]">
              Loading teacher photo settings...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              {/* Interactive Frame Preview on Left */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center space-y-3">
                <span className="text-[11px] font-display uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                  About Page Frame Preview
                </span>

                <div
                  ref={imageFrameRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-[#d4af37]/50 shadow-xl bg-[var(--surface-low)] flex items-center justify-center select-none ${
                    photoUrl ? "cursor-grab active:cursor-grabbing" : ""
                  }`}
                  title={photoUrl ? "Click and drag to position image" : "Upload picture to preview"}
                >
                  {photoUrl ? (
                    <div
                      className="w-full h-full transition-transform"
                      style={{
                        transform: `scale(${zoom}) translate(${posX}px, ${posY}px)`,
                      }}
                    >
                      <img
                        src={photoUrl}
                        alt="Teacher Frame"
                        className="w-full h-full pointer-events-none select-none"
                        style={{
                          objectFit: fitMode,
                          objectPosition: position,
                        }}
                        draggable={false}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center text-[var(--text-muted)] space-y-2">
                      <span className="material-symbols-outlined text-4xl text-[#d4af37]/60">person</span>
                      <span className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                        No Photo Configured
                      </span>
                      <span className="font-serif text-[11px] text-[var(--text-muted)] leading-tight">
                        Displays clean initials fallback. Upload real photo below.
                      </span>
                    </div>
                  )}

                  {/* Gold Overlay Ring */}
                  <div className="absolute inset-0 rounded-full border border-[#d4af37]/40 pointer-events-none" />
                </div>

                {photoUrl && (
                  <span className="text-[10px] font-serif text-[var(--text-muted)] italic">
                    Drag preview inside the circle to adjust framing
                  </span>
                )}
              </div>

              {/* Controls on Right */}
              <div className="sm:col-span-7 space-y-4">
                {/* Upload / Replace Actions */}
                <div className="space-y-2">
                  <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Select Teacher Photo
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#141416] hover:bg-[#e4c665] font-display text-xs uppercase tracking-wider font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      <span>
                        {uploading
                          ? "Uploading..."
                          : photoUrl
                          ? "Replace Picture"
                          : "Select Picture From Computer"}
                      </span>
                    </button>

                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-3 py-2 rounded-xl border border-rose-500/30 hover:border-rose-500 text-rose-600 dark:text-rose-400 font-display text-xs uppercase tracking-wider font-semibold cursor-pointer inline-flex items-center gap-1"
                        title="Delete photo and return to fallback"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Direct URL input fallback */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] font-bold">
                    Or Image URL
                  </label>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://... or /uploads/faculty/..."
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)] font-serif focus:outline-hidden focus:border-[#d4af37]"
                  />
                </div>

                {photoUrl && (
                  <div className="space-y-3 pt-2 border-t border-[var(--surface-border)]/60">
                    {/* Zoom Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                          Zoom: {zoom.toFixed(2)}x
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setZoom((prev) => Math.max(0.8, prev - 0.1))}
                            className="w-6 h-6 rounded-md border border-[var(--surface-border)] flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => setZoom((prev) => Math.min(3, prev + 0.1))}
                            className="w-6 h-6 rounded-md border border-[var(--surface-border)] flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="3"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full accent-[#d4af37] cursor-pointer"
                      />
                    </div>

                    {/* Fit Mode & Centering */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="block font-display uppercase tracking-wider font-bold text-[var(--text-muted)] text-[10px]">
                          Scaling Mode
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setFitMode("cover")}
                            className={`flex-1 py-1 rounded-lg font-display text-[11px] uppercase font-bold cursor-pointer ${
                              fitMode === "cover"
                                ? "bg-[#d4af37] text-[#141416]"
                                : "bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-muted)]"
                            }`}
                          >
                            Fill (Cover)
                          </button>
                          <button
                            type="button"
                            onClick={() => setFitMode("contain")}
                            className={`flex-1 py-1 rounded-lg font-display text-[11px] uppercase font-bold cursor-pointer ${
                              fitMode === "contain"
                                ? "bg-[#d4af37] text-[#141416]"
                                : "bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-muted)]"
                            }`}
                          >
                            Fit (Contain)
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="block font-display uppercase tracking-wider font-bold text-[var(--text-muted)] text-[10px]">
                          Vertical Alignment
                        </span>
                        <div className="flex items-center gap-1">
                          {(["center", "top", "bottom"] as const).map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => setPosition(pos)}
                              className={`flex-1 py-1 rounded-lg font-display text-[10px] uppercase font-bold cursor-pointer ${
                                position === pos
                                  ? "bg-[#d4af37] text-[#141416]"
                                  : "bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-muted)]"
                              }`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Reset Button */}
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={handleResetAdjustments}
                        className="text-[11px] font-display uppercase tracking-wider text-[#d4af37] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">refresh</span>
                        <span>Reset Zoom &amp; Position</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--surface-border)] flex items-center justify-between gap-3 shrink-0">
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {photoUrl ? "Custom picture configured" : "No photo (Fallback active)"}
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer text-[var(--text-muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || loading}
              onClick={handleSaveChanges}
              className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-extrabold cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{saving ? "Saving..." : "Save Picture"}</span>
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[var(--surface-lowest)] border border-rose-500/40 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <span className="material-symbols-outlined text-3xl">warning</span>
                <h4 className="font-display text-base font-bold text-[var(--text-main)]">
                  Delete Teacher Picture?
                </h4>
              </div>
              <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                This will remove the current picture and return the About page portrait frame to its clean fallback empty state.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--surface-border)] text-xs font-display font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeletePicture}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-display uppercase tracking-wider font-bold cursor-pointer shadow-xs"
                >
                  Yes, Remove Picture
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
