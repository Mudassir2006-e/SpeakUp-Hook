"use client";

import React, { useEffect, useState, useMemo } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  getAdminBookingsAction,
  updateBookingStatusAction,
  archiveBookingAction,
  AdminBookingRecord,
  BookingStatus,
} from "@/app/admin/booking-actions";

type FilterTab = "all" | BookingStatus;

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await getAdminBookingsAction();
      if (res.success && res.data) {
        setBookings(res.data);
      } else {
        showToast("error", res.error || "Failed to load booking requests.");
      }
    } catch {
      showToast("error", "Unexpected error loading booking requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleStatusChange = async (id: string, newStatus: BookingStatus) => {
    setActionLoadingId(id);
    try {
      const res = await updateBookingStatusAction(id, newStatus);
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: newStatus, updated_at: new Date().toISOString() } : b))
        );
        const labels: Record<BookingStatus, string> = {
          pending: "Marked as pending review.",
          contacted: "Marked as contacted.",
          scheduled: "Session scheduled successfully.",
          completed: "Session marked as completed.",
          cancelled: "Booking marked as cancelled.",
          archived: "Booking archived.",
        };
        showToast("success", labels[newStatus] || "Status updated.");
      } else {
        showToast("error", res.error || "Failed to update status.");
      }
    } catch {
      showToast("error", "Error updating booking status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchive = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await archiveBookingAction(id);
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: "archived", updated_at: new Date().toISOString() } : b))
        );
        showToast("success", "Booking archived.");
      } else {
        showToast("error", res.error || "Failed to archive booking.");
      }
    } catch {
      showToast("error", "Error archiving booking.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const metrics = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const contacted = bookings.filter((b) => b.status === "contacted").length;
    const scheduled = bookings.filter((b) => b.status === "scheduled").length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const archived = bookings.filter((b) => b.status === "archived").length;
    return { total, pending, contacted, scheduled, completed, archived };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeTab !== "all" && b.status !== activeTab) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.full_name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.phone.includes(q) ||
        (b.network && b.network.toLowerCase().includes(q)) ||
        (b.message && b.message.toLowerCase().includes(q))
      );
    });
  }, [bookings, activeTab, searchQuery]);

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-display uppercase tracking-wider font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Pending
          </span>
        );
      case "contacted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-display uppercase tracking-wider font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            Contacted
          </span>
        );
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-display uppercase tracking-wider font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Scheduled
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-display uppercase tracking-wider font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-display uppercase tracking-wider font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
            Cancelled
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-display uppercase tracking-wider font-bold bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  const getCleanWhatsAppUrl = (countryCode: string, phone: string, name: string) => {
    const combined = `${countryCode}${phone}`.replace(/[^0-9]/g, "");
    const greeting = encodeURIComponent(
      `Hello ${name}, this is the SpeakUp Academic Advisory desk regarding your requested advisory consultation.`
    );
    return `https://wa.me/${combined}?text=${greeting}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#faf8f5] dark:bg-[#0c0c0e]">
      <AdminHeader
        title="Advisory Booking Requests"
        subtitle="Review, contact, schedule, and manage student advisory and diagnostic speaking consultations"
      />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between shadow-md transition-all ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-950/40 border-red-500/30 text-red-800 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px]">
                {toast.type === "success" ? "check_circle" : "error"}
              </span>
              <span className="font-serif text-sm font-medium">{toast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 text-inherit opacity-70 hover:opacity-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* ================= 1. METRICS OVERVIEW ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] shadow-2xs space-y-1">
            <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Total
            </span>
            <p className="font-display text-2xl font-extrabold text-[var(--text-main)]">
              {metrics.total}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-950/15 border border-amber-500/25 shadow-2xs space-y-1">
            <span className="font-display text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold">
              Pending
            </span>
            <p className="font-display text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {metrics.pending}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-sky-500/5 dark:bg-sky-950/15 border border-sky-500/25 shadow-2xs space-y-1">
            <span className="font-display text-[11px] uppercase tracking-wider text-sky-700 dark:text-sky-300 font-semibold">
              Contacted
            </span>
            <p className="font-display text-2xl font-extrabold text-sky-600 dark:text-sky-400">
              {metrics.contacted}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/15 border border-emerald-500/25 shadow-2xs space-y-1">
            <span className="font-display text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-semibold">
              Scheduled
            </span>
            <p className="font-display text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {metrics.scheduled}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-950/15 border border-purple-500/25 shadow-2xs space-y-1">
            <span className="font-display text-[11px] uppercase tracking-wider text-purple-700 dark:text-purple-300 font-semibold">
              Completed
            </span>
            <p className="font-display text-2xl font-extrabold text-purple-600 dark:text-purple-400">
              {metrics.completed}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-500/5 dark:bg-zinc-950/15 border border-zinc-500/25 shadow-2xs space-y-1">
            <span className="font-display text-[11px] uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-semibold">
              Archived
            </span>
            <p className="font-display text-2xl font-extrabold text-zinc-600 dark:text-zinc-300">
              {metrics.archived}
            </p>
          </div>
        </div>

        {/* ================= 2. CONTROLS: TABS & SEARCH ================= */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[var(--surface-lowest)] border border-[var(--surface-border)] p-3 sm:p-4 rounded-2xl shadow-2xs">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "contacted", label: "Contacted" },
                { id: "scheduled", label: "Scheduled" },
                { id: "completed", label: "Completed" },
                { id: "archived", label: "Archived" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-low)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--text-muted)]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full pl-9.5 pr-4 py-2 bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl font-serif text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-[#d4af37] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= 3. BOOKINGS LIST ================= */}
        {loading ? (
          <div className="text-center py-20 space-y-3 bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-[#d4af37] animate-spin">
              progress_activity
            </span>
            <p className="font-serif text-sm text-[var(--text-muted)]">
              Loading advisory bookings...
            </p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-20 bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl space-y-3 p-8">
            <span className="material-symbols-outlined text-4xl text-[var(--text-muted)]">
              event_busy
            </span>
            <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
              No advisory bookings found
            </h3>
            <p className="font-serif text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {searchQuery
                ? "No booking requests match your current search criteria."
                : `No booking requests currently under "${activeTab}" status.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((b) => (
              <div
                key={b.id}
                className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl p-5 sm:p-6 shadow-xs hover:border-[#d4af37]/40 transition-all space-y-4"
              >
                {/* Header: Name, Status Badge, Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--surface-border)]/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/30 flex items-center justify-center font-display font-extrabold text-sm shrink-0">
                      {b.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                        <span>{b.full_name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-low)] text-[var(--text-muted)] border border-[var(--surface-border)] text-[10px] uppercase font-display tracking-wider font-semibold">
                          {b.professional_status || "Professional"}
                        </span>
                      </h3>
                      <p className="font-serif text-xs text-[var(--text-muted)]">
                        Received on {new Date(b.created_at).toLocaleDateString()} at{" "}
                        {new Date(b.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(b.status)}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-serif">
                  <div className="space-y-1">
                    <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Email Address
                    </span>
                    <p className="text-[var(--text-main)] font-mono">
                      <a
                        href={`mailto:${b.email}`}
                        className="hover:text-[#d4af37] underline decoration-dotted"
                      >
                        {b.email}
                      </a>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Phone Number
                    </span>
                    <div className="flex items-center gap-2">
                      <p className="text-[var(--text-main)] font-mono">
                        {b.country_code} {b.phone}
                      </p>
                      <a
                        href={getCleanWhatsAppUrl(b.country_code, b.phone, b.full_name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-display uppercase tracking-wider font-bold hover:bg-emerald-500/20"
                      >
                        <span className="material-symbols-outlined text-[13px]">chat</span>
                        WhatsApp
                      </a>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Mobile Network
                    </span>
                    <p className="text-[var(--text-main)] uppercase tracking-wider">
                      {b.network || "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Message / Learning Goals */}
                {b.message && (
                  <div className="p-3.5 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] space-y-1">
                    <span className="font-display text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Applicant Message / Focus Areas
                    </span>
                    <p className="font-serif text-xs text-[var(--text-main)] leading-relaxed italic">
                      &quot;{b.message}&quot;
                    </p>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-serif text-[var(--text-muted)]">
                    <span className="material-symbols-outlined text-[15px]">schedule</span>
                    <span>Last updated: {new Date(b.updated_at).toLocaleString()}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {b.status === "pending" && (
                      <button
                        type="button"
                        disabled={actionLoadingId === b.id}
                        onClick={() => handleStatusChange(b.id, "contacted")}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-700 dark:text-sky-300 font-display text-[11px] uppercase tracking-wider font-bold cursor-pointer transition-all disabled:opacity-50"
                      >
                        Mark Contacted
                      </button>
                    )}

                    {(b.status === "pending" || b.status === "contacted") && (
                      <button
                        type="button"
                        disabled={actionLoadingId === b.id}
                        onClick={() => handleStatusChange(b.id, "scheduled")}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 font-display text-[11px] uppercase tracking-wider font-bold cursor-pointer transition-all disabled:opacity-50"
                      >
                        Schedule Session
                      </button>
                    )}

                    {b.status === "scheduled" && (
                      <button
                        type="button"
                        disabled={actionLoadingId === b.id}
                        onClick={() => handleStatusChange(b.id, "completed")}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-700 dark:text-purple-300 font-display text-[11px] uppercase tracking-wider font-bold cursor-pointer transition-all disabled:opacity-50"
                      >
                        Mark Completed
                      </button>
                    )}

                    {b.status !== "archived" && b.status !== "cancelled" && (
                      <button
                        type="button"
                        disabled={actionLoadingId === b.id}
                        onClick={() => handleStatusChange(b.id, "cancelled")}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-700 dark:text-rose-300 font-display text-[11px] uppercase tracking-wider font-semibold cursor-pointer transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}

                    {b.status !== "archived" ? (
                      <button
                        type="button"
                        disabled={actionLoadingId === b.id}
                        onClick={() => handleArchive(b.id)}
                        className="px-3 py-1.5 rounded-xl border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-low)] font-display text-[11px] uppercase tracking-wider font-semibold cursor-pointer transition-all disabled:opacity-50"
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actionLoadingId === b.id}
                        onClick={() => handleStatusChange(b.id, "pending")}
                        className="px-3 py-1.5 rounded-xl border border-[var(--surface-border)] text-[#d4af37] hover:bg-[var(--surface-low)] font-display text-[11px] uppercase tracking-wider font-semibold cursor-pointer transition-all disabled:opacity-50"
                      >
                        Restore to Pending
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
