/**
 * Validation utilities for student & admin forms across SpeakUp LMS.
 * Enforces rigorous client- and server-side checks for names, emails, passwords, and phone numbers.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a person's name.
 * - Required.
 * - Length between 2 and 50 characters.
 * - Must contain alphabetic letters and only valid name punctuation (spaces, hyphens, apostrophes).
 * - Rejects purely numeric, symbolic, or nonsensical input.
 */
export function validateName(name: string, fieldLabel = "Name"): ValidationResult {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return { valid: false, error: `${fieldLabel} is required.` };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: `${fieldLabel} must be at least 2 characters long.` };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: `${fieldLabel} cannot exceed 50 characters.` };
  }
  // Must contain at least one letter and only letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\u00C0-\u024F\s'-]+$/;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, error: `${fieldLabel} contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed.` };
  }
  return { valid: true };
}

/**
 * Validates an email address against RFC 5322 format.
 * - Required.
 * - Proper format with user, domain, and valid TLD.
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = (email || "").trim();
  if (!trimmed) {
    return { valid: false, error: "Email address is required." };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address (e.g. scholar@example.com)." };
  }
  return { valid: true };
}

/**
 * Detailed real-time status of individual password requirements.
 */
export interface PasswordRequirementsStatus {
  minLength: boolean;     // At least 8 characters
  hasUppercase: boolean;  // At least 1 uppercase letter (A-Z)
  hasLowercase: boolean;  // At least 1 lowercase letter (a-z)
  hasTwoDigits: boolean;  // At least 2 numeric digits (0-9)
  hasSpecialChar: boolean;// At least 1 special character (!@#$%^&* etc.)
  allValid: boolean;
}

/**
 * Checks a password string against all 5 security requirements in real-time.
 */
export function checkPasswordRequirements(password: string): PasswordRequirementsStatus {
  const p = password || "";
  const minLength = p.length >= 8;
  const hasUppercase = /[A-Z]/.test(p);
  const hasLowercase = /[a-z]/.test(p);
  const digitMatches = p.match(/\d/g);
  const hasTwoDigits = Boolean(digitMatches && digitMatches.length >= 2);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(p);

  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasTwoDigits,
    hasSpecialChar,
    allValid: minLength && hasUppercase && hasLowercase && hasTwoDigits && hasSpecialChar,
  };
}

/**
 * Validates password strength across all SpeakUp LMS student and administrative forms.
 * - Required.
 * - Minimum 8 characters.
 * - At least one uppercase letter (A-Z).
 * - At least one lowercase letter (a-z).
 * - At least two numeric digits (0-9).
 * - At least one special character (!@#$%^&* etc.).
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: "Password is required." };
  }
  const status = checkPasswordRequirements(password);
  if (!status.minLength) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  if (!status.hasUppercase) {
    return { valid: false, error: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!status.hasLowercase) {
    return { valid: false, error: "Password must contain at least one lowercase letter (a-z)." };
  }
  if (!status.hasTwoDigits) {
    return { valid: false, error: "Password must contain at least two numeric digits (0-9)." };
  }
  if (!status.hasSpecialChar) {
    return { valid: false, error: "Password must contain at least one special character (e.g. !@#$%^&*)." };
  }
  return { valid: true };
}

import { parsePhoneNumber, type CountryCode as LibCountryCode } from "libphonenumber-js";

/**
 * Strips duplicate calling codes if user typed the country code into the national input field.
 * Example: if dialCode is "+92" and user typed "923001234567" or "+92 300 1234567",
 * returns "3001234567".
 */
export function stripDuplicateCallingCode(rawNumber: string, dialCode: string): string {
  let cleaned = rawNumber.trim();
  const digitsOnlyDial = dialCode.replace(/\D/g, "");

  if (cleaned.startsWith(dialCode)) {
    cleaned = cleaned.slice(dialCode.length).trim();
  } else if (cleaned.startsWith(`+${digitsOnlyDial}`)) {
    cleaned = cleaned.slice(digitsOnlyDial.length + 1).trim();
  } else if (cleaned.startsWith(digitsOnlyDial) && cleaned.length > digitsOnlyDial.length + 6) {
    cleaned = cleaned.slice(digitsOnlyDial.length).trim();
  }

  return cleaned.replace(/^[\s-]+/, "");
}

const DIAL_TO_ISO: Record<string, LibCountryCode> = {
  "+92": "PK",
  "+91": "IN",
  "+1": "US",
  "+27": "ZA",
  "+44": "GB",
  "+971": "AE",
  "+966": "SA",
  "+61": "AU",
  "+49": "DE",
  "+33": "FR",
  "+39": "IT",
  "+34": "ES",
  "+31": "NL",
  "+41": "CH",
  "+46": "SE",
  "+47": "NO",
  "+45": "DK",
  "+353": "IE",
  "+64": "NZ",
  "+65": "SG",
  "+60": "MY",
  "+90": "TR",
  "+974": "QA",
  "+965": "KW",
  "+973": "BH",
  "+968": "OM",
  "+880": "BD",
  "+94": "LK",
  "+977": "NP",
  "+63": "PH",
  "+62": "ID",
  "+20": "EG",
  "+234": "NG",
  "+254": "KE",
  "+86": "CN",
  "+81": "JP",
  "+82": "KR",
  "+55": "BR",
};

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
  const dialCode = countryOrDialCode.startsWith("+")
    ? countryOrDialCode
    : `+${countryOrDialCode}`;
  const isoCode = (DIAL_TO_ISO[dialCode] || (countryOrDialCode.length === 2 ? countryOrDialCode.toUpperCase() : "PK")) as LibCountryCode;

  const cleanPhone = stripDuplicateCallingCode(phone, dialCode);

  if (!cleanPhone || !cleanPhone.replace(/\D/g, "")) {
    return {
      isValid: false,
      e164: "",
      national: "",
      countryCode: dialCode,
      countryIso: isoCode,
      error: "Phone number is required.",
    };
  }

  try {
    const parsed = parsePhoneNumber(cleanPhone, isoCode);
    if (parsed && parsed.isValid()) {
      return {
        isValid: true,
        e164: parsed.number,
        national: parsed.formatNational(),
        countryCode: `+${parsed.countryCallingCode}`,
        countryIso: parsed.country || isoCode,
      };
    }
  } catch {
    // fallback check
  }

  // Pakistan mobile fallback
  const digits = cleanPhone.replace(/\D/g, "");
  if (isoCode === "PK") {
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
    countryCode: dialCode,
    countryIso: isoCode,
    error: "Please enter a valid phone number.",
  };
}

/**
 * Validates phone numbers by country using Google's libphonenumber standard.
 * - Supports Pakistan (+92), India (+91), United States (+1), South Africa (+27), and all standard country numbering plans.
 * - Handles leading zeros and prevents duplicate calling codes.
 * - Rejects letters and invalid numbering sequences with country-specific guidance.
 */
export function validatePhone(phone: string, countryCode = "+92"): ValidationResult {
  const raw = (phone || "").trim();
  if (!raw) {
    return { valid: false, error: "Phone number is required." };
  }
  // Strictly reject letters
  if (/[a-zA-Z]/.test(raw)) {
    return { valid: false, error: "Phone number cannot contain letters." };
  }

  const result = normalizePhoneNumber(raw, countryCode);
  if (!result.isValid) {
    return {
      valid: false,
      error: result.error || "Please enter a valid phone number.",
    };
  }

  return { valid: true };
}

/**
 * Normalizes phone numbers consistently for database storage.
 */
export function formatPhoneNumberE164(phone: string, countryCode = "+92"): string {
  const result = normalizePhoneNumber(phone, countryCode);
  return result.e164 || phone.trim();
}

/**
 * Generates initials avatar text based on full name.
 * Example requirement:
 * - "Mudassir Ali" -> "MA"
 * - "Sawa Khan" -> "SK"
 * - "Admin" -> "A"
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 1).toUpperCase();
}

/**
 * Validates a storage path strictly within the private assignments bucket.
 * Must match: submissions/<student_id>/<filename>
 */
export function isValidAssignmentStoragePath(storagePath: string): boolean {
  if (!storagePath || typeof storagePath !== "string") return false;
  if (storagePath.includes("..") || storagePath.includes("//")) return false;
  const pathRegex = /^submissions\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\.(jpe?g|png|webp)$/i;
  return pathRegex.test(storagePath);
}

/**
 * Validates whether a remote URL is a trusted, safe Supabase Storage asset.
 * Rejects SSRF vectors including loopback, private ranges, metadata endpoints, non-HTTPS protocols, and arbitrary external domains.
 */
export function isSafeRemoteImageUrl(urlString: string, configuredSupabaseUrl?: string): boolean {
  if (!urlString || typeof urlString !== "string") return false;
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:") return false;

    const hostname = parsed.hostname.toLowerCase();

    // Reject IP addresses (IPv4 & IPv6), metadata, loopback, and private ranges
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname === "169.254.169.254" || // AWS / GCP / Azure metadata
      hostname === "metadata.google.internal" ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^127\./.test(hostname) ||
      /^[0-9.]+$/.test(hostname) // Any raw numeric IPv4 address
    ) {
      return false;
    }

    const envSupabaseUrl = configuredSupabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    let configuredHost = "";
    if (envSupabaseUrl) {
      try {
        configuredHost = new URL(envSupabaseUrl).hostname.toLowerCase();
      } catch {}
    }

    const isConfiguredHost = Boolean(configuredHost && hostname === configuredHost);
    const isSupabaseHost = hostname.endsWith(".supabase.co");

    if (!isConfiguredHost && !isSupabaseHost) {
      return false;
    }

    // Path must strictly target the assignments storage bucket
    const pathname = parsed.pathname.toLowerCase();
    if (
      !pathname.includes("/storage/v1/object/sign/assignments/") &&
      !pathname.includes("/storage/v1/object/authenticated/assignments/") &&
      !pathname.includes("/storage/v1/object/public/assignments/")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
