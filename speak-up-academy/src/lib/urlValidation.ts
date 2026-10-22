/**
 * URL Validation & Sanitization Utility for Link Buttons
 * 
 * Ensures external links are properly formatted, secure, and safe to open.
 */

export interface UrlValidationResult {
  isValid: boolean;
  formattedUrl: string;
  error?: string;
}

export function validateAndFormatUrl(rawUrl: string): UrlValidationResult {
  const trimmed = (rawUrl || "").trim();

  if (!trimmed) {
    return {
      isValid: false,
      formattedUrl: "",
      error: "URL cannot be empty.",
    };
  }

  // Security guard: Prevent javascript:, data:, vbscript: or other dangerous pseudo-protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return {
      isValid: false,
      formattedUrl: "",
      error: "Security violation: Only standard web URLs (http/https) are permitted.",
    };
  }

  // Prepend https:// if no protocol was supplied
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    // If it looks like a relative or naked domain (e.g. "example.com" or "www.example.com")
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        isValid: false,
        formattedUrl: "",
        error: "URL protocol must be HTTP or HTTPS.",
      };
    }

    // Must have a valid hostname (at least one dot or localhost)
    if (!parsed.hostname || (!parsed.hostname.includes(".") && parsed.hostname !== "localhost")) {
      return {
        isValid: false,
        formattedUrl: "",
        error: "Invalid domain name in URL.",
      };
    }

    return {
      isValid: true,
      formattedUrl: parsed.toString(),
    };
  } catch {
    return {
      isValid: false,
      formattedUrl: "",
      error: "Malformed URL format. Please provide a valid web address.",
    };
  }
}
