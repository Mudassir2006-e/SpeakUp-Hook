"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * AdminPreviewBanner
 * Renders an informative banner exclusively when an administrator is previewing
 * the student-facing LMS experience. Clearly delineates preview sessions from actual
 * student accounts without modifying student data or weakening server-side security.
 */
export default function AdminPreviewBanner() {
  const [isAdminPreview, setIsAdminPreview] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkRole() {
      try {
        if (typeof window !== "undefined" && window.location.search.includes("preview=admin")) {
          if (isMounted) setIsAdminPreview(true);
        }

        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && isMounted) {
          const appMetaRole = (user.app_metadata?.role as string) || null;
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.role === "admin" || appMetaRole === "admin") {
            setIsAdminPreview(true);
          }
        }
      } catch {}
    }

    checkRole();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!isAdminPreview) return null;

  return (
    <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs mb-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-display uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400">
              Administrator Live Preview
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold">
              Preview Session
            </span>
          </div>
          <p className="font-serif text-xs text-[var(--text-muted)] mt-0.5">
            Viewing authentic student-facing LMS environment. Actual student records remain protected with Row Level Security.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
        <Link
          href="/admin/courses"
          className="px-3.5 py-2 rounded-xl border border-amber-500/30 hover:border-amber-500 bg-white/40 dark:bg-black/20 text-amber-800 dark:text-amber-300 font-display text-xs uppercase tracking-wider font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <span className="material-symbols-outlined text-[16px]">menu_book</span>
          <span>Course Manager</span>
        </Link>
        <Link
          href="/admin/dashboard"
          className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Admin Panel</span>
        </Link>
      </div>
    </div>
  );
}
