"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  getCentralFaqsAction,
  saveCentralFaqAction,
  deleteCentralFaqAction,
  CentralFaqItem,
} from "@/app/admin/faq-actions";

const CATEGORIES = [
  "All Categories",
  "General",
  "Registration",
  "LMS",
  "Certificate",
  "Learning Path",
  "Pricing",
  "Courses",
  "Payment",
];

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState<CentralFaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<CentralFaqItem | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("General");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [saving, setSaving] = useState(false);

  // Deletion state
  const [faqToDelete, setFaqToDelete] = useState<CentralFaqItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadFaqs = async () => {
    setLoading(true);
    try {
      const res = await getCentralFaqsAction();
      if (res.success && Array.isArray(res.data)) {
        setFaqs(res.data);
      }
    } catch (err: any) {
      showNotification("error", "Failed to load FAQs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const handleOpenAddModal = () => {
    setEditingFaq(null);
    setQuestion("");
    setAnswer("");
    setCategory(selectedCategory !== "All Categories" ? selectedCategory : "General");
    setStatus("published");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (faq: CentralFaqItem) => {
    setEditingFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategory(faq.category);
    setStatus(faq.status);
    setIsModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      showNotification("error", "Question cannot be empty.");
      return;
    }
    if (!answer.trim()) {
      showNotification("error", "Answer cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveCentralFaqAction({
        id: editingFaq?.id,
        question: question.trim(),
        answer: answer.trim(),
        category,
        status,
      });

      if (res.success) {
        showNotification(
          "success",
          editingFaq ? "FAQ updated successfully!" : "New FAQ created and published!"
        );
        setIsModalOpen(false);
        await loadFaqs();
      } else {
        showNotification("error", res.error || "Failed to save FAQ.");
      }
    } catch (err: any) {
      showNotification("error", err?.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!faqToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteCentralFaqAction(faqToDelete.id);
      if (res.success) {
        showNotification("success", "FAQ deleted successfully.");
        setFaqToDelete(null);
        await loadFaqs();
      } else {
        showNotification("error", res.error || "Failed to delete FAQ.");
      }
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to delete FAQ.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory =
      selectedCategory === "All Categories" ||
      faq.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pb-16 bg-[#fdfbf7] dark:bg-[var(--bg-main)]">
      <AdminHeader
        title="FAQs Management"
        subtitle="Single Source of Truth for Institutional Knowledge & Answers"
      />

      <div className="p-6 sm:p-8 max-w-[1360px] mx-auto space-y-6">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`p-4 rounded-xl font-display text-xs font-bold uppercase tracking-wider flex items-center justify-between shadow-md animate-in fade-in duration-200 ${
              notification.type === "success"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                : "bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400"
            }`}
          >
            <span>{notification.message}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-xs uppercase font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action Header Banner */}
        <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
              <span className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                Knowledge Directory
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-main)]">
              Frequently Asked Questions
            </h1>
            <p className="font-serif text-xs text-[var(--text-muted)]">
              Manage centralized question-and-answer pairs. Content published here automatically informs the website and student portal.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>+ Add FAQ</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--text-muted)]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQs by question or answer..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-xs font-serif text-[var(--text-main)] focus:outline-none focus:border-[#d4af37] transition-colors"
              />
            </div>

            <span className="font-mono text-xs text-[var(--text-muted)]">
              {filteredFaqs.length} of {faqs.length} FAQs
            </span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--surface-border)]/50">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-display text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#d4af37] text-[#141416] shadow-2xs"
                      : "border border-[var(--surface-border)] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#d4af37]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQs List */}
        {loading ? (
          <div className="p-12 text-center text-xs font-serif text-[var(--text-muted)]">
            Loading centralized FAQs...
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] p-12 text-center max-w-lg mx-auto space-y-3">
            <span className="material-symbols-outlined text-4xl text-[var(--text-muted)]">quiz</span>
            <h3 className="font-display text-base font-bold text-[var(--text-main)]">No FAQs Found</h3>
            <p className="font-serif text-xs text-[var(--text-muted)]">
              {searchQuery || selectedCategory !== "All Categories"
                ? "No questions match your current filter criteria."
                : "No FAQs have been created yet. Click '+ Add FAQ' to create the first one."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq) => (
              <div
                key={faq.id}
                className="rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] p-5 sm:p-6 shadow-xs hover:border-[#d4af37]/60 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/30">
                        {faq.category}
                      </span>
                      <span
                        className={`font-display text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${
                          faq.status === "published"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                        }`}
                      >
                        {faq.status === "published" ? "Published" : "Draft"}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                      {faq.question}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(faq)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-[var(--surface-low)] text-[var(--text-main)] font-display text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFaqToDelete(faq)}
                      className="p-1.5 rounded-xl border border-red-500/30 hover:border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-display text-[11px] uppercase tracking-wider font-bold transition-all cursor-pointer"
                      title="Delete FAQ"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>

                <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-line pt-1 border-t border-[var(--surface-border)]/50">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ================= MODAL: ADD / EDIT FAQ ================= */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#16161a] border border-[var(--surface-border)] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#d4af37]/15 text-[#d4af37] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">quiz</span>
                  </div>
                  <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                    {editingFaq ? "Edit FAQ" : "Create New FAQ"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveFaq} className="space-y-4">
                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Category / Context <span className="text-[#d4af37]">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-sm font-serif text-[var(--text-main)] focus:outline-none focus:border-[#d4af37] cursor-pointer"
                  >
                    {CATEGORIES.filter((c) => c !== "All Categories").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Question */}
                <div className="space-y-1.5">
                  <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Question <span className="text-[#d4af37]">*</span>
                  </label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. How do I earn an official SpeakUp Certificate?"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-sm font-serif text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                    required
                  />
                </div>

                {/* Answer */}
                <div className="space-y-1.5">
                  <label className="block font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Answer <span className="text-[#d4af37]">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Provide authoritative guidance..."
                    className="w-full p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-low)] text-sm font-serif text-[var(--text-main)] focus:outline-none focus:border-[#d4af37] leading-relaxed"
                    required
                  />
                </div>

                {/* Status Toggle */}
                <div className="flex items-center gap-3 pt-1">
                  <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Publish Status:
                  </label>
                  <div className="inline-flex rounded-xl border border-[var(--surface-border)] p-1 bg-[var(--surface-low)]">
                    <button
                      type="button"
                      onClick={() => setStatus("published")}
                      className={`px-3 py-1 rounded-lg text-xs font-display uppercase tracking-wider font-bold transition-all ${
                        status === "published"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      Published
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus("draft")}
                      className={`px-3 py-1 rounded-lg text-xs font-display uppercase tracking-wider font-bold transition-all ${
                        status === "draft"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      Draft
                    </button>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingFaq ? "Save Changes" : "Create FAQ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: DELETE FAQ CONFIRMATION ================= */}
        {faqToDelete && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#16161a] border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined text-[28px]">warning</span>
                <h3 className="font-display text-base font-bold">Delete FAQ</h3>
              </div>
              <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                Are you sure you want to permanently delete this FAQ?
                <br />
                <span className="font-bold text-[var(--text-main)] mt-1 block">
                  "{faqToDelete.question}"
                </span>
              </p>
              <div className="flex justify-end gap-3 pt-2 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  onClick={() => setFaqToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-display uppercase font-bold shadow-xs flex items-center gap-1.5"
                >
                  {deleting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
