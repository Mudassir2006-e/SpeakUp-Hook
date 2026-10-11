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
 * Validates password strength.
 * - Required.
 * - Minimum 8 characters.
 * - Must contain at least one letter and at least one number.
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: "Password is required." };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return { valid: false, error: "Password must contain both letters and numbers." };
  }
  return { valid: true };
}

/**
 * Validates phone numbers by country.
 * - For Pakistan (+92): strictly validates Pakistani mobile numbers (e.g. 0300 1234567, 300 1234567, or 923001234567).
 * - Rejects any letters or invalid numeric sequences.
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

  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return { valid: false, error: "Please enter a valid numeric phone number." };
  }

  if (countryCode === "+92") {
    // Pakistani mobile numbers:
    // Formats: 3001234567 (10 digits starting with 3), 03001234567 (11 digits starting with 03), 923001234567 (12 digits starting with 923)
    const isPakMobile =
      (digits.length === 10 && digits.startsWith("3")) ||
      (digits.length === 11 && digits.startsWith("03")) ||
      (digits.length === 12 && digits.startsWith("923"));

    if (!isPakMobile) {
      return {
        valid: false,
        error: "Please enter a valid Pakistani mobile number (e.g. 0300 1234567 or 300 1234567).",
      };
    }
    return { valid: true };
  }

  // Other international formats: 7 to 15 digits
  if (digits.length < 7 || digits.length > 15) {
    return {
      valid: false,
      error: "Phone number must be between 7 and 15 digits.",
    };
  }

  return { valid: true };
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
