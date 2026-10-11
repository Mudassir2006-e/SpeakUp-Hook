"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SpeakUpVideoPlayer from "@/components/SpeakUpVideoPlayer";
import { useCmsContent } from "@/lib/cms/useCmsContent";
import { getCentralEventsAction, LmsEvent } from "@/app/admin/event-actions";
import { getPublishedSocialLinksAction } from "@/app/admin/links-actions";
import {
  getHomeVideoSettingsAction,
  HomeVideoSettings,
} from "@/app/admin/home-video-actions";


export default function HomePage() {
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [liveEvent, setLiveEvent] = useState<LmsEvent | null>(null);
  const [whatsAppNumber, setWhatsAppNumber] = useState("+92 300 0000000");
  const [homeVideo, setHomeVideo] = useState<HomeVideoSettings>({
    sourceType: "youtube",
    videoUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o",
    embedUrl: "https://www.youtube-nocookie.com/embed/iCvmsMzlF7o?autoplay=1&rel=0&modestbranding=1",
    title: "Discover SpeakUp",
    subtitle: "Explore our premier communication training, executive programs, and student transformation.",
    badgeText: "Brand Showcase",
    durationText: "2:45 • Overview",
    thumbnailUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
    suggestedThumbnails: [],
    aspectRatio: "16:9",
    isActive: true,
    updatedAt: "",
  });
  const cms = useCmsContent("home");

  useEffect(() => {
    async function loadHomeVideo() {
      try {
        const res = await getHomeVideoSettingsAction();
        if (res.success && res.data) {
          setHomeVideo(res.data);
        }
      } catch (err) {
        console.error("Failed to load home video settings:", err);
      }
    }
    loadHomeVideo();

    const handleVideoUpdate = () => {
      loadHomeVideo();
    };
    window.addEventListener("speakup-home-video-updated", handleVideoUpdate);

    async function fetchLiveEvent() {
      try {
        const res = await getCentralEventsAction();
        if (res.success && res.data && res.data.length > 0) {
          setLiveEvent(res.data[0]);
        } else {
          setLiveEvent(null);
        }
      } catch (err) {
        setLiveEvent(null);
      }
    }
    fetchLiveEvent();

    async function fetchWhatsApp() {
      try {
        const res = await getPublishedSocialLinksAction();
        if (res.success && res.data?.whatsappNumber) {
          setWhatsAppNumber(res.data.whatsappNumber);
        }
      } catch {
        // Fallback silently
      }
    }
    fetchWhatsApp();

    return () => {
      window.removeEventListener("speakup-home-video-updated", handleVideoUpdate);
    };
  }, []);

  const cleanPhone = whatsAppNumber.replace(/[^0-9]/g, "");
  const whatsAppSeatUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hello SpeakUp Administration, I would like to reserve my seat for the upcoming masterclass session.")}`
    : "https://wa.me";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)]">
      <Navbar />

      <main className="flex-1">
        {/* ================= HERO SECTION ================= */}
        <section className="relative overflow-hidden border-b border-[var(--surface-border)] pt-12 pb-8 lg:pt-16 lg:pb-10">
          <div className="hero-glow"></div>

          <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 flex flex-col items-start">
              {/* Badge */}
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-full mb-6 backdrop-blur-sm shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.7)]"></span>
                <span className="font-display text-[12px] uppercase tracking-[0.2em] font-semibold text-[var(--text-main)]">
                  {cms.hero?.badgeText || "Cohort 2026 Admission Open"}
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-main)] mb-6 leading-[1.08] max-w-xl">
                {cms.hero?.heading ? (
                  cms.hero.heading
                ) : (
                  <>
                    Master the Art of <br />
                    <span className="text-[#d4af37] italic font-serif font-light">Communication</span>
                  </>
                )}
              </h1>

              {/* Body Subtitle */}
              <p className="font-serif text-lg md:text-xl text-[var(--text-muted)] mb-8 max-w-lg leading-relaxed">
                {cms.hero?.bodyText || cms.hero?.subheading || "Elevate your executive presence through bespoke linguistic training designed for the world’s most discerning professionals."}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 items-center mb-8 w-full sm:w-auto">
                <Link
                  href={cms.hero?.primaryButtonLink || "/courses"}
                  className="bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] font-display text-[13px] px-8 py-4 hover:bg-[#d4af37] dark:hover:bg-[#e9c349] hover:text-white transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_25px_rgba(212,175,55,0.3)] hover:-translate-y-0.5 active:scale-95 uppercase tracking-widest font-bold rounded-full cursor-pointer"
                >
                  {cms.hero?.primaryButtonText || "Learn More"}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>

                <Link
                  href={cms.hero?.secondaryButtonLink || "/demo"}
                  className="bg-transparent border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-[13px] px-7 py-4 transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-95 uppercase tracking-widest hover:bg-[#d4af37]/5 rounded-full cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#d4af37]">play_circle</span>
                  {cms.hero?.secondaryButtonText || "Free Demo"}
                </Link>
              </div>

              {/* Advisory Session Card */}
              <div className="w-full p-6 bg-[var(--surface-lowest)]/90 backdrop-blur-md border border-[var(--surface-border)] shadow-sm relative overflow-hidden group hover:border-[#d4af37]/50 transition-colors duration-300 rounded-2xl">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#d4af37] to-[#d4af37]/20"></div>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#d4af37]/15 flex items-center justify-center text-[#d4af37] shrink-0 border border-[#d4af37]/20">
                    <span className="material-symbols-outlined text-[22px]">calendar_today</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-serif text-[15px] text-[var(--text-main)] leading-relaxed mb-3">
                      {cms.hero?.advisoryHeading || "For personalized guidance on your leadership journey, book a private session with our academic team to discuss your goals and explore our methodology."}
                    </p>
                    <Link
                      href={cms.hero?.advisoryButtonLink || "/book-session"}
                      className="inline-flex items-center gap-2 text-[#d4af37] font-display text-[12px] uppercase tracking-[0.2em] font-bold hover:gap-3 transition-all cursor-pointer"
                    >
                      <span>{cms.hero?.advisoryButtonText || "Book Your Session"}</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Video / Promotional Brand Showcase Preview Column */}
            <div className="lg:col-span-6 relative flex flex-col justify-center">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h3 className="font-display text-sm sm:text-base uppercase tracking-wider text-[#d4af37] mb-1 font-bold">
                    {homeVideo.title || "Discover SpeakUp"}
                  </h3>
                  <p className="font-serif text-[var(--text-muted)] text-[15px]">
                    {homeVideo.subtitle || "Explore our premier communication training, executive programs, and student transformation."}
                  </p>
                </div>
                <div className="hidden sm:block h-px flex-1 mx-6 bg-[var(--surface-border)] mb-2"></div>
              </div>

              {/* Video Thumbnail Card with Best Fit Aspect Ratio */}
              <div
                onClick={() => setVideoModalOpen(true)}
                className={`relative w-full rounded-2xl overflow-hidden group cursor-pointer bg-[var(--surface-low)] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] border border-[var(--surface-border)] hover:border-[#d4af37]/60 transition-all duration-300 ${
                  homeVideo.aspectRatio === "9:16"
                    ? "aspect-[9/16] max-w-[340px] mx-auto"
                    : homeVideo.aspectRatio === "1:1"
                    ? "aspect-square max-w-[440px] mx-auto"
                    : homeVideo.aspectRatio === "4:3"
                    ? "aspect-[4/3] max-w-[520px] mx-auto"
                    : "aspect-[16/10]"
                }`}
              >
                {/* Visual Background Simulation with chosen Thumbnail */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundImage: `url('${homeVideo.thumbnailUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80"}')`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20"></div>

                {/* Central Play Badge */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-20 h-20 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-lg group-hover:scale-110 group-hover:border-[#d4af37] transition-all duration-300">
                    <span
                      className="material-symbols-outlined text-[#d4af37] text-[40px] ml-1"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_arrow
                    </span>
                  </div>
                </div>

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10 flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                      <span className="material-symbols-outlined text-[16px]">timer</span>
                    </div>
                    <span className="text-[12px] font-display uppercase tracking-widest font-bold">
                      {homeVideo.durationText || "2:45 • Overview"}
                    </span>
                  </div>
                  <span className="text-[11px] font-display uppercase tracking-widest bg-[#d4af37] text-[#1a1a1a] font-bold px-3 py-1 rounded-full">
                    Watch Video
                  </span>
                </div>
              </div>
            </div>

            {/* Important Note Banner across bottom */}
            <div className="lg:col-span-12 mt-6 pt-8 border-t border-[var(--surface-border)]">
              <div className="flex flex-col md:flex-row items-center gap-6 bg-[var(--surface-lowest)]/80 p-6 rounded-2xl border border-[var(--surface-border)] backdrop-blur-sm max-w-4xl mx-auto shadow-xs">
                <div className="shrink-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#d4af37]/15 flex items-center justify-center text-[#d4af37] border border-[#d4af37]/30">
                    <span className="material-symbols-outlined text-[20px]">info</span>
                  </div>
                  <h5 className="font-display text-[12px] uppercase tracking-[0.2em] text-[var(--text-main)] font-bold whitespace-nowrap">
                    Important Note
                  </h5>
                </div>
                <div className="h-6 w-px bg-[var(--surface-border)] hidden md:block"></div>
                <p className="font-serif text-[14px] text-[var(--text-muted)] leading-relaxed text-center md:text-left flex-1">
                  Need more information? Most common questions are already answered throughout our website. If you have a specific question or need clarification about courses, enrollment, pricing, or sessions, please contact our administration team.
                </p>
                <a
                  href="https://wa.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-2 bg-[var(--surface-low)] hover:bg-[#d4af37] text-[var(--text-main)] hover:text-white border border-[var(--surface-border)] hover:border-[#d4af37] px-5 py-2.5 rounded-full font-display text-[11px] uppercase tracking-wider font-bold transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  <span>Contact Desk</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ================= STANDARD OF EXCELLENCE BENTO GRID ================= */}
        <section className="py-20 lg:py-24 bg-[var(--surface-low)]/50 border-b border-[var(--surface-border)] relative">
          <div className="max-w-[1200px] mx-auto px-6 md:px-12">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
              <div className="max-w-2xl">
                <span className="font-display text-[12px] uppercase tracking-[0.3em] text-[#d4af37] mb-3 block font-bold">
                  The Heritage of Mastery
                </span>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-main)] tracking-tight leading-[1.1]">
                  The Standard of <br />
                  <span className="italic font-serif font-light text-[#d4af37]">Excellence</span>
                </h2>
              </div>
              <p className="font-serif text-[var(--text-muted)] max-w-md text-[15px] leading-relaxed border-l-2 border-[#d4af37]/50 pl-5 py-2">
                Accelerate your future through a methodology refined for the world&apos;s most discerning leaders. Building confidence, clarity, and commanding rhetoric.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
              {/* Left Column: 3 Pillars */}
              <div className="lg:col-span-7 space-y-8">
                {/* Pillar 1 */}
                <div className="group flex gap-5 items-start p-6 rounded-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] shadow-xs hover:border-[#d4af37]/40 transition-all duration-300">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-xl border border-[var(--surface-border)] flex items-center justify-center text-[var(--text-muted)] bg-[var(--surface-low)] transition-all duration-300 group-hover:bg-[#d4af37] group-hover:text-white group-hover:border-[#d4af37]">
                      <span className="material-symbols-outlined text-[28px]">psychology</span>
                    </div>
                    <span className="absolute -top-2.5 -right-2.5 text-[11px] font-bold font-display text-[#d4af37] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-full px-2 py-0.5">
                      01
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl font-bold text-[var(--text-main)] mb-2 tracking-tight">
                      Cognitive Precision
                    </h3>
                    <p className="font-serif text-[var(--text-muted)] text-[15px] leading-relaxed">
                      Train your mind to organize complex thoughts with the clarity required for high-stakes decision making. Master the intentional silence before the speech.
                    </p>
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="group flex gap-5 items-start p-6 rounded-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] shadow-xs hover:border-[#d4af37]/40 transition-all duration-300">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-xl border border-[var(--surface-border)] flex items-center justify-center text-[var(--text-muted)] bg-[var(--surface-low)] transition-all duration-300 group-hover:bg-[#d4af37] group-hover:text-white group-hover:border-[#d4af37]">
                      <span className="material-symbols-outlined text-[28px]">record_voice_over</span>
                    </div>
                    <span className="absolute -top-2.5 -right-2.5 text-[11px] font-bold font-display text-[#d4af37] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-full px-2 py-0.5">
                      02
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl font-bold text-[var(--text-main)] mb-2 tracking-tight">
                      Articulate Influence
                    </h3>
                    <p className="font-serif text-[var(--text-muted)] text-[15px] leading-relaxed">
                      Transform raw intention into persuasive, natural expression. We focus on the nuances of tone, cadence, and presence that define global executive authority.
                    </p>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="group flex gap-5 items-start p-6 rounded-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] shadow-xs hover:border-[#d4af37]/40 transition-all duration-300">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-xl border border-[var(--surface-border)] flex items-center justify-center text-[var(--text-muted)] bg-[var(--surface-low)] transition-all duration-300 group-hover:bg-[#d4af37] group-hover:text-white group-hover:border-[#d4af37]">
                      <span className="material-symbols-outlined text-[28px]">trending_up</span>
                    </div>
                    <span className="absolute -top-2.5 -right-2.5 text-[11px] font-bold font-display text-[#d4af37] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-full px-2 py-0.5">
                      03
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl font-bold text-[var(--text-main)] mb-2 tracking-tight">
                      Iterative Evolution
                    </h3>
                    <p className="font-serif text-[var(--text-muted)] text-[15px] leading-relaxed">
                      Refine your skills through a continuous feedback loop. Build sustainable speaking habits that separate the merely proficient from the exceptional.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Session Card */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
                <div className="bg-[var(--surface-lowest)] border border-[var(--surface-border)] p-8 rounded-2xl shadow-sm hover:border-[#d4af37]/40 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-bl-[100px] pointer-events-none"></div>

                  {liveEvent ? (
                    <>
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <div className="w-12 h-12 bg-[var(--surface-low)] rounded-xl flex items-center justify-center text-[var(--text-main)] border border-[var(--surface-border)]">
                            <span className="material-symbols-outlined text-[24px]">videocam</span>
                          </div>
                          <span className="text-[11px] font-display uppercase tracking-[0.2em] text-[#d4af37] border border-[#d4af37]/40 px-3 py-1 rounded-full font-bold">
                            Live Masterclass
                          </span>
                        </div>

                        <h4 className="font-display text-2xl font-bold text-[var(--text-main)] leading-tight mb-3">
                          {liveEvent.title}
                        </h4>
                        <p className="font-serif text-[var(--text-muted)] text-[15px] leading-relaxed mb-6">
                          {liveEvent.description || "A deep dive into the linguistic structures of executive reporting, board presentations, and formal negotiations."}
                        </p>
                      </div>

                      <div className="pt-6 border-t border-[var(--surface-border)]">
                        <div className="flex items-center gap-2.5 mb-6">
                          <span className="material-symbols-outlined text-[#d4af37] text-[20px]">calendar_month</span>
                          <span className="text-[12px] text-[var(--text-main)] font-display uppercase tracking-widest font-bold">
                            {`${liveEvent.dayDate}${liveEvent.time ? ` • ${liveEvent.time}` : ""}`}
                          </span>
                        </div>

                        <a
                          href={whatsAppSeatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] font-display text-[12px] uppercase tracking-widest flex items-center justify-center gap-2.5 hover:bg-[#d4af37] dark:hover:bg-[#e9c349] transition-all duration-300 font-bold py-4 rounded-full shadow-sm group"
                        >
                          <span className="material-symbols-outlined text-[18px] transition-transform group-hover:scale-110">
                            event_seat
                          </span>
                          <span>Reserve Your Seat via WhatsApp</span>
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
                      <div className="w-12 h-12 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--text-muted)]">
                        <span className="material-symbols-outlined text-[24px]">event_busy</span>
                      </div>
                      <h4 className="font-display text-lg font-bold text-[var(--text-main)]">
                        No Live Masterclasses Scheduled
                      </h4>
                      <p className="font-serif text-xs text-[var(--text-muted)] max-w-xs leading-relaxed">
                        Upcoming cohort dates and live masterclasses will appear here once announced by academic administration.
                      </p>
                      <Link
                        href="/book-session"
                        className="mt-3 px-4 py-2 rounded-full border border-[var(--surface-border)] hover:border-[#d4af37] font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors inline-flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#d4af37]">calendar_today</span>
                        <span>Book an Individual Session</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>



            {/* Academic Direction & Session Booking */}
            <div className="mt-12 sm:mt-14 rounded-3xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] p-8 sm:p-10 lg:p-12 relative overflow-hidden shadow-xs">
              {/* Subtle architectural ambient aura */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#d4af37]/5 dark:bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--surface-high)]/40 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left Column: Narrative */}
                <div className="lg:col-span-7 flex flex-col items-start text-left">
                  <h3 className="font-display text-2xl sm:text-3xl lg:text-[34px] font-bold text-[var(--text-main)] tracking-tight leading-[1.2] mb-4">
                    Book Your Session with Our Academic Team
                  </h3>

                  <p className="font-serif text-[16px] sm:text-[17px] text-[var(--text-muted)] leading-relaxed max-w-xl">
                    Discuss your learning objectives, explore our methodology, and determine the ideal pathway for your executive communication with our team.
                  </p>
                </div>

                {/* Right Column: Academic Pathway CTAs */}
                <div className="lg:col-span-5 flex flex-col gap-3.5 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 w-full">
                    <Link
                      href="/about#faculty"
                      className="bg-[var(--surface-low)] hover:bg-[var(--surface)] border border-[var(--surface-border)] hover:border-[#d4af37]/50 px-5 py-3.5 rounded-xl flex items-center justify-between text-xs font-display font-semibold tracking-wider uppercase text-[var(--text-main)] hover:text-[#d4af37] transition-all duration-300 group active:scale-[0.98]"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[18px] text-[#d4af37]">groups</span>
                        <span>Meet Some of the Faculty</span>
                      </span>
                      <span className="material-symbols-outlined text-[16px] opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#d4af37]">
                        arrow_forward
                      </span>
                    </Link>

                    <Link
                      href="/methodology"
                      className="bg-[var(--surface-low)] hover:bg-[var(--surface)] border border-[var(--surface-border)] hover:border-[#d4af37]/50 px-5 py-3.5 rounded-xl flex items-center justify-between text-xs font-display font-semibold tracking-wider uppercase text-[var(--text-main)] hover:text-[#d4af37] transition-all duration-300 group active:scale-[0.98]"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[18px] text-[#d4af37]">menu_book</span>
                        <span>Explore Methodology</span>
                      </span>
                      <span className="material-symbols-outlined text-[16px] opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#d4af37]">
                        arrow_forward
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= FINAL COMMITMENT CTA ================= */}
        <section className="py-8 lg:py-10 bg-[var(--bg-main)] relative transition-colors">
          <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative z-10 text-center flex flex-col items-center">
            {/* Main Heading */}
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[46px] text-[var(--text-main)] font-bold leading-[1.12] tracking-tight mb-4 max-w-2xl">
              {cms.cta_banner?.bannerHeading ? (
                cms.cta_banner.bannerHeading
              ) : (
                <>
                  Our Commitment to <br />
                  <span className="italic font-serif font-light text-[#d4af37]">Excellence</span>
                </>
              )}
            </h2>

            {/* Editorial Description */}
            <p className="font-serif text-[16px] sm:text-[18px] text-[var(--text-muted)] leading-relaxed max-w-2xl mx-auto mb-8">
              {cms.cta_banner?.bannerBody || "Join the ranks of global professionals who have transformed their communication through SpeakUp's elite, structured methodology."}
            </p>

            {/* Action Area */}
            <div className="flex flex-col items-center gap-3.5">
              <Link
                href={cms.cta_banner?.ctaButtonLink || "/book-session"}
                className="inline-flex items-center gap-3.5 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] dark:hover:bg-[#e9c349] hover:text-white px-8 py-4 rounded-2xl text-xs font-display font-bold tracking-widest uppercase transition-all duration-300 shadow-sm group active:scale-[0.98]"
              >
                <span className="w-9 h-9 rounded-xl bg-white/10 dark:bg-black/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                </span>
                <span>{cms.cta_banner?.ctaButtonText || "Book Your Session"}</span>
                <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ================= THEME-AWARE PROMOTIONAL VIDEO LIGHTBOX ================= */}
      {videoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setVideoModalOpen(false)}
        >
          <div
            className={`w-full overflow-hidden rounded-2xl shadow-2xl relative border transition-all ${
              homeVideo.aspectRatio === "9:16"
                ? "max-w-md"
                : homeVideo.aspectRatio === "1:1"
                ? "max-w-xl"
                : homeVideo.aspectRatio === "4:3"
                ? "max-w-2xl"
                : "max-w-4xl"
            } bg-white dark:bg-[#141416] border-neutral-200 dark:border-white/15 text-[var(--text-main)]`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Theme-Aware (Light in Light Mode, Dark in Dark Mode) */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-white/10 bg-neutral-50/90 dark:bg-[#1a1a1e] text-[var(--text-main)]">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#d4af37] text-[20px]">smart_display</span>
                <div>
                  <h4 className="font-display text-xs sm:text-sm uppercase tracking-wider font-bold">
                    {homeVideo.title || "Discover SpeakUp"}
                  </h4>
                  <span className="hidden sm:inline font-mono text-[10px] text-[var(--text-muted)]">
                    {homeVideo.badgeText || "Promotional Showcase"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVideoModalOpen(false)}
                aria-label="Close video"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-white/70 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Video Player Frame with Best Fit Aspect Ratio */}
            <div
              className={`w-full bg-black flex items-center justify-center overflow-hidden ${
                homeVideo.aspectRatio === "9:16"
                  ? "aspect-[9/16]"
                  : homeVideo.aspectRatio === "1:1"
                  ? "aspect-square"
                  : homeVideo.aspectRatio === "4:3"
                  ? "aspect-[4/3]"
                  : "aspect-video"
              }`}
            >
              {homeVideo.sourceType === "local" ? (
                <video
                  src={homeVideo.videoUrl}
                  poster={homeVideo.thumbnailUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : homeVideo.sourceType === "youtube" ? (
                <SpeakUpVideoPlayer
                  videoUrl={homeVideo.embedUrl}
                  title={homeVideo.title}
                  poster={homeVideo.thumbnailUrl}
                  autoPlay={true}
                />
              ) : (
                <iframe
                  src={homeVideo.embedUrl}
                  title={homeVideo.title || "SpeakUp Promotional Video"}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
