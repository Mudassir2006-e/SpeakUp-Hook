"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getPublishedSelectorsAction } from "@/app/admin/cms-actions";

const ROUTE_PAGE_MAP: Record<string, string> = {
  "/": "home",
  "/about": "about",
  "/courses": "courses",
  "/pricing": "pricing",
  "/course-outline": "course-outline",
  "/faq": "faq",
  "/methodology": "methodology",
  "/book-session": "book-session",
  "/reviews": "about",
  "/faculty": "faculty",
  "/lms-journey": "lms-journey",
  "/demo": "demo",
  "/auth/login": "auth-login",
  "/auth/register": "auth-register",
  "/lms/dashboard": "lms-dashboard",
  "/lms/courses": "lms-courses",
  "/lms/learn": "lms-learn",
  "/lms/events": "lms-events",
  "/lms/certificates": "lms-certificates",
  "/lms/profile": "lms-profile",
};

interface SelectorItem {
  selector: string;
  type: "text" | "image";
  value: string;
  originalValue?: string;
  elementTag?: string;
  objectFit?: string;
}

export default function CmsPublishedHydrator() {
  const pathname = usePathname();
  const observerRef = useRef<MutationObserver | null>(null);
  const isApplyingRef = useRef<boolean>(false);

  useEffect(() => {
    // Skip if running inside an iframe (e.g. Visual Editor preview)
    if (typeof window !== "undefined" && window.self !== window.top) {
      return;
    }

    // Skip on admin management pages
    if (pathname.startsWith("/admin")) {
      return;
    }

    const pageKey = ROUTE_PAGE_MAP[pathname] || (pathname.slice(1).replace(/\//g, "-") || "home");
    let isCancelled = false;

    /**
     * Resiliently finds the matching DOM element on the public page.
     * Uses exact selector, cleaned selector (stripping iframe wrappers), and content anchors.
     */
    const findMatchingElement = (sel: string, item: SelectorItem): HTMLElement | null => {
      // 1. Direct match
      try {
        const el = document.querySelector(sel);
        if (el) return el as HTMLElement;
      } catch {}

      // 2. Cleaned selector: strip iframe-specific prefixes like 'div:nth-of-type(...) >'
      if (sel.includes("main")) {
        try {
          const mainIdx = sel.indexOf("main");
          const cleaned = sel.slice(mainIdx);
          const el = document.querySelector(cleaned);
          if (el) return el as HTMLElement;
        } catch {}
      }

      if (sel.includes("section")) {
        try {
          const secIdx = sel.indexOf("section");
          const cleaned = sel.slice(secIdx);
          const el = document.querySelector(cleaned);
          if (el) return el as HTMLElement;
        } catch {}
      }

      // 3. Fallback by original text value anchor
      if (item.type === "text" && item.originalValue?.trim()) {
        const targetText = item.originalValue.trim();
        const tag = item.elementTag?.toLowerCase() || "*";
        const candidates = document.querySelectorAll(tag);
        for (let i = 0; i < candidates.length; i++) {
          const cand = candidates[i] as HTMLElement;
          if (cand.textContent?.trim() === targetText || cand.innerText?.trim() === targetText) {
            return cand;
          }
        }
      }

      return null;
    };

    /**
     * Applies published selector values to the DOM.
     * Supports single characters, punctuation marks, complete paragraphs, and images.
     */
    const applySelectors = (selectors: Record<string, SelectorItem>) => {
      if (!selectors || Object.keys(selectors).length === 0) return;
      if (isApplyingRef.current) return;
      isApplyingRef.current = true;

      try {
        Object.entries(selectors).forEach(([sel, item]) => {
          if (!item) return;

          const el = findMatchingElement(sel, item);
          if (!el) return;

          if (item.type === "text" && item.value !== undefined) {
            // Check if textContent needs update (supports single char, punctuation, or empty string)
            if (el.textContent !== item.value) {
              el.textContent = item.value;
              el.setAttribute("data-cms-published-applied", "true");
            }
          } else if (item.type === "image" && item.value && el.tagName === "IMG") {
            const img = el as HTMLImageElement;
            if (img.src !== item.value) {
              img.src = item.value;
            }
            if (item.objectFit) {
              img.style.objectFit = item.objectFit;
            }
            img.setAttribute("data-cms-published-applied", "true");
          }
        });
      } finally {
        setTimeout(() => {
          isApplyingRef.current = false;
        }, 50);
      }
    };

    let cachedSelectors: Record<string, SelectorItem> | null = null;

    const hydratePublishedEdits = async () => {
      try {
        const res = await getPublishedSelectorsAction(pageKey);
        if (isCancelled || !res.success || !res.data) return;

        cachedSelectors = res.data as Record<string, SelectorItem>;
        if (Object.keys(cachedSelectors).length === 0) return;

        // 1. Immediate application
        applySelectors(cachedSelectors);

        // 2. Timed follow-ups for dynamic React components
        const timer1 = setTimeout(() => {
          if (!isCancelled && cachedSelectors) applySelectors(cachedSelectors);
        }, 150);

        const timer2 = setTimeout(() => {
          if (!isCancelled && cachedSelectors) applySelectors(cachedSelectors);
        }, 600);

        // 3. Attach persistent MutationObserver to protect against React virtual DOM overwrites
        if (observerRef.current) {
          observerRef.current.disconnect();
        }

        observerRef.current = new MutationObserver(() => {
          if (!isCancelled && cachedSelectors && !isApplyingRef.current) {
            applySelectors(cachedSelectors);
          }
        });

        observerRef.current.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      } catch {
        // Graceful failover
      }
    };

    hydratePublishedEdits();

    const handlePublishedBroadcast = () => {
      hydratePublishedEdits();
    };

    window.addEventListener("speakup-cms-published", handlePublishedBroadcast);

    return () => {
      isCancelled = true;
      window.removeEventListener("speakup-cms-published", handlePublishedBroadcast);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [pathname]);

  return null;
}
