"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

interface AdminSidebarProps {
  adminEmail?: string | null;
}

interface NavGroup {
  title: string;
  items: {
    label: string;
    href: string;
    icon: string;
  }[];
}

export default function AdminSidebar({ adminEmail: _adminEmail }: AdminSidebarProps) {
  const pathname = usePathname();

  const navGroups: NavGroup[] = [
    {
      title: "Main",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" },
        { label: "Students", href: "/admin/students", icon: "group" },
        { label: "Student Assignment Checker", href: "/admin/assignments", icon: "assignment_turned_in" },
        { label: "Courses", href: "/admin/courses", icon: "school" },
        { label: "Course Requests", href: "/admin/course-requests", icon: "how_to_reg" },
      ],
    },
    {
      title: "Content & Website",
      items: [
        { label: "Edit Website", href: "/admin/edit", icon: "web" },
        { label: "Course Outline", href: "/admin/edit-course-outline", icon: "format_list_numbered" },
        { label: "Benefits", href: "/admin/benefits", icon: "verified" },
        { label: "Teachers & Faculty", href: "/admin/teachers", icon: "badge" },
        { label: "FAQs", href: "/admin/faqs", icon: "quiz" },
        { label: "Upcoming Events", href: "/admin/events", icon: "event" },
      ],
    },
    {
      title: "Feedback & Moderation",
      items: [
        { label: "Reviews", href: "/admin/reviews", icon: "rate_review" },
      ],
    },
    {
      title: "Communication & Settings",
      items: [
        { label: "Email Center", href: "/admin/emails", icon: "mail" },
        { label: "Portal Email", href: "/admin/portal-email", icon: "alternate_email" },
        { label: "Links & Socials", href: "/admin/links", icon: "share" },
        { label: "AI & Integrations", href: "/admin/integrations", icon: "hub" },
      ],
    },
  ];

  return (
    <aside className="w-68 shrink-0 bg-white dark:bg-[#141416] border-r border-[var(--surface-border)] flex flex-col h-screen sticky top-0 shadow-xs z-30">
      {/* Brand Header with Prominent SpeakUp Branding */}
      <div className="p-5 border-b border-[var(--surface-border)] space-y-3">
        <div className="flex items-center">
          <Logo size="md" href="/admin/dashboard" brandText="SpeakUp" />
        </div>

        {/* Elegant Admin Panel Label */}
        <div className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#d4af37]/15 via-[#d4af37]/20 to-[#d4af37]/15 border border-[#d4af37]/35 flex items-center justify-center gap-2 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse"></span>
          <span className="font-display text-[11px] uppercase tracking-widest font-extrabold text-[#8a6d1b] dark:text-[#e4c665]">
            Admin Control Center
          </span>
        </div>
      </div>

      {/* Main Navigation Links Grouped by Area */}
      <nav className="flex-1 p-3.5 space-y-5 overflow-y-auto custom-scroll">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-display uppercase tracking-widest text-[#8a6d1b] dark:text-[#d4af37] font-bold flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#d4af37]"></span>
              <span>{group.title}</span>
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.href || (pathname?.startsWith(item.href + "/") && item.href !== "/admin");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold transition-all ${
                    isActive
                      ? "bg-[#d4af37]/20 text-[#141416] dark:text-[#d4af37] border-r-3 border-[#d4af37] font-bold shadow-2xs"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)]"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[19px] ${isActive ? "text-[#d4af37]" : "text-[var(--text-muted)]"}`}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
