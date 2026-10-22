"use client";

import React, { useState } from "react";
import { getInitials } from "@/lib/validation";

interface InitialsAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  className?: string;
  sizeClass?: string;
  textSizeClass?: string;
}

export default function InitialsAvatar({
  name,
  avatarUrl,
  className = "",
  sizeClass = "w-12 h-12",
  textSizeClass = "text-base",
}: InitialsAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initial = getInitials(name);

  const hasValidCustomUrl =
    avatarUrl &&
    !avatarUrl.startsWith("data:") &&
    !avatarUrl.includes("unsplash.com") && // treat unsplash default as placeholder
    !imgError;

  if (hasValidCustomUrl) {
    return (
      <div
        className={`${sizeClass} rounded-full overflow-hidden border-2 border-[#d4af37] bg-white dark:bg-[#141416] shrink-0 aspect-square ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl!}
          alt={name || "User Avatar"}
          className="w-full h-full object-cover rounded-full block"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full border-2 border-[#d4af37] bg-[#fbf9f4] dark:bg-[var(--surface-low)] text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center font-display font-extrabold uppercase shrink-0 select-none shadow-xs aspect-square ${textSizeClass} ${className}`}
      title={name || "User Avatar"}
      aria-label={name || "User Avatar"}
    >
      {initial}
    </div>
  );
}
