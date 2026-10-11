"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MethodologyVideoSettings,
  MethodologyVideoSource,
  getMethodologyVideoSettingsAction,
  saveMethodologyVideoSettingsAction,
  removeMethodologyVideoAction,
  normalizeMethodologyVideoUrl,
} from "@/app/admin/methodology-video-actions";

interface MethodologyVideoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: MethodologyVideoSettings) => void;
}

export default function MethodologyVideoEditorModal({
  isOpen,
  onClose,
  onSaved,
}: MethodologyVideoEditorModalProps) {
  const [settings, setSettings] = useState<MethodologyVideoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState<"embed" | "thumbnail">("embed");

  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    getMethodologyVideoSettingsAction().then((res) => {
      if (res.success && res.data) {
        setSettings(res.data);
      } else {
        setError("Failed to load methodology guided video settings.");
      }
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSourceTypeChange = async (sourceType: MethodologyVideoSource) => {
    if (!settings) return;
    const norm = await normalizeMethodologyVideoUrl(settings.videoUrl, sourceType);
    setSettings({
      ...settings,
      sourceType,
      embedUrl: norm.embedUrl,
      aspectRatio: norm.detectedAspect !== "auto" ? norm.detectedAspect : settings.aspectRatio,
    });
  };

  const handleUrlChange = async (url: string) => {
    if (!settings) return;
    const norm = await normalizeMethodologyVideoUrl(url, settings.sourceType);
    setSettings({
      ...settings,
      videoUrl: url,
      embedUrl: norm.embedUrl,
      aspectRatio: norm.detectedAspect !== "auto" ? norm.detectedAspect : settings.aspectRatio,
      thumbnailUrl: norm.defaultThumb || settings.thumbnailUrl,
    });
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    if (file.size > 100 * 1024 * 1024) {
      setError("Video file exceeds the 100MB limit.");
      return;
    }

    setVideoUploading(true);
    setError(null);

    try {
      const blobUrl = URL.createObjectURL(file);
      setSettings({
        ...settings,
        sourceType: "local",
        videoUrl: blobUrl,
        embedUrl: blobUrl,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load video file.");
    } finally {
      setVideoUploading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await saveMethodologyVideoSettingsAction(settings);
      if (res.success && res.data) {
        setSuccess(true);
        if (onSaved) onSaved(res.data);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(res.error || "Failed to save methodology video settings.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to remove the Methodology Guided Video?")) return;
    setSaving(true);
    try {
      const res = await removeMethodologyVideoAction();
      if (res.success && res.data) {
        setSettings(res.data);
        setSuccess(true);
        if (onSaved) onSaved(res.data);
        setTimeout(() => onClose(), 800);
      }
    } catch {
      setError("Failed to remove video.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 flex items-center justify-center text-[#d4af37] border border-[#d4af37]/30">
              <span className="material-symbols-outlined text-[22px]">play_circle</span>
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
                Methodology Guided LMS Video
              </h2>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                Manage the guided system walkthrough for the Methodology page
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

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-serif flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-serif flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Methodology video successfully saved &amp; published!</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm font-serif text-[var(--text-muted)] flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg animate-spin text-[#d4af37]">progress_activity</span>
            <span>Loading video configuration...</span>
          </div>
        ) : settings ? (
          <div className="space-y-6">
            {/* Source Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                Video Source Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(["youtube", "vimeo", "external", "local"] as MethodologyVideoSource[]).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => handleSourceTypeChange(src)}
                    className={`py-2 px-3 rounded-xl border text-xs font-display uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                      settings.sourceType === src
                        ? "border-[#d4af37] bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37]"
                        : "border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-muted)] hover:border-[#d4af37]/50"
                    }`}
                  >
                    {src === "local" ? "File Upload" : src}
                  </button>
                ))}
              </div>
            </div>

            {/* URL or Upload Input */}
            {settings.sourceType === "local" ? (
              <div className="space-y-2">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Upload Video File (MP4, WebM - Max 100MB)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={handleVideoFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={videoUploading}
                    onClick={() => videoInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)] inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    <span>{videoUploading ? "Loading Video..." : "Choose Video From Device"}</span>
                  </button>
                  {settings.videoUrl && (
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                      Video file selected
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Video URL (YouTube, Vimeo, or Direct Link)
                </label>
                <input
                  type="text"
                  value={settings.videoUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-sm font-mono text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            )}

            {/* Video Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Preview
                </label>
                <div className="flex items-center gap-2 text-xs font-display">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("embed")}
                    className={`px-2.5 py-1 rounded-lg ${
                      previewMode === "embed"
                        ? "bg-[#d4af37] text-black font-bold"
                        : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    Video Player
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("thumbnail")}
                    className={`px-2.5 py-1 rounded-lg ${
                      previewMode === "thumbnail"
                        ? "bg-[#d4af37] text-black font-bold"
                        : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    Thumbnail
                  </button>
                </div>
              </div>

              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-[var(--surface-border)] shadow-md">
                {previewMode === "embed" && settings.embedUrl ? (
                  settings.sourceType === "local" ? (
                    <video src={settings.embedUrl} controls className="w-full h-full object-cover" />
                  ) : (
                    <iframe
                      src={settings.embedUrl}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )
                ) : (
                  <img
                    src={settings.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Content Details: Title, Subtitle, Duration, Thumbnail URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Title
                </label>
                <input
                  type="text"
                  value={settings.title}
                  onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Duration Badge
                </label>
                <input
                  type="text"
                  value={settings.durationText}
                  onChange={(e) => setSettings({ ...settings, durationText: e.target.value })}
                  placeholder="3:20 • Walkthrough"
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)]"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Subtitle / Description
                </label>
                <input
                  type="text"
                  value={settings.subtitle}
                  onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs text-[var(--text-main)]"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Thumbnail Image URL
                </label>
                <input
                  type="text"
                  value={settings.thumbnailUrl}
                  onChange={(e) => setSettings({ ...settings, thumbnailUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-mono text-[var(--text-main)]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-rose-500/30 hover:border-rose-500 text-rose-600 dark:text-rose-400 text-xs font-display uppercase tracking-wider font-bold cursor-pointer"
              >
                Remove Video
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-extrabold shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Save &amp; Publish Video</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
