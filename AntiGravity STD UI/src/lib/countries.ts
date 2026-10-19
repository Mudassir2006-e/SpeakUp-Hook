import { parsePhoneNumber, type CountryCode as LibCountryCode } from "libphonenumber-js";

export interface CountryInfo {
  code: LibCountryCode;
  name: string;
  dialCode: string;
  flag: string;
  example: string;
  formatPlaceholder: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰", example: "300 1234567", formatPlaceholder: "300 1234567" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳", example: "98765 43210", formatPlaceholder: "98765 43210" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸", example: "(202) 555-0123", formatPlaceholder: "(202) 555-0123" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦", example: "82 123 4567", formatPlaceholder: "82 123 4567" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", example: "7911 123456", formatPlaceholder: "7911 123456" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", example: "(416) 555-0199", formatPlaceholder: "(416) 555-0199" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪", example: "50 123 4567", formatPlaceholder: "50 123 4567" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", example: "50 123 4567", formatPlaceholder: "50 123 4567" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺", example: "412 345 678", formatPlaceholder: "412 345 678" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪", example: "151 23456789", formatPlaceholder: "151 23456789" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷", example: "6 12 34 56 78", formatPlaceholder: "6 12 34 56 78" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹", example: "312 345 6789", formatPlaceholder: "312 345 6789" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸", example: "612 34 56 78", formatPlaceholder: "612 34 56 78" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱", example: "6 12345678", formatPlaceholder: "6 12345678" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭", example: "79 123 45 67", formatPlaceholder: "79 123 45 67" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪", example: "70 123 45 67", formatPlaceholder: "70 123 45 67" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴", example: "412 34 567", formatPlaceholder: "412 34 567" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰", example: "20 12 34 56", formatPlaceholder: "20 12 34 56" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪", example: "85 123 4567", formatPlaceholder: "85 123 4567" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿", example: "21 123 4567", formatPlaceholder: "21 123 4567" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬", example: "8123 4567", formatPlaceholder: "8123 4567" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾", example: "12 345 6789", formatPlaceholder: "12 345 6789" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷", example: "501 234 56 78", formatPlaceholder: "501 234 56 78" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦", example: "3312 3456", formatPlaceholder: "3312 3456" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼", example: "5012 3456", formatPlaceholder: "5012 3456" },
  { code: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭", example: "3600 1234", formatPlaceholder: "3600 1234" },
  { code: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲", example: "9123 4567", formatPlaceholder: "9123 4567" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩", example: "1712 345678", formatPlaceholder: "1712 345678" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰", example: "71 234 5678", formatPlaceholder: "71 234 5678" },
  { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵", example: "984 1234567", formatPlaceholder: "984 1234567" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭", example: "917 123 4567", formatPlaceholder: "917 123 4567" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩", example: "812 3456 7890", formatPlaceholder: "812 3456 7890" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬", example: "100 123 4567", formatPlaceholder: "100 123 4567" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬", example: "802 123 4567", formatPlaceholder: "802 123 4567" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪", example: "712 345678", formatPlaceholder: "712 345678" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳", example: "131 2345 6789", formatPlaceholder: "131 2345 6789" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵", example: "90 1234 5678", formatPlaceholder: "90 1234 5678" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷", example: "10 1234 5678", formatPlaceholder: "10 1234 5678" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷", example: "11 91234 5678", formatPlaceholder: "11 91234 5678" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Pakistan (+92)

/**
 * Finds country metadata by dial code (e.g. "+92" or "92").
 */
export function getCountryByDialCode(dialCode: string): CountryInfo {
  const clean = dialCode.trim().startsWith("+") ? dialCode.trim() : `+${dialCode.trim()}`;
  const found = COUNTRIES.find((c) => c.dialCode === clean);
  return found || DEFAULT_COUNTRY;
}

/**
 * Finds country metadata by ISO code (e.g. "PK", "IN", "US", "ZA").
 */
export function getCountryByCode(code: string): CountryInfo {
  const upper = code.trim().toUpperCase();
  const found = COUNTRIES.find((c) => c.code === upper);
  return found || DEFAULT_COUNTRY;
}

/**
 * Strips duplicate calling codes if user typed the country code into the local input field.
 * Example: if dialCode is "+92" and user typed "923001234567" or "+92 300 1234567",
 * returns "3001234567".
 */
export function stripDuplicateCallingCode(rawNumber: string, dialCode: string): string {
  let cleaned = rawNumber.trim();
  const digitsOnlyDial = dialCode.replace(/\D/g, "");

  // If starts with +<dialCode>
  if (cleaned.startsWith(dialCode)) {
    cleaned = cleaned.slice(dialCode.length).trim();
  } else if (cleaned.startsWith(`+${digitsOnlyDial}`)) {
    cleaned = cleaned.slice(digitsOnlyDial.length + 1).trim();
  } else if (cleaned.startsWith(digitsOnlyDial) && cleaned.length > digitsOnlyDial.length + 6) {
    cleaned = cleaned.slice(digitsOnlyDial.length).trim();
  }

  // Remove leading dashes/spaces if left behind
  return cleaned.replace(/^[\s-]+/, "");
}

/**
 * Normalizes a phone number to standard E.164 and clean national formats.
 */
export function normalizePhoneNumber(
  phone: string,
  countryOrDialCode: string = "+92"
): {
  isValid: boolean;
  e164: string;
  national: string;
  countryCode: string;
  countryIso: LibCountryCode;
  error?: string;
} {
  const country = countryOrDialCode.startsWith("+")
    ? getCountryByDialCode(countryOrDialCode)
    : getCountryByCode(countryOrDialCode);

  const cleanPhone = stripDuplicateCallingCode(phone, country.dialCode);

  if (!cleanPhone || !cleanPhone.replace(/\D/g, "")) {
    return {
      isValid: false,
      e164: "",
      national: "",
      countryCode: country.dialCode,
      countryIso: country.code,
      error: "Phone number is required.",
    };
  }

  try {
    const parsed = parsePhoneNumber(cleanPhone, country.code);
    if (parsed && parsed.isValid()) {
      return {
        isValid: true,
        e164: parsed.number, // e.g. +923001234567
        national: parsed.formatNational(), // e.g. 0300 1234567
        countryCode: `+${parsed.countryCallingCode}`,
        countryIso: parsed.country || country.code,
      };
    }
  } catch {
    // libphonenumber parse failed
  }

  // Fallback check for mobile numbering plan patterns
  const digits = cleanPhone.replace(/\D/g, "");
  if (country.code === "PK") {
    const isPakMobile =
      (digits.length === 10 && digits.startsWith("3")) ||
      (digits.length === 11 && digits.startsWith("03")) ||
      (digits.length === 12 && digits.startsWith("923"));
    if (isPakMobile) {
      const pure10 = digits.startsWith("923") ? digits.slice(2) : digits.startsWith("03") ? digits.slice(1) : digits;
      return {
        isValid: true,
        e164: `+92${pure10}`,
        national: `0${pure10}`,
        countryCode: "+92",
        countryIso: "PK",
      };
    }
  }

  return {
    isValid: false,
    e164: "",
    national: cleanPhone,
    countryCode: country.dialCode,
    countryIso: country.code,
    error: `Please enter a valid phone number for ${country.name} (e.g. ${country.example}).`,
  };
}
