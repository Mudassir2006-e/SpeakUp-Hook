/**
 * SpeakUp LMS — Professional Login Attempt Protection Engine
 * Implements server-side attempt limits, exponential backoff cooldowns,
 * temporary lockouts, and brute-force mitigation for admin and student accounts.
 */

interface AttemptTracker {
  recentAttempts: number[]; // Timestamps of attempts within rolling window
  consecutiveFailures: number;
  lockedUntil: number | null; // Timestamp when temporary lockout ends
  lastAttemptAt: number;
}

// In-memory persistent tracking maps (per Node process)
const accountAttempts = new Map<string, AttemptTracker>();
const ipAttempts = new Map<string, AttemptTracker>();

// Configurable parameters strictly adhering to security specification:
export const ROLLING_WINDOW_MS = 30 * 1000; // 30-second rolling window
export const MAX_WINDOW_ATTEMPTS = 3; // No more than 3 password attempts within rolling 30s

/**
 * Calculates progressive cooldown seconds according to failure tiers:
 * - 3 consecutive failures: 30 seconds
 * - 4 consecutive failures: 60 seconds
 * - 5–9 consecutive failures: 300 seconds (5-minute temporary restriction)
 * - 10–12+ consecutive failures: 900 seconds (15-minute strong temporary lockout & security logging)
 */
export function calculateCooldownSeconds(consecutiveFailures: number): number {
  if (consecutiveFailures < 3) return 0;
  if (consecutiveFailures === 3) return 30;
  if (consecutiveFailures === 4) return 60;
  if (consecutiveFailures >= 5 && consecutiveFailures < 10) return 300;
  return 900; // 15 minutes
}

function cleanOldAttempts(attempts: number[], now: number): number[] {
  const cutoff = now - ROLLING_WINDOW_MS;
  return attempts.filter((t) => t > cutoff);
}

/**
 * Checks whether a login attempt is allowed for the given account email and IP address.
 * Never leaks whether the account exists or not.
 */
export function checkLoginAllowed(
  email: string,
  ip?: string | null
): { allowed: boolean; retryAfterSeconds: number; reason?: string } {
  const now = Date.now();
  const normEmail = email.trim().toLowerCase();

  // 1. Check account lockout state
  const acct = accountAttempts.get(normEmail);
  if (acct) {
    if (acct.lockedUntil && now < acct.lockedUntil) {
      const waitSec = Math.ceil((acct.lockedUntil - now) / 1000);
      return { allowed: false, retryAfterSeconds: waitSec, reason: "temporary_lockout" };
    }

    // Check rolling 30-second window
    const recent = cleanOldAttempts(acct.recentAttempts, now);
    if (recent.length >= MAX_WINDOW_ATTEMPTS) {
      const waitSec = Math.ceil((recent[0] + ROLLING_WINDOW_MS - now) / 1000);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, waitSec),
        reason: "window_rate_limit",
      };
    }
  }

  // 2. Check source IP lockout state (prevents multi-account brute force spam)
  if (ip && ip !== "unknown") {
    const ipTracker = ipAttempts.get(ip);
    if (ipTracker) {
      if (ipTracker.lockedUntil && now < ipTracker.lockedUntil) {
        const waitSec = Math.ceil((ipTracker.lockedUntil - now) / 1000);
        return { allowed: false, retryAfterSeconds: waitSec, reason: "ip_lockout" };
      }

      // Check rolling window for IP
      const recentIp = cleanOldAttempts(ipTracker.recentAttempts, now);
      if (recentIp.length >= 10) {
        // Source spam limit across multiple accounts
        const waitSec = Math.ceil((recentIp[0] + ROLLING_WINDOW_MS - now) / 1000);
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, waitSec),
          reason: "ip_rate_limit",
        };
      }
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Records a failed password login attempt and calculates progressive cooldowns.
 */
export function recordFailedLoginAttempt(
  email: string,
  ip?: string | null
): { consecutiveFailures: number; lockedUntil: number | null; retryAfterSeconds: number } {
  const now = Date.now();
  const normEmail = email.trim().toLowerCase();

  // Update account tracker
  let acct = accountAttempts.get(normEmail);
  if (!acct) {
    acct = {
      recentAttempts: [],
      consecutiveFailures: 0,
      lockedUntil: null,
      lastAttemptAt: now,
    };
    accountAttempts.set(normEmail, acct);
  }

  acct.recentAttempts = cleanOldAttempts(acct.recentAttempts, now);
  acct.recentAttempts.push(now);
  acct.consecutiveFailures += 1;
  acct.lastAttemptAt = now;

  const cooldownSec = calculateCooldownSeconds(acct.consecutiveFailures);
  if (cooldownSec > 0) {
    acct.lockedUntil = now + cooldownSec * 1000;
  }

  // Security audit logging on repeated threshold breaches
  if (acct.consecutiveFailures >= 10) {
    console.warn(
      `[Security Alert] High-frequency login failures detected: Account "${normEmail}" reached ${
        acct.consecutiveFailures
      } consecutive failures (Source IP: ${ip || "unknown"}). Applied 15-minute temporary restriction until ${new Date(
        acct.lockedUntil!
      ).toISOString()}.`
    );
  } else if (acct.consecutiveFailures === 5) {
    console.warn(
      `[Security Notice] Account "${normEmail}" entered 5-minute temporary restriction following 5 consecutive failed login attempts.`
    );
  }

  // Update IP tracker
  if (ip && ip !== "unknown") {
    let ipTracker = ipAttempts.get(ip);
    if (!ipTracker) {
      ipTracker = {
        recentAttempts: [],
        consecutiveFailures: 0,
        lockedUntil: null,
        lastAttemptAt: now,
      };
      ipAttempts.set(ip, ipTracker);
    }
    ipTracker.recentAttempts = cleanOldAttempts(ipTracker.recentAttempts, now);
    ipTracker.recentAttempts.push(now);
    ipTracker.consecutiveFailures += 1;
    ipTracker.lastAttemptAt = now;
  }

  return {
    consecutiveFailures: acct.consecutiveFailures,
    lockedUntil: acct.lockedUntil,
    retryAfterSeconds: cooldownSec,
  };
}

/**
 * Resets failure counters safely upon successful authentication.
 */
export function recordSuccessfulLogin(email: string, ip?: string | null): void {
  const normEmail = email.trim().toLowerCase();
  accountAttempts.delete(normEmail);

  if (ip && ipAttempts.has(ip)) {
    const ipTracker = ipAttempts.get(ip)!;
    ipTracker.consecutiveFailures = Math.max(0, ipTracker.consecutiveFailures - 2);
    if (ipTracker.consecutiveFailures === 0) {
      ipAttempts.delete(ip);
    }
  }
}

/**
 * Diagnostic helper for testing attempt states without exposing private credentials.
 */
export function getAttemptStatus(email: string): {
  consecutiveFailures: number;
  isLocked: boolean;
  remainingSeconds: number;
} {
  const now = Date.now();
  const acct = accountAttempts.get(email.trim().toLowerCase());
  if (!acct) {
    return { consecutiveFailures: 0, isLocked: false, remainingSeconds: 0 };
  }
  const isLocked = Boolean(acct.lockedUntil && now < acct.lockedUntil);
  const remainingSeconds = isLocked ? Math.ceil((acct.lockedUntil! - now) / 1000) : 0;
  return {
    consecutiveFailures: acct.consecutiveFailures,
    isLocked,
    remainingSeconds,
  };
}
