"use client";

import React, { useState, useEffect, useRef } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import Link from "next/link";
import {
  getLogoSettingsAction,
  uploadLogoImageAction,
  removeCustomLogoAction,
  LogoSettingsData,
} from "@/app/admin/logo-actions";
import { SpeakUpSymbol } from "@/components/Logo";
import HomeVideoEditorModal from "@/components/admin/HomeVideoEditorModal";
import MethodologyMediaEditorModal from "@/components/admin/MethodologyMediaEditorModal";
import LmsWorkingVideoEditorModal from "@/components/admin/LmsWorkingVideoEditorModal";
import TermsSectionsEditorModal from "@/components/admin/TermsSectionsEditorModal";
import PrivacySectionsEditorModal from "@/components/admin/PrivacySectionsEditorModal";

interface PageItem {
  id: string;
  name: string;
  route: string;
  description: string;
  icon: string;
  section: "Public Website" | "Authentication" | "Student LMS";
  category: string;
  slug?: string;
}

// Exact actual project routes (no invented pages)
const PROJECT_PAGES: PageItem[] = [
  // --- Public Website Pages (12) ---
  {
    id: "home",
    name: "Home",
    route: "/",
    description: "Main institutional landing page showcasing SpeakUp's pedagogical philosophy, programs, and enrollment.",
    icon: "home",
    section: "Public Website",
    category: "Core",
  },
  {
    id: "about",
    name: "About",
    route: "/about",
    description: "Institutional background, founding vision by Sir Mudassir Ali, and linguistic mastery mission.",
    icon: "info",
    section: "Public Website",
    category: "Institutional",
  },
  {
    id: "courses",
    name: "Courses",
    route: "/courses",
    description: "Academic catalog of public speaking, German and English CEFR cohort programs.",
    icon: "school",
    section: "Public Website",
    category: "Academics",
  },
  {
    id: "pricing",
    name: "Course Pricing",
    route: "/pricing",
    description: "Tuition structures, installment options, and domestic bank transfer details (Meezan, Raast).",
    icon: "payments",
    section: "Public Website",
    category: "Admissions",
  },
  {
    id: "course-outline",
    name: "Course Outline",
    route: "/course-outline",
    description: "Comprehensive syllabus breakdown, weekly modular milestones, and speech lab criteria.",
    icon: "menu_book",
    section: "Public Website",
    category: "Academics",
  },
  {
    id: "contact",
    name: "Book Session / Contact",
    route: "/book-session",
    description: "Diagnostic speaking consultation booking form and personal fluency assessment reservation.",
    icon: "calendar_month",
    section: "Public Website",
    category: "Admissions",
  },
  {
    id: "faculty",
    name: "Faculty",
    route: "/faculty",
    description: "Profiles and credentials of senior vocal coaches, linguistic mentors, and speech examiners.",
    icon: "person_celebrate",
    section: "Public Website",
    category: "Academics",
  },
  {
    id: "methodology",
    name: "Methodology",
    route: "/methodology",
    description: "SpeakUp's proprietary 4-stage speaking framework and immersive articulation drills.",
    icon: "psychology",
    section: "Public Website",
    category: "Academics",
  },
  {
    id: "reviews",
    name: "Reviews",
    route: "/reviews",
    description: "Verified alumni testimonials, cohort reviews, and executive communication case studies.",
    icon: "reviews",
    section: "Public Website",
    category: "Institutional",
  },
  {
    id: "faq",
    name: "FAQ",
    route: "/faq",
    description: "Frequently asked questions regarding admissions, schedules, certifications, and payment options.",
    icon: "help",
    section: "Public Website",
    category: "Admissions",
  },
  {
    id: "terms",
    name: "Terms & Conditions",
    route: "/terms",
    description: "Official enrollment regulations, academic integrity policy, fee schedules, and student terms.",
    icon: "gavel",
    section: "Public Website",
    category: "Legal",
  },
  {
    id: "privacy",
    name: "Privacy Policy",
    route: "/privacy",
    description: "Official privacy policy, data protection regulations, and student privacy disclosure.",
    icon: "policy",
    section: "Public Website",
    category: "Legal",
  },
  {
    id: "lms-journey",
    name: "LMS Journey",
    route: "/lms-journey",
    description: "Interactive visual tour guiding prospective and enrolled students through the LMS learning experience.",
    icon: "route",
    section: "Public Website",
    category: "Core",
  },

  // --- Authentication Pages (6) ---
  {
    id: "auth-login",
    name: "Sign In",
    route: "/auth/login",
    description: "Universal single-door authentication entry point for both student scholars and administrative mentors.",
    icon: "login",
    section: "Authentication",
    category: "Access",
  },
  {
    id: "auth-register",
    name: "Register / Sign Up",
    route: "/auth/register",
    description: "Student onboarding and self-registration with full name, email, phone number, and password validation.",
    icon: "person_add",
    section: "Authentication",
    category: "Access",
  },
  {
    id: "auth-forgot",
    name: "Forgot Password",
    route: "/auth/forgot-password",
    description: "Self-service password recovery flow dispatching secure Supabase reset links to verified student emails.",
    icon: "lock_reset",
    section: "Authentication",
    category: "Recovery",
  },
  {
    id: "auth-reset",
    name: "Reset Password",
    route: "/auth/reset-password",
    description: "Secure credential replacement page accessed via authenticated recovery token links.",
    icon: "vpn_key",
    section: "Authentication",
    category: "Recovery",
  },
  {
    id: "auth-verify",
    name: "Verify Email",
    route: "/auth/verify",
    description: "Email confirmation status page verifying inbox activation before full account grant.",
    icon: "mark_email_read",
    section: "Authentication",
    category: "Access",
  },
  {
    id: "auth-change-email",
    name: "Change Email",
    route: "/auth/change-email",
    description: "Protected route handling email updates and verification handshakes.",
    icon: "alternate_email",
    section: "Authentication",
    category: "Access",
  },

  // --- Student LMS Pages (6) ---
  {
    id: "lms-dashboard",
    name: "Student LMS Dashboard",
    route: "/lms/dashboard",
    description: "Main student learning center featuring enrolled courses, lesson progress meters, and quick resume.",
    icon: "dashboard",
    section: "Student LMS",
    category: "Learning Portal",
    slug: "lms-dashboard",
  },
  {
    id: "lms-courses",
    name: "My Courses",
    route: "/lms/courses",
    description: "Personalized list of enrolled academic cohorts with persistent progress percentages and curriculum outlines.",
    icon: "auto_stories",
    section: "Student LMS",
    category: "Learning Portal",
    slug: "lms-courses",
  },
  {
    id: "lms-learn",
    name: "Learning Portal & Lectures",
    route: "/lms/learn",
    description: "Interactive video studio, module notes, and lesson completion checkmarks with persistent database sync.",
    icon: "play_lesson",
    section: "Student LMS",
    category: "Learning Portal",
    slug: "lms-learn",
  },
  {
    id: "lms-certificates",
    name: "Certificates",
    route: "/lms/certificates",
    description: "Official institutional certificates earned upon curriculum completion with verification IDs.",
    icon: "workspace_premium",
    section: "Student LMS",
    category: "Credentials",
    slug: "lms-certificates",
  },
  {
    id: "lms-events",
    name: "Schedule & Live Events",
    route: "/lms/events",
    description: "Calendar of live speaking workshops, diagnostic evaluations, and mentor office hour sessions.",
    icon: "event",
    section: "Student LMS",
    category: "Schedule",
    slug: "lms-events",
  },
  {
    id: "lms-profile",
    name: "Student Profile & Settings",
    route: "/lms/profile",
    description: "Student account settings, avatar picture upload, phone contact details, and password updates.",
    icon: "account_circle",
    section: "Student LMS",
    category: "Account",
    slug: "lms-profile",
  },
];

type MainTab = "pages" | "courses" | "lms-preview" | "logo";

export default function AddedWebsiteAdminPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("pages");
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPageId, setSelectedPageId] = useState<string>("home");
  const [homeVideoModalOpen, setHomeVideoModalOpen] = useState(false);
  const [methodologyMediaModalOpen, setMethodologyMediaModalOpen] = useState(false);
  const [lmsWorkingVideoModalOpen, setLmsWorkingVideoModalOpen] = useState(false);
  const [termsSectionsModalOpen, setTermsSectionsModalOpen] = useState(false);
  const [privacySectionsModalOpen, setPrivacySectionsModalOpen] = useState(false);

  // Logo Management State
  const [logoSettings, setLogoSettings] = useState<LogoSettingsData>({
    lightLogoUrl: null,
    darkLogoUrl: null,
    updatedAt: new Date().toISOString(),
  });
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [uploadingLight, setUploadingLight] = useState(false);
  const [uploadingDark, setUploadingDark] = useState(false);
  const [logoToast, setLogoToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const lightInputRef = useRef<HTMLInputElement>(null);
  const darkInputRef = useRef<HTMLInputElement>(null);

  const showLogoToast = (type: "success" | "error", text: string) => {
    setLogoToast({ type, text });
    setTimeout(() => setLogoToast(null), 4000);
  };

  useEffect(() => {
    async function loadLogos() {
      setLoadingLogo(true);
      try {
        const res = await getLogoSettingsAction();
        if (res.success && res.data) {
          setLogoSettings(res.data);
        }
      } catch (err: any) {
        console.error("Failed to load logo settings:", err);
      } finally {
        setLoadingLogo(false);
      }
    }
    loadLogos();
  }, []);

  const handleUploadLogo = async (file: File, mode: "light" | "dark") => {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      showLogoToast("error", "Invalid format. Allowed: PNG, JPG, WebP, or SVG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showLogoToast("error", "Logo file size must not exceed 2MB.");
      return;
    }

    if (mode === "light") setUploadingLight(true);
    else setUploadingDark(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadLogoImageAction(fd, mode);
      if (res.success && res.data?.logoUrl) {
        const next = {
          ...logoSettings,
          [`${mode}LogoUrl`]: res.data!.logoUrl,
        };
        setLogoSettings(next);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("speakup_shared_logos", JSON.stringify(next));
          } catch {}
          window.dispatchEvent(new CustomEvent("speakup-logo-updated", { detail: next }));
        }
        showLogoToast("success", `${mode === "light" ? "Light Mode" : "Dark Mode"} logo successfully updated.`);
      } else {
        showLogoToast("error", res.error || "Failed to upload logo.");
      }
    } catch (err: any) {
      showLogoToast("error", err?.message || "Upload failed.");
    } finally {
      if (mode === "light") setUploadingLight(false);
      else setUploadingDark(false);
    }
  };

  const handleRemoveLogo = async (mode: "light" | "dark") => {
    try {
      const res = await removeCustomLogoAction(mode);
      if (res.success) {
        const next = {
          ...logoSettings,
          [`${mode}LogoUrl`]: null,
        };
        setLogoSettings(next);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("speakup_shared_logos", JSON.stringify(next));
          } catch {}
          window.dispatchEvent(new CustomEvent("speakup-logo-updated", { detail: next }));
        }
        showLogoToast("success", `Custom ${mode} logo removed. Reverted to default SpeakUp emblem.`);
      } else {
        showLogoToast("error", res.error || "Failed to remove logo.");
      }
    } catch (err: any) {
      showLogoToast("error", err?.message || "Remove failed.");
    }
  };

  // Filter project pages
  const filteredPages = PROJECT_PAGES.filter((page) => {
    const matchesSection = selectedSection === "All" || page.section === selectedSection;
    const matchesSearch =
      page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const selectedPage = PROJECT_PAGES.find((p) => p.id === selectedPageId) || PROJECT_PAGES[0];

  const publicCount = PROJECT_PAGES.filter((p) => p.section === "Public Website").length;
  const authCount = PROJECT_PAGES.filter((p) => p.section === "Authentication").length;
  const lmsCount = PROJECT_PAGES.filter((p) => p.section === "Student LMS").length;

  return (
    <div className="min-h-screen pb-16">
      <AdminHeader
        title="Edit Website"
        subtitle="Manage website structure, courses preview, Student LMS preview, and branding"
      />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-8 space-y-8">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--surface-border)] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "pages", label: "Edit Website Pages", icon: "edit" },
              { id: "courses", label: "Edit Courses", icon: "menu_book" },
              { id: "lms-preview", label: "Student LMS Preview", icon: "preview" },
              { id: "logo", label: "Logo Management", icon: "palette" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as MainTab)}
                  className={`px-4 py-2 rounded-xl font-display text-xs uppercase tracking-wider font-semibold transition-all inline-flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? "bg-[#d4af37] text-[#141416] shadow-xs font-bold"
                      : "border border-[var(--surface-border)] bg-white dark:bg-[#141416] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#d4af37]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/admin/courses"
              className="px-4 py-2 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">school</span>
              <span>Courses Navigation</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: EDIT WEBSITE (ALL PAGES DIRECTORY) */}
        {/* ========================================================================= */}
        {activeTab === "pages" && (
          <div className="space-y-6">
            {/* Scope Summary Banner */}
            <div className="rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#141416] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-display uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                  Edit Website Structure &amp; Destination Map
                </span>
                <p className="font-serif text-xs text-[var(--text-muted)] max-w-xl leading-relaxed">
                  Real project routes across the Public Website, Authentication System, and Student LMS. All items target authentic existing routes.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] text-xs font-display font-bold uppercase tracking-wider border border-[#d4af37]/30">
                  {PROJECT_PAGES.length} Total Routes
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "All Pages", val: "All", count: PROJECT_PAGES.length },
                  { label: "Public Website", val: "Public Website", count: publicCount },
                  { label: "Authentication", val: "Authentication", count: authCount },
                  { label: "Student LMS", val: "Student LMS", count: lmsCount },
                ].map((sec) => (
                  <button
                    key={sec.val}
                    type="button"
                    onClick={() => setSelectedSection(sec.val)}
                    className={`px-3.5 py-1.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      selectedSection === sec.val
                        ? "bg-[#d4af37] text-[#141416] shadow-xs font-bold"
                        : "border border-[var(--surface-border)] bg-white dark:bg-[#141416] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#d4af37]"
                    }`}
                  >
                    <span>{sec.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
                      {sec.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[var(--text-muted)]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter website pages..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#141416] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                />
              </div>
            </div>

            {/* Sticky Action Bar for Selected Page (Primary Sticky Header) */}
            <div className="sticky top-20 sm:top-24 z-20 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-md border border-[#d4af37]/40 dark:border-[#d4af37]/30 rounded-2xl p-3.5 sm:p-4.5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">{selectedPage.icon}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-display uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                      Selected Page
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-low)] text-[var(--text-muted)] border border-[var(--surface-border)]">
                      {selectedPage.section}
                    </span>
                  </div>
                  <h4 className="font-display text-sm sm:text-base font-bold text-[var(--text-main)] truncate">
                    {selectedPage.name} <span className="font-mono text-xs text-[var(--text-muted)] font-normal">({selectedPage.route})</span>
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-end flex-wrap">
                {selectedPage.id === "home" && (
                  <button
                    type="button"
                    onClick={() => setHomeVideoModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">smart_display</span>
                    <span>Home Video</span>
                  </button>
                )}

                {selectedPage.id === "methodology" && (
                  <button
                    type="button"
                    onClick={() => setMethodologyMediaModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">psychology</span>
                    <span>Methodology Media</span>
                  </button>
                )}

                {selectedPage.id === "lms-journey" && (
                  <button
                    type="button"
                    onClick={() => setLmsWorkingVideoModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">laptop_mac</span>
                    <span>LMS Working Video</span>
                  </button>
                )}

                {selectedPage.id === "faq" && (
                  <Link
                    href="/admin/faqs"
                    className="px-3.5 py-2 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">help</span>
                    <span>Manage FAQ Items</span>
                  </Link>
                )}

                {selectedPage.id === "terms" && (
                  <button
                    type="button"
                    onClick={() => setTermsSectionsModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">gavel</span>
                    <span>Terms &amp; Conditions Sections</span>
                  </button>
                )}

                {selectedPage.id === "privacy" && (
                  <button
                    type="button"
                    onClick={() => setPrivacySectionsModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-[#d4af37] bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">policy</span>
                    <span>Privacy Policy Sections</span>
                  </button>
                )}

                <Link
                  href={selectedPage.route}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141418] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#d4af37]">open_in_new</span>
                  <span>Open Live Page</span>
                </Link>

                <Link
                  href={`/admin/edit-page?slug=${selectedPage.slug || selectedPage.id || encodeURIComponent(selectedPage.route)}`}
                  className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  <span>Edit</span>
                </Link>
              </div>
            </div>

            {/* Clean Full-Width Page List (Redundant right-side toolbar removed) */}
            <div className="w-full space-y-3">
              {filteredPages.map((page) => {
                const isSelected = page.id === selectedPageId;
                return (
                  <div
                    key={page.id}
                    onClick={() => setSelectedPageId(page.id)}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                      isSelected
                        ? "border-[#d4af37] bg-white dark:bg-[#18181c] shadow-md ring-1 ring-[#d4af37]/50"
                        : "border-[var(--surface-border)] bg-white dark:bg-[#141416] hover:border-[#d4af37]/60 hover:bg-[#fdfbf7] dark:hover:bg-[#16161a] shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                          isSelected
                            ? "bg-[#d4af37] text-[#141416] border-[#d4af37]"
                            : "bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-[#d4af37] border-[var(--surface-border)] group-hover:border-[#d4af37]/40"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[22px]">
                          {page.icon}
                        </span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display text-sm font-bold text-[var(--text-main)] truncate">
                            {page.name}
                          </h3>
                          <span className="font-mono text-[11px] text-[var(--text-muted)] bg-[var(--surface-border)]/40 px-2 py-0.5 rounded-md">
                            {page.route}
                          </span>
                          <span
                            className={`text-[9px] font-display uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                              page.section === "Public Website"
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                                : page.section === "Authentication"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                            }`}
                          >
                            {page.section}
                          </span>
                        </div>
                        <p className="font-serif text-xs text-[var(--text-muted)] line-clamp-1">
                          {page.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {page.id === "home" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPageId("home");
                            setHomeVideoModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 hover:bg-[#d4af37] text-[#8a6d1b] dark:text-[#d4af37] hover:text-[#141416] font-display text-[10px] uppercase tracking-wider font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[14px]">smart_display</span>
                          <span>Home Video</span>
                        </button>
                      )}
                      {page.id === "methodology" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPageId("methodology");
                            setMethodologyMediaModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 hover:bg-[#d4af37] text-[#8a6d1b] dark:text-[#d4af37] hover:text-[#141416] font-display text-[10px] uppercase tracking-wider font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[14px]">psychology</span>
                          <span>Methodology Media</span>
                        </button>
                      )}
                      {page.id === "lms-journey" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPageId("lms-journey");
                            setLmsWorkingVideoModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 hover:bg-[#d4af37] text-[#8a6d1b] dark:text-[#d4af37] hover:text-[#141416] font-display text-[10px] uppercase tracking-wider font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[14px]">laptop_mac</span>
                          <span>LMS Working Video</span>
                        </button>
                      )}
                      {page.id === "faq" && (
                        <Link
                          href="/admin/faqs"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/10 hover:bg-[#d4af37] text-[#8a6d1b] dark:text-[#d4af37] hover:text-[#141416] font-display text-[10px] uppercase tracking-wider font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[14px]">help</span>
                          <span>Manage FAQs</span>
                        </Link>
                      )}
                      <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)] group-hover:text-[#d4af37] transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredPages.length === 0 && (
                <div className="p-8 text-center rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#141416] space-y-2">
                  <span className="material-symbols-outlined text-[32px] text-[var(--text-muted)]">search_off</span>
                  <p className="font-display text-sm font-semibold text-[var(--text-main)]">
                    No matching pages found
                  </p>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    Try clearing your search query or selecting All Pages.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: EDIT COURSES (REQUIREMENT 4) */}
        {/* ========================================================================= */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#141416] p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--surface-border)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
                    <span className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                      Academic Curriculum &amp; Pricing Management
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[var(--text-main)] mt-1">
                    Edit Courses &amp; Outlines
                  </h2>
                  <p className="font-serif text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                    Direct access to genuine live pages and course content for Courses, Course Pricing, and Course Outlines.
                  </p>
                </div>

                <Link
                  href="/admin/edit-courses"
                  className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-2 shrink-0 self-start sm:self-center"
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  <span>Open Academic Course Manager</span>
                </Link>
              </div>

              {/* 3 Core Academic Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* 1. Courses Catalog */}
                <div className="p-6 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed]/50 dark:bg-[var(--surface-low)]/30 hover:border-[#d4af37] transition-all space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px]">school</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                      Courses Catalog
                    </h3>
                    <p className="font-mono text-xs text-[#8a6d1b] dark:text-[#d4af37]">
                      /courses
                    </p>
                    <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                      Complete public course directory showcasing speech masterclasses, CEFR levels (A1 to C2), and cohort eligibility.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--surface-border)]">
                    <Link
                      href="/courses"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 rounded-lg bg-white dark:bg-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] text-center font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-main)] inline-flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      <span>Open Live Courses Page</span>
                    </Link>
                  </div>
                </div>

                {/* 2. Course Pricing */}
                <div className="p-6 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed]/50 dark:bg-[var(--surface-low)]/30 hover:border-[#d4af37] transition-all space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px]">payments</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                      Course Pricing
                    </h3>
                    <p className="font-mono text-xs text-blue-600 dark:text-blue-400">
                      /pricing
                    </p>
                    <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                      Tuition fees, domestic payment instructions (Meezan Bank, Raast), verification protocols, and scholar discounts.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--surface-border)]">
                    <Link
                      href="/pricing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 rounded-lg bg-white dark:bg-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] text-center font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-main)] inline-flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      <span>Open Live Pricing Page</span>
                    </Link>
                  </div>
                </div>

                {/* 3. Course Outline */}
                <div className="p-6 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed]/50 dark:bg-[var(--surface-low)]/30 hover:border-[#d4af37] transition-all space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px]">menu_book</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                      Course Outline
                    </h3>
                    <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      /course-outline
                    </p>
                    <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                      Week-by-week curriculum module breakdown, acoustic drill topics, and final oral evaluation guidelines.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--surface-border)]">
                    <Link
                      href="/course-outline"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 rounded-lg bg-white dark:bg-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] text-center font-display text-xs uppercase tracking-wider font-semibold text-[var(--text-main)] inline-flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      <span>Open Live Outline Page</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: STUDENT LMS DASHBOARD PREVIEW (REQUIREMENT 5) */}
        {/* ========================================================================= */}
        {activeTab === "lms-preview" && (
          <div className="space-y-6">
            {/* Administrator Preview Mode Callout Banner */}
            <div className="rounded-2xl border-2 border-[#d4af37] bg-white dark:bg-[#141416] p-6 shadow-md space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37] text-[#141416] font-display text-[10px] font-black uppercase tracking-wider">
                        Administrator Preview Mode
                      </span>
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        Route: /lms/dashboard
                      </span>
                    </div>
                    <h3 className="font-display text-base font-bold text-[var(--text-main)] mt-0.5">
                      Live Student LMS Dashboard Inspection
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Link
                    href="/lms/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>Open Live Student LMS</span>
                  </Link>
                </div>
              </div>

              <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                Notice: This frame renders the authentic, live Student LMS engine. It preserves actual layout, enrolled course cards, persistent learning progress percentages, and responsive styles without exposing other students’ private information.
              </p>
            </div>

            {/* Embedded Live LMS Viewport Frame */}
            <div className="rounded-2xl border border-[var(--surface-border)] overflow-hidden bg-white dark:bg-[#101014] shadow-lg">
              <div className="px-4 py-2.5 bg-[#f9f5ed] dark:bg-[var(--surface-low)] border-b border-[var(--surface-border)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                  <span className="ml-2 font-mono text-[11px] text-[var(--text-muted)]">
                    https://speakup.edu/lms/dashboard
                  </span>
                </div>
                <span className="text-[10px] font-display uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                  Interactive Live LMS Viewport
                </span>
              </div>

              <iframe
                src="/lms/dashboard"
                title="Student LMS Dashboard Live Preview"
                className="w-full h-[680px] border-none bg-white dark:bg-[#141416]"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: LOGO MANAGEMENT (REQUIREMENT 6) */}
        {/* ========================================================================= */}
        {activeTab === "logo" && (
          <div className="space-y-6">
            {/* Logo Toast */}
            {logoToast && (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between text-xs font-display font-semibold transition-all ${
                  logoToast.type === "success"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    {logoToast.type === "success" ? "check_circle" : "error"}
                  </span>
                  <span>{logoToast.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLogoToast(null)}
                  className="text-xs uppercase tracking-wider underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#141416] p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--surface-border)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
                    <span className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                      Branding &amp; Visual Identity
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[var(--text-main)] mt-1">
                    Logo Management
                  </h2>
                  <p className="font-serif text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                    Select, preview, or upload custom logos for Light Mode and Dark Mode. Uploads are stored persistently in Supabase and maintain the original emblem fallback.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    Max size: 2MB | Formats: PNG, JPG, WebP, SVG
                  </span>
                </div>
              </div>

              {/* Hidden file inputs */}
              <input
                type="file"
                ref={lightInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadLogo(f, "light");
                }}
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                className="hidden"
              />
              <input
                type="file"
                ref={darkInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadLogo(f, "dark");
                }}
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                className="hidden"
              />

              {/* Light & Dark Logo Management Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Light Mode Logo Card */}
                <div className="p-6 rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#18181c] space-y-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#d4af37] text-[20px]">light_mode</span>
                      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-main)]">
                        Light Mode Logo
                      </h3>
                    </div>
                    <span className="text-[10px] font-display uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {logoSettings.lightLogoUrl ? "Custom Upload" : "Default SpeakUp SVG"}
                    </span>
                  </div>

                  {/* Light Canvas Preview Container */}
                  <div className="w-full h-44 rounded-xl bg-[#ffffff] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center p-4 relative shadow-inner">
                    <span className="absolute top-2 left-2 text-[9px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
                      Light Theme Canvas Preview
                    </span>
                    <div className="flex items-center gap-3">
                      {logoSettings.lightLogoUrl ? (
                        <img
                          src={logoSettings.lightLogoUrl}
                          alt="SpeakUp Light Logo"
                          className="h-16 w-auto max-w-[200px] object-contain"
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <SpeakUpSymbol sizeClass="w-14 h-14" themeMode="light" standColor="#D4AF37" />
                          <span className="font-display text-2xl font-black uppercase tracking-wider text-[#141416]">
                            SpeakUp
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={uploadingLight}
                      onClick={() => lightInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-50 text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      {uploadingLight ? (
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                      )}
                      <span>{logoSettings.lightLogoUrl ? "Replace Light Logo" : "Upload Light Logo"}</span>
                    </button>

                    {logoSettings.lightLogoUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLogo("light")}
                        className="px-4 py-2 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
                      >
                        Reset to Default
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Dark Mode Logo Card */}
                <div className="p-6 rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#18181c] space-y-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#d4af37] text-[20px]">dark_mode</span>
                      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-main)]">
                        Dark Mode Logo
                      </h3>
                    </div>
                    <span className="text-[10px] font-display uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {logoSettings.darkLogoUrl ? "Custom Upload" : "Default SpeakUp SVG"}
                    </span>
                  </div>

                  {/* Dark Canvas Preview Container */}
                  <div className="w-full h-44 rounded-xl bg-[#141416] border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center p-4 relative shadow-inner">
                    <span className="absolute top-2 left-2 text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
                      Dark Theme Canvas Preview
                    </span>
                    <div className="flex items-center gap-3">
                      {logoSettings.darkLogoUrl ? (
                        <img
                          src={logoSettings.darkLogoUrl}
                          alt="SpeakUp Dark Logo"
                          className="h-16 w-auto max-w-[200px] object-contain"
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <SpeakUpSymbol sizeClass="w-14 h-14" themeMode="dark" standColor="#e5e2e1" />
                          <span className="font-display text-2xl font-black uppercase tracking-wider text-[#f7f0e8]">
                            SpeakUp
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={uploadingDark}
                      onClick={() => darkInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-50 text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      {uploadingDark ? (
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                      )}
                      <span>{logoSettings.darkLogoUrl ? "Replace Dark Logo" : "Upload Dark Logo"}</span>
                    </button>

                    {logoSettings.darkLogoUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLogo("dark")}
                        className="px-4 py-2 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
                      >
                        Reset to Default
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Home Video Management Modal */}
      <HomeVideoEditorModal
        isOpen={homeVideoModalOpen}
        onClose={() => setHomeVideoModalOpen(false)}
      />

      {/* Methodology Media Management Modal (Req 1) */}
      <MethodologyMediaEditorModal
        isOpen={methodologyMediaModalOpen}
        onClose={() => setMethodologyMediaModalOpen(false)}
      />

      {/* LMS Working Video Management Modal (Req 2) */}
      <LmsWorkingVideoEditorModal
        isOpen={lmsWorkingVideoModalOpen}
        onClose={() => setLmsWorkingVideoModalOpen(false)}
      />

      {/* Terms Sections Management Modal */}
      <TermsSectionsEditorModal
        isOpen={termsSectionsModalOpen}
        onClose={() => setTermsSectionsModalOpen(false)}
      />

      {/* Privacy Policy Management Modal */}
      <PrivacySectionsEditorModal
        isOpen={privacySectionsModalOpen}
        onClose={() => setPrivacySectionsModalOpen(false)}
      />
    </div>
  );
}
