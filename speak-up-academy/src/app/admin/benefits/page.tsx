"use client";

import React, { useState, useEffect } from "react";
import AdminTopHeader from "@/components/admin/AdminTopHeader";
import {
  CentralBenefitItem,
  getCentralBenefitsAction,
  saveCentralBenefitAction,
  deleteCentralBenefitAction,
  reorderCentralBenefitsAction,
} from "@/app/admin/benefits-actions";

const POPULAR_ICONS = [
  "verified",
  "video_library",
  "menu_book",
  "live_tv",
  "psychology",
  "groups",
  "school",
  "description",
  "record_voice_over",
  "military_tech",
  "workspace_premium",
  "star",
  "trending_up",
];

export default function AdminBenefitsPage() {
  const [benefits, setBenefits] = useState<CentralBenefitItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBenefit, setEditingBenefit] = useState<CentralBenefitItem | null>(null);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [icon, setIcon] = useState<string>("verified");
  const [saving, setSaving] = useState<boolean>(false);
  const [benefitToDelete, setBenefitToDelete] = useState<CentralBenefitItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadBenefits = async () => {
    setLoading(true);
    try {
      const res = await getCentralBenefitsAction();
      if (res.success && Array.isArray(res.data)) {
        setBenefits(res.data);
      }
    } catch {
      showToast("error", "Failed to load benefits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBenefits();
  }, []);

  const openAddModal = () => {
    setEditingBenefit(null);
    setTitle("");
    setDescription("");
    setIcon("verified");
    setIsModalOpen(true);
  };

  const openEditModal = (b: CentralBenefitItem) => {
    setEditingBenefit(b);
    setTitle(b.title);
    setDescription(b.description);
    setIcon(b.icon || "verified");
    setIsModalOpen(true);
  };

  const handleSaveBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("error", "Benefit title is required.");
      return;
    }
    if (!description.trim()) {
      showToast("error", "Benefit description is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveCentralBenefitAction({
        id: editingBenefit?.id,
        title: title.trim(),
        description: description.trim(),
        icon: icon.trim(),
        order: editingBenefit?.order,
      });

      if (res.success) {
        showToast("success", "Benefit saved & published successfully!");
        setIsModalOpen(false);
        loadBenefits();
      } else {
        showToast("error", res.error || "Failed to save benefit.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Error saving benefit.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBenefit = async () => {
    if (!benefitToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteCentralBenefitAction(benefitToDelete.id);
      if (res.success) {
        showToast("success", "Benefit deleted successfully.");
        setBenefitToDelete(null);
        loadBenefits();
      } else {
        showToast("error", res.error || "Failed to delete benefit.");
      }
    } catch {
      showToast("error", "Error deleting benefit.");
    } finally {
      setDeleting(false);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= benefits.length) return;

    const reordered = [...benefits];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setBenefits(reordered);

    try {
      const res = await reorderCentralBenefitsAction(reordered.map((b) => b.id));
      if (res.success) {
        showToast("success", "Order updated!");
      }
    } catch {
      showToast("error", "Failed to save reorder.");
      loadBenefits();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AdminTopHeader
          title="Institutional Benefits"
          subtitle="Manage the advantages and benefits displayed on the public website and LMS journey"
          actions={
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-extrabold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Add Benefit</span>
            </button>
          }
        />

        <main className="p-6 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
          {toast && (
            <div
              className={`p-4 rounded-xl text-xs font-display font-semibold flex items-center gap-2 ${
                toast.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400"
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {toast.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{toast.message}</span>
            </div>
          )}

          <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#d4af37]">verified</span>
              <h2 className="font-display text-base font-bold text-[var(--text-main)]">
                Configured Benefits
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] font-mono text-xs font-bold">
                {benefits.length}
              </span>
            </div>
            <p className="font-serif text-xs text-[var(--text-muted)]">
              Use arrows to reorder benefits. Changes sync immediately.
            </p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm font-serif text-[var(--text-muted)] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg animate-spin text-[#d4af37]">progress_activity</span>
              <span>Loading benefits...</span>
            </div>
          ) : benefits.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[var(--surface-low)] border border-[var(--surface-border)] space-y-3">
              <span className="material-symbols-outlined text-4xl text-[#d4af37]">verified</span>
              <p className="font-serif text-sm text-[var(--text-muted)]">
                No benefits configured yet. Click &ldquo;Add Benefit&rdquo; above to create one.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {benefits.map((benefit, index) => (
                <div
                  key={benefit.id}
                  className="p-5 rounded-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] hover:border-[#d4af37]/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] bg-[var(--surface-low)] shrink-0">
                      <span className="material-symbols-outlined text-[24px]">
                        {benefit.icon || "verified"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                          #{index + 1}
                        </span>
                        <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                          {benefit.title}
                        </h3>
                      </div>
                      <p className="font-serif text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-2xl">
                        {benefit.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Reorder Buttons */}
                    <div className="flex items-center border border-[var(--surface-border)] rounded-xl overflow-hidden bg-[var(--surface-low)]">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, "up")}
                        className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        disabled={index === benefits.length - 1}
                        onClick={() => handleMove(index, "down")}
                        className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditModal(benefit)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-xs font-display font-semibold cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setBenefitToDelete(benefit)}
                      className="px-3 py-1.5 rounded-xl border border-rose-500/30 hover:border-rose-500 text-rose-600 dark:text-rose-400 text-xs font-display font-semibold cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

      {/* Add / Edit Benefit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
              <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                {editingBenefit ? "Edit Benefit" : "Add Institutional Benefit"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveBenefit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Benefit Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Recorded Classes"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Comprehensive description of this benefit for students..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Icon (Google Material Symbols)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-low)] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] shrink-0">
                    <span className="material-symbols-outlined text-[22px]">{icon}</span>
                  </div>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="icon name"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-mono text-[var(--text-main)]"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {POPULAR_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                        icon === ic
                          ? "border-[#d4af37] bg-[#d4af37]/20 text-[#8a6d1b] dark:text-[#d4af37]"
                          : "border-[var(--surface-border)] text-[var(--text-muted)] hover:border-[#d4af37]/50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{ic}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-extrabold shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save & Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {benefitToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <span className="material-symbols-outlined text-[28px]">delete_forever</span>
              <div>
                <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                  Delete Benefit?
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to permanently delete &ldquo;{benefitToDelete.title}&rdquo;? It will be removed from all public benefit sections.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setBenefitToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBenefit}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
