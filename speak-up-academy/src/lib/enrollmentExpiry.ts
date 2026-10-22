/**
 * SpeakUp LMS — Course Enrollment Duration and Expiry Utility
 * Authoritatively calculates start dates, configured durations (3, 4, 6 months),
 * calculated expiry dates, remaining days, and status tiers.
 */

export type EnrollmentExpiryStatus = "active" | "expiring_soon" | "expired" | "pending" | "rejected";

export interface EnrollmentExpiryCalculation {
  startDate: Date | null;
  startDateIso: string | null;
  durationMonths: number;
  durationLabel: string;
  expiresAt: Date | null;
  expiresAtIso: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  status: EnrollmentExpiryStatus;
  statusLabel: string;
  remainingLabel: string;
}

/**
 * Standard durations supported by SpeakUp LMS
 */
export const SUPPORTED_DURATIONS = [
  { months: 3, label: "3 Months (Standard Cohort)" },
  { months: 4, label: "4 Months (Accelerated Plus)" },
  { months: 6, label: "6 Months (Extended Mastery)" },
] as const;

/**
 * Derives default duration in months for a given course ID or slug.
 * Matches configured course settings across the application.
 */
export function getCourseDefaultDurationMonths(courseIdOrSlug?: string | null): number {
  if (!courseIdOrSlug) return 3;
  const lower = courseIdOrSlug.toLowerCase().trim();

  // Courses with 4 or 6 months configured or 10-week intensive
  if (lower.includes("mastery") || lower.includes("professional") || lower.includes("strategic")) {
    return 6;
  }
  if (lower.includes("speak-30") || lower.includes("accelerated")) {
    return 4;
  }
  return 3; // Default 3 months standard duration
}

/**
 * Calculates the exact expiry date and status for an enrollment.
 * 
 * @param approvedAt Effective start timestamp (ISO string or Date)
 * @param durationMonths Configured duration in months (defaults to 3 if not specified)
 * @param explicitExpiresAt Optional existing persisted expiry timestamp
 * @param rawStatus The base enrollment status ('pending' | 'approved' | 'rejected')
 */
export function calculateEnrollmentExpiry(params: {
  approvedAt?: string | Date | null;
  requestedAt?: string | Date | null;
  durationMonths?: number | null;
  explicitExpiresAt?: string | Date | null;
  rawStatus?: string | null;
  courseId?: string | null;
}): EnrollmentExpiryCalculation {
  const { approvedAt, requestedAt, explicitExpiresAt, rawStatus, courseId } = params;

  const durationMonths =
    params.durationMonths && params.durationMonths > 0
      ? params.durationMonths
      : getCourseDefaultDurationMonths(courseId);

  const durationLabel = `${durationMonths} Month${durationMonths > 1 ? "s" : ""}`;

  // If enrollment is pending or rejected, it does not have active expiry
  if (rawStatus === "pending") {
    return {
      startDate: requestedAt ? new Date(requestedAt) : null,
      startDateIso: requestedAt ? new Date(requestedAt).toISOString() : null,
      durationMonths,
      durationLabel,
      expiresAt: null,
      expiresAtIso: null,
      daysRemaining: null,
      isExpired: false,
      isExpiringSoon: false,
      status: "pending",
      statusLabel: "Pending Approval",
      remainingLabel: "Awaiting Review",
    };
  }

  if (rawStatus === "rejected") {
    return {
      startDate: null,
      startDateIso: null,
      durationMonths,
      durationLabel,
      expiresAt: null,
      expiresAtIso: null,
      daysRemaining: null,
      isExpired: false,
      isExpiringSoon: false,
      status: "rejected",
      statusLabel: "Access Revoked / Rejected",
      remainingLabel: "Not Active",
    };
  }

  // Calculate start date from approvedAt (or fallback to requestedAt)
  const rawStart = approvedAt || requestedAt || null;
  if (!rawStart) {
    return {
      startDate: null,
      startDateIso: null,
      durationMonths,
      durationLabel,
      expiresAt: null,
      expiresAtIso: null,
      daysRemaining: null,
      isExpired: false,
      isExpiringSoon: false,
      status: "pending",
      statusLabel: "No Start Date",
      remainingLabel: "Unscheduled",
    };
  }

  const startDate = new Date(rawStart);
  let expiresAt: Date;

  if (explicitExpiresAt) {
    expiresAt = new Date(explicitExpiresAt);
  } else {
    // Add duration in months
    expiresAt = new Date(startDate.getTime());
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
  }

  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = diffMs <= 0;
  const isExpiringSoon = !isExpired && daysRemaining <= 14;

  let status: EnrollmentExpiryStatus = "active";
  let statusLabel = "Active";
  let remainingLabel = `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`;

  if (isExpired) {
    status = "expired";
    const daysAgo = Math.abs(daysRemaining);
    statusLabel = "Expired";
    remainingLabel = daysAgo === 0 ? "Expired today" : `Expired ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`;
  } else if (isExpiringSoon) {
    status = "expiring_soon";
    statusLabel = "Expiring Soon";
  }

  return {
    startDate,
    startDateIso: startDate.toISOString(),
    durationMonths,
    durationLabel,
    expiresAt,
    expiresAtIso: expiresAt.toISOString(),
    daysRemaining,
    isExpired,
    isExpiringSoon,
    status,
    statusLabel,
    remainingLabel,
  };
}

/**
 * Checks whether an enrollment currently grants active, unexpired course access.
 */
export function isEnrollmentActive(params: {
  status?: string | null;
  approvedAt?: string | Date | null;
  requestedAt?: string | Date | null;
  durationMonths?: number | null;
  explicitExpiresAt?: string | Date | null;
  courseId?: string | null;
}): boolean {
  if (params.status !== "approved") {
    return false;
  }
  const calc = calculateEnrollmentExpiry({
    approvedAt: params.approvedAt,
    requestedAt: params.requestedAt,
    durationMonths: params.durationMonths,
    explicitExpiresAt: params.explicitExpiresAt,
    rawStatus: params.status,
    courseId: params.courseId,
  });
  return !calc.isExpired;
}
