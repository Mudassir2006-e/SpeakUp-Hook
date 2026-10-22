"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { COUNTRIES, getCountryByDialCode, type CountryInfo } from "@/lib/countries";

interface CountryPhoneInputProps {
  id?: string;
  phone: string;
  countryCode: string;
  onChangePhone: (phone: string) => void;
  onChangeCountryCode: (countryCode: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function CountryPhoneInput({
  id = "reg-phone",
  phone,
  countryCode,
  onChangePhone,
  onChangeCountryCode,
  error,
  required = true,
  disabled = false,
  className = "",
}: CountryPhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = useMemo(() => {
    return getCountryByDialCode(countryCode);
  }, [countryCode]);

  // Filter countries by name, dialCode, or ISO code
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectCountry = (country: CountryInfo) => {
    onChangeCountryCode(country.dialCode);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handlePhoneChange = (val: string) => {
    let clean = val;
    // Prevent duplicate country code if user types it into input
    const digitsOnlyDial = selectedCountry.dialCode.replace(/\D/g, "");
    if (clean.startsWith(selectedCountry.dialCode)) {
      clean = clean.slice(selectedCountry.dialCode.length);
    } else if (clean.startsWith(`+${digitsOnlyDial}`)) {
      clean = clean.slice(digitsOnlyDial.length + 1);
    }
    onChangePhone(clean);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`flex border bg-[var(--surface-lowest)] rounded-xl overflow-hidden transition-all duration-200 ${
          error
            ? "border-rose-500"
            : isOpen
            ? "border-[#d4af37] ring-1 ring-[#d4af37]"
            : "border-[var(--surface-border)] focus-within:border-[#d4af37]"
        }`}
      >
        {/* Country Selector Trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Select country, current is ${selectedCountry.name} (${selectedCountry.dialCode})`}
          className="flex items-center gap-1.5 bg-[var(--surface-low)] hover:bg-[var(--surface-border)]/50 px-3 py-3 border-r border-[var(--surface-border)] text-[var(--text-main)] font-serif text-sm transition-colors cursor-pointer select-none shrink-0"
        >
          <span className="text-base" role="img" aria-label={selectedCountry.name}>
            {selectedCountry.flag}
          </span>
          <span className="font-semibold text-xs text-[var(--text-main)]">
            {selectedCountry.dialCode}
          </span>
          <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)] transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "none" }}>
            expand_more
          </span>
        </button>

        {/* National Number Input */}
        <input
          id={id}
          required={required}
          disabled={disabled}
          type="tel"
          placeholder={selectedCountry.formatPlaceholder}
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          className="w-full p-3.5 font-serif text-base bg-transparent text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50 border-none focus:outline-none"
        />
      </div>

      {/* Searchable Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 max-h-72 bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="p-2.5 border-b border-[var(--surface-border)] bg-[var(--surface-low)] sticky top-0">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--text-muted)] pointer-events-none">
                search
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code..."
                className="w-full pl-8 pr-3 py-1.5 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-xs rounded-lg border border-[var(--surface-border)] focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          {/* Countries List */}
          <div className="overflow-y-auto divide-y divide-[var(--surface-border)]/40 flex-1">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c) => (
                <button
                  key={`${c.code}-${c.dialCode}`}
                  type="button"
                  onClick={() => handleSelectCountry(c)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-[var(--surface-low)] transition-colors cursor-pointer text-xs ${
                    c.dialCode === countryCode && c.code === selectedCountry.code
                      ? "bg-[#d4af37]/10 text-[#8a6d1b] dark:text-[#d4af37] font-semibold"
                      : "text-[var(--text-main)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    <span className="text-base shrink-0">{c.flag}</span>
                    <span className="font-serif truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">
                      {c.dialCode}
                    </span>
                    {c.dialCode === countryCode && c.code === selectedCountry.code && (
                      <span className="material-symbols-outlined text-[16px] text-[#d4af37]">
                        check
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs font-serif text-[var(--text-muted)]">
                No country found matching &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}

      {/* Helper text showing national number example */}
      <p className="mt-1 text-[11px] font-serif text-[var(--text-muted)] flex items-center justify-between">
        <span>Example: <strong className="text-[var(--text-main)] font-mono">{selectedCountry.example}</strong></span>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{selectedCountry.name}</span>
      </p>
    </div>
  );
}
