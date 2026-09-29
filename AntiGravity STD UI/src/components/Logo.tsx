import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  href?: string;
  className?: string;
}

export const SpeakUpSymbol: React.FC<{ sizeClass?: string }> = ({
  sizeClass = "w-11 h-11",
}) => {
  return (
    <div className={`relative shrink-0 flex items-center justify-center ${sizeClass}`}>
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full object-contain"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldPrestigeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F2D06B" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#A8811A" />
          </linearGradient>
          <linearGradient id="charcoalGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#222226" />
            <stop offset="100%" stopColor="#141416" />
          </linearGradient>
          <linearGradient id="charcoalGradDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E5E2E1" />
            <stop offset="100%" stopColor="#C8C6C5" />
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
            stroke="#141416"
            className="logo-mic-stand stroke-[#141416] dark:stroke-[#e5e2e1] transition-colors"
            strokeWidth="9"
            strokeLinecap="round"
          />

          {/* Microphone Neck & Base Stand */}
          <line
            x1="0"
            y1="48"
            x2="0"
            y2="76"
            stroke="#141416"
            className="logo-mic-stand stroke-[#141416] dark:stroke-[#e5e2e1] transition-colors"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M -30 76 L 30 76"
            stroke="#141416"
            className="logo-mic-stand stroke-[#141416] dark:stroke-[#e5e2e1] transition-colors"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Central Microphone Capsule Body */}
          <rect x="-24" y="-72" width="48" height="84" rx="24" fill="url(#goldPrestigeGrad)" />

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
}) => {
  const sizeMap = {
    sm: { symbol: "w-8 h-8", text: "text-base md:text-lg tracking-tight" },
    md: { symbol: "w-11 h-11", text: "text-xl md:text-2xl tracking-tight" },
    lg: { symbol: "w-14 h-14", text: "text-2xl md:text-3xl tracking-tight" },
    xl: { symbol: "w-20 h-20", text: "text-3xl md:text-4xl tracking-tight" },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 group cursor-pointer transition-transform active:scale-[0.98] ${className}`}>
      <SpeakUpSymbol sizeClass={currentSize.symbol} />
      {showText && (
        <span className={`font-display font-bold uppercase tracking-wider text-[#141416] dark:text-[#f7f0e8] brand-name-text ${currentSize.text}`}>
          SpeakUp
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} aria-label="SpeakUp Home">{content}</Link>;
  }

  return content;
};

export default Logo;
