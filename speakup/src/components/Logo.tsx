"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getLogoSettingsAction, LogoSettingsData } from "@/app/admin/logo-actions";
import { useCmsContent } from "@/lib/cms/useCmsContent";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  href?: string;
  className?: string;
  brandText?: string;
  tagline?: string;
  customImage?: string;
  standColor?: string;
}

// Global in-memory cache to share logo settings across all instances instantly
let globalLogoSettings: LogoSettingsData | null = null;
let logoFetchPromise: Promise<LogoSettingsData | null> | null = null;

export function useSharedLogo() {
  const [logoSettings, setLogoSettings] = useState<LogoSettingsData | null>(globalLogoSettings);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    // Detect dark mode from html class or local storage
    const checkDark = () => {
      if (typeof document !== "undefined") {
        setIsDarkMode(document.documentElement.classList.contains("dark"));
      }
    };
    checkDark();

    // Listen for theme mutations
    const observer = new MutationObserver(checkDark);
    if (typeof document !== "undefined") {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    }

    // Try loading from localStorage first for instant display
    if (!globalLogoSettings && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("speakup_shared_logos");
        if (cached) {
          const parsed = JSON.parse(cached);
          globalLogoSettings = parsed;
          setLogoSettings(parsed);
        }
      } catch {
        // Ignore JSON error
      }
    }

    // Fetch latest logo settings from Supabase
    if (!logoFetchPromise) {
      logoFetchPromise = getLogoSettingsAction()
        .then((res) => {
          if (res.success && res.data) {
            globalLogoSettings = res.data;
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("speakup_shared_logos", JSON.stringify(res.data));
              } catch {}
            }
            return res.data;
          }
          return null;
        })
        .catch(() => null)
        .finally(() => {
          logoFetchPromise = null;
        });
    }

    logoFetchPromise.then((data) => {
      if (data) setLogoSettings(data);
    });

    // Listen for custom logo update events (e.g. from Admin Logo Management tab)
    const handleLogoUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<LogoSettingsData | null>;
      if (customEvent.detail) {
        globalLogoSettings = customEvent.detail;
        setLogoSettings(customEvent.detail);
      } else {
        // Re-fetch
        getLogoSettingsAction().then((res) => {
          if (res.success && res.data) {
            globalLogoSettings = res.data;
            setLogoSettings(res.data);
            try {
              localStorage.setItem("speakup_shared_logos", JSON.stringify(res.data));
            } catch {}
          }
        });
      }
    };

    window.addEventListener("speakup-logo-updated", handleLogoUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener("speakup-logo-updated", handleLogoUpdate);
    };
  }, []);

  const activeCustomLogo = isDarkMode
    ? logoSettings?.darkLogoUrl || logoSettings?.lightLogoUrl || null
    : logoSettings?.lightLogoUrl || logoSettings?.darkLogoUrl || null;

  return { activeCustomLogo, isDarkMode };
}

export const SpeakUpSymbol: React.FC<{
  sizeClass?: string;
  themeMode?: "light" | "dark" | "auto";
  standColor?: string;
  customImage?: string;
}> = ({
  sizeClass = "w-11 h-11",
  themeMode = "auto",
  standColor,
  customImage: explicitCustomImage,
}) => {
  const { activeCustomLogo } = useSharedLogo();
  const [imageError, setImageError] = useState(false);
  const reactId = React.useId();
  const gradId = `goldPrestigeGrad_${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const displayImage = explicitCustomImage || activeCustomLogo;

  // Outer Cradle, Neck, and Stand Base:
  // Light theme: #141416 deep charcoal obsidian (matches approved branding)
  // Dark theme: #E5E2E1 crisp luminous silver for high contrast
  const resolvedStandStroke = standColor
    ? standColor
    : themeMode === "light"
      ? "#141416"
      : themeMode === "dark"
        ? "#E5E2E1"
        : "currentColor";

  const standClassName = standColor
    ? ""
    : themeMode === "light"
      ? "text-[#141416]"
      : themeMode === "dark"
        ? "text-[#E5E2E1]"
        : "text-[#141416] dark:text-[#E5E2E1] transition-colors";

  // If an uploaded custom logo is active and valid, display it
  if (displayImage && !imageError) {
    return (
      <div className={`relative shrink-0 flex items-center justify-center aspect-square ${sizeClass}`}>
        <img
          src={displayImage}
          alt="SpeakUp Logo"
          className="w-full h-full object-contain shrink-0 aspect-square"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Canonical Vector SpeakUp Emblem Fallback
  return (
    <div className={`relative shrink-0 flex items-center justify-center aspect-square ${sizeClass}`}>
      <svg
        viewBox="0 0 240 240"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full object-contain shrink-0 aspect-square"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F2D06B" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#A8811A" />
          </linearGradient>
        </defs>

        <g transform="translate(120, 115)">
          {/* Outer Speech Resonance Wave Arcs */}
          <path
            d="M -62 -28 C -74 -10, -74 18, -62 36"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="4"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />
          <path
            d="M 62 -28 C 74 -10, 74 18, 62 36"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="4"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />

          {/* Outer Cradle / U-Bracket */}
          <path
            d="M -42 -2 C -42 28, -24 48, 0 48 C 24 48, 42 28, 42 -2"
            fill="none"
            stroke={resolvedStandStroke}
            className={`logo-mic-stand ${standClassName}`}
            strokeWidth="9"
            strokeLinecap="round"
          />

          {/* Microphone Neck & Base Stand */}
          <line
            x1="0"
            y1="48"
            x2="0"
            y2="76"
            stroke={resolvedStandStroke}
            className={`logo-mic-stand ${standClassName}`}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M -30 76 L 30 76"
            stroke={resolvedStandStroke}
            className={`logo-mic-stand ${standClassName}`}
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Central Microphone Capsule Body */}
          <rect x="-24" y="-72" width="48" height="84" rx="24" fill={`url(#${gradId})`} />

          {/* Microphone Acoustic Slits */}
          <line x1="-12" y1="-52" x2="12" y2="-52" stroke="#141416" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="-15" y1="-42" x2="15" y2="-42" stroke="#141416" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="-12" y1="-32" x2="12" y2="-32" stroke="#141416" strokeWidth="3.5" strokeLinecap="round" />

          {/* Upward Voice Elevation Arc */}
          <path d="M -12 -10 Q 0 4 12 -10" fill="none" stroke="#141416" strokeWidth="4" strokeLinecap="round" />

          {/* Upward Beacon Apex Star */}
          <circle cx="0" cy="-88" r="6" fill="#D4AF37" />
        </g>
      </svg>
    </div>
  );
};

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showText = true,
  href = "/",
  className = "",
  brandText,
  tagline,
  customImage,
  standColor,
}) => {
  const cms = useCmsContent("home");
  const cmsHeader = cms?.header;
  const effectiveBrandText = brandText || cmsHeader?.logoText || "SpeakUp";
  // "Linguistic Institute" tagline is strictly removed everywhere from SpeakUp logo
  const cleanTagline = tagline && tagline !== "Linguistic Institute" ? tagline : "";
  const effectiveTagline = cleanTagline || (cmsHeader?.logoTagline && cmsHeader.logoTagline !== "Linguistic Institute" ? cmsHeader.logoTagline : "");
  const effectiveCustomImage = customImage || cmsHeader?.logoImage;

  const sizeMap = {
    sm: { symbol: "w-8 h-8 shrink-0", text: "text-sm sm:text-base tracking-tight" },
    md: { symbol: "w-10 h-10 sm:w-11 sm:h-11 shrink-0", text: "text-xl sm:text-2xl tracking-tight" },
    lg: { symbol: "w-12 h-12 sm:w-14 sm:h-14 shrink-0", text: "text-2xl sm:text-3xl tracking-tight" },
    xl: { symbol: "w-16 h-16 sm:w-20 sm:h-20 shrink-0", text: "text-3xl sm:text-4xl tracking-tight" },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 group cursor-pointer transition-transform active:scale-[0.98] shrink-0 ${className}`}>
      <SpeakUpSymbol sizeClass={currentSize.symbol} customImage={effectiveCustomImage} standColor={standColor} />
      {showText && (
        <div className="flex flex-col shrink-0 justify-center">
          <span className={`font-display font-bold uppercase tracking-wider text-[#141416] dark:text-[#f7f0e8] brand-name-text leading-none whitespace-nowrap select-none ${currentSize.text}`}>
            {effectiveBrandText}
          </span>
          {effectiveTagline ? (
            <span className="text-[9px] font-serif uppercase tracking-widest text-[#d4af37] leading-none mt-1 whitespace-nowrap select-none">
              {effectiveTagline}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} aria-label={`${effectiveBrandText} Home`} className="inline-flex items-center shrink-0">
        {content}
      </Link>
    );
  }

  return content;
};

export default Logo;
