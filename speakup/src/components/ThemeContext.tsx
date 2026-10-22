"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>("light");
  const pathname = usePathname();

  useEffect(() => {
    const isPublicWebsite =
      !pathname ||
      (!pathname.startsWith("/admin") && !pathname.startsWith("/lms"));

    const saved = localStorage.getItem("speakup-theme") as Theme | null;
    const userManuallySetPublic = sessionStorage.getItem("speakup-public-theme-explicit");

    let initialTheme: Theme = "light";

    if (isPublicWebsite) {
      // Requirement G: Default website theme must ALWAYS be Light Mode for public entries
      // Only use dark if the user explicitly switched theme during this visit
      if (userManuallySetPublic && (saved === "dark" || saved === "light")) {
        initialTheme = saved;
      } else {
        initialTheme = "light";
      }
    } else {
      // Authenticated Admin / LMS areas: honor saved user preference
      if (saved === "dark" || saved === "light") {
        initialTheme = saved;
      } else {
        initialTheme = "light";
      }
    }

    setThemeState(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, [pathname]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("speakup-theme", newTheme);
    sessionStorage.setItem("speakup-public-theme-explicit", "true");
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className={`p-2 rounded-full border border-[var(--surface-border)] text-[var(--text-main)] hover:text-[#d4af37] hover:bg-[#d4af37]/10 transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 ${className}`}
    >
      {theme === "light" ? (
        <svg
          className="w-5 h-5 text-[var(--text-main)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          className="w-5 h-5 text-[#d4af37]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
};
