"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  getCentralEventsAction,
  saveCentralEventAction,
  deleteCentralEventAction,
  LmsEvent,
} from "../event-actions";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<LmsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<LmsEvent> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await getCentralEventsAction();
      if (res.success && res.data) {
        setEvents(res.data);
      } else {
        showToast("error", res.error || "Failed to load upcoming events.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to load upcoming events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleOpenAddModal = () => {
    setEditingEvent({
      title: "",
      description: "",
      dayDate: "",
      time: "",
      essentialInfo: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: LmsEvent) => {
    setEditingEvent({ ...event });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editingEvent.title?.trim() || !editingEvent.dayDate?.trim()) {
      showToast("error", "Event Title and Date are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await saveCentralEventAction({
        id: editingEvent.id,
        title: editingEvent.title.trim(),
        description: editingEvent.description?.trim() || "",
        dayDate: editingEvent.dayDate.trim(),
        time: editingEvent.time?.trim() || "",
        essentialInfo: editingEvent.essentialInfo?.trim() || "",
      });

      if (res.success) {
        showToast("success", editingEvent.id ? "Event updated successfully." : "Event created successfully.");
        handleCloseModal();
        await loadEvents();
      } else {
        showToast("error", res.error || "Failed to save event.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this event? This will remove it from both the website and Student LMS.")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await deleteCentralEventAction(id);
      if (res.success) {
        showToast("success", "Event deleted successfully.");
        await loadEvents();
      } else {
        showToast("error", res.error || "Failed to delete event.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to delete event.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#faf8f5] dark:bg-[#0c0c0e]">
      <AdminHeader
        title="Upcoming Events"
        subtitle="Manage centralized academic events visible across the main website and Student LMS"
      />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between shadow-md transition-all ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-950/40 border-red-500/30 text-red-800 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px]">
                {toast.type === "success" ? "check_circle" : "error"}
              </span>
              <span className="font-display text-sm font-semibold">{toast.text}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-current opacity-70 hover:opacity-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Action Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-2xl p-6 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
              <span className="font-display text-xs uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                Single Source of Truth
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)]">
              Academic Calendar &amp; Masterclasses
            </h2>
            <p className="font-serif text-sm text-[var(--text-muted)] max-w-2xl">
              Events created here are immediately synchronized to both the public website and the authenticated Student LMS portal.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#141416] hover:bg-[#222228] dark:bg-[#d4af37] dark:hover:bg-[#e4c665] text-white dark:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Event</span>
          </button>
        </div>

        {/* Events Grid or Empty State */}
        {loading ? (
          <div className="p-12 text-center text-[var(--text-muted)] font-serif text-sm">
            Loading upcoming events...
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-12 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">event_busy</span>
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--text-main)]">
                No Upcoming Events Scheduled
              </h3>
              <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                There are currently no events created. Click &quot;Add Event&quot; above to schedule a live masterclass or seminar for your students.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white hover:bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-[#d4af37]">add</span>
                <span>Create First Event</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] hover:border-[#d4af37]/60 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-5 transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="px-3 py-1 rounded-full bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] font-display text-[10px] uppercase tracking-wider font-bold border border-[#d4af37]/30">
                      Live Academic Event
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(event)}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[#d4af37] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] transition-all cursor-pointer"
                        title="Edit Event"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === event.id}
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer disabled:opacity-50"
                        title="Delete Event"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <h3 className="font-display text-xl font-bold text-[var(--text-main)] leading-snug">
                    {event.title}
                  </h3>

                  <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                    {event.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-[#f9f5ed] dark:bg-[var(--surface-low)]/80 p-3 rounded-xl border border-[var(--surface-border)] space-y-1">
                      <span className="font-display text-[10px] uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-bold block">
                        Day &amp; Date
                      </span>
                      <p className="font-serif text-xs sm:text-sm text-[var(--text-main)] font-semibold">
                        {event.dayDate}
                      </p>
                    </div>

                    <div className="bg-[#f9f5ed] dark:bg-[var(--surface-low)]/80 p-3 rounded-xl border border-[var(--surface-border)] space-y-1">
                      <span className="font-display text-[10px] uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-bold block">
                        Session Time
                      </span>
                      <p className="font-serif text-xs sm:text-sm text-[var(--text-main)] font-semibold">
                        {event.time || "Schedule Pending"}
                      </p>
                    </div>
                  </div>

                  {event.essentialInfo && (
                    <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-900 dark:text-amber-200 text-xs font-serif leading-relaxed">
                      <span className="font-bold font-display uppercase tracking-wider text-[10px] block mb-0.5 text-amber-700 dark:text-amber-400">
                        Instructions / Notes
                      </span>
                      {event.essentialInfo}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal for Add / Edit Event */}
        {isModalOpen && editingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-4">
                <div className="space-y-0.5">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--text-main)]">
                    {editingEvent.id ? "Edit Academic Event" : "Create Upcoming Event"}
                  </h3>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    Updates will immediately sync across main website &amp; LMS
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingEvent.title || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                    placeholder="e.g., Executive Articulation Masterclass"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      Day &amp; Date *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingEvent.dayDate || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, dayDate: e.target.value })}
                      placeholder="e.g., Saturday, 18 October 2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                      Session Time
                    </label>
                    <input
                      type="text"
                      value={editingEvent.time || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                      placeholder="e.g., 06:00 PM – 07:30 PM PKT"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Event Description
                  </label>
                  <textarea
                    rows={3}
                    value={editingEvent.description || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                    placeholder="Brief description of topics covered and seminar format..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Essential Info / Preparation Notes
                  </label>
                  <input
                    type="text"
                    value={editingEvent.essentialInfo || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, essentialInfo: e.target.value })}
                    placeholder="e.g., Prior review of capstone notes required"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-transparent text-sm text-[var(--text-main)] focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#141416] hover:bg-[#222228] dark:bg-[#d4af37] dark:hover:bg-[#e4c665] text-white dark:text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                    <span>{editingEvent.id ? "Save Changes" : "Create Event"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
