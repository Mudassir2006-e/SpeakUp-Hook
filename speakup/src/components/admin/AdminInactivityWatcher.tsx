"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearAdminMfaSessionAction } from "@/lib/auth/adminVerification";

// Inactivity timeout: 12 hours (43,200,000 milliseconds)
const INACTIVITY_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const STORAGE_ACTIVITY_KEY = "speakup_admin_last_activity";
const STORAGE_SIGNOUT_EVENT_KEY = "speakup_admin_signout_trigger";

export default function AdminInactivityWatcher() {
  const router = useRouter();
  const isSigningOutRef = useRef(false);
  const lastLocalActivityRef = useRef<number>(Date.now());
  const lastStorageSyncRef = useRef<number>(Date.now());

  useEffect(() => {
    // Initialize activity timestamp
    const now = Date.now();
    lastLocalActivityRef.current = now;
    try {
      localStorage.setItem(STORAGE_ACTIVITY_KEY, now.toString());
    } catch {
      // Storage access safety
    }

    const performSignOut = async () => {
      if (isSigningOutRef.current) return;
      isSigningOutRef.current = true;

      try {
        // Broadcast signout to other open Admin Panel tabs
        localStorage.setItem(STORAGE_SIGNOUT_EVENT_KEY, Date.now().toString());
      } catch {
        // Storage access safety
      }

      try {
        await clearAdminMfaSessionAction();
      } catch {
        // MFA cookie clearance safety
      }

      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Offline / safety fallback
      }

      try {
        localStorage.removeItem(STORAGE_ACTIVITY_KEY);
        localStorage.removeItem("speakup_student_name");
        localStorage.removeItem("speakup_student_email");
        localStorage.removeItem("speakup_student_phone");
        localStorage.removeItem("speakup_enrolled_courses");
      } catch {
        // Storage cleanup
      }

      router.replace("/auth/login?reason=inactivity");
    };

    // Activity handler - resets inactivity timer upon user interaction
    const recordActivity = () => {
      if (isSigningOutRef.current) return;
      const current = Date.now();
      lastLocalActivityRef.current = current;

      // Throttle localStorage updates to avoid disk thrashing (every 5 seconds)
      if (current - lastStorageSyncRef.current > 5000) {
        lastStorageSyncRef.current = current;
        try {
          localStorage.setItem(STORAGE_ACTIVITY_KEY, current.toString());
        } catch {
          // Non-blocking
        }
      }
    };

    // Check expiration against both in-memory time and synced tab time
    const checkInactivity = () => {
      if (isSigningOutRef.current) return;
      const current = Date.now();
      let lastActivity = lastLocalActivityRef.current;

      try {
        const storedStr = localStorage.getItem(STORAGE_ACTIVITY_KEY);
        if (storedStr) {
          const storedTime = parseInt(storedStr, 10);
          if (!isNaN(storedTime) && storedTime > lastActivity) {
            lastActivity = storedTime;
            lastLocalActivityRef.current = storedTime;
          }
        }
      } catch {
        // Non-blocking
      }

      if (current - lastActivity >= INACTIVITY_TIMEOUT_MS) {
        performSignOut();
      }
    };

    // Storage event for multi-tab synchronization
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_SIGNOUT_EVENT_KEY) {
        performSignOut();
      } else if (e.key === STORAGE_ACTIVITY_KEY && e.newValue) {
        const parsed = parseInt(e.newValue, 10);
        if (!isNaN(parsed) && parsed > lastLocalActivityRef.current) {
          lastLocalActivityRef.current = parsed;
        }
      }
    };

    // Window focus & tab visibility change check
    const handleVisibilityOrFocus = () => {
      checkInactivity();
    };

    // Monitored meaningful user interaction events
    const monitoredEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "wheel",
    ];

    monitoredEvents.forEach((ev) => {
      window.addEventListener(ev, recordActivity, { passive: true });
    });

    window.addEventListener("storage", handleStorageEvent);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    // Periodic watchdog timer running every 5 seconds
    const intervalTimer = setInterval(checkInactivity, 5000);

    return () => {
      monitoredEvents.forEach((ev) => {
        window.removeEventListener(ev, recordActivity);
      });
      window.removeEventListener("storage", handleStorageEvent);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      clearInterval(intervalTimer);
    };
  }, [router]);

  return null;
}
