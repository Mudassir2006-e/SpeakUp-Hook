"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

export const Footer: React.FC = () => {
  const pathname = usePathname();

  // SpeakUp Footer is strictly a Homepage-only element
  if (pathname !== "/") {
    return null;
  }

  return (
    <footer className="bg-[var(--bg-main)] border-t border-[var(--surface-border)] relative overflow-hidden transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 px-6 md:px-12 py-12 max-w-[1200px] mx-auto relative z-10 items-start">
        {/* Col 1: Brand & Tagline */}
        <div className="flex flex-col items-start gap-4">
          <Logo size="md" />
          <p className="text-[14px] text-[var(--text-muted)] font-serif max-w-[240px] leading-relaxed">
            Premium linguistic education for the discerning global professional.
          </p>
          <div className="flex flex-col gap-1.5 mt-1 text-[13px] text-[var(--text-muted)] font-serif">
            <Link href="/privacy" className="hover:text-[#d4af37] transition-colors">
              Privacy &amp; Policies
            </Link>
            <Link href="/pricing?tab=terms" className="hover:text-[#d4af37] transition-colors">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>

        {/* Col 2: Platform Links */}
        <div className="flex flex-col gap-2.5">
          <h4 className="font-display text-[12px] uppercase tracking-[0.2em] font-bold text-[var(--text-main)] mb-1">
            Platform
          </h4>
          <Link href="/auth/login" className="text-[14px] text-[var(--text-muted)] hover:text-[#d4af37] transition-colors font-serif">
            Student Portal
          </Link>
          <Link href="/courses" className="text-[14px] text-[var(--text-muted)] hover:text-[#d4af37] transition-colors font-serif">
            Courses
          </Link>
          <Link href="/methodology" className="text-[14px] text-[var(--text-muted)] hover:text-[#d4af37] transition-colors font-serif">
            Methodology
          </Link>
          <Link href="/faq" className="text-[14px] text-[var(--text-muted)] hover:text-[#d4af37] transition-colors font-serif">
            FAQs
          </Link>
        </div>

        {/* Col 3: Social Platforms */}
        <div className="flex flex-col gap-2.5">
          <h4 className="font-display text-[12px] uppercase tracking-[0.2em] font-bold text-[var(--text-main)] mb-1">
            Social Platforms
          </h4>
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] text-[var(--text-muted)] hover:text-[#d4af37] transition-colors font-serif"
          >
            LinkedIn
          </a>
          <a
            href="https://www.instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] text-[var(--text-muted)] hover:text-[#d4af37] transition-colors font-serif"
          >
            Instagram
          </a>
        </div>

        {/* Col 4: Contact Administration */}
        <div className="flex flex-col gap-2.5">
          <h4 className="font-display text-[12px] uppercase tracking-[0.2em] font-bold text-[var(--text-main)] mb-1">
            Contact Administration
          </h4>
          <p className="text-[13px] text-[var(--text-muted)] font-serif leading-relaxed mb-1">
            Reach out to our academic administration for guidance on curriculum, enrollment, and verification.
          </p>
          <div className="flex items-center gap-3 group mt-0.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--surface-low)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[#d4af37] group-hover:text-white transition-colors shrink-0">
              <span className="material-symbols-outlined text-[17px]">mail</span>
            </div>
            <a
              href="mailto:admissions@speakup.com"
              className="text-[14px] font-serif text-[var(--text-main)] hover:text-[#d4af37] transition-colors truncate"
            >
              admissions@speakup.com
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[var(--surface-border)] px-6 md:px-12 py-5 max-w-[1200px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-[12px] text-[var(--text-muted)] font-serif">
        <span>© 2026 SpeakUp Premium Education. All rights reserved.</span>
        <span className="font-display uppercase tracking-wider text-[11px]">Editorial Heritage Design System</span>
      </div>
    </footer>
  );
};

export default Footer;
