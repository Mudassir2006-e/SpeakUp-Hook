"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import LivePageVisualEditor, { PageOption } from "@/components/admin/LivePageVisualEditor";

// Canonical Project Pages Catalog
const PROJECT_PAGES: PageOption[] = [
  { id: "home", name: "Home", route: "/", section: "Public Website", category: "Core Marketing", slug: "home" },
  { id: "about", name: "About", route: "/about", section: "Public Website", category: "Institutional", slug: "about" },
  { id: "courses", name: "Courses", route: "/courses", section: "Public Website", category: "Curriculum", slug: "courses" },
  { id: "pricing", name: "Course Pricing", route: "/pricing", section: "Public Website", category: "Commercial", slug: "pricing" },
  { id: "course-outline", name: "Course Outline", route: "/course-outline", section: "Public Website", category: "Curriculum", slug: "course-outline" },
  { id: "book-session", name: "Book Session", route: "/book-session", section: "Public Website", category: "Admissions", slug: "book-session" },
  { id: "faq", name: "FAQ", route: "/faq", section: "Public Website", category: "Information", slug: "faq" },
  { id: "methodology", name: "Methodology", route: "/methodology", section: "Public Website", category: "Academics", slug: "methodology" },
  { id: "contact", name: "Contact", route: "/#contact", section: "Public Website", category: "Support", slug: "contact" },
  { id: "video-player", name: "SpeakUp Video Player", route: "/", section: "Public Website", category: "Interactive Media", slug: "video-player" },
  { id: "terms", name: "Terms & Conditions", route: "/terms", section: "Public Website", category: "Legal", slug: "terms" },
  { id: "privacy", name: "Privacy Policy", route: "/privacy", section: "Public Website", category: "Legal", slug: "privacy" },
  { id: "auth-login", name: "Sign In", route: "/auth/login", section: "Authentication", category: "Portal Access", slug: "login" },
  { id: "auth-register", name: "Register", route: "/auth/register", section: "Authentication", category: "Admissions", slug: "register" },
  { id: "auth-forgot", name: "Forgot Password", route: "/auth/forgot-password", section: "Authentication", category: "Account Recovery", slug: "forgot-password" },
  { id: "auth-reset", name: "Reset Password", route: "/auth/reset-password", section: "Authentication", category: "Account Recovery", slug: "reset-password" },
  { id: "auth-verify", name: "Email Verification", route: "/auth/verify", section: "Authentication", category: "Security", slug: "verify" },
  { id: "auth-change-email", name: "Change Email", route: "/auth/change-email", section: "Authentication", category: "Account Management", slug: "change-email" },
  { id: "lms-dashboard", name: "Student LMS Dashboard", route: "/lms/dashboard", section: "Student LMS", category: "Learning Space", slug: "lms-dashboard" },
  { id: "lms-courses", name: "LMS My Courses", route: "/lms/courses", section: "Student LMS", category: "Curriculum", slug: "lms-courses" },
  { id: "lms-learn", name: "LMS Classroom & Lessons", route: "/lms/learn", section: "Student LMS", category: "Classroom", slug: "lms-learn" },
  { id: "lms-events", name: "LMS Schedule & Events", route: "/lms/events", section: "Student LMS", category: "Calendar", slug: "lms-events" },
  { id: "lms-certificates", name: "LMS Certificates", route: "/lms/certificates", section: "Student LMS", category: "Credentials", slug: "lms-certificates" },
  { id: "lms-profile", name: "LMS Profile & Settings", route: "/lms/profile", section: "Student LMS", category: "Account", slug: "lms-profile" },
];

// Flexible alias dictionary for matching friendly names to student LMS and public routes
const ALIAS_MAP: Record<string, string> = {
  "student lms": "lms-dashboard",
  "student-lms": "lms-dashboard",
  "lms": "lms-dashboard",
  "lms dashboard": "lms-dashboard",
  "lms-dashboard": "lms-dashboard",
  "learning": "lms-learn",
  "lecture": "lms-learn",
  "learning / lecture": "lms-learn",
  "learning / lessons": "lms-learn",
  "classroom": "lms-learn",
  "my courses": "lms-courses",
  "my-courses": "lms-courses",
  "lms-courses": "lms-courses",
  "schedule": "lms-events",
  "events": "lms-events",
  "certificates": "lms-certificates",
};

function EditPageWorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slugParam = searchParams.get("slug") || searchParams.get("page") || "home";
  const normalizedParam = slugParam.toLowerCase().trim();
  const resolvedSlug = ALIAS_MAP[normalizedParam] || normalizedParam;

  // Resolve matching page
  const page =
    PROJECT_PAGES.find(
      (p) =>
        p.slug.toLowerCase() === resolvedSlug ||
        p.id.toLowerCase() === resolvedSlug ||
        p.route.toLowerCase() === resolvedSlug ||
        p.name.toLowerCase() === resolvedSlug
    ) ||
    PROJECT_PAGES.find(
      (p) =>
        p.slug.toLowerCase() === normalizedParam ||
        p.id.toLowerCase() === normalizedParam ||
        p.route.toLowerCase() === normalizedParam ||
        p.name.toLowerCase() === normalizedParam
    ) || PROJECT_PAGES[0];

  return (
    <LivePageVisualEditor
      pageKey={page.slug}
      pageName={page.name}
      pageRoute={page.route}
      pageSection={page.section}
      pageCategory={page.category}
      availablePages={PROJECT_PAGES}
      onSwitchPage={(newSlug) => {
        router.push(`/admin/edit-page?slug=${newSlug}`);
      }}
      isCourseSpecific={false}
    />
  );
}

export default function AdminEditPageWorkspace() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-8 flex items-center justify-center">
          <div className="space-y-3 text-center">
            <span className="material-symbols-outlined animate-spin text-3xl text-[#d4af37]">
              progress_activity
            </span>
            <p className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Loading Page Editing Workspace...
            </p>
          </div>
        </div>
      }
    >
      <EditPageWorkspaceContent />
    </Suspense>
  );
}
