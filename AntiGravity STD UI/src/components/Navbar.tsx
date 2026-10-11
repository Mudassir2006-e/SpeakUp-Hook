"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";
import { ThemeToggle } from "./ThemeContext";
import { useCmsContent } from "@/lib/cms/useCmsContent";

interface NavLink {
  label: string;
  href: string;
}

const defaultNavLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Methodology", href: "/methodology" },
  { label: "Pricing", href: "/pricing" },
  { label: "Privacy", href: "/privacy" },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cms = useCmsContent("home");
  const cmsHeader = cms?.header;

  const navLinks: NavLink[] = [
    { label: cmsHeader?.nav1Label || "Home", href: cmsHeader?.nav1Link || "/" },
    { label: cmsHeader?.nav2Label || "Courses", href: cmsHeader?.nav2Link || "/courses" },
    { label: cmsHeader?.nav3Label || "Methodology", href: cmsHeader?.nav3Link || "/methodology" },
    { label: cmsHeader?.nav4Label || "Pricing", href: cmsHeader?.nav4Link || "/pricing" },
    { label: cmsHeader?.nav5Label || "Privacy", href: cmsHeader?.nav5Link || "/privacy" },
  ];

  const isHomepage = pathname === "/";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    // Contextual fallback when arriving directly without prior session history
    if (pathname.startsWith("/course-outline") || pathname.startsWith("/courses/")) {
      router.push("/courses");
    } else if (pathname.startsWith("/lms-journey")) {
      router.push("/methodology");
    } else {
      router.push("/");
    }
  };

  return (
    <nav className="w-full top-0 sticky z-50 border-b border-[var(--surface-border)] shadow-[0_4px_30px_rgba(0,0,0,0.02)] transition-all duration-300 backdrop-blur-md bg-[var(--bg-main)]/90">
      <div className="flex justify-between items-center px-6 md:px-12 max-w-[1200px] mx-auto h-[88px]">
        {/* Brand Logo [SpeakUp logo] + [SpeakUp brand name] */}
        <Logo
          size="md"
          brandText={cmsHeader?.logoText}
          tagline={cmsHeader?.logoTagline}
          customImage={cmsHeader?.logoImage}
        />

        {/* HOMEPAGE: Desktop Nav Links (Home, Courses, Methodology, Pricing, Privacy) */}
        {isHomepage && (
          <div className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-display text-[13px] uppercase tracking-widest px-4 py-2 rounded-full transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "font-bold bg-[#d4af37]/15 dark:bg-[#d4af37]/25 text-[var(--text-main)] border border-[#d4af37]/40 shadow-xs"
                      : "text-[var(--text-muted)] hover:text-[#d4af37] border border-transparent hover:border-[#d4af37]/30 hover:bg-black/5 dark:hover:bg-white/5 font-semibold"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* HOMEPAGE: ThemeToggle + Round Person/Account Icon */}
        {isHomepage && (
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Link
              href="/auth/login"
              className="w-10 h-10 rounded-full border border-[var(--surface-border)] bg-[var(--surface-lowest)] hover:border-[#d4af37] hover:bg-[#d4af37]/10 flex items-center justify-center transition-all shadow-xs group cursor-pointer active:scale-95"
              aria-label="Account"
              title="Account"
            >
              <svg
                className="w-5 h-5 text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>

            {/* Mobile Hamburger Menu Toggle (Homepage Only) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="lg:hidden p-2 rounded-lg border border-[var(--surface-border)] text-[var(--text-main)] hover:text-[#d4af37] transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* INNER PAGES: Contextual Back Button */}
        {!isHomepage && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface-lowest)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] transition-all shadow-xs group cursor-pointer active:scale-95 font-display text-[12px] uppercase tracking-widest font-semibold"
              aria-label="Back to previous page"
            >
              <svg
                className="w-4 h-4 text-[var(--text-main)] group-hover:text-[#d4af37] group-hover:-translate-x-0.5 transition-transform"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Drawer Menu (Homepage Only) */}
      {isHomepage && mobileMenuOpen && (
        <div className="lg:hidden border-t border-[var(--surface-border)] bg-[var(--bg-main)] px-6 py-5 space-y-2 shadow-lg animate-in fade-in duration-200">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block font-display text-[13px] uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#d4af37]/20 text-[var(--text-main)] font-bold border-l-4 border-[#d4af37]"
                    : "text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-main)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-4 border-t border-[var(--surface-border)] flex items-center justify-center">
            <Link
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-11 h-11 rounded-full border border-[var(--surface-border)] bg-[var(--surface-lowest)] hover:border-[#d4af37] hover:bg-[#d4af37]/10 flex items-center justify-center transition-all shadow-xs group cursor-pointer"
              aria-label="Account"
              title="Account"
            >
              <svg
                className="w-5 h-5 text-[var(--text-main)] group-hover:text-[#d4af37] transition-colors"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
