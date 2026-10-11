"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  HomeVideoSettings,
  HomeVideoSource,
  getHomeVideoSettingsAction,
  saveHomeVideoSettingsAction,
  uploadHomeVideoFileAction,
  uploadHomeVideoThumbnailAction,
  saveFrameThumbnailAction,
  normalizeVideoUrl,
} from "@/app/admin/home-video-actions";

interface HomeVideoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: HomeVideoSettings) => void;
}

export default function HomeVideoEditorModal({
  isOpen,
  onClose,
  onSaved,
}: HomeVideoEditorModalProps) {
  const [settings, setSettings] = useState<HomeVideoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Upload states
  const [videoUploading, setVideoUploading] = useState(false);
  const [thumbUploading, setThumbUploading] = useState(false);
  const [generatingFrames, setGeneratingFrames] = useState(false);

  // File input refs for responsive device native file pickers
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    getHomeVideoSettingsAction().then((res) => {
      if (res.success && res.data) {
        setSettings(res.data);
      } else {
        setError("Failed to load home video settings");
      }
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSourceTypeChange = async (sourceType: HomeVideoSource) => {
    if (!settings) return;
    const norm = await normalizeVideoUrl(settings.videoUrl, sourceType);
    setSettings({
      ...settings,
      sourceType,
      embedUrl: norm.embedUrl,
      aspectRatio: norm.detectedAspect !== "auto" ? norm.detectedAspect : settings.aspectRatio,
    });
  };

  const handleUrlChange = async (url: string) => {
    if (!settings) return;
    const norm = await normalizeVideoUrl(url, settings.sourceType);
    setSettings({
      ...settings,
      videoUrl: url,
      embedUrl: norm.embedUrl,
      aspectRatio: norm.detectedAspect !== "auto" ? norm.detectedAspect : settings.aspectRatio,
      thumbnailUrl: norm.defaultThumb || settings.thumbnailUrl,
    });
  };

  /**
   * Captures 3 candidate frames from a video URL/Blob at 20%, 50%, 80% marks
   */
  const captureFramesFromVideo = async (videoSrc: string): Promise<string[]> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = videoSrc;

      const capturedDataUrls: string[] = [];

      video.onloadedmetadata = async () => {
        const duration = video.duration || 5;
        const timePoints = [
          Math.max(0.5, duration * 0.2),
          Math.max(1.0, duration * 0.5),
          Math.max(1.5, duration * 0.8),
        ];

        for (let i = 0; i < timePoints.length; i++) {
          await new Promise<void>((res) => {
            const handleSeeked = () => {
              video.removeEventListener("seeked", handleSeeked);
              try {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 360;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  capturedDataUrls.push(canvas.toDataURL("image/jpeg", 0.85));
                }
              } catch {
                // Canvas error (CORS, etc.)
              }
              res();
            };
            video.addEventListener("seeked", handleSeeked);
            video.currentTime = timePoints[i];
          });
        }
        resolve(capturedDataUrls);
      };

      video.onerror = () => {
        resolve([]);
      };
    });
  };

  /**
   * Handle video file upload from desktop / tablet / mobile file picker
   */
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    setVideoUploading(true);
    setError(null);

    try {
      // 1. Create a local object URL to generate suggested thumbnail frames immediately
      setGeneratingFrames(true);
      const localBlobUrl = URL.createObjectURL(file);
      const frameDataUrls = await captureFramesFromVideo(localBlobUrl);

      // Save the generated frames to server
      const savedFrameUrls: string[] = [];
      for (let i = 0; i < frameDataUrls.length; i++) {
        const res = await saveFrameThumbnailAction(frameDataUrls[i], i + 1);
        if (res.success && res.url) {
          savedFrameUrls.push(res.url);
        }
      }
      setGeneratingFrames(false);

      // 2. Upload video file to server
      const fd = new FormData();
      fd.append("video", file);
      const uploadRes = await uploadHomeVideoFileAction(fd);

      if (uploadRes.success && uploadRes.url) {
        setSettings({
          ...settings,
          sourceType: "local",
          videoUrl: uploadRes.url,
          embedUrl: uploadRes.url,
          suggestedThumbnails: savedFrameUrls,
          thumbnailUrl: savedFrameUrls[0] || settings.thumbnailUrl,
        });
      } else {
        setError(uploadRes.error || "Failed to upload video");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to process video file");
    } finally {
      setVideoUploading(false);
      setGeneratingFrames(false);
    }
  };

  /**
   * Handle custom thumbnail upload
   */
  const handleThumbFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    setThumbUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("thumbnail", file);
      const res = await uploadHomeVideoThumbnailAction(fd);

      if (res.success && res.url) {
        setSettings({
          ...settings,
          thumbnailUrl: res.url,
        });
      } else {
        setError(res.error || "Failed to upload thumbnail");
      }
    } catch (err: any) {
      setError(err?.message || "Thumbnail upload failed");
    } finally {
      setThumbUploading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await saveHomeVideoSettingsAction(settings);
      if (res.success && res.data) {
        setSuccess(true);
        if (onSaved) onSaved(res.data);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(res.error || "Failed to save settings");
      }
    } catch (err: any) {
      setError(err?.message || "Error saving home video");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#141416] border border-[var(--surface-border)] rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden my-6 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--surface-border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">smart_display</span>
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
                Home Video Management
              </h2>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                Promotional &amp; brand showcase video displayed on the public Home page
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-low)] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-serif flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-serif flex items-center gap-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>Home video settings saved successfully!</span>
            </div>
          )}

          {loading || !settings ? (
            <div className="py-16 text-center space-y-3">
              <span className="material-symbols-outlined text-3xl animate-spin text-[#d4af37]">
                progress_activity
              </span>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                Loading Home Video configuration...
              </p>
            </div>
          ) : (
            <>
              {/* 1. Source Platform Selector */}
              <div className="space-y-2">
                <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#d4af37] text-[16px]">video_settings</span>
                  <span>Video Source Option</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "youtube", label: "YouTube", icon: "smart_display" },
                    { id: "instagram", label: "Instagram", icon: "photo_camera" },
                    { id: "facebook", label: "Facebook", icon: "share" },
                    { id: "vimeo", label: "Vimeo", icon: "movie" },
                    { id: "local", label: "Local Upload", icon: "upload_file" },
                    { id: "external", label: "External URL", icon: "link" },
                  ].map((src) => {
                    const isSelected = settings.sourceType === src.id;
                    return (
                      <button
                        key={src.id}
                        type="button"
                        onClick={() => handleSourceTypeChange(src.id as HomeVideoSource)}
                        className={`p-3 rounded-xl border font-display text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#d4af37] text-[#141416] border-[#d4af37] shadow-xs"
                            : "bg-[#f9f5ed]/50 dark:bg-[var(--surface-low)] text-[var(--text-main)] border-[var(--surface-border)] hover:border-[#d4af37]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{src.icon}</span>
                        <span>{src.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. URL Input or Upload Trigger */}
              {settings.sourceType === "local" ? (
                <div className="space-y-3 p-5 rounded-2xl border-2 border-dashed border-[#d4af37]/40 bg-[#f9f5ed]/40 dark:bg-[var(--surface-low)]/40 text-center">
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/ogg"
                    onChange={handleVideoFileChange}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <span className="material-symbols-outlined text-4xl text-[#d4af37]">
                      cloud_upload
                    </span>
                    <h4 className="font-display text-sm font-bold text-[var(--text-main)]">
                      Upload Local Video
                    </h4>
                    <p className="font-serif text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                      Supports MP4, WebM, and MOV up to 100MB. Responsive file picker works on Desktop, Tablet, and Mobile.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={videoUploading}
                      onClick={() => videoInputRef.current?.click()}
                      className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {videoUploading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[16px]">
                            progress_activity
                          </span>
                          <span>{generatingFrames ? "Generating Frames..." : "Uploading..."}</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">file_upload</span>
                          <span>Choose Video File</span>
                        </>
                      )}
                    </button>
                  </div>

                  {settings.videoUrl && settings.videoUrl.startsWith("/uploads/") && (
                    <div className="pt-2">
                      <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        ✓ Loaded: {settings.videoUrl.split("/").pop()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    {settings.sourceType.toUpperCase()} Video URL
                  </label>
                  <input
                    type="text"
                    value={settings.videoUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder={
                      settings.sourceType === "youtube"
                        ? "https://www.youtube.com/watch?v=... or youtu.be/..."
                        : settings.sourceType === "instagram"
                        ? "https://www.instagram.com/reel/... or /p/..."
                        : settings.sourceType === "facebook"
                        ? "https://www.facebook.com/watch/?v=... or reels/..."
                        : settings.sourceType === "vimeo"
                        ? "https://vimeo.com/..."
                        : "https://example.com/video.mp4"
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-[var(--text-main)] font-mono text-xs focus:outline-hidden focus:border-[#d4af37]"
                  />
                  <span className="font-serif text-[11px] text-[var(--text-muted)] block">
                    Normalized Safe Embed: <code className="text-[#8a6d1b] dark:text-[#d4af37] font-mono break-all">{settings.embedUrl}</code>
                  </span>
                </div>
              )}

              {/* 3. Suggested Frames & Custom Thumbnail (Requirement 8) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#d4af37] text-[16px]">image</span>
                    <span>Video Thumbnail Image</span>
                  </label>
                  <span className="font-serif text-[11px] text-[var(--text-muted)]">
                    Displayed before video playback begins
                  </span>
                </div>

                {/* Suggested Frames from Video (if available) */}
                {settings.suggestedThumbnails && settings.suggestedThumbnails.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-display text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block">
                      Suggested Captured Frames from Video:
                    </span>
                    <div className="grid grid-cols-3 gap-3">
                      {settings.suggestedThumbnails.map((frameUrl, idx) => {
                        const isChosen = settings.thumbnailUrl === frameUrl;
                        return (
                          <div
                            key={idx}
                            onClick={() => setSettings({ ...settings, thumbnailUrl: frameUrl })}
                            className={`relative aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                              isChosen
                                ? "border-[#d4af37] ring-2 ring-[#d4af37]/40 scale-102"
                                : "border-[var(--surface-border)] hover:border-[#d4af37]/60 opacity-80 hover:opacity-100"
                            }`}
                          >
                            <img
                              src={frameUrl}
                              alt={`Suggested Frame ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-1 left-1 bg-black/70 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-white">
                              Frame {idx + 1}
                            </div>
                            {isChosen && (
                              <div className="absolute top-1 right-1 bg-[#d4af37] text-[#141416] w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs">
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active Thumbnail Preview & Custom Upload */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed]/40 dark:bg-[var(--surface-low)]/40">
                  <div className="relative w-36 aspect-video rounded-lg overflow-hidden border border-[var(--surface-border)] bg-black/10 shrink-0">
                    {settings.thumbnailUrl ? (
                      <img
                        src={settings.thumbnailUrl}
                        alt="Active Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                        <span className="material-symbols-outlined">image</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <span className="font-display text-xs font-bold text-[var(--text-main)] block">
                      Custom Thumbnail Override
                    </span>
                    <p className="font-serif text-xs text-[var(--text-muted)]">
                      Upload any branded graphic (JPG, PNG, WebP up to 5MB).
                    </p>

                    <input
                      ref={thumbInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleThumbFileChange}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={thumbUploading}
                        onClick={() => thumbInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#1a1a1e] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {thumbUploading ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-[14px]">
                              progress_activity
                            </span>
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[16px] text-[#d4af37]">
                              upload
                            </span>
                            <span>Upload Image</span>
                          </>
                        )}
                      </button>

                      {settings.thumbnailUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              thumbnailUrl:
                                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
                            })
                          }
                          className="px-3 py-2 rounded-xl text-[var(--text-muted)] hover:text-rose-500 font-display text-xs uppercase tracking-wider cursor-pointer"
                        >
                          Reset Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Aspect Ratio Selection (Requirement 9) */}
              <div className="space-y-2">
                <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#d4af37] text-[16px]">aspect_ratio</span>
                  <span>Responsive Aspect Ratio (Best Fit Container)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "16:9", label: "16:9 Widescreen (YouTube / Landscape)" },
                    { id: "9:16", label: "9:16 Vertical (Reels / TikTok / Shorts)" },
                    { id: "4:3", label: "4:3 Standard" },
                    { id: "1:1", label: "1:1 Square (Instagram Post)" },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, aspectRatio: ratio.id as any })}
                      className={`p-2.5 rounded-xl border font-display text-[11px] uppercase tracking-wider font-bold text-center transition-all cursor-pointer ${
                        settings.aspectRatio === ratio.id
                          ? "bg-[#d4af37] text-[#141416] border-[#d4af37]"
                          : "border-[var(--surface-border)] bg-[#f9f5ed]/30 dark:bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Promotional Text (Requirement 7) */}
              <div className="space-y-3 pt-2">
                <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#d4af37] text-[16px]">campaign</span>
                  <span>Promotional Presentation Texts (Not Methodology / Guided)</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                      Title
                    </span>
                    <input
                      type="text"
                      value={settings.title}
                      onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                      placeholder="e.g. Discover SpeakUp"
                      className="w-full px-3.5 py-2 bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl font-display font-bold text-xs text-[var(--text-main)] focus:outline-hidden focus:border-[#d4af37]"
                    />
                  </div>

                  <div>
                    <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                      Badge Label
                    </span>
                    <input
                      type="text"
                      value={settings.badgeText}
                      onChange={(e) => setSettings({ ...settings, badgeText: e.target.value })}
                      placeholder="e.g. Brand Showcase or What We Offer"
                      className="w-full px-3.5 py-2 bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl font-display font-bold text-xs text-[var(--text-main)] focus:outline-hidden focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div>
                  <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Subtitle / Description
                  </span>
                  <input
                    type="text"
                    value={settings.subtitle}
                    onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                    placeholder="e.g. Explore our premier communication training, executive programs, and student transformation."
                    className="w-full px-3.5 py-2 bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl font-serif text-xs text-[var(--text-main)] focus:outline-hidden focus:border-[#d4af37]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                      Duration / Tagline
                    </span>
                    <input
                      type="text"
                      value={settings.durationText}
                      onChange={(e) => setSettings({ ...settings, durationText: e.target.value })}
                      placeholder="e.g. 2:45 • Overview"
                      className="w-full px-3.5 py-2 bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl font-display text-xs text-[var(--text-main)] focus:outline-hidden focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="flex items-center justify-between sm:justify-start gap-4 pt-5">
                    <span className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      Active on Home Page:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, isActive: !settings.isActive })}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        settings.isActive ? "bg-[#d4af37]" : "bg-[var(--surface-border)]"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          settings.isActive ? "right-1" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--surface-border)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[var(--surface-border)] font-display text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] hover:bg-[var(--surface-low)] cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving || loading || !settings}
            onClick={handleSave}
            className="px-7 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[16px]">
                  progress_activity
                </span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Save Home Video</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
