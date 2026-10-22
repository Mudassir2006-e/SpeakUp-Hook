"use client";

import React, { useState, useEffect } from "react";
import {
  CentralPrivacyItem,
  getCentralPrivacyAction,
  saveCentralPrivacyAction,
} from "@/app/admin/privacy-actions";

interface PrivacySectionsEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function PrivacySectionsEditorModal({
  isOpen,
  onClose,
  onSaved,
}: PrivacySectionsEditorModalProps) {
  const [sections, setSections] = useState<CentralPrivacyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Deletion Confirmation Modal State
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);

  // Active Edit / Add state (null = none active)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // View Mode: 'edit' or 'preview'
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadPrivacy = async () => {
    setLoading(true);
    try {
      const res = await getCentralPrivacyAction();
      if (res.success && Array.isArray(res.data)) {
        setSections(res.data);
      }
    } catch {
      showToast("error", "Failed to load privacy policy sections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPrivacy();
      setEditingId(null);
      setDeletePendingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Reorder section up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index - 1, 0, moved);
    setSections(reordered.map((item, idx) => ({ ...item, number: idx + 1 })));
  };

  // Reorder section down
  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index + 1, 0, moved);
    setSections(reordered.map((item, idx) => ({ ...item, number: idx + 1 })));
  };

  // Start editing a section
  const startEdit = (item: CentralPrivacyItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditContent(item.content);
  };

  // Start adding a new section
  const startAddNew = () => {
    const tempId = `new-priv-${Date.now()}`;
    const newSection: CentralPrivacyItem = {
      id: tempId,
      number: sections.length + 1,
      title: "",
      content: "",
    };
    setSections([...sections, newSection]);
    setEditingId(tempId);
    setEditTitle("");
    setEditContent("");
  };

  // Save current editing item in local list
  const applyCurrentEdit = () => {
    if (!editTitle.trim()) {
      showToast("error", "Section heading is required.");
      return;
    }
    if (!editContent.trim()) {
      showToast("error", "Section description is required.");
      return;
    }

    setSections((prev) =>
      prev.map((item) =>
        item.id === editingId
          ? { ...item, title: editTitle.trim(), content: editContent.trim() }
          : item
      )
    );
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  };

  // Cancel edit
  const cancelEdit = () => {
    if (editingId && editingId.startsWith("new-priv-")) {
      // Remove unsaved new section
      setSections((prev) => prev.filter((item) => item.id !== editingId));
    }
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  };

  // Confirm deletion
  const confirmDelete = () => {
    if (!deletePendingId) return;
    setSections((prev) => {
      const filtered = prev.filter((item) => item.id !== deletePendingId);
      return filtered.map((item, idx) => ({ ...item, number: idx + 1 }));
    });
    if (editingId === deletePendingId) {
      setEditingId(null);
    }
    setDeletePendingId(null);
    showToast("success", "Section removed. Click 'Save & Publish' to persist.");
  };

  // Save and Publish All
  const handleSaveAndPublish = async () => {
    let currentList = [...sections];
    if (editingId) {
      if (!editTitle.trim() || !editContent.trim()) {
        showToast("error", "Please finish editing the current section or cancel before publishing.");
        return;
      }
      currentList = currentList.map((item) =>
        item.id === editingId
          ? { ...item, title: editTitle.trim(), content: editContent.trim() }
          : item
      );
    }

    if (currentList.length === 0) {
      showToast("error", "At least one privacy policy section must exist.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveCentralPrivacyAction(currentList);
      if (res.success && res.data) {
        setSections(res.data);
        setEditingId(null);
        showToast("success", "Privacy Policy sections saved and published!");
        if (onSaved) onSaved();
      } else {
        showToast("error", res.error || "Failed to save privacy sections.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Error saving privacy sections.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl text-[#d4af37]">policy</span>
            <div>
              <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                Manage Privacy Policy Sections
              </h3>
              <p className="font-serif text-xs text-[var(--text-muted)]">
                Add, reorder, edit, and publish numbered data governance and compliance sections.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`px-3 py-1 rounded-lg text-xs font-display font-semibold transition-all cursor-pointer ${
                  viewMode === "edit"
                    ? "bg-[#d4af37] text-[#141416] font-bold shadow-2xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                Edit Mode
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`px-3 py-1 rounded-lg text-xs font-display font-semibold transition-all cursor-pointer ${
                  viewMode === "preview"
                    ? "bg-[#d4af37] text-[#141416] font-bold shadow-2xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                Preview Policy
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-4">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)]">
              Loading current privacy policy sections...
            </div>
          ) : viewMode === "preview" ? (
            <div className="space-y-6 py-2">
              <div className="p-4 rounded-xl border border-[#d4af37]/35 bg-[#d4af37]/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-display text-[var(--text-main)]">
                  <span className="material-symbols-outlined text-[18px] text-[#d4af37]">visibility</span>
                  <span className="font-bold">Public Website Preview</span>
                  <span className="text-[var(--text-muted)] font-normal">— exactly as rendered on /privacy</span>
                </div>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-display font-bold text-[#8a6d1b] dark:text-[#d4af37] hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Live /privacy Page</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map((sec, idx) => (
                  <div
                    key={sec.id || idx}
                    className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-6 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--text-main)] font-display font-bold text-xs">
                          {String(sec.number || idx + 1).padStart(2, "0")}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[var(--surface-low)] border border-[var(--surface-border)] font-display text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                          Section {sec.number || idx + 1}
                        </span>
                      </div>
                      <h4 className="font-display text-sm font-bold text-[var(--text-main)] mb-2">
                        {sec.title || "Untitled Section"}
                      </h4>
                      <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed whitespace-pre-line">
                        {sec.content || "No description provided."}
                      </p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-[var(--surface-border)]/50 flex items-center gap-1.5 text-[11px] font-display text-[#d4af37] font-semibold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]"></span>
                      <span>Compliance Mandatory</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((sec, index) => {
                const isEditing = editingId === sec.id;

                if (isEditing) {
                  return (
                    <div
                      key={sec.id}
                      className="p-4 rounded-xl border-2 border-[#d4af37] bg-[var(--surface-low)] space-y-3 shadow-xs animate-in fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-display uppercase tracking-wider font-bold text-[#d4af37]">
                          Section {String(index + 1).padStart(2, "0")} (Editing)
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                          Section Heading *
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="e.g. Certification Integrity & Public Registry"
                          className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-xs text-[var(--text-main)] font-serif focus:outline-hidden focus:border-[#d4af37]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                          Section Description / Policy Text *
                        </label>
                        <textarea
                          rows={4}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="Enter complete privacy and compliance statement..."
                          className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-xs text-[var(--text-main)] font-serif focus:outline-hidden focus:border-[#d4af37]"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3.5 py-1.5 rounded-xl border border-[var(--surface-border)] hover:border-[var(--text-muted)] text-xs font-display font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={applyCurrentEdit}
                          className="px-4 py-1.5 rounded-xl bg-[#d4af37] text-[#141416] font-display text-xs uppercase tracking-wider font-bold hover:bg-[#e4c665] cursor-pointer shadow-xs"
                        >
                          Update Section
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={sec.id}
                    className="p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] hover:border-[#d4af37]/50 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xs font-bold text-[#d4af37]">
                          {String(index + 1).padStart(2, "0")}.
                        </span>
                        <h4 className="font-display text-sm font-bold text-[var(--text-main)] truncate">
                          {sec.title || "Untitled Section"}
                        </h4>
                      </div>
                      <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">
                        {sec.content || "No content provided."}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                        className="p-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Section Up"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={index === sections.length - 1}
                        onClick={() => handleMoveDown(index)}
                        className="p-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Section Down"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => startEdit(sec)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] text-xs font-display font-semibold text-[var(--text-main)] cursor-pointer"
                        title="Edit Section"
                      >
                        Edit
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setDeletePendingId(sec.id)}
                        className="p-1.5 rounded-lg border border-rose-500/30 hover:border-rose-500 text-rose-600 dark:text-rose-400 cursor-pointer"
                        title="Delete Section"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Section Button */}
          {!editingId && (
            <button
              type="button"
              onClick={startAddNew}
              className="w-full py-3 rounded-xl border border-dashed border-[#d4af37]/60 hover:border-[#d4af37] bg-[#d4af37]/5 hover:bg-[#d4af37]/10 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Add New Section</span>
            </button>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[var(--surface-border)] flex items-center justify-between gap-3 shrink-0">
          <span className="font-mono text-[11px] text-[var(--text-muted)]">
            {sections.length} numbered section{sections.length !== 1 ? "s" : ""}
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[var(--text-muted)] font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || loading}
              onClick={handleSaveAndPublish}
              className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-extrabold cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">publish</span>
              <span>{saving ? "Publishing..." : "Save & Publish"}</span>
            </button>
          </div>
        </div>

        {/* Confirmation Modal for Section Deletion */}
        {deletePendingId && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[var(--surface-lowest)] border border-rose-500/40 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <span className="material-symbols-outlined text-3xl">warning</span>
                <h4 className="font-display text-base font-bold text-[var(--text-main)]">
                  Delete Privacy Policy Section?
                </h4>
              </div>
              <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                Are you sure you want to remove this section? The remaining sections will automatically be renumbered.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletePendingId(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--surface-border)] text-xs font-display font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-display uppercase tracking-wider font-bold cursor-pointer shadow-xs"
                >
                  Yes, Delete Section
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
