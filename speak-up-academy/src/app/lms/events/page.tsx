"use client";

import React, { useState, useEffect } from "react";
import LmsProfileDropdown from "@/components/LmsProfileDropdown";
import { getCentralEventsAction, LmsEvent } from "@/app/admin/event-actions";
import { getPublishedSocialLinksAction } from "@/app/admin/links-actions";

export default function UpcomingEventsPage() {
  const [events, setEvents] = useState<LmsEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [adminWhatsApp, setAdminWhatsApp] = useState<string>("+92 300 0000000");

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const res = await getCentralEventsAction();
        if (res.success && res.data) {
          setEvents(res.data);
        }
      } catch (e) {
        console.error("Failed to load central events in LMS:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();

    async function loadPhone() {
      try {
        const res = await getPublishedSocialLinksAction();
        if (res.success && res.data?.whatsappNumber) {
          setAdminWhatsApp(res.data.whatsappNumber);
          return;
        }
      } catch {
        // Fallback below
      }
      const savedPhone =
        process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ||
        (typeof window !== "undefined" ? localStorage.getItem("speakup_admin_whatsapp") || "+92 300 0000000" : "+92 300 0000000");
      setAdminWhatsApp(savedPhone);
    }
    loadPhone();
  }, []);

  const handleWhatsAppContact = () => {
    const defaultMessage =
      "Hello SpeakUp Administration, I am a student requesting event details and the relevant Zoom access link for upcoming academic events.";
    const encodedText = encodeURIComponent(defaultMessage);

    const verifiedNumber =
      adminWhatsApp.trim() ||
      (typeof window !== "undefined"
        ? localStorage.getItem("speakup_admin_whatsapp") || ""
        : "");

    if (verifiedNumber.trim()) {
      const cleanNumber = verifiedNumber.replace(/[^0-9]/g, "");
      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedText}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } else {
      window.open(`https://wa.me/?text=${encodedText}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="max-w-[1300px] mx-auto space-y-8 py-4">
      {/* ================= TOP HEADER ================= */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 pt-2 border-b border-[var(--surface-border)]">
        <div className="space-y-1">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
            Upcoming Events
          </h1>
          <p className="font-serif text-base sm:text-lg text-[var(--text-muted)]">
            Curated academic masterclasses, live practical seminars, and speaking defense sessions.
          </p>
        </div>

        {/* Profile Header (matches Enrolled Courses & Learning Player design) */}
        <div className="shrink-0 self-start sm:self-center">
          <LmsProfileDropdown variant="header" />
        </div>
      </section>

      {/* ================= CONTACT ADMINISTRATION ACTION BANNER ================= */}
      <section className="rounded-2xl bg-white dark:bg-[#141418]/60 border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-display text-xs uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
              Live Session Access &amp; Support
            </span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--text-main)]">
            Need Zoom Links or Event Admission?
          </h2>
          <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
            Students can contact the administration on WhatsApp to verify eligibility, receive session schedules, and obtain the relevant Zoom link.
          </p>
        </div>

        {/* WhatsApp Contact Administration Action */}
        <div className="shrink-0 flex items-center">
          <button
            type="button"
            onClick={handleWhatsAppContact}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-95"
            aria-label="Contact Administration on WhatsApp for event details and Zoom links"
          >
            <svg
              className="w-5 h-5 fill-current shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>Contact Administration</span>
          </button>
        </div>
      </section>

      {/* ================= UPCOMING EVENTS CONTENT ================= */}
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2 text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)]">
            <span className="material-symbols-outlined text-[18px] text-[#d4af37]">event</span>
            <span>Upcoming Learning Events</span>
            {events.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#8a6d1b] dark:text-[#d4af37] text-[11px] font-mono font-bold">
                {events.length}
              </span>
            )}
          </div>
        </div>

        {/* If no events are currently available */}
        {events.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#141418]/60 border border-[var(--surface-border)] p-12 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">event_busy</span>
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--text-main)]">
                No Upcoming Events Scheduled
              </h3>
              <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
                There are currently no upcoming learning events scheduled. Please check back later or contact the administration team for the next scheduled session dates.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleWhatsAppContact}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white hover:bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-[#d4af37]">chat</span>
                <span>Inquire With Administration</span>
              </button>
            </div>
          </div>
        ) : (
          /* Student-Focused Event Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl bg-white dark:bg-[#141418]/60 border border-[var(--surface-border)] hover:border-[#d4af37]/60 p-6 sm:p-7 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  {/* Event Title */}
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-main)] leading-snug">
                    {event.title}
                  </h2>

                  {/* Short Event Information */}
                  <p className="font-serif text-sm sm:text-[15px] text-[var(--text-muted)] leading-relaxed">
                    {event.description}
                  </p>

                  {/* Event Day/Date & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="bg-[#f9f5ed] dark:bg-[var(--surface-low)]/80 p-3 rounded-xl border border-[var(--surface-border)] space-y-1">
                      <span className="font-display text-[10px] uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-bold block">
                        Day &amp; Date
                      </span>
                      <p className="font-serif text-xs sm:text-sm text-[var(--text-main)] font-semibold">
                        {event.dayDate || "To Be Announced"}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
