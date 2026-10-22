"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import HomeVideoEditorModal from "@/components/admin/HomeVideoEditorModal";
import Link from "next/link";
import {
  HomeVideoSettings,
  getHomeVideoSettingsAction,
} from "@/app/admin/home-video-actions";

export default function AdminHomeVideoPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [settings, setSettings] = useState<HomeVideoSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHomeVideoSettingsAction().then((res) => {
      if (res.success && res.data) {
        setSettings(res.data);
      }
      setLoading(false);
    });
  }, [modalOpen]);

  return (
    <div className="min-h-screen pb-16 bg-[var(--bg-main)] text-[var(--text-main)]">
      <AdminHeader
        title="Home Video Control"
        subtitle="Manage the promotional showcase video displayed on the public Home page"
      />

      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8 space-y-6">
        {/* Back Link & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--surface-border)]">
          <Link
            href="/admin/edit"
            className="inline-flex items-center gap-2 text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Edit Website</span>
          </Link>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            <span>Open Video Editor</span>
          </button>
        </div>

        {/* Current Video Configuration Card */}
        <div className="rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#141416] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">smart_display</span>
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-[var(--text-main)]">
                  Active Promotional Home Video
                </h2>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  Public promotional showcase on the landing page
                </p>
              </div>
            </div>

            {settings && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-display uppercase tracking-wider font-bold border ${
                  settings.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                }`}
              >
                {settings.isActive ? "Published Live" : "Inactive"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-[var(--text-muted)] font-serif text-xs">
              Loading settings...
            </div>
          ) : settings ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left: Thumbnail & Embed Preview */}
              <div className="space-y-3">
                <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--surface-border)] bg-black/10 group">
                  <img
                    src={settings.thumbnailUrl}
                    alt={settings.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/90 text-[#d4af37] flex items-center justify-center shadow-lg">
                      <span className="material-symbols-outlined text-3xl ml-0.5">play_arrow</span>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[11px] font-mono bg-black/60 px-3 py-1.5 rounded-lg">
                    <span>{settings.durationText}</span>
                    <span className="uppercase font-bold text-[#d4af37]">{settings.sourceType}</span>
                  </div>
                </div>
              </div>

              {/* Right: Details & Metadata */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-display uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37] bg-[#d4af37]/20 px-2.5 py-0.5 rounded-full">
                      {settings.badgeText}
                    </span>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      Aspect: {settings.aspectRatio}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                    {settings.title}
                  </h3>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    {settings.subtitle}
                  </p>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider">
                    Source URL:
                  </span>
                  <div className="p-2.5 rounded-lg bg-[var(--surface-low)] border border-[var(--surface-border)] truncate text-[var(--text-main)]">
                    {settings.videoUrl}
                  </div>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <span className="text-[var(--text-muted)] block text-[10px] uppercase tracking-wider">
                    Safe Embed URL:
                  </span>
                  <div className="p-2.5 rounded-lg bg-[var(--surface-low)] border border-[var(--surface-border)] truncate text-[var(--text-main)]">
                    {settings.embedUrl}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="w-full py-2.5 rounded-xl border border-[#d4af37] bg-[#d4af37]/10 hover:bg-[#d4af37] text-[#8a6d1b] dark:text-[#d4af37] hover:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    <span>Configure Video, Platform &amp; Thumbnails</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <HomeVideoEditorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
