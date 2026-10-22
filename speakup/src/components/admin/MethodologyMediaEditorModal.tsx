"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MethodologyMediaItem,
  getMethodologyMediaAction,
  saveMethodologyMediaDraftAction,
  publishMethodologyMediaAction,
  revertMethodologyMediaDraftAction,
  uploadMethodologyMediaImageAction,
  deleteMethodologyMediaItemAction,
} from "@/app/admin/methodology-actions";

interface MethodologyMediaEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export default function MethodologyMediaEditorModal({
  isOpen,
  onClose,
  onSuccess,
}: MethodologyMediaEditorModalProps) {
  const [items, setItems] = useState<MethodologyMediaItem[]>([]);
  const [publishedCount, setPublishedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [reverting, setReverting] = useState<boolean>(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Accurate Frame Preview Modal State
  const [previewItem, setPreviewItem] = useState<MethodologyMediaItem | null>(null);

  // Deletion Confirmation Modal State
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Revert Confirmation Modal State
  const [showRevertConfirm, setShowRevertConfirm] = useState<boolean>(false);

  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadIndex, setActiveUploadIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    getMethodologyMediaAction().then((res) => {
      if (!isMounted) return;
      setLoading(false);
      if (res.success && res.data) {
        setItems(res.data.items || []);
        setPublishedCount(res.data.publishedItems?.length || 0);
      } else {
        setNotification({
          type: "error",
          message: res.error || "Failed to load methodology media.",
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Add new image item (repeatable Add Picture with no artificial limit)
  const handleAddNewItem = () => {
    const newItem: MethodologyMediaItem = {
      id: `meth-${Date.now()}`,
      url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      title: `LMS Showcase Picture ${items.length + 1}`,
      caption: "Interactive learning module and live speaking practice showcase.",
      order: items.length + 1,
      fitMode: "cover",
      objectPosition: "center",
    };
    setItems([...items, newItem]);
    showToast("success", `Picture #${items.length + 1} added. Upload a file or adjust settings.`);
  };

  // Trigger file dialog for an item
  const handleTriggerUpload = (index: number) => {
    setActiveUploadIndex(index);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Upload file handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeUploadIndex === null) return;

    const idx = activeUploadIndex;
    setUploadingIndex(idx);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadMethodologyMediaImageAction(formData);
      if (res.success && res.url) {
        const updated = [...items];
        updated[idx] = {
          ...updated[idx],
          url: res.url,
          title: updated[idx].title || res.fileName || `Picture ${idx + 1}`,
        };
        setItems(updated);
        showToast("success", `Picture #${idx + 1} uploaded successfully.`);
      } else {
        showToast("error", res.error || "Failed to upload image.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Error uploading image.");
    } finally {
      setUploadingIndex(null);
      setActiveUploadIndex(null);
    }
  };

  // Update item fields
  const handleUpdateItem = (index: number, field: keyof MethodologyMediaItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Reset positioning & frame fit
  const handleResetFrame = (index: number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      fitMode: "cover",
      objectPosition: "center",
    };
    setItems(updated);
    showToast("success", `Picture #${index + 1} frame settings reset to default.`);
  };

  // Confirm and permanently delete image item
  const handleConfirmDelete = async () => {
    if (deleteConfirmIndex === null) return;
    const index = deleteConfirmIndex;
    const item = items[index];
    if (!item) return;

    setDeleting(true);
    const updated = items.filter((_, i) => i !== index).map((it, i) => ({ ...it, order: i + 1 }));
    setItems(updated);

    try {
      if (item.id) {
        await deleteMethodologyMediaItemAction(item.id);
      }
      showToast("success", `Picture "${item.title || `Picture ${index + 1}`}" deleted permanently.`);
    } catch {
      showToast("error", "Failed to delete media item.");
    } finally {
      setDeleting(false);
      setDeleteConfirmIndex(null);
    }
  };

  // Move item up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setItems(updated.map((it, i) => ({ ...it, order: i + 1 })));
  };

  // Move item down
  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setItems(updated.map((it, i) => ({ ...it, order: i + 1 })));
  };

  // Save draft
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await saveMethodologyMediaDraftAction(items);
      if (res.success) {
        showToast("success", "Methodology media draft saved successfully.");
      } else {
        showToast("error", res.error || "Failed to save draft.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  // Publish
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await publishMethodologyMediaAction(items);
      if (res.success) {
        setPublishedCount(items.length);
        showToast("success", "Methodology showcase published to live website!");
        if (onSuccess) onSuccess("Methodology Media published successfully.");
      } else {
        showToast("error", res.error || "Failed to publish.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to publish.");
    } finally {
      setPublishing(false);
    }
  };

  // Confirm Revert
  const handleConfirmRevert = async () => {
    setReverting(true);
    try {
      const res = await revertMethodologyMediaDraftAction();
      if (res.success && res.data) {
        setItems(res.data);
        setShowRevertConfirm(false);
        showToast("success", "Draft reverted back to the current published version.");
      } else {
        showToast("error", res.error || "Failed to revert draft.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to revert draft.");
    } finally {
      setReverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      {/* Main Modal Box */}
      <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[var(--surface-border)] shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[#d4af37] text-xl">psychology</span>
              <span className="font-display text-[11px] font-bold uppercase tracking-widest text-[#d4af37]">
                Methodology Page — Multi-Picture Gallery &amp; Frame Editor
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-[var(--text-main)] mt-1">
              Methodology Pictures Management
            </h2>
            <p className="font-serif text-xs text-[var(--text-muted)] mt-1 max-w-3xl leading-relaxed">
              Manage showcase images displayed on the public Methodology page. Upload screenshots from your computer or phone, adjust frame fit (Fit vs Fill) and focal centering, reorder sequence, and preview before publishing.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-low)] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl text-xs font-serif flex items-center gap-2 shrink-0 ${
              notification.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {notification.type === "success" ? "check_circle" : "error"}
            </span>
            <span>{notification.message}</span>
          </div>
        )}

        {/* Content Area: Scrollable List of Images */}
        <div className="flex-1 overflow-y-auto custom-scroll space-y-4 pr-1">
          {loading ? (
            <div className="py-16 text-center text-sm font-serif text-[var(--text-muted)]">
              Loading methodology pictures...
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-low)] space-y-3">
              <span className="material-symbols-outlined text-4xl text-[#d4af37]">add_photo_alternate</span>
              <p className="font-serif text-sm text-[var(--text-muted)]">No pictures in showcase yet.</p>
              <button
                type="button"
                onClick={handleAddNewItem}
                className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add First Picture</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => {
                const isUploadingThis = uploadingIndex === idx;
                const fitMode = item.fitMode || "cover";
                const objectPos = item.objectPosition || "center";

                return (
                  <div
                    key={item.id || idx}
                    className="p-4 sm:p-5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] hover:border-[#d4af37]/50 transition-all flex flex-col md:flex-row gap-4 items-start"
                  >
                    {/* Position Badge & Reorder Arrows */}
                    <div className="flex md:flex-col items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Picture Up"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                      </button>
                      <span className="w-7 h-7 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#8a6d1b] dark:text-[#d4af37] font-mono text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === items.length - 1}
                        className="p-1 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Picture Down"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                      </button>
                    </div>

                    {/* Accurate Thumbnail Preview with Live Fit & Position */}
                    <div className="relative w-full md:w-52 aspect-[4/3] rounded-xl overflow-hidden border border-[var(--surface-border)] bg-black/60 shrink-0 group">
                      {item.url ? (
                        <img
                          src={item.url}
                          alt={item.title || `Picture ${idx + 1}`}
                          className="w-full h-full transition-transform duration-300"
                          style={{
                            objectFit: fitMode,
                            objectPosition: objectPos,
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                          <span className="material-symbols-outlined text-[20px]">image</span>
                          <span className="text-[10px] font-serif">No Image</span>
                        </div>
                      )}

                      {/* Badges Overlay */}
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[9px] font-mono font-bold text-[#d4af37]">
                          #{idx + 1}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[9px] font-mono font-semibold text-white uppercase">
                          {fitMode}
                        </span>
                      </div>

                      {/* Clickable Quick Full-Frame Preview Overlay */}
                      {item.url && (
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-display uppercase tracking-wider font-bold transition-opacity cursor-pointer gap-1.5 backdrop-blur-2xs"
                          title="Preview in full public frame"
                        >
                          <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                          <span>Public Preview</span>
                        </button>
                      )}
                    </div>

                    {/* Details & Frame Adjustment Controls */}
                    <div className="flex-1 space-y-3 w-full">
                      {/* Title & URL */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-display uppercase font-bold text-[var(--text-muted)] mb-1">
                            Showcase Title
                          </label>
                          <input
                            type="text"
                            value={item.title || ""}
                            onChange={(e) => handleUpdateItem(idx, "title", e.target.value)}
                            placeholder="e.g. Interactive Speech Lab"
                            className="w-full px-3 py-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden focus:border-[#d4af37]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-display uppercase font-bold text-[var(--text-muted)] mb-1">
                            Image URL / Source
                          </label>
                          <input
                            type="url"
                            value={item.url}
                            onChange={(e) => handleUpdateItem(idx, "url", e.target.value)}
                            placeholder="https://... or /uploads/..."
                            className="w-full px-3 py-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden focus:border-[#d4af37]"
                          />
                        </div>
                      </div>

                      {/* Caption / Description */}
                      <div>
                        <label className="block text-[10px] font-display uppercase font-bold text-[var(--text-muted)] mb-1">
                          Caption / Subtitle Description
                        </label>
                        <input
                          type="text"
                          value={item.caption || ""}
                          onChange={(e) => handleUpdateItem(idx, "caption", e.target.value)}
                          placeholder="Brief description of what this methodology picture showcases..."
                          className="w-full px-3 py-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-xs focus:outline-hidden focus:border-[#d4af37]"
                        />
                      </div>

                      {/* Frame Adjustment Controls: Fit to Frame vs Fill Frame, Centering & Positioning */}
                      <div className="pt-2 border-t border-[var(--surface-border)]/60 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-display uppercase font-bold text-[#8a6d1b] dark:text-[#d4af37] mr-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">aspect_ratio</span>
                          <span>Frame Fit:</span>
                        </span>

                        {/* Fit to Frame (contain) */}
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, "fitMode", "contain")}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-display uppercase font-bold transition-all cursor-pointer ${
                            fitMode === "contain"
                              ? "bg-[#d4af37] text-[#141416] shadow-2xs"
                              : "bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          }`}
                          title="Fit whole image inside frame without cropping"
                        >
                          Fit to Frame
                        </button>

                        {/* Fill Frame (cover) */}
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, "fitMode", "cover")}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-display uppercase font-bold transition-all cursor-pointer ${
                            fitMode === "cover"
                              ? "bg-[#d4af37] text-[#141416] shadow-2xs"
                              : "bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          }`}
                          title="Fill entire display frame"
                        >
                          Fill Frame
                        </button>

                        {/* Position Adjustment */}
                        <span className="text-[10px] font-display uppercase font-bold text-[var(--text-muted)] ml-2 mr-1">
                          Position:
                        </span>

                        {/* Center */}
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, "objectPosition", "center")}
                          className={`px-2 py-1 rounded-md text-[10px] font-display uppercase font-semibold transition-all cursor-pointer ${
                            objectPos === "center"
                              ? "bg-[#d4af37]/30 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/50"
                              : "bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          }`}
                          title="Center alignment"
                        >
                          Center
                        </button>

                        {/* Top */}
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, "objectPosition", "top")}
                          className={`px-2 py-1 rounded-md text-[10px] font-display uppercase font-semibold transition-all cursor-pointer ${
                            objectPos === "top"
                              ? "bg-[#d4af37]/30 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/50"
                              : "bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          }`}
                          title="Align to top"
                        >
                          Top
                        </button>

                        {/* Bottom */}
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, "objectPosition", "bottom")}
                          className={`px-2 py-1 rounded-md text-[10px] font-display uppercase font-semibold transition-all cursor-pointer ${
                            objectPos === "bottom"
                              ? "bg-[#d4af37]/30 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/50"
                              : "bg-[var(--surface-lowest)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          }`}
                          title="Align to bottom"
                        >
                          Bottom
                        </button>

                        {/* Reset */}
                        <button
                          type="button"
                          onClick={() => handleResetFrame(idx)}
                          className="px-2 py-1 rounded-md border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] text-[10px] font-display uppercase font-medium ml-auto cursor-pointer"
                          title="Reset frame fit and position to defaults"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Per-Item Action Buttons */}
                    <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto justify-end">
                      {/* Replace / Upload Picture */}
                      <button
                        type="button"
                        onClick={() => handleTriggerUpload(idx)}
                        disabled={isUploadingThis}
                        className="flex-1 md:flex-none px-3.5 py-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-lowest)] text-[var(--text-main)] font-display text-[11px] uppercase tracking-wider font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        title="Upload a new picture to replace this one"
                      >
                        <span className="material-symbols-outlined text-[15px] text-[#d4af37]">upload</span>
                        <span>{isUploadingThis ? "Uploading..." : "Replace"}</span>
                      </button>

                      {/* Public Frame Preview */}
                      {item.url && (
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="flex-1 md:flex-none px-3.5 py-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-lowest)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-display text-[11px] uppercase tracking-wider font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          title="Preview in public frame"
                        >
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                          <span>Preview</span>
                        </button>
                      )}

                      {/* Delete Picture with Confirmation */}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmIndex(idx)}
                        className="px-3 py-1.5 rounded-lg border border-red-500/25 hover:border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-display text-[11px] uppercase font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="Delete this picture permanently"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Repeatable "Add Picture" Button */}
          <button
            type="button"
            onClick={handleAddNewItem}
            className="w-full py-4 rounded-xl border border-dashed border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer bg-[var(--surface-lowest)] shadow-2xs hover:bg-[#d4af37]/5"
          >
            <span className="material-symbols-outlined text-[20px] text-[#d4af37]">add_photo_alternate</span>
            <span>Add Picture (Current Total: {items.length})</span>
          </button>
        </div>

        {/* Footer Actions: Save Draft, Publish, Revert, Cancel */}
        <div className="pt-4 border-t border-[var(--surface-border)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-serif text-[var(--text-muted)]">
            <span>Showcase Total: <strong>{items.length}</strong> pictures</span>
            <span>•</span>
            <span>Published: <strong>{publishedCount}</strong> pictures</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Revert Action */}
            <button
              type="button"
              onClick={() => setShowRevertConfirm(true)}
              disabled={saving || publishing || reverting}
              className="px-4 py-2 rounded-xl border border-amber-500/30 hover:border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              title="Discard draft and return to current published version"
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              <span>Revert</span>
            </button>

            {/* Save Draft */}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || publishing || reverting}
              className="px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-[#d4af37]">save</span>
              <span>{saving ? "Saving Draft..." : "Save Draft"}</span>
            </button>

            {/* Publish */}
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving || publishing || reverting}
              className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-extrabold transition-all shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">publish</span>
              <span>{publishing ? "Publishing..." : "Publish to Methodology"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmIndex !== null && items[deleteConfirmIndex] && (
        <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-lowest)] border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-500">
              <span className="material-symbols-outlined text-[32px]">warning</span>
              <div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                  Delete Picture #{deleteConfirmIndex + 1}?
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  Permanent removal confirmation
                </p>
              </div>
            </div>

            <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to permanently delete <strong>{items[deleteConfirmIndex].title || `Picture #${deleteConfirmIndex + 1}`}</strong>? This picture and its associated metadata will be permanently removed upon confirmation.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setDeleteConfirmIndex(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting ? "Deleting..." : "Confirm Permanent Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert Confirmation Modal */}
      {showRevertConfirm && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-500">
              <span className="material-symbols-outlined text-[28px]">history</span>
              <div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                  Revert draft changes?
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  Safe draft rollback confirmation
                </p>
              </div>
            </div>

            <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
              Your unpublished draft changes will be discarded and the pictures will return to the current published version.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setShowRevertConfirm(false)}
                disabled={reverting}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevert}
                disabled={reverting}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {reverting ? "Reverting..." : "Revert"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accurate Public Frame Preview Modal (Matches public Methodology Frame) */}
      {previewItem && (
        <div
          className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="max-w-2xl w-full relative flex flex-col items-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                  Public Frame Simulation (4:3 Aspect Ratio)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 uppercase">
                  {previewItem.fitMode || "cover"} • {previewItem.objectPosition || "center"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-display text-xs uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>Close</span>
              </button>
            </div>

            {/* Simulated Public Frame with Same Dimensions, Ratio & Overlay */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-[var(--surface-border)] bg-[var(--surface-low)]">
              <img
                src={previewItem.url}
                alt={previewItem.title || "Methodology Preview"}
                className="w-full h-full"
                style={{
                  objectFit: previewItem.fitMode || "cover",
                  objectPosition: previewItem.objectPosition || "center",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

              <div className="absolute bottom-5 left-5 right-5 text-white z-10 pointer-events-none">
                <span className="font-display text-[11px] uppercase tracking-widest bg-[#d4af37] text-[#1a1a1a] px-3 py-1 rounded-full font-bold inline-block mb-1.5 shadow-xs">
                  LMS
                </span>
                <h4 className="font-display text-sm font-bold text-white mb-0.5">
                  {previewItem.title || "Interactive Lecture Classroom"}
                </h4>
                {previewItem.caption && (
                  <p className="font-serif text-xs opacity-90 line-clamp-2 leading-relaxed">
                    {previewItem.caption}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
