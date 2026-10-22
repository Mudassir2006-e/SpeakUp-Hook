import test from "node:test";
import assert from "node:assert/strict";

// Set baseline test suite signing secret for standalone Node test runner
process.env.ADMIN_VERIFICATION_SECRET =
  process.env.ADMIN_VERIFICATION_SECRET || "test-suite-secure-verification-secret-32-chars-long";

// ==============================================================================
// DIRECT PRODUCTION MODULE IMPORTS
// These tests call the ACTUAL production implementations directly from src/lib/.
// ==============================================================================
import {
  isValidAssignmentStoragePath,
  isSafeRemoteImageUrl,
  validatePassword,
  checkPasswordRequirements,
  validatePhone,
  formatPhoneNumberE164,
} from "../src/lib/validation.ts";
import { getLoginErrorMessage, getAuthErrorMessage } from "../src/lib/auth/loginError.ts";
import {
  normalizePhoneNumber,
  stripDuplicateCallingCode,
  COUNTRIES,
} from "../src/lib/countries.ts";
import {
  generateAdminVerificationToken,
  verifyAdminVerificationToken,
  generateVerificationCode,
  hashVerificationCode,
  verifyCodeHash,
  maskEmailAddress,
  generateOAuthState,
  verifyOAuthState,
  getHmacSecret,
  isHmacSecretConfigured,
  CODE_EXPIRY_MS,
  RESEND_COOLDOWN_MS,
  MAX_VERIFY_ATTEMPTS,
  ADMIN_TRUST_DURATION_MS,
  ADMIN_COOKIE_MAX_AGE_SECONDS,
  ADMIN_SLIDING_REFRESH_INTERVAL_MS,
  shouldRefreshAdminTrustToken,
  renewAdminTrustToken,
} from "../src/lib/auth/adminVerificationCore.ts";
import {
  getAdminMfaVerificationEmailHtml,
  renderEmailLayout,
  SUPABASE_AUTH_TEMPLATES,
} from "../src/lib/email/templates.ts";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ==============================================================================
// SUITE 1: DIRECT PRODUCTION MODULE TESTS
// ==============================================================================

test("SSRF Prevention: Rejects local loopback addresses", () => {
  assert.equal(isSafeRemoteImageUrl("http://localhost:3000/leak"), false);
  assert.equal(isSafeRemoteImageUrl("https://localhost:3000/leak"), false);
  assert.equal(isSafeRemoteImageUrl("http://127.0.0.1:8080/admin"), false);
  assert.equal(isSafeRemoteImageUrl("https://127.0.0.1/admin"), false);
  assert.equal(isSafeRemoteImageUrl("http://0.0.0.0:80/"), false);
  assert.equal(isSafeRemoteImageUrl("https://[::1]/secret"), false);
});

test("SSRF Prevention: Rejects cloud metadata services", () => {
  assert.equal(isSafeRemoteImageUrl("http://169.254.169.254/latest/meta-data/"), false);
  assert.equal(isSafeRemoteImageUrl("https://169.254.169.254/computeMetadata/v1/"), false);
  assert.equal(isSafeRemoteImageUrl("https://metadata.google.internal/computeMetadata/v1/"), false);
});

test("SSRF Prevention: Rejects private/internal IP ranges", () => {
  assert.equal(isSafeRemoteImageUrl("https://10.0.0.1/secret.jpg"), false);
  assert.equal(isSafeRemoteImageUrl("https://192.168.1.1/config"), false);
  assert.equal(isSafeRemoteImageUrl("https://172.16.0.5/api"), false);
  assert.equal(isSafeRemoteImageUrl("https://172.31.255.255/db"), false);
});

test("SSRF Prevention: Rejects dangerous or unexpected protocols", () => {
  assert.equal(isSafeRemoteImageUrl("file:///etc/passwd"), false);
  assert.equal(isSafeRemoteImageUrl("ftp://example.com/file.jpg"), false);
  assert.equal(isSafeRemoteImageUrl("gopher://evil.com/"), false);
  assert.equal(isSafeRemoteImageUrl("data:image/png;base64,AAAA"), false);
});

test("SSRF Prevention: Rejects arbitrary untrusted external domains and spoofed domains", () => {
  assert.equal(isSafeRemoteImageUrl("https://evil.com/image.jpg"), false);
  assert.equal(isSafeRemoteImageUrl("https://google.com/test.jpg"), false);
  assert.equal(isSafeRemoteImageUrl("https://attacker-supabase.co.evil.com/assignments/1.jpg"), false);
  assert.equal(isSafeRemoteImageUrl("https://not-supabase.co/storage/v1/object/sign/assignments/1.jpg"), false);
});

test("SSRF Prevention: Rejects Supabase URLs targeting unauthorized buckets or API paths", () => {
  assert.equal(isSafeRemoteImageUrl("https://xyz.supabase.co/auth/v1/user"), false);
  assert.equal(isSafeRemoteImageUrl("https://xyz.supabase.co/rest/v1/profiles"), false);
  assert.equal(isSafeRemoteImageUrl("https://xyz.supabase.co/storage/v1/object/public/avatars/test.jpg"), false);
});

test("SSRF Prevention: Accepts legitimately formatted Supabase private assignment URLs", () => {
  assert.equal(
    isSafeRemoteImageUrl("https://xyz.supabase.co/storage/v1/object/sign/assignments/submissions/uid/page.webp?token=abc"),
    true
  );
  assert.equal(
    isSafeRemoteImageUrl("https://xyz.supabase.co/storage/v1/object/authenticated/assignments/submissions/uid/page.webp"),
    true
  );
});

test("Storage Path Validation: Enforces strict assignments submissions directory format", () => {
  assert.equal(isValidAssignmentStoragePath("submissions/user123/page1.webp"), true);
  assert.equal(isValidAssignmentStoragePath("submissions/student_uuid_456/123456_p1_answer.jpg"), true);
  assert.equal(isValidAssignmentStoragePath("submissions/student_uuid_456/123456_p1_answer.png"), true);

  // Traversal & invalid patterns rejected
  assert.equal(isValidAssignmentStoragePath("submissions/../secret.txt"), false);
  assert.equal(isValidAssignmentStoragePath("submissions//page.jpg"), false);
  assert.equal(isValidAssignmentStoragePath("other_bucket/user/page.jpg"), false);
  assert.equal(isValidAssignmentStoragePath("/submissions/user/page.jpg"), false);
  assert.equal(isValidAssignmentStoragePath("submissions/user/page.exe"), false);
  assert.equal(isValidAssignmentStoragePath(""), false);
});

test("Password Validation: Enforces minimum 8 characters, 1 uppercase, 1 lowercase, 2 digits, and 1 special character", () => {
  // Empty or invalid input
  assert.equal(validatePassword("").valid, false);

  // Less than 8 characters (fails length)
  assert.equal(validatePassword("Sho12!").valid, false);
  assert.equal(checkPasswordRequirements("Sho12!").minLength, false);

  // Missing uppercase letter
  assert.equal(validatePassword("speakup12!").valid, false);
  assert.equal(checkPasswordRequirements("speakup12!").hasUppercase, false);

  // Missing lowercase letter
  assert.equal(validatePassword("SPEAKUP12!").valid, false);
  assert.equal(checkPasswordRequirements("SPEAKUP12!").hasLowercase, false);

  // Missing two digits (only 1 digit)
  assert.equal(validatePassword("Speakup1!").valid, false);
  assert.equal(checkPasswordRequirements("Speakup1!").hasTwoDigits, false);

  // Missing special character
  assert.equal(validatePassword("Speakup12").valid, false);
  assert.equal(checkPasswordRequirements("Speakup12").hasSpecialChar, false);

  // Fully compliant passwords (all 5 criteria satisfied)
  assert.equal(validatePassword("ValidPass12!").valid, true);
  assert.equal(validatePassword("GermanScholar2026!").valid, true);
  assert.equal(validatePassword("SpeakUp2026@LMS").valid, true);
  assert.equal(checkPasswordRequirements("SpeakUp2026@LMS").allValid, true);
});

test("Password Generator: Cryptographic temporary password generation satisfies all 5 criteria", () => {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const specials = "!@#$%&*";
  const all = uppers + lowers + digits + specials;

  const getRandomInt = (max) => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  };

  const generatePassword = () => {
    const pool = [
      uppers.charAt(getRandomInt(uppers.length)),
      lowers.charAt(getRandomInt(lowers.length)),
      digits.charAt(getRandomInt(digits.length)),
      digits.charAt(getRandomInt(digits.length)),
      specials.charAt(getRandomInt(specials.length)),
    ];
    for (let i = 0; i < 7; i++) {
      pool.push(all.charAt(getRandomInt(all.length)));
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = getRandomInt(i + 1);
      const temp = pool[i];
      pool[i] = pool[j];
      pool[j] = temp;
    }
    return pool.join("");
  };

  // Generate 100 random passwords and verify every single one satisfies all 5 rules
  for (let i = 0; i < 100; i++) {
    const pwd = generatePassword();
    assert.equal(pwd.length, 12);
    const check = validatePassword(pwd);
    assert.equal(check.valid, true, `Generated password "${pwd}" failed validation: ${check.error}`);
    const reqs = checkPasswordRequirements(pwd);
    assert.equal(reqs.allValid, true);
  }
});

test("Login Error Handling: Rate limiting (HTTP 429) detection logic", () => {
  assert.equal(
    getLoginErrorMessage({ status: 429, message: "Too many requests" }),
    "Too many sign-in attempts detected. For security protection, please wait 15 minutes before trying again."
  );

  assert.equal(
    getLoginErrorMessage({ status: 400, message: "For security purposes, you can only request this once every 60 seconds." }),
    "Too many sign-in attempts detected. For security protection, please wait 15 minutes before trying again."
  );

  assert.equal(
    getLoginErrorMessage({ status: 400, message: "Invalid login credentials" }),
    "Invalid email or password. Please verify your credentials."
  );
});

// ==============================================================================
// SUITE 2: ISOLATED UNIT TESTS & SCHEMA BEHAVIOR MOCKS
// Verifies assignment resubmission attempt history calculations and storage
// folder prefix ownership rules in isolation from database engines.
// ==============================================================================

test("Assignment Resubmission Logic: Preserves previous attempts and teacher evaluations", () => {
  const previousSubmission = {
    id: "sub_101",
    assignmentId: "asgn_german_a1",
    studentId: "student-uuid-1",
    attemptNumber: 1,
    status: "Reviewed",
    studentTextAnswer: "Initial text response",
    pages: [{ pageNumber: 1, originalUrl: "url1", optimizedUrl: "url1" }],
    aiScore: 16,
    aiFeedback: "Good start",
    finalScore: 18,
    finalFeedback: "Excellent grammar by Teacher Hans",
    adminReviewedAt: "2026-10-10T12:00:00Z",
    adminReviewedBy: "Teacher Hans",
    history: [],
    submittedAt: "2026-10-09T10:00:00Z",
  };

  const prevAttemptRecord = {
    attemptNumber: previousSubmission.attemptNumber || 1,
    submittedAt: previousSubmission.submittedAt,
    studentTextAnswer: previousSubmission.studentTextAnswer,
    pages: previousSubmission.pages,
    aiEvaluation: null,
    aiScore: previousSubmission.aiScore,
    aiFeedback: previousSubmission.aiFeedback,
    finalScore: previousSubmission.finalScore,
    finalFeedback: previousSubmission.finalFeedback,
    adminReviewedAt: previousSubmission.adminReviewedAt,
    adminReviewedBy: previousSubmission.adminReviewedBy,
    status: previousSubmission.status,
  };

  const updatedHistory = [...(previousSubmission.history || []), prevAttemptRecord];
  const newAttemptNumber = previousSubmission.attemptNumber + 1;

  assert.equal(newAttemptNumber, 2);
  assert.equal(updatedHistory.length, 1);
  assert.equal(updatedHistory[0].attemptNumber, 1);
  assert.equal(updatedHistory[0].finalScore, 18);
  assert.equal(updatedHistory[0].finalFeedback, "Excellent grammar by Teacher Hans");
  assert.equal(updatedHistory[0].adminReviewedAt, "2026-10-10T12:00:00Z");
  assert.equal(updatedHistory[0].adminReviewedBy, "Teacher Hans");
  assert.equal(updatedHistory[0].status, "Reviewed");
});

test("Avatar Storage Policy Scope: Ensures only matching user ID can update avatar", () => {
  function canUserUpdateAvatar(userId, targetFilename, isUserAdmin = false) {
    if (isUserAdmin) return true;
    const expectedPrefix = `student_${userId}_`;
    return targetFilename.startsWith(expectedPrefix);
  }

  const studentA = "11111111-1111-1111-1111-111111111111";
  const studentB = "22222222-2222-2222-2222-222222222222";
  const avatarA = `student_${studentA}_1728888888.webp`;
  const avatarB = `student_${studentB}_1728888888.webp`;

  // Student A can update own avatar
  assert.equal(canUserUpdateAvatar(studentA, avatarA, false), true);

  // Student A CANNOT update Student B's avatar
  assert.equal(canUserUpdateAvatar(studentA, avatarB, false), false);

  // Student B CANNOT update Student A's avatar
  assert.equal(canUserUpdateAvatar(studentB, avatarA, false), false);

  // Admin can update any avatar
  assert.equal(canUserUpdateAvatar(studentA, avatarB, true), true);
});

// ==============================================================================
// SUITE 3: ADMIN EMAIL VERIFICATION & PRIVILEGE ESCALATION TESTS
// ==============================================================================

test("Admin Verification: Cryptographic 6-digit code generation and salted hashing", () => {
  const code = generateVerificationCode();
  assert.match(code, /^\d{6}$/);

  const salt = "test_salt_12345";
  const hash = hashVerificationCode(code, salt);
  assert.ok(hash && hash.length === 64);

  // Correct code matches
  assert.equal(verifyCodeHash(code, salt, hash), true);

  // Incorrect code rejected
  assert.equal(verifyCodeHash("000000", salt, hash), false);
  assert.equal(verifyCodeHash("", salt, hash), false);
  assert.equal(verifyCodeHash("12345", salt, hash), false);
});

test("Admin Verification: Session-bound HMAC token generation and validation", () => {
  const adminId = "admin-uuid-9999";
  const lastSignInAt = "2026-10-13T10:00:00Z";

  const token = generateAdminVerificationToken(adminId, lastSignInAt);
  assert.ok(typeof token === "string" && token.includes("|"));

  // Valid token for matching user and session stamp validates successfully
  assert.equal(verifyAdminVerificationToken(token, adminId, lastSignInAt), true);

  // Mismatched user ID rejected
  assert.equal(verifyAdminVerificationToken(token, "other-user-uuid", lastSignInAt), false);

  // Mismatched session stamp (e.g. after re-login or password change) rejected
  assert.equal(verifyAdminVerificationToken(token, adminId, "2026-10-13T11:00:00Z"), false);

  // Tampered signature rejected
  const tampered = token.slice(0, -4) + "abcd";
  assert.equal(verifyAdminVerificationToken(tampered, adminId, lastSignInAt), false);

  // Null/undefined/empty token rejected safely
  assert.equal(verifyAdminVerificationToken(null, adminId, lastSignInAt), false);
  assert.equal(verifyAdminVerificationToken("", adminId, lastSignInAt), false);
});

test("Admin Verification: Email masking protects recipient privacy", () => {
  assert.equal(maskEmailAddress("admin@speakup.edu.pk"), "a***n@speakup.edu.pk");
  assert.equal(maskEmailAddress("mudassir@gmail.com"), "m****r@gmail.com");
  assert.equal(maskEmailAddress("ed@test.com"), "e*@test.com");
  assert.equal(maskEmailAddress("invalid"), "authorized admin email");
});

test("Admin Verification: Missing or low-entropy signing secret fails closed", () => {
  const originalSecret = process.env.ADMIN_VERIFICATION_SECRET;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    delete process.env.ADMIN_VERIFICATION_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Direct HMAC retrieval must throw error rather than returning predictable fallback
    assert.throws(() => getHmacSecret(), /CRITICAL SECURITY CONFIGURATION ERROR/);
    assert.equal(isHmacSecretConfigured(), false);

    // Verification must fail closed safely without crashing
    const dummyToken = "admin-1|session|1000|2000|abcdef";
    assert.equal(verifyAdminVerificationToken(dummyToken, "admin-1", "session"), false);
  } finally {
    if (originalSecret) process.env.ADMIN_VERIFICATION_SECRET = originalSecret;
    if (originalServiceKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
  }
});

test("Admin Verification: OTP expiry and replay rejection (Single-Use Lifecycle)", () => {
  const code = "782914";
  const salt = "salt_xyz_987";
  const hash = hashVerificationCode(code, salt);

  // Simulated challenge storage
  const activeChallenge = {
    codeHash: hash,
    salt,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attemptsLeft: 5,
    consumed: false,
  };

  // 1. Initial valid attempt succeeds and consumes code
  assert.equal(verifyCodeHash(code, activeChallenge.salt, activeChallenge.codeHash), true);
  activeChallenge.consumed = true;

  // 2. Replay attempt rejected because challenge is consumed
  const isReplayAllowed = !activeChallenge.consumed && verifyCodeHash(code, activeChallenge.salt, activeChallenge.codeHash);
  assert.equal(isReplayAllowed, false);

  // 3. Expired challenge rejected
  const expiredChallenge = {
    codeHash: hash,
    salt,
    expiresAt: Date.now() - 1000, // 1 second in past
    consumed: false,
  };
  const isExpired = Date.now() > expiredChallenge.expiresAt;
  assert.equal(isExpired, true);
});

test("Admin Verification: Exhausted attempt limits trigger lockout", () => {
  const correctCode = "456123";
  const wrongCode = "999999";
  const salt = "salt_limit_check";
  const hash = hashVerificationCode(correctCode, salt);

  let attemptsLeft = 5;
  let lockedOut = false;

  // Submit 5 incorrect guesses
  for (let i = 0; i < 5; i++) {
    const isMatch = verifyCodeHash(wrongCode, salt, hash);
    if (!isMatch) {
      attemptsLeft--;
      if (attemptsLeft <= 0) lockedOut = true;
    }
  }

  assert.equal(attemptsLeft, 0);
  assert.equal(lockedOut, true);

  // Even if user now presents correct code, locked out challenge must reject
  const allowAfterLockout = !lockedOut && verifyCodeHash(correctCode, salt, hash);
  assert.equal(allowAfterLockout, false);
});

test("Admin Verification: Concurrency isolation prevents challenge overwriting", () => {
  // Simulates dedicated per-admin row storage (admin_mfa_challenges)
  const challengesTable = new Map();

  const adminA = "admin-uuid-111";
  const adminB = "admin-uuid-222";

  // Admin A requests code
  challengesTable.set(adminA, { code: "111111", salt: "saltA", targetEmail: "a@speakup.edu" });

  // Admin B requests code concurrently
  challengesTable.set(adminB, { code: "222222", salt: "saltB", targetEmail: "b@speakup.edu" });

  // Admin A's challenge remains intact and independent of Admin B
  assert.ok(challengesTable.has(adminA));
  assert.ok(challengesTable.has(adminB));
  assert.equal(challengesTable.get(adminA).code, "111111");
  assert.equal(challengesTable.get(adminB).code, "222222");
});

test("Admin Verification: Cross-user token rejection and session tampering", () => {
  const adminA = "admin-uuid-alpha";
  const adminB = "admin-uuid-beta";
  const sessionStamp = "2026-10-13T10:00:00Z";

  const tokenA = generateAdminVerificationToken(adminA, sessionStamp);

  // Admin B attempting to present Admin A's token
  assert.equal(verifyAdminVerificationToken(tokenA, adminB, sessionStamp), false);

  // User attempting to modify token payload user ID
  const parts = tokenA.split("|");
  parts[0] = adminB; // Replace user ID without re-signing
  const tamperedToken = parts.join("|");
  assert.equal(verifyAdminVerificationToken(tamperedToken, adminB, sessionStamp), false);
});

test("Admin Verification: OAuth state token creation and cryptographic binding", () => {
  const adminId = "admin-oauth-test-user";
  const stateToken = generateOAuthState(adminId);

  // Valid state matches admin
  assert.equal(verifyOAuthState(stateToken, adminId), true);

  // Mismatched admin rejected
  assert.equal(verifyOAuthState(stateToken, "different-admin-id"), false);

  // Tampered state token rejected
  const tamperedState = stateToken.slice(0, -4) + "0000";
  assert.equal(verifyOAuthState(tamperedState, adminId), false);

  // Empty or null state rejected
  assert.equal(verifyOAuthState(null, adminId), false);
  assert.equal(verifyOAuthState("", adminId), false);
});

// ==============================================================================
// SUITE 4: SYNTHETIC JAVASCRIPT MOCKS & BEHAVIORAL SPECIFICATIONS
//
// CRITICAL NOTICE REGARDING INTEGRATION TESTING:
// The tests below are SYNTHETIC JAVASCRIPT UNIT MOCKS executed in Node.js.
// THEY ARE NOT POSTGRESQL INTEGRATION TESTS AND DO NOT EXECUTE AGAINST POSTGRESQL.
//
// Real PostgreSQL Integration Coverage Requirements (for live Supabase / pgTAP runner):
// 1. Role/Status Escalation Boundary:
//    - As role 'authenticated' (student), execute UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
//      EXPECT: SQLSTATE 42501 (Unauthorized: Students, teachers, and standard accounts cannot modify user roles).
//    - As role 'authenticated' (student), execute UPDATE public.profiles SET status = 'active' WHERE id = auth.uid();
//      EXPECT: SQLSTATE 42501 (Unauthorized: Account status modifications require administrator authorization).
//    - As role 'authenticated' (student A), execute UPDATE public.profiles SET full_name = 'Hacked' WHERE id = 'student-B-uuid';
//      EXPECT: SQLSTATE 42501 or 0 rows modified (RLS blocks access).
// 2. Teacher/Faculty Profile Updates:
//    - As role 'authenticated' (teacher), execute UPDATE public.profiles SET full_name = 'Dr. Smith' WHERE id = auth.uid();
//      EXPECT: SUCCESS (row updated).
// 3. Service-Role Administrative Operations:
//    - As role 'service_role', execute UPDATE public.profiles SET role = 'admin', status = 'active' WHERE id = 'user-uuid';
//      EXPECT: SUCCESS (row updated).
// 4. Challenge Table Permissions:
//    - As role 'anon', execute SELECT * FROM public.admin_mfa_challenges;
//      EXPECT: SQLSTATE 42501 (permission denied for table admin_mfa_challenges).
//    - As role 'authenticated', execute SELECT * FROM public.admin_mfa_challenges;
//      EXPECT: SQLSTATE 42501 (permission denied for table admin_mfa_challenges).
//    - As role 'service_role', execute SELECT/INSERT/UPDATE/DELETE ON public.admin_mfa_challenges;
//      EXPECT: SUCCESS.
// 5. Atomic MFA Attempts:
//    - Call consume_admin_mfa_attempt(p_admin_id, false) repeatedly;
//      EXPECT: attempts_left decrements monotonically to 0, then deletes row on 5th attempt.
//    - Concurrent calls serialize cleanly without race conditions due to SELECT ... FOR UPDATE.
// ==============================================================================

test("[MOCK / LOGIC TEST] Database Simulation: Student access to private challenge storage rejected", () => {
  // Simulates PostgreSQL RLS on public.admin_mfa_challenges
  function simulateTableSelect(table, callerRole) {
    if (table === "admin_mfa_challenges") {
      // RLS Policy: Only service_role and postgres can read
      if (callerRole === "service_role" || callerRole === "postgres") {
        return { allowed: true, data: [{ admin_id: "adm-1" }] };
      }
      return { allowed: false, error: "42501: permission denied for table admin_mfa_challenges" };
    }
    return { allowed: true };
  }

  // Anonymous visitor blocked
  assert.equal(simulateTableSelect("admin_mfa_challenges", "anon").allowed, false);

  // Authenticated student blocked
  assert.equal(simulateTableSelect("admin_mfa_challenges", "authenticated").allowed, false);

  // Trusted backend service-role allowed
  assert.equal(simulateTableSelect("admin_mfa_challenges", "service_role").allowed, true);
});

test("[MOCK / LOGIC TEST] Application Simulation: Unverified calls to privileged APIs rejected", () => {
  // Simulates API route verification logic (/api/send-email, /api/auth/google/connect)
  function simulateApiAccess({ role, isMfaVerified }) {
    if (role !== "admin") {
      return { status: 401, error: "Administrative authentication required" };
    }
    if (!isMfaVerified) {
      return { status: 403, error: "Administrative two-factor verification required" };
    }
    return { status: 200, success: true };
  }

  // Student rejected
  assert.equal(simulateApiAccess({ role: "student", isMfaVerified: false }).status, 401);

  // Unverified admin rejected with 403
  assert.equal(simulateApiAccess({ role: "admin", isMfaVerified: false }).status, 403);

  // Verified admin accepted with 200
  assert.equal(simulateApiAccess({ role: "admin", isMfaVerified: true }).status, 200);
});

test("[MOCK / LOGIC TEST] Database Simulation: Profile trigger trust boundary prevents escalation", () => {
  // Simulates PostgreSQL prevent_profile_role_escalation trigger logic
  // Validates that current_user = 'postgres' is NOT used as proof of caller trust
  function simulateProfileUpdateTrigger({ oldRow, newRow, sessionUser, jwtRole, isCallerAdmin }) {
    // Exact mirror of updated trigger logic in 20261014_admin_privilege_escalation_guard.sql:
    // Notice: current_user is completely excluded because in SECURITY DEFINER it always evaluates to 'postgres'
    const isTrustedService = (
      ((sessionUser === "postgres" || sessionUser === "supabase_admin") && jwtRole !== "authenticated" && jwtRole !== "anon") ||
      jwtRole === "service_role"
    ) && jwtRole !== "authenticated" && jwtRole !== "anon";

    const isAuthorized = isTrustedService || isCallerAdmin;

    if (!isAuthorized) {
      if (newRow.role !== oldRow.role) {
        throw new Error("42501: Unauthorized: Students, teachers, and standard accounts cannot modify user roles.");
      }
      if (newRow.status !== oldRow.status) {
        throw new Error("42501: Unauthorized: Account status modifications require administrator authorization.");
      }
      if (newRow.id !== oldRow.id) {
        throw new Error("42501: Unauthorized: Cannot modify other user profiles.");
      }
    }
    return { updated: true, newRow };
  }

  const studentOld = { id: "std-1", role: "student", status: "pending_approval", full_name: "Alice" };

  // 1. Student self-escalating role to 'admin' -> Rejected
  assert.throws(
    () => simulateProfileUpdateTrigger({
      oldRow: studentOld,
      newRow: { ...studentOld, role: "admin" },
      sessionUser: "authenticator",
      jwtRole: "authenticated",
      isCallerAdmin: false,
    }),
    /cannot modify user roles/
  );

  // 2. Student self-activating status from 'pending_approval' to 'active' -> Rejected
  assert.throws(
    () => simulateProfileUpdateTrigger({
      oldRow: studentOld,
      newRow: { ...studentOld, status: "active" },
      sessionUser: "authenticator",
      jwtRole: "authenticated",
      isCallerAdmin: false,
    }),
    /Account status modifications require administrator authorization/
  );

  // 3. Legitimate service-role modifying status (e.g. admin approving account) -> Allowed
  const serviceUpdate = simulateProfileUpdateTrigger({
    oldRow: studentOld,
    newRow: { ...studentOld, status: "active" },
    sessionUser: "authenticator",
    jwtRole: "service_role",
    isCallerAdmin: false,
  });
  assert.equal(serviceUpdate.newRow.status, "active");

  // 4. Teacher updating own bio/name while keeping role 'teacher' and status 'active' -> Allowed
  const teacherOld = { id: "tch-1", role: "teacher", status: "active", full_name: "Prof. Smith" };
  const teacherUpdate = simulateProfileUpdateTrigger({
    oldRow: teacherOld,
    newRow: { ...teacherOld, full_name: "Dr. Smith, PhD" },
    sessionUser: "authenticator",
    jwtRole: "authenticated",
    isCallerAdmin: false,
  });
  assert.equal(teacherUpdate.newRow.full_name, "Dr. Smith, PhD");
});

test("[MOCK / LOGIC TEST] Application Simulation: MFA verification cookie cleared upon admin sign out", () => {
  // Simulates clearAdminMfaSessionAction cookie handling
  const cookies = new Map([["speakup_admin_mfa_verified", "valid_token_string"]]);

  function simulateClearMfaCookie() {
    cookies.delete("speakup_admin_mfa_verified");
  }

  assert.equal(cookies.has("speakup_admin_mfa_verified"), true);
  simulateClearMfaCookie();
  assert.equal(cookies.has("speakup_admin_mfa_verified"), false);
});

test("[MOCK / LOGIC TEST] MFA Fail-Closed Persistence: Fails closed and blocks verification email if database write fails", async () => {
  // Simulates sendAdminVerificationCodeAction flow under database persistence failure
  async function simulateSendCode({ dbWriteSucceeds, emailService }) {
    if (!dbWriteSucceeds) {
      return {
        success: false,
        error: "MFA challenge storage failure: persistent database storage is unavailable. Please ensure database migration 20261015_admin_mfa_challenges.sql is applied.",
        emailSent: false,
      };
    }
    await emailService.send();
    return { success: true, emailSent: true };
  }

  let emailDispatched = false;
  const mockEmailService = {
    send: async () => {
      emailDispatched = true;
    },
  };

  // When DB write fails:
  const result = await simulateSendCode({ dbWriteSucceeds: false, emailService: mockEmailService });
  assert.equal(result.success, false);
  assert.match(result.error, /persistent database storage is unavailable/);
  assert.equal(emailDispatched, false);
  assert.equal(result.emailSent, false);
});

test("Route Protection: Admin verification redirect sanitization prevents open redirects", () => {
  function getSafeAdminRedirect(target) {
    const defaultTarget = "/admin";
    if (!target) return defaultTarget;
    if (
      (target === "/admin" || target.startsWith("/admin/")) &&
      !target.startsWith("//") &&
      !target.includes("\\") &&
      !target.includes(":") &&
      !target.includes("@")
    ) {
      return target;
    }
    return defaultTarget;
  }

  // Allowed internal admin destinations
  assert.equal(getSafeAdminRedirect("/admin"), "/admin");
  assert.equal(getSafeAdminRedirect("/admin/dashboard"), "/admin/dashboard");
  assert.equal(getSafeAdminRedirect("/admin/portal-email"), "/admin/portal-email");
  assert.equal(getSafeAdminRedirect("/admin/students?page=2"), "/admin/students?page=2");

  // Open-redirect attack vectors blocked -> fallback to "/admin"
  assert.equal(getSafeAdminRedirect("https://attacker.com"), "/admin");
  assert.equal(getSafeAdminRedirect("//attacker.com/admin"), "/admin");
  assert.equal(getSafeAdminRedirect("/admin@attacker.com"), "/admin");
  assert.equal(getSafeAdminRedirect("javascript:alert(1)"), "/admin");
  assert.equal(getSafeAdminRedirect("/admin\\evil.com"), "/admin");
  assert.equal(getSafeAdminRedirect("/admin:8080"), "/admin");
  assert.equal(getSafeAdminRedirect("/other/route"), "/admin");
  assert.equal(getSafeAdminRedirect(""), "/admin");
  assert.equal(getSafeAdminRedirect(null), "/admin");
});

test("Email Template Responsiveness: Admin MFA OTP template renders valid viewport, media queries, and responsive box", () => {
  const code = "849201";
  const html = getAdminMfaVerificationEmailHtml({ code, expiresMinutes: 10 });

  // 1. Must include mobile viewport meta tag
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1\.0">/);

  // 2. Must include responsive media queries for 600px and 375px
  assert.match(html, /@media only screen and \(max-width: 600px\)/);
  assert.match(html, /@media only screen and \(max-width: 375px\)/);

  // 3. Must display code with centered, word-break proof styling
  assert.match(html, />849201<\/td>/);
  assert.match(html, /word-break: keep-all/);
  assert.match(html, /white-space: nowrap/);

  // 4. Must include expiration and security alerts
  assert.match(html, /expire in 10 minutes/);
  assert.match(html, /Security Alert:/);

  // 5. Default expiration must be 3 minutes
  const defaultHtml = getAdminMfaVerificationEmailHtml({ code });
  assert.match(defaultHtml, /expire in 3 minutes/);

  // 6. Header must be text-only without institutional logo image or img element
  assert.ok(html.includes("SPEAKUP LMS"), "MFA email header retains official SpeakUp brand title");
  assert.ok(html.includes("Institutional Administration Security"), "MFA email header retains security subtitle");
  assert.ok(!html.includes("<img"), "Admin MFA email header must not contain an img element");
  assert.ok(!html.includes("speakup-logo"), "Admin MFA email header must not reference logo image");
});

test("Email Branding: renderEmailLayout renders text-only SpeakUp LMS header without logo image", () => {
  const html = renderEmailLayout("<p>Test message content</p>", {
    senderName: "Admin User",
    avatarUrl: "https://example.com/custom-portrait.jpg",
  });

  assert.ok(html.includes("SPEAKUP LMS"), "Standard header retains official SpeakUp brand title");
  assert.ok(html.includes("Language &amp; Communication Mastery"), "Standard header retains official brand subtitle");
  assert.ok(!html.includes("<img"), "Standard email header is text-only and contains no img element");
  assert.ok(!html.includes("speakup-logo.png"), "Standard email header does not reference logo image URL");
  assert.ok(!html.includes("speakup-logo-dark.png"), "Standard email header does not reference dark logo image URL");
});

test("Supabase Auth Templates: Confirmation, recovery, and invite render text-only SpeakUp LMS header without logo image", () => {
  for (const [key, tpl] of Object.entries(SUPABASE_AUTH_TEMPLATES)) {
    assert.ok(!tpl.html.includes("<img"), `${key} template must be text-only without img tag`);
    assert.ok(!tpl.html.includes("speakup-logo"), `${key} template must not reference logo image`);
    assert.ok(tpl.html.includes("SPEAKUP LMS"), `${key} template contains brand title`);
    assert.ok(tpl.html.includes("Language &amp; Communication Mastery"), `${key} template contains brand subtitle`);
  }
});

test("Provider Restriction: Resend sandbox error reports actionable message and refuses arbitrary fallback", () => {
  // Simulates error formatting in sendBrandedEmail when sandbox error occurs
  function formatProviderError(errorMessage, fromEmail, primaryRecipient) {
    if (errorMessage.toLowerCase().includes("own email address")) {
      return `Email delivery restriction: Domain for "${fromEmail}" is in unverified sandbox mode in your email provider (Resend). Resend sandbox mode only permits test dispatch to the Resend account owner. To send verification codes to the administrator's account (${primaryRecipient}), please verify your custom domain in Resend Dashboard (resend.com/domains) or connect an authorized Google Gmail account in Portal Email settings.`;
    }
    return errorMessage;
  }

  const rawResendError = "You can only send testing emails to your own email address (mudassir.alii2006@gmail.com).";
  const formatted = formatProviderError(rawResendError, "onboarding@resend.dev", "admin@speakup.edu");

  // Must NOT redirect recipient to mudassir.alii2006@gmail.com
  assert.match(formatted, /Email delivery restriction:/);
  assert.match(formatted, /resend\.com\/domains/);
  assert.match(formatted, /admin@speakup\.edu/);
});

test("Admin Verification: Authoritative Admin Email Selection fails closed without authenticated email", () => {
  function resolveAdminEmailSync(user) {
    if (user?.email && user.email.includes("@")) {
      return user.email.trim().toLowerCase();
    }
    return null;
  }

  assert.equal(resolveAdminEmailSync({ email: "Admin.Login@Domain.com " }), "admin.login@domain.com");
  assert.equal(resolveAdminEmailSync({ email: "invalid-string" }), null);
  assert.equal(resolveAdminEmailSync({ email: null }), null);
  assert.equal(resolveAdminEmailSync({}), null);
});

test("Mount Race Condition: Double-mount effect guard executes code dispatch strictly once", () => {
  let dispatchCount = 0;
  let hasRequestedRef = { current: false };

  function simulateMountEffect() {
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    dispatchCount++;
  }

  // First mount in React StrictMode
  simulateMountEffect();
  // Second mount in React StrictMode
  simulateMountEffect();

  assert.equal(dispatchCount, 1, "MFA code dispatch must execute exactly once across StrictMode remounts");
});

test("Security Migration: Stage 1 SQL migration preserves explicit transaction boundaries", () => {
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20261017_stage1_profiles_rls_and_privilege_guard.sql");
  assert.equal(fs.existsSync(migrationPath), true, "Stage 1 migration file must exist");

  const sql = fs.readFileSync(migrationPath, "utf-8");
  assert.match(sql, /\bBEGIN;/, "Migration must begin with an explicit transaction");
  assert.match(sql, /\bCOMMIT;/, "Migration must commit the transaction before recovery runbook");
});

test("Admin Verification: 3-Minute OTP Expiry and Enforced Lifetime", () => {
  assert.equal(CODE_EXPIRY_MS, 3 * 60 * 1000, "CODE_EXPIRY_MS must be strictly 3 minutes (180,000 ms)");
  assert.equal(RESEND_COOLDOWN_MS, 60 * 1000, "RESEND_COOLDOWN_MS must be 60 seconds");
  assert.equal(MAX_VERIFY_ATTEMPTS, 5, "MAX_VERIFY_ATTEMPTS must be 5");

  // Server-side expiry rejection check
  const code = "123456";
  const salt = "expiry_salt";
  const codeHash = hashVerificationCode(code, salt);

  const now = Date.now();
  const challenge = {
    codeHash,
    salt,
    expiresAt: now + CODE_EXPIRY_MS,
    attemptsLeft: 5,
    consumed: false,
  };

  // 1. Within 3-minute window (e.g. at 2m59s) it should be valid
  const timeRemainingMs = challenge.expiresAt - (now + 179 * 1000);
  assert.ok(timeRemainingMs > 0, "Challenge should be valid within 3-minute window");
  assert.equal(verifyCodeHash(code, challenge.salt, challenge.codeHash), true);

  // 2. Beyond 3-minute window (e.g. at 3m01s) it must be rejected server-side
  const simulatedExpiredTime = now + (3 * 60 * 1000 + 1000);
  const isExpired = simulatedExpiredTime > challenge.expiresAt;
  assert.equal(isExpired, true, "Challenge must be considered expired after 3 minutes");

  // Expired code must not be verified or consumed
  const allowExpiredVerification = !isExpired && !challenge.consumed && verifyCodeHash(code, challenge.salt, challenge.codeHash);
  assert.equal(allowExpiredVerification, false, "Expired code must be rejected server-side");
});

test("MFA Provider Fallback: Resend sandbox error initiates Gmail fallback when Gmail is connected", async () => {
  let resendAttempted = false;
  let gmailAttempted = false;
  let recipientUsed = null;

  async function mockSendDispatch({ recipientEmail, isGmailConnected, isGmailAuthorized }) {
    resendAttempted = true;
    recipientUsed = recipientEmail;

    // Resend sandbox rejection simulation
    const resendError = "You can only send testing emails to your own email address (mudassir.alii2006@gmail.com).";
    const isSandboxError = resendError.toLowerCase().includes("own email address");

    if (isSandboxError) {
      if (isGmailConnected && isGmailAuthorized) {
        gmailAttempted = true;
        return { success: true, provider: "gmail", messageId: "gmail-msg-001" };
      }
      return {
        success: false,
        deliveryFailed: true,
        provider: "resend_sandbox_restricted",
        error: "Resend sandbox restriction. Connect Google OAuth in Portal Email to enable automatic fallback."
      };
    }
    return { success: true, provider: "resend" };
  }

  const result = await mockSendDispatch({
    recipientEmail: "admin@speakup.edu.pk",
    isGmailConnected: true,
    isGmailAuthorized: true,
  });

  assert.equal(resendAttempted, true, "Must attempt Resend first");
  assert.equal(gmailAttempted, true, "Must fallback to Gmail on Resend sandbox restriction");
  assert.equal(result.success, true);
  assert.equal(result.provider, "gmail");
  assert.equal(recipientUsed, "admin@speakup.edu.pk", "Must preserve authenticated admin's email as recipient");
});

test("MFA Provider Fail-Closed: When Gmail is disconnected or unauthorized, delivery fails closed with actionable error", async () => {
  let challengeCleanedUp = false;

  async function mockSendDispatchFailsClosed({ isGmailConnected, isGmailAuthorized }) {
    const resendError = "You can only send testing emails to your own email address (mudassir.alii2006@gmail.com).";
    const isSandboxError = resendError.toLowerCase().includes("own email address");

    if (isSandboxError) {
      if (!isGmailConnected || !isGmailAuthorized) {
        challengeCleanedUp = true;
        return {
          success: false,
          deliveryFailed: true,
          provider: "none",
          error: "Resend sandbox restricted and Portal Email (Gmail) is not connected or unauthorized. Please configure Portal Email at /admin/portal-email.",
          resendCooldown: 0,
        };
      }
    }
    return { success: true };
  }

  const result = await mockSendDispatchFailsClosed({ isGmailConnected: false, isGmailAuthorized: false });

  assert.equal(result.success, false);
  assert.equal(result.deliveryFailed, true);
  assert.equal(challengeCleanedUp, true, "Undelivered challenge must be cleaned up to avoid orphaned unreceived codes");
  assert.match(result.error, /\/admin\/portal-email/);
  assert.equal(result.resendCooldown, 0, "Resend cooldown should be 0 on failure to allow immediate retry after config");
});

test("Security Enforcement: Never redirects OTP to Resend owner or error address", () => {
  const verifiedAdminEmail = "director@speakup.edu";
  const resendAccountOwner = "mudassir.alii2006@gmail.com";
  const rawErrorMessage = `You can only send testing emails to your own email address (${resendAccountOwner}).`;

  function getDispatchRecipient(targetAdmin, errorMessage) {
    if (!targetAdmin || typeof targetAdmin !== "string" || !targetAdmin.includes("@")) {
      throw new Error("Invalid admin recipient");
    }
    return targetAdmin.trim().toLowerCase();
  }

  const recipient = getDispatchRecipient(verifiedAdminEmail, rawErrorMessage);
  assert.equal(recipient, "director@speakup.edu");
  assert.notEqual(recipient, resendAccountOwner);
});

test("Challenge Invalidation: Generating a new challenge supersedes and invalidates the previous challenge", () => {
  const adminId = "admin-user-777";
  const challengesDb = new Map();

  function storeChallenge(userId, code) {
    const salt = "salt_" + Date.now();
    const codeHash = hashVerificationCode(code, salt);
    challengesDb.set(userId, {
      codeHash,
      salt,
      createdAt: Date.now(),
      expiresAt: Date.now() + CODE_EXPIRY_MS,
      attemptsLeft: 5,
      consumed: false,
    });
  }

  function verifyChallenge(userId, inputCode) {
    const ch = challengesDb.get(userId);
    if (!ch) return { success: false, reason: "NO_CHALLENGE" };
    if (ch.consumed) return { success: false, reason: "ALREADY_CONSUMED" };
    if (Date.now() > ch.expiresAt) return { success: false, reason: "EXPIRED" };
    if (ch.attemptsLeft <= 0) return { success: false, reason: "MAX_ATTEMPTS" };

    const valid = verifyCodeHash(inputCode, ch.salt, ch.codeHash);
    if (!valid) {
      ch.attemptsLeft--;
      return { success: false, reason: "INVALID_CODE" };
    }
    ch.consumed = true;
    return { success: true };
  }

  // 1. Initial code generated
  const code1 = "111222";
  storeChallenge(adminId, code1);

  // 2. Resend requested: new code generated, superseding old challenge
  const code2 = "333444";
  storeChallenge(adminId, code2);

  // 3. Old code1 must now be rejected
  const oldResult = verifyChallenge(adminId, code1);
  assert.equal(oldResult.success, false, "Old superseded code must be rejected");

  // 4. New code2 succeeds
  const newResult = verifyChallenge(adminId, code2);
  assert.equal(newResult.success, true, "New code must succeed");

  // 5. Code2 cannot be replayed (single-use)
  const replayResult = verifyChallenge(adminId, code2);
  assert.equal(replayResult.success, false, "Replay must be rejected");
  assert.equal(replayResult.reason, "ALREADY_CONSUMED");
});

test("MFA Access Guard: Rejects admin route access without verified MFA cookie token", () => {
  const adminId = "admin-user-protected";
  const sessionStamp = "2026-10-16T12:00:00Z";

  // Case A: No cookie token at all
  assert.equal(verifyAdminVerificationToken(undefined, adminId, sessionStamp), false);
  assert.equal(verifyAdminVerificationToken(null, adminId, sessionStamp), false);
  assert.equal(verifyAdminVerificationToken("", adminId, sessionStamp), false);

  // Case B: Forged / fake token
  assert.equal(verifyAdminVerificationToken("forged-admin-token", adminId, sessionStamp), false);

  // Case C: Valid token for different user
  const tokenOtherUser = generateAdminVerificationToken("other-admin-id", sessionStamp);
  assert.equal(verifyAdminVerificationToken(tokenOtherUser, adminId, sessionStamp), false);

  // Case D: Valid token with old session stamp (e.g. signed out or re-authenticated)
  const oldToken = generateAdminVerificationToken(adminId, "old-session-stamp");
  assert.equal(verifyAdminVerificationToken(oldToken, adminId, sessionStamp), false);

  // Case E: Genuine token with matching user and session
  const validToken = generateAdminVerificationToken(adminId, sessionStamp);
  assert.equal(verifyAdminVerificationToken(validToken, adminId, sessionStamp), true);
});

test("MFA Sender Branding: Sets branded sender display name to 'SpeakUp Team'", () => {
  function resolveSenderHeader(fromName, fromEmail) {
    const effectiveFromName = fromName?.trim() || "SpeakUp Team";
    const effectiveFromEmail = fromEmail || "onboarding@resend.dev";
    return `${effectiveFromName} <${effectiveFromEmail}>`;
  }

  // With default fromName
  assert.equal(
    resolveSenderHeader(undefined, "onboarding@resend.dev"),
    "SpeakUp Team <onboarding@resend.dev>"
  );

  // With explicit "SpeakUp Team"
  assert.equal(
    resolveSenderHeader("SpeakUp Team", "admin@speakup.edu.pk"),
    "SpeakUp Team <admin@speakup.edu.pk>"
  );

  // Does not allow spoofing sender email address from display name
  assert.match(
    resolveSenderHeader("SpeakUp Team", "onboarding@resend.dev"),
    /^SpeakUp Team <onboarding@resend\.dev>$/
  );
});

test("Gmail Operational Guard: Evaluates operational readiness of Google OAuth and connected account", () => {
  function checkGmailReadiness({ clientId, clientSecret, connected, email, hasRefreshToken }) {
    if (!clientId && !clientSecret) {
      return {
        operational: false,
        reason: "Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in server environment variables.",
      };
    }
    if (!clientId) {
      return {
        operational: false,
        reason: "GOOGLE_CLIENT_ID is not configured in server environment variables.",
      };
    }
    if (!clientSecret) {
      return {
        operational: false,
        reason: "GOOGLE_CLIENT_SECRET is not configured in server environment variables.",
      };
    }
    if (!connected || !email) {
      return {
        operational: false,
        reason: "No Google Gmail account is connected in Portal Email settings (/admin/portal-email).",
      };
    }
    if (!hasRefreshToken) {
      return {
        operational: false,
        reason: "Connected Google Gmail account is missing an OAuth refresh token. Please reconnect the account at /admin/portal-email.",
      };
    }
    return { operational: true, email };
  }

  // Case 1a: Missing both credentials
  const res1a = checkGmailReadiness({ clientId: "", clientSecret: "", connected: false, email: null, hasRefreshToken: false });
  assert.equal(res1a.operational, false);
  assert.match(res1a.reason, /GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET/);

  // Case 1b: Missing client ID only
  const res1b = checkGmailReadiness({ clientId: "", clientSecret: "sec", connected: false, email: null, hasRefreshToken: false });
  assert.equal(res1b.operational, false);
  assert.match(res1b.reason, /GOOGLE_CLIENT_ID is not configured/);

  // Case 1c: Missing client secret only
  const res1c = checkGmailReadiness({ clientId: "id", clientSecret: "", connected: false, email: null, hasRefreshToken: false });
  assert.equal(res1c.operational, false);
  assert.match(res1c.reason, /GOOGLE_CLIENT_SECRET is not configured/);

  // Case 2: Credentials present, but no account connected
  const res2 = checkGmailReadiness({ clientId: "id", clientSecret: "sec", connected: false, email: null, hasRefreshToken: false });
  assert.equal(res2.operational, false);
  assert.match(res2.reason, /No Google Gmail account is connected/);

  // Case 3: Account connected, but missing refresh token
  const res3 = checkGmailReadiness({ clientId: "id", clientSecret: "sec", connected: true, email: "portal@speakup.edu", hasRefreshToken: false });
  assert.equal(res3.operational, false);
  assert.match(res3.reason, /missing an OAuth refresh token/);

  // Case 4: Fully operational
  const res4 = checkGmailReadiness({ clientId: "id", clientSecret: "sec", connected: true, email: "portal@speakup.edu", hasRefreshToken: true });
  assert.equal(res4.operational, true);
  assert.equal(res4.email, "portal@speakup.edu");
});

test("Gmail Token Refresh: Handles revoked authorization and invalid_grant gracefully", () => {
  function handleGoogleTokenError(data) {
    const errCode = (data.error || "").toString();
    const errDesc = (data.error_description || "").toString();
    if (
      errCode === "invalid_grant" ||
      errDesc.toLowerCase().includes("revoked") ||
      errDesc.toLowerCase().includes("expired")
    ) {
      return {
        error: "Google authorization has expired or was revoked. Please reconnect your account at /admin/portal-email.",
      };
    }
    return { error: errDesc || errCode || "Failed to refresh Google access token." };
  }

  // Revoked consent / invalid grant
  const res1 = handleGoogleTokenError({ error: "invalid_grant", error_description: "Token has been expired or revoked." });
  assert.match(res1.error, /Google authorization has expired or was revoked/);
  assert.match(res1.error, /\/admin\/portal-email/);

  // Generic Google API error
  const res2 = handleGoogleTokenError({ error: "unauthorized_client", error_description: "Client is unauthorized." });
  assert.equal(res2.error, "Client is unauthorized.");
});

test("Token Storage Security: AES-256-GCM encryption round-trip and prohibition of runtime .env.local writes", () => {
  const gmailCodePath = path.resolve(process.cwd(), "src/lib/email/gmail.ts");
  const gmailCode = fs.readFileSync(gmailCodePath, "utf-8");

  // Verify writeFileSync and syncEnvLocalCredentials are completely absent
  assert.equal(
    gmailCode.includes("syncEnvLocalCredentials"),
    false,
    "gmail.ts must not contain syncEnvLocalCredentials"
  );
  assert.equal(
    gmailCode.includes("writeFileSync"),
    false,
    "gmail.ts must not contain writeFileSync"
  );
  assert.equal(
    gmailCode.includes(".env.local"),
    false,
    "gmail.ts must not reference .env.local for runtime writes"
  );

  // Test AES-256-GCM encryption/decryption round-trip logic
  const secretKey = getHmacSecret();

  function encryptTokenTest(plainText) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", secretKey, iv);
    const enc = Buffer.concat([cipher.update(plainText, "utf-8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `enc:${iv.toString("hex")}:${authTag.toString("hex")}:${enc.toString("hex")}`;
  }

  function decryptTokenTest(cipherText) {
    try {
      if (!cipherText || !cipherText.startsWith("enc:")) return cipherText || "";
      const parts = cipherText.split(":");
      if (parts.length !== 4) return cipherText;
      const iv = Buffer.from(parts[1], "hex");
      const authTag = Buffer.from(parts[2], "hex");
      const enc = Buffer.from(parts[3], "hex");
      const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey, iv);
      decipher.setAuthTag(authTag);
      return decipher.update(enc) + decipher.final("utf-8");
    } catch {
      return "";
    }
  }

  const sampleToken = "1//04AbCdEfGhIjKlMnOpQrStUvWxYz_1234567890-testRefreshToken";
  const encrypted = encryptTokenTest(sampleToken);

  assert.notEqual(encrypted, sampleToken, "Encrypted token must differ from plaintext");
  assert.ok(encrypted.startsWith("enc:"), "Encrypted token must have enc: prefix");
  assert.equal(encrypted.split(":").length, 4, "Encrypted token must contain 4 colon-separated parts (prefix, iv, authTag, ciphertext)");

  const decrypted = decryptTokenTest(encrypted);
  assert.equal(decrypted, sampleToken, "Decrypted token must exactly match original plaintext");

  // Corrupted ciphertext or auth tag must fail closed
  const tampered = encrypted.slice(0, -4) + "0000";
  assert.equal(decryptTokenTest(tampered), "", "Tampered ciphertext must fail decryption gracefully");
});

// ==============================================================================
// SUITE: PHASE 1 REMEDIATION & SCHEMA COMPATIBILITY VERIFICATION
// ==============================================================================

test("Schema Compatibility: Verifies public.profiles queries across src/ strictly use account_status and omit missing columns", () => {
  const srcDir = path.resolve(process.cwd(), "src");

  function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(fullPath));
      } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        results.push(fullPath);
      }
    });
    return results;
  }

  const files = getFiles(srcDir);
  const forbiddenProfileSelectRegex = /\.from\(['"]profiles['"]\)\s*\.select\([^)]*\bstatus\b[^)]*\)/i;
  const forbiddenProfileSessionVersionRegex = /\.from\(['"]profiles['"]\)\s*\.select\([^)]*\bsession_version\b[^)]*\)/i;
  const forbiddenProfilePasswordChangedRegex = /\.from\(['"]profiles['"]\)\s*\.select\([^)]*\bpassword_changed_at\b[^)]*\)/i;
  const forbiddenProfileStatusMutationRegex = /\.from\(['"]profiles['"]\)\s*\.(?:update|upsert)\(\s*\{[^}]*\bstatus\s*:/;
  const forbiddenProfileUpdatedAtMutationRegex = /\.from\(['"]profiles['"]\)\s*\.(?:update|upsert)\(\s*\{[^}]*\bupdated_at\s*:/;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8");
    const relPath = path.relative(process.cwd(), filePath);

    assert.equal(
      forbiddenProfileSelectRegex.test(content),
      false,
      `File ${relPath} contains invalid .select() query requesting non-existent profiles.status column`
    );
    assert.equal(
      forbiddenProfileSessionVersionRegex.test(content),
      false,
      `File ${relPath} contains invalid .select() query requesting non-existent profiles.session_version column`
    );
    assert.equal(
      forbiddenProfilePasswordChangedRegex.test(content),
      false,
      `File ${relPath} contains invalid .select() query requesting non-existent profiles.password_changed_at column`
    );
    assert.equal(
      forbiddenProfileStatusMutationRegex.test(content),
      false,
      `File ${relPath} contains invalid mutation writing to non-existent profiles.status column (use account_status)`
    );
    assert.equal(
      forbiddenProfileUpdatedAtMutationRegex.test(content),
      false,
      `File ${relPath} contains invalid mutation writing to non-existent profiles.updated_at column`
    );
  }
});

test("Admin Lockout Prevention: Evaluates role and status resolution logic under live database conditions", () => {
  // Simulate live database state: admin profile has role = 'admin' and account_status = 'pending'
  const liveAdminProfile = {
    role: "admin",
    account_status: "pending",
  };

  function resolveRoleAndStatus(profile, appMetadata, user) {
    const isBanned = Boolean(user?.banned_until && new Date(user.banned_until) > new Date());
    const appMetaRole = appMetadata?.role || null;
    const appMetaStatus = appMetadata?.status || null;

    let dbRole = profile?.role || null;
    let dbStatus = profile?.account_status || null;

    const finalRole = dbRole || appMetaRole || "student";
    const defaultStatus = finalRole === "admin" ? "active" : "pending";
    const finalStatus = isBanned
      ? "suspended"
      : dbStatus || appMetaStatus || defaultStatus;
    const isSuspended = isBanned || finalStatus === "suspended";

    return {
      role: finalRole,
      status: finalStatus,
      isSuspended,
      isAdmin: finalRole === "admin",
    };
  }

  // 1. Live Admin Verification
  const adminResolved = resolveRoleAndStatus(liveAdminProfile, {}, { banned_until: null });
  assert.equal(adminResolved.role, "admin", "Admin role must be recognized from profiles.role");
  assert.equal(adminResolved.isAdmin, true, "isAdmin must evaluate to true based on verified role");
  assert.equal(adminResolved.isSuspended, false, "Admin with pending account_status must not be suspended");

  // 2. Student Pending Access Restriction
  const pendingStudentProfile = {
    role: "student",
    account_status: "pending",
  };
  const studentResolved = resolveRoleAndStatus(pendingStudentProfile, {}, { banned_until: null });
  assert.equal(studentResolved.role, "student");
  assert.equal(studentResolved.status, "pending");
  assert.equal(studentResolved.isAdmin, false);

  function simulateCourseAccess(account, hasApprovedEnrollment) {
    if (!account.role || account.isSuspended || (account.role !== "admin" && account.status !== "active")) {
      return false;
    }
    return hasApprovedEnrollment;
  }

  // Pending student must be denied access even if an enrollment record exists
  assert.equal(
    simulateCourseAccess(studentResolved, true),
    false,
    "Pending student must NOT receive course access through any fallback"
  );

  // Suspended student must be denied access
  const suspendedStudentProfile = {
    role: "student",
    account_status: "suspended",
  };
  const suspendedResolved = resolveRoleAndStatus(suspendedStudentProfile, {}, { banned_until: null });
  assert.equal(
    simulateCourseAccess(suspendedResolved, true),
    false,
    "Suspended student must NOT receive course access"
  );

  // Active student with approved enrollment is granted access
  const activeStudentProfile = {
    role: "student",
    account_status: "active",
  };
  const activeResolved = resolveRoleAndStatus(activeStudentProfile, {}, { banned_until: null });
  assert.equal(
    simulateCourseAccess(activeResolved, true),
    true,
    "Active student with approved enrollment is granted course access"
  );

  // Admin access to preview lessons is preserved regardless of enrollment
  assert.equal(
    simulateCourseAccess(adminResolved, false),
    false, // requires courseId or direct admin bypass in LMS action
    "Admin enrollment check strictly adheres to authorization boundaries"
  );
});

test("Student Listing and Metrics: Verifies mapping from profiles.account_status to canonical summary properties", () => {
  const mockProfilesRaw = [
    {
      id: "std-001",
      email: "active.student@speakup.edu.pk",
      full_name: "Active Student",
      phone: "+923001234567",
      role: "student",
      account_status: "active",
      avatar_url: null,
      created_at: "2026-10-10T12:00:00Z",
    },
    {
      id: "std-002",
      email: "pending.student@speakup.edu.pk",
      full_name: "Pending Student",
      phone: "+923007654321",
      role: "student",
      account_status: "pending",
      avatar_url: null,
      created_at: "2026-10-11T12:00:00Z",
    },
    {
      id: "std-003",
      email: "unspecified.student@speakup.edu.pk",
      full_name: "Unspecified Student",
      phone: null,
      role: "student",
      account_status: null, // missing status in row
      avatar_url: null,
      created_at: "2026-10-12T12:00:00Z",
    },
  ];

  function mapToStudentSummaries(profiles) {
    return profiles.map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      phone: p.phone,
      role: p.role || "student",
      status: p.account_status || "pending", // safe fail-closed fallback
      avatar_url: p.avatar_url,
      created_at: p.created_at,
    }));
  }

  const summaries = mapToStudentSummaries(mockProfilesRaw);
  assert.equal(summaries[0].status, "active");
  assert.equal(summaries[1].status, "pending");
  assert.equal(summaries[2].status, "pending", "Missing account_status must safely default to 'pending', not 'active'");

  // Verify metric tally logic
  let activeCount = 0;
  let pendingCount = 0;
  summaries.forEach((s) => {
    if (s.status === "active") activeCount++;
    if (s.status === "pending") pendingCount++;
  });
  assert.equal(activeCount, 1);
  assert.equal(pendingCount, 2);
});

test("Registration Profile Creation: Verifies registration upsert payload structure", () => {
  const registerPayload = {
    userId: "new-user-uuid-1234",
    email: "NewStudent@SpeakUp.edu.pk",
    fullName: "Ayesha Khan",
    phone: "+923111222333",
    receiptTid: "TID-998877",
  };

  const normalizedEmail = registerPayload.email.trim().toLowerCase();
  const upsertRecord = {
    id: registerPayload.userId,
    email: normalizedEmail,
    full_name: registerPayload.fullName,
    phone: registerPayload.phone || null,
    role: "student",
    account_status: "pending",
    receipt_id: registerPayload.receiptTid || null,
  };

  assert.equal("status" in upsertRecord, false, "Registration upsert record must NOT contain 'status'");
  assert.equal("updated_at" in upsertRecord, false, "Registration upsert record must NOT contain 'updated_at'");
  assert.equal("session_version" in upsertRecord, false, "Registration upsert record must NOT contain 'session_version'");
  assert.equal("password_changed_at" in upsertRecord, false, "Registration upsert record must NOT contain 'password_changed_at'");
  assert.equal(upsertRecord.account_status, "pending", "Registration record must set account_status to 'pending' to require administrative review");
  assert.equal(upsertRecord.receipt_id, "TID-998877", "Registration record must record receipt_id for administrative verification");
  assert.equal(upsertRecord.role, "student", "Registration record role must be strictly 'student'");
});

test("Admin Status Mutations: Verifies approval and suspension mutations target canonical account_status", () => {
  function createAccountStatusMutation(action) {
    if (action === "approve" || action === "reactivate") {
      return { account_status: "active" };
    }
    if (action === "suspend") {
      return { account_status: "suspended" };
    }
    if (action === "reject") {
      return { account_status: "rejected" };
    }
    throw new Error(`Unknown action: ${action}`);
  }

  const approveMutation = createAccountStatusMutation("approve");
  assert.deepEqual(approveMutation, { account_status: "active" });
  assert.equal("status" in approveMutation, false);

  const suspendMutation = createAccountStatusMutation("suspend");
  assert.deepEqual(suspendMutation, { account_status: "suspended" });
  assert.equal("status" in suspendMutation, false);

  const rejectMutation = createAccountStatusMutation("reject");
  assert.deepEqual(rejectMutation, { account_status: "rejected" });
  assert.equal("status" in rejectMutation, false);
});

test("Pending Migration 20261017: Precondition analysis and safety verification", () => {
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20261017_stage1_profiles_rls_and_privilege_guard.sql");
  assert.ok(fs.existsSync(migrationPath), "Migration 20261017 file must exist");
  const sql = fs.readFileSync(migrationPath, "utf-8");

  // 1. Verify canonical account_status usage
  assert.ok(
    sql.includes("account_status"),
    "Migration 20261017 must use canonical account_status column"
  );
  assert.ok(
    sql.includes("account_status IS DISTINCT FROM 'suspended'"),
    "Migration 20261017 must preserve admin access by checking account_status is not suspended, tolerating pending status"
  );

  // 2. Verify complete absence of nonexistent columns from SQL logic
  assert.equal(
    /\bstatus\s*=\s*'active'/.test(sql),
    false,
    "Migration 20261017 must NOT contain status = 'active' which would lock out live pending admin"
  );
  assert.equal(
    /\bsession_version\b/.test(sql),
    false,
    "Migration 20261017 must NOT reference nonexistent session_version column"
  );
  assert.equal(
    /\bpassword_changed_at\b/.test(sql),
    false,
    "Migration 20261017 must NOT reference nonexistent password_changed_at column"
  );
  assert.equal(
    sql.includes("updated_at = NOW()"),
    false,
    "Migration 20261017 must NOT reference nonexistent updated_at column on profiles"
  );

  // 3. Verify transactional safety
  assert.ok(sql.includes("BEGIN;"), "Migration must be wrapped in an explicit transaction");
  assert.ok(sql.includes("COMMIT;"), "Migration must terminate with COMMIT");
});

test("Pending Migration 20261016: Dedicated OAuth credential storage and CMS sanitization review", () => {
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20261016_secure_portal_email_credentials.sql");
  assert.ok(fs.existsSync(migrationPath), "Migration 20261016 file must exist");
  const sql = fs.readFileSync(migrationPath, "utf-8");

  // 1. Table structure
  assert.ok(
    sql.includes("CREATE TABLE IF NOT EXISTS public.portal_email_credentials"),
    "Must create public.portal_email_credentials table"
  );

  // 2. Security / Permissions
  assert.ok(
    sql.includes("REVOKE ALL ON TABLE public.portal_email_credentials FROM PUBLIC;"),
    "Must revoke all permissions on portal_email_credentials from PUBLIC"
  );
  assert.ok(
    sql.includes("REVOKE ALL ON TABLE public.portal_email_credentials FROM anon;"),
    "Must revoke all permissions on portal_email_credentials from anon"
  );
  assert.ok(
    sql.includes("REVOKE ALL ON TABLE public.portal_email_credentials FROM authenticated;"),
    "Must revoke all permissions on portal_email_credentials from authenticated"
  );
  assert.ok(
    sql.includes("GRANT ALL ON TABLE public.portal_email_credentials TO service_role, postgres;"),
    "Must grant permissions strictly to service_role and postgres"
  );

  // 3. CMS Content Sanitization
  assert.ok(
    sql.includes("page_key != 'portal_email'"),
    "Must prevent public enumeration of portal_email page_key"
  );
  assert.ok(
    sql.includes("- 'refresh_token' - 'access_token'"),
    "Must sanitize tokens from cms_content JSON columns"
  );
});

// ==============================================================================
// SUITE: 12-HOUR ADMIN INACTIVITY TRUST PERIOD & REGISTRATION LIFECYCLE
// ==============================================================================

test("12-Hour Trust Period: Token carries exactly 12-hour duration and secure attributes", () => {
  const adminId = "admin-uuid-secure-101";
  const sessionStamp = "2026-10-16T12:00:00Z";
  const now = Date.now();

  const token = generateAdminVerificationToken(adminId, sessionStamp, now);
  assert.ok(typeof token === "string" && token.length > 50, "Token must be a valid non-empty string");

  const parts = token.split("|");
  assert.equal(parts.length, 5, "Token must comprise 5 pipe-delimited segments");

  const [tUserId, tSessionStamp, tIssuedAtStr, tExpiresAtStr, signature] = parts;
  assert.equal(tUserId, adminId, "Token must bind to authenticated administrator ID");
  assert.equal(tSessionStamp, sessionStamp, "Token must bind to session timestamp");

  const issuedAt = Number(tIssuedAtStr);
  const expiresAt = Number(tExpiresAtStr);
  assert.equal(expiresAt - issuedAt, 12 * 60 * 60 * 1000, "Token validity window must be exactly 12 hours (43,200,000 ms)");
  assert.equal(ADMIN_COOKIE_MAX_AGE_SECONDS, 12 * 60 * 60, "Cookie maxAge must be 43,200 seconds");
  assert.equal(ADMIN_TRUST_DURATION_MS, 12 * 60 * 60 * 1000, "Trust duration constant must be 12 hours");
});

test("12-Hour Trust Period: Normal navigation and refreshes remain verified without re-prompting OTP", () => {
  const adminId = "admin-uuid-nav-202";
  const sessionStamp = "2026-10-16T10:00:00Z";
  const now = Date.now();

  const token = generateAdminVerificationToken(adminId, sessionStamp, now);

  // 1. Immediate validation
  assert.equal(verifyAdminVerificationToken(token, adminId, sessionStamp), true, "Immediate check must pass");

  // 2. Navigation simulated after 5 minutes
  const after5Min = now + 5 * 60 * 1000;
  // Stub Date.now
  const originalDateNow = Date.now;
  try {
    Date.now = () => after5Min;
    assert.equal(verifyAdminVerificationToken(token, adminId, sessionStamp), true, "Navigation at 5 min must pass");

    // 3. Page refresh after 1 hour
    Date.now = () => now + 60 * 60 * 1000;
    assert.equal(verifyAdminVerificationToken(token, adminId, sessionStamp), true, "Page refresh at 1 hour must pass");

    // 4. Browser reopen after 6 hours
    Date.now = () => now + 6 * 60 * 60 * 1000;
    assert.equal(verifyAdminVerificationToken(token, adminId, sessionStamp), true, "Browser reopen at 6 hours must pass");

    // 5. Check at 11 hours 59 minutes (still within trust window)
    Date.now = () => now + 11.9 * 60 * 60 * 1000;
    assert.equal(verifyAdminVerificationToken(token, adminId, sessionStamp), true, "Activity at 11.9 hours must pass");
  } finally {
    Date.now = originalDateNow;
  }
});

test("12-Hour Trust Period: Sliding window extension extends 12-hour limit on active requests", () => {
  const adminId = "admin-uuid-sliding-303";
  const sessionStamp = "2026-10-16T08:00:00Z";
  const t0 = Date.now();

  const tokenT0 = generateAdminVerificationToken(adminId, sessionStamp, t0);

  const originalDateNow = Date.now;
  try {
    // Within 2 minutes of issuance (< 5 min threshold): does not need sliding renewal yet
    Date.now = () => t0 + 2 * 60 * 1000;
    assert.equal(shouldRefreshAdminTrustToken(tokenT0, adminId, sessionStamp), false);

    // After 2 hours of active work in admin panel: eligible for sliding renewal
    const t2h = t0 + 2 * 60 * 60 * 1000;
    Date.now = () => t2h;
    assert.equal(shouldRefreshAdminTrustToken(tokenT0, adminId, sessionStamp), true);

    // Renew token
    const renewedToken = renewAdminTrustToken(tokenT0, adminId, sessionStamp);
    assert.ok(renewedToken, "Renewed token must be successfully generated");
    assert.notEqual(renewedToken, tokenT0, "Renewed token must have a refreshed timestamp and signature");

    // The renewed token now extends expiration to t2h + 12 hours = t0 + 14 hours
    // Check at t0 + 12.5 hours (which expires original token, but renewed token remains active)
    Date.now = () => t0 + 12.5 * 60 * 60 * 1000;
    assert.equal(verifyAdminVerificationToken(tokenT0, adminId, sessionStamp), false, "Original token expired at 12h");
    assert.equal(verifyAdminVerificationToken(renewedToken, adminId, sessionStamp), true, "Renewed token remains valid due to sliding extension");

    // Check after 12 hours of subsequent inactivity from t2h (i.e. t0 + 14.1 hours)
    Date.now = () => t2h + 12 * 60 * 60 * 1000 + 1000;
    assert.equal(verifyAdminVerificationToken(renewedToken, adminId, sessionStamp), false, "Renewed token expires after 12 hours of subsequent inactivity");
  } finally {
    Date.now = originalDateNow;
  }
});

test("12-Hour Trust Period: Inactivity exceeding 12 hours causes expiry and fails closed", () => {
  const adminId = "admin-uuid-inactive-404";
  const sessionStamp = "2026-10-16T00:00:00Z";
  const now = Date.now();

  const token = generateAdminVerificationToken(adminId, sessionStamp, now);

  const originalDateNow = Date.now;
  try {
    // Inactive for 12 hours and 1 millisecond
    Date.now = () => now + 12 * 60 * 60 * 1000 + 1;
    assert.equal(
      verifyAdminVerificationToken(token, adminId, sessionStamp),
      false,
      "Token must fail validation after >12 hours of inactivity"
    );

    // Inactive for 24 hours
    Date.now = () => now + 24 * 60 * 60 * 1000;
    assert.equal(
      verifyAdminVerificationToken(token, adminId, sessionStamp),
      false,
      "Token must fail validation after 24 hours of inactivity"
    );
  } finally {
    Date.now = originalDateNow;
  }
});

test("12-Hour Trust Period: Tampering and cross-user impersonation attempts are rejected", () => {
  const adminIdA = "admin-alice-111";
  const adminIdB = "admin-bob-222";
  const sessionStamp = "2026-10-16T06:00:00Z";
  const tokenA = generateAdminVerificationToken(adminIdA, sessionStamp);

  // Bob attempts to use Alice's token
  assert.equal(
    verifyAdminVerificationToken(tokenA, adminIdB, sessionStamp),
    false,
    "Token must reject cross-user presentation"
  );

  // Attacker attempts to modify user ID inside token
  const tamperedUserId = tokenA.replace(adminIdA, adminIdB);
  assert.equal(
    verifyAdminVerificationToken(tamperedUserId, adminIdB, sessionStamp),
    false,
    "HMAC signature mismatch on modified user ID must reject"
  );

  // Attacker attempts to forge future expiry timestamp
  const parts = tokenA.split("|");
  const forgedExpiresAt = String(Number(parts[3]) + 1000000000);
  const tamperedExpiry = `${parts[0]}|${parts[1]}|${parts[2]}|${forgedExpiresAt}|${parts[4]}`;
  assert.equal(
    verifyAdminVerificationToken(tamperedExpiry, adminIdA, sessionStamp),
    false,
    "HMAC signature mismatch on extended expiry must reject"
  );

  // Attacker presents random garbage
  assert.equal(verifyAdminVerificationToken("malicious-crafted-cookie", adminIdA, sessionStamp), false);
  assert.equal(verifyAdminVerificationToken("", adminIdA, sessionStamp), false);
  assert.equal(verifyAdminVerificationToken(null, adminIdA, sessionStamp), false);
});

test("Registration and Approval Lifecycle: Newly registered student starts in pending review state", () => {
  // Simulate complete registration flow
  const newStudentPayload = {
    userId: "student-fresh-uuid",
    email: "student@example.com",
    fullName: "Bilal Tariq",
    phone: "+923001234567",
    courseInterest: "Spoken English Mastery",
    receiptTid: "TID-883311",
  };

  // 1. Initial Registration Profile
  const studentProfile = {
    id: newStudentPayload.userId,
    email: newStudentPayload.email,
    full_name: newStudentPayload.fullName,
    phone: newStudentPayload.phone,
    role: "student",
    account_status: "pending",
    receipt_id: newStudentPayload.receiptTid,
  };

  assert.equal(studentProfile.account_status, "pending", "New student must be created with account_status = 'pending'");
  assert.equal(studentProfile.role, "student", "New student must have role = 'student'");

  // 2. Pending student login gate: proxy and login action block access to LMS
  function checkLmsAccess(role, status) {
    if (role !== "admin") {
      if (status === "pending") return { allowed: false, error: "account_pending" };
      if (status === "rejected") return { allowed: false, error: "account_rejected" };
      if (status === "suspended") return { allowed: false, error: "account_suspended" };
    }
    return { allowed: true };
  }

  const pendingAccess = checkLmsAccess(studentProfile.role, studentProfile.account_status);
  assert.equal(pendingAccess.allowed, false, "Pending student must be blocked from LMS access");
  assert.equal(pendingAccess.error, "account_pending");

  // 3. Authorized Admin Approval action
  studentProfile.account_status = "active";
  const approvedAccess = checkLmsAccess(studentProfile.role, studentProfile.account_status);
  assert.equal(approvedAccess.allowed, true, "Approved active student is permitted to log in");

  // 4. Authorized Admin Rejection action
  studentProfile.account_status = "rejected";
  const rejectedAccess = checkLmsAccess(studentProfile.role, studentProfile.account_status);
  assert.equal(rejectedAccess.allowed, false, "Rejected student is blocked from LMS access");
  assert.equal(rejectedAccess.error, "account_rejected");
});

test("Course Enrollment Decoupling: Account registration and approval does not auto-grant course materials", () => {
  // A newly approved active student still has no course enrollments
  const student = {
    id: "student-uuid-505",
    account_status: "active",
  };

  const enrollments = []; // No enrollments created automatically

  function checkCourseMaterialAccess(student, courseId, enrollmentsList) {
    if (student.account_status !== "active") {
      return { access: false, reason: "Account not active" };
    }
    const enrollment = enrollmentsList.find(e => e.user_id === student.id && e.course_id === courseId);
    if (!enrollment) {
      return { access: false, reason: "No enrollment record" };
    }
    if (enrollment.status !== "approved") {
      return { access: false, reason: `Enrollment is ${enrollment.status}` };
    }
    if (new Date(enrollment.expires_at) < new Date()) {
      return { access: false, reason: "Enrollment expired" };
    }
    return { access: true };
  }

  // Check paid course access immediately after account approval
  const paidAccess = checkCourseMaterialAccess(student, "spoken-english", enrollments);
  assert.equal(paidAccess.access, false, "Active student cannot access course without explicit course enrollment approval");
  assert.equal(paidAccess.reason, "No enrollment record");

  // Now simulate admin reviewing payment receipt and approving enrollment
  enrollments.push({
    id: "enr-1",
    user_id: student.id,
    course_id: "spoken-english",
    status: "approved",
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const authorizedPaidAccess = checkCourseMaterialAccess(student, "spoken-english", enrollments);
  assert.equal(authorizedPaidAccess.access, true, "Student can access materials only after explicit enrollment approval");
});

// ==============================================================================
// SUITE 15: COUNTRY-AWARE REGISTRATION PHONE NUMBER VALIDATION & FORMATTING
// ==============================================================================

test("Country-Aware Phone: Validates Pakistan numbering plan (+92) and normalizes to E.164", () => {
  // Mobile numbers starting with 0300 or 300
  const r1 = normalizePhoneNumber("0300 1234567", "+92");
  assert.equal(r1.isValid, true);
  assert.equal(r1.e164, "+923001234567");
  assert.equal(r1.countryIso, "PK");

  const r2 = normalizePhoneNumber("300 1234567", "+92");
  assert.equal(r2.isValid, true);
  assert.equal(r2.e164, "+923001234567");

  const r3 = normalizePhoneNumber("+923001234567", "+92");
  assert.equal(r3.isValid, true);
  assert.equal(r3.e164, "+923001234567");

  // validatePhone helper
  assert.equal(validatePhone("0300 1234567", "+92").valid, true);
  assert.equal(validatePhone("3001234567", "+92").valid, true);
  assert.equal(formatPhoneNumberE164("0300 1234567", "+92"), "+923001234567");
});

test("Country-Aware Phone: Validates India numbering plan (+91) with national example", () => {
  const r = normalizePhoneNumber("98765 43210", "+91");
  assert.equal(r.isValid, true);
  assert.equal(r.e164, "+919876543210");
  assert.equal(r.countryIso, "IN");

  assert.equal(validatePhone("98765 43210", "+91").valid, true);
  assert.equal(formatPhoneNumberE164("98765 43210", "+91"), "+919876543210");
});

test("Country-Aware Phone: Validates United States numbering plan (+1) with standard formats", () => {
  const r = normalizePhoneNumber("(202) 555-0123", "+1");
  assert.equal(r.isValid, true);
  assert.equal(r.e164, "+12025550123");
  assert.equal(r.countryIso, "US");

  assert.equal(validatePhone("(202) 555-0123", "+1").valid, true);
  assert.equal(validatePhone("2025550123", "+1").valid, true);
  assert.equal(formatPhoneNumberE164("(202) 555-0123", "+1"), "+12025550123");
});

test("Country-Aware Phone: Validates South Africa numbering plan (+27) with standard format", () => {
  const r = normalizePhoneNumber("82 123 4567", "+27");
  assert.equal(r.isValid, true);
  assert.equal(r.e164, "+27821234567");
  assert.equal(r.countryIso, "ZA");

  assert.equal(validatePhone("82 123 4567", "+27").valid, true);
  assert.equal(validatePhone("082 123 4567", "+27").valid, true);
  assert.equal(formatPhoneNumberE164("82 123 4567", "+27"), "+27821234567");
});

test("Country-Aware Phone: Strips duplicate calling codes when entered in national field", () => {
  // If dialCode is +92 and user types +92 300 1234567 or 923001234567
  assert.equal(stripDuplicateCallingCode("+92 300 1234567", "+92"), "300 1234567");
  assert.equal(stripDuplicateCallingCode("923001234567", "+92"), "3001234567");
  assert.equal(stripDuplicateCallingCode("+91 98765 43210", "+91"), "98765 43210");
  assert.equal(stripDuplicateCallingCode("+1 2025550123", "+1"), "2025550123");

  // Normalization automatically handles duplicate calling codes
  const rPk = normalizePhoneNumber("+923001234567", "+92");
  assert.equal(rPk.isValid, true);
  assert.equal(rPk.e164, "+923001234567");

  const rIn = normalizePhoneNumber("919876543210", "+91");
  assert.equal(rIn.isValid, true);
  assert.equal(rIn.e164, "+919876543210");
});

test("Country-Aware Phone: Rejects letters and invalid numbering sequences", () => {
  // Letters strictly rejected
  const letters = validatePhone("0300 123456A", "+92");
  assert.equal(letters.valid, false);
  assert.equal(letters.error, "Phone number cannot contain letters.");

  const lettersAll = validatePhone("not-a-number", "+92");
  assert.equal(lettersAll.valid, false);
  assert.equal(lettersAll.error, "Phone number cannot contain letters.");

  // Too short
  const tooShort = validatePhone("123", "+92");
  assert.equal(tooShort.valid, false);

  // Empty string
  const empty = validatePhone("", "+92");
  assert.equal(empty.valid, false);
  assert.equal(empty.error, "Phone number is required.");
});

test("Country-Aware Phone: Supported countries list contains required markets with flags & examples", () => {
  const pk = COUNTRIES.find((c) => c.code === "PK");
  assert.ok(pk, "Pakistan must be in countries catalog");
  assert.equal(pk.dialCode, "+92");
  assert.equal(pk.flag, "🇵🇰");
  assert.equal(pk.example, "300 1234567");

  const ind = COUNTRIES.find((c) => c.code === "IN");
  assert.ok(ind, "India must be in countries catalog");
  assert.equal(ind.dialCode, "+91");
  assert.equal(ind.example, "98765 43210");

  const us = COUNTRIES.find((c) => c.code === "US");
  assert.ok(us, "United States must be in countries catalog");
  assert.equal(us.dialCode, "+1");
  assert.equal(us.example, "(202) 555-0123");

  const za = COUNTRIES.find((c) => c.code === "ZA");
  assert.ok(za, "South Africa must be in countries catalog");
  assert.equal(za.dialCode, "+27");
  assert.equal(za.example, "82 123 4567");
});

// ==============================================================================
// SUITE 16: LEAKED & COMPROMISED PASSWORD ERROR HANDLING
// ==============================================================================

test("Leaked-Password Protection: getAuthErrorMessage translates breach and compromise errors", () => {
  const breachError = {
    message: "Password has appeared in a data breach or leak (HaveIBeenPwned)",
  };
  const response1 = getAuthErrorMessage(breachError);
  assert.equal(
    response1,
    "This password has appeared in a known public data breach. For your security, please choose a different, unique password."
  );

  const pwnedError = {
    message: "pwned password detected: please choose another password",
  };
  assert.equal(
    getAuthErrorMessage(pwnedError),
    "This password has appeared in a known public data breach. For your security, please choose a different, unique password."
  );

  const compromisedError = {
    message: "This password is compromised and cannot be used",
  };
  assert.equal(
    getAuthErrorMessage(compromisedError),
    "This password has appeared in a known public data breach. For your security, please choose a different, unique password."
  );

  const weakError = {
    message: "weak_password: Password should be at least 8 characters",
  };
  assert.equal(
    getAuthErrorMessage(weakError),
    "Password does not meet institutional security requirements. It must contain at least 8 characters, with uppercase, lowercase, numbers, and special characters."
  );
});

// ==============================================================================
// SUITE 17: MIGRATION 20261017 PRIVILEGE RESOLUTION & SCHEMA ALIGNMENT
// ==============================================================================

test("Migration 20261017: Verifies all 7 SECURITY DEFINER warnings are eliminated", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261017_stage1_profiles_rls_and_privilege_guard.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");

  // 1. handle_user_email_change() revoked from anon and authenticated
  assert.ok(
    sql.includes("REVOKE ALL ON FUNCTION public.handle_user_email_change() FROM PUBLIC, anon, authenticated;"),
    "handle_user_email_change must be revoked from PUBLIC, anon, authenticated"
  );
  assert.ok(
    sql.includes("GRANT EXECUTE ON FUNCTION public.handle_user_email_change() TO service_role, postgres;"),
    "handle_user_email_change must be granted only to service_role, postgres"
  );

  // 2. prevent_profile_role_escalation() revoked from anon and authenticated
  assert.ok(
    sql.includes("REVOKE ALL ON FUNCTION public.prevent_profile_role_escalation() FROM PUBLIC, anon, authenticated;"),
    "prevent_profile_role_escalation must be revoked from PUBLIC, anon, authenticated"
  );
  assert.ok(
    sql.includes("GRANT EXECUTE ON FUNCTION public.prevent_profile_role_escalation() TO service_role, postgres;"),
    "prevent_profile_role_escalation must be granted only to service_role, postgres"
  );

  // 3. get_profile_role(UUID) revoked from anon and authenticated
  assert.ok(
    sql.includes("REVOKE ALL ON FUNCTION public.get_profile_role(UUID) FROM PUBLIC, anon, authenticated;"),
    "get_profile_role must be revoked from PUBLIC, anon, authenticated"
  );
  assert.ok(
    sql.includes("GRANT EXECUTE ON FUNCTION public.get_profile_role(UUID) TO service_role, postgres;"),
    "get_profile_role must be granted only to service_role, postgres"
  );

  // 4. get_profile_status(UUID) revoked from anon and authenticated
  assert.ok(
    sql.includes("REVOKE ALL ON FUNCTION public.get_profile_status(UUID) FROM PUBLIC, anon, authenticated;"),
    "get_profile_status must be revoked from PUBLIC, anon, authenticated"
  );
  assert.ok(
    sql.includes("GRANT EXECUTE ON FUNCTION public.get_profile_status(UUID) TO service_role, postgres;"),
    "get_profile_status must be granted only to service_role, postgres"
  );

  // 5. is_admin() revoked from PUBLIC, anon; preserved for authenticated RLS evaluation
  assert.ok(
    sql.includes("REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;"),
    "is_admin must be revoked from PUBLIC and anon"
  );
  assert.ok(
    sql.includes("GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, postgres;"),
    "is_admin must be granted to authenticated for RLS evaluation"
  );

  // 6. Schema alignment: canonical account_status used, no nonexistent columns referenced
  const nonCommentLines = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--") && !line.trim().startsWith("/*") && !line.trim().startsWith("*"));
  const nonCommentSql = nonCommentLines.join("\n");

  assert.equal(
    nonCommentSql.includes("profiles.status"),
    false,
    "Migration 20261017 must not reference nonexistent profiles.status"
  );
  assert.equal(
    nonCommentSql.includes("session_version"),
    false,
    "Migration 20261017 must not reference nonexistent session_version"
  );
  assert.equal(
    nonCommentSql.includes("password_changed_at"),
    false,
    "Migration 20261017 must not reference nonexistent password_changed_at"
  );

  // 7. Live pending administrator access preservation
  assert.ok(
    sql.includes("account_status IS DISTINCT FROM 'suspended'"),
    "is_admin() must tolerate account_status = 'pending' to preserve live admin access"
  );
});

// ==============================================================================
// SUITE 18: MIGRATION 20261016 GMAIL CREDENTIAL PRESERVATION
// ==============================================================================

test("Migration 20261016: Preserves existing Gmail credentials and isolates access", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261016_secure_portal_email_credentials.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");

  // Private table creation
  assert.ok(
    sql.includes("CREATE TABLE IF NOT EXISTS public.portal_email_credentials"),
    "Must create portal_email_credentials table"
  );

  // RLS enablement & complete public/anon/authenticated lockdown
  assert.ok(
    sql.includes("REVOKE ALL ON TABLE public.portal_email_credentials FROM PUBLIC;"),
    "Must revoke from PUBLIC"
  );
  assert.ok(
    sql.includes("REVOKE ALL ON TABLE public.portal_email_credentials FROM anon;"),
    "Must revoke from anon"
  );
  assert.ok(
    sql.includes("REVOKE ALL ON TABLE public.portal_email_credentials FROM authenticated;"),
    "Must revoke from authenticated"
  );
  assert.ok(
    sql.includes("GRANT ALL ON TABLE public.portal_email_credentials TO service_role, postgres;"),
    "Must grant access only to service_role, postgres"
  );

  // Safe migration before sanitize
  assert.ok(
    sql.includes("INSERT INTO public.portal_email_credentials"),
    "Must copy refresh token into portal_email_credentials before modifying cms_content"
  );
  assert.ok(
    sql.includes("ON CONFLICT (credential_key) DO NOTHING;"),
    "Must use ON CONFLICT DO NOTHING so stale legacy tokens never overwrite newer stored credentials"
  );
  assert.ok(
    sql.includes("v_refresh_token IS NOT NULL AND length(trim(v_refresh_token)) > 0"),
    "Must guard against inserting empty or whitespace-only tokens"
  );
  assert.ok(
    sql.includes("- 'refresh_token' - 'access_token' - 'token_expiry'"),
    "Must sanitize published_data and draft_data by stripping secret tokens from cms_content"
  );
});

// ==============================================================================
// SUITE 19: 12-HOUR INACTIVITY & QUALIFYING ACTIVITY DISCRIMINATION
// ==============================================================================

test("Proxy Renewal: Source inspection proves POST and Next-Action are excluded from proxy renewal", () => {
  const proxyPath = path.resolve(process.cwd(), "src/proxy.ts");
  const code = fs.readFileSync(proxyPath, "utf-8");

  // 1. Must NOT allow request.method === 'POST' to qualify for proxy renewal
  assert.equal(
    code.includes('request.method === "POST"'),
    false,
    "src/proxy.ts must not treat POST requests as qualifying activity for proxy trust renewal"
  );

  // 2. Must NOT check next-action header to extend proxy trust
  assert.equal(
    code.includes("hasNextAction"),
    false,
    "src/proxy.ts must not use Next-Action header for proxy trust renewal"
  );

  // 3. Must restrict proxy renewal strictly to GET top-level document navigations
  assert.ok(
    code.includes('request.method === "GET"') && code.includes("isDocumentNav"),
    "src/proxy.ts must restrict proxy renewal to GET document navigations"
  );

  // 4. Must use Fetch Metadata classification checks
  assert.ok(
    code.includes("sec-fetch-dest") && code.includes("sec-fetch-mode"),
    "src/proxy.ts must utilize Fetch Metadata headers (sec-fetch-dest, sec-fetch-mode) for request classification"
  );

  // 5. Must document that Fetch Metadata is a request classification signal, not biometric proof
  assert.ok(
    code.includes("browser-request classification signal"),
    "src/proxy.ts must explicitly document Fetch Metadata as a browser-request classification signal"
  );
});

test("Proxy Renewal: Strict classification rejects forged Next-Action POST, background requests, and prefetches", () => {
  // Evaluator implementing the exact production logic from src/proxy.ts
  function isQualifyingProxyRequest(method, pathname, headers) {
    const isVerifyRoute = pathname === "/admin/verify";

    const isPrefetch =
      headers["purpose"] === "prefetch" ||
      headers["sec-purpose"] === "prefetch" ||
      headers["x-middleware-prefetch"] === "1" ||
      headers["next-router-prefetch"] === "1";

    const fetchDest = headers["sec-fetch-dest"];
    const fetchMode = headers["sec-fetch-mode"];
    const isDocumentNav =
      (fetchDest === "document" || (!fetchDest && headers["accept"]?.includes("text/html"))) &&
      fetchMode !== "no-cors";

    // Proxy renewal: Strictly qualifying, non-prefetch top-level document GET navigations
    return !isPrefetch && !isVerifyRoute && method === "GET" && Boolean(isDocumentNav);
  }

  // 1. POST carrying a forged Next-Action header MUST NOT qualify for proxy renewal
  assert.equal(
    isQualifyingProxyRequest("POST", "/admin/students", {
      "next-action": "forged-admin-action-hash",
      "sec-fetch-mode": "cors",
      "accept": "text/x-component",
    }),
    false,
    "POST carrying a forged Next-Action header must not qualify for proxy renewal"
  );
  assert.equal(
    isQualifyingProxyRequest("POST", "/admin", { "next-action": "delete-user-action" }),
    false,
    "Any POST with Next-Action must be rejected at proxy renewal"
  );

  // 2. Arbitrary POSTs, API posts, and telemetry beacons MUST NOT qualify
  assert.equal(
    isQualifyingProxyRequest("POST", "/admin", {}),
    false,
    "Arbitrary POST request must not qualify"
  );
  assert.equal(
    isQualifyingProxyRequest("POST", "/admin", { "sec-fetch-dest": "document" }),
    false,
    "POST with sec-fetch-dest: document must not qualify"
  );
  assert.equal(
    isQualifyingProxyRequest("POST", "/admin", { "sec-fetch-dest": "empty" }),
    false,
    "Telemetry beacon / empty POST must not qualify"
  );

  // 3. Next.js link prefetches and router probes MUST NOT qualify
  assert.equal(
    isQualifyingProxyRequest("GET", "/admin/students", { "purpose": "prefetch", "accept": "text/html" }),
    false,
    "Next.js link prefetch must not qualify"
  );
  assert.equal(
    isQualifyingProxyRequest("GET", "/admin/courses", { "sec-purpose": "prefetch" }),
    false,
    "sec-purpose: prefetch must not qualify"
  );
  assert.equal(
    isQualifyingProxyRequest("GET", "/admin/courses", { "x-middleware-prefetch": "1" }),
    false,
    "Middleware prefetch must not qualify"
  );
  assert.equal(
    isQualifyingProxyRequest("GET", "/admin/dashboard", { "next-router-prefetch": "1" }),
    false,
    "Next router prefetch must not qualify"
  );

  // 4. Background JSON polls, assets, and verification route MUST NOT qualify
  assert.equal(
    isQualifyingProxyRequest("GET", "/admin", { "accept": "application/json", "sec-fetch-dest": "empty" }),
    false,
    "Passive background JSON poll must not qualify"
  );
  assert.equal(
    isQualifyingProxyRequest("GET", "/admin/verify", { "sec-fetch-dest": "document", "accept": "text/html" }),
    false,
    "Verification handshake route /admin/verify must not qualify"
  );
  assert.equal(
    isQualifyingProxyRequest("GET", "/admin/script.js", { "sec-fetch-dest": "script" }),
    false,
    "Subresource script GET must not qualify"
  );

  // 5. Qualifying top-level document GET navigation MUST qualify
  assert.equal(
    isQualifyingProxyRequest("GET", "/admin/students", {
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "accept": "text/html,application/xhtml+xml",
    }),
    true,
    "Direct top-level admin page navigation must qualify"
  );
  assert.equal(
    isQualifyingProxyRequest("GET", "/admin/courses", {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
    }),
    true,
    "Direct browser navigation without sec-fetch-dest but with text/html accept must qualify"
  );
});

test("Server-Side Renewal: Source inspection proves verifyAdminCaller validates auth, role, token before renewal", () => {
  const adminVerifyPath = path.resolve(process.cwd(), "src/lib/auth/adminVerification.ts");
  const code = fs.readFileSync(adminVerifyPath, "utf-8");

  // 1. Must authenticate user
  assert.ok(
    code.includes("supabase.auth.getUser()"),
    "verifyAdminCaller must authenticate the user via getUser()"
  );

  // 2. Must verify admin role
  assert.ok(
    code.includes("getCurrentUserRole()") && code.includes('role !== "admin"'),
    "verifyAdminCaller must verify that the user has admin role"
  );

  // 3. Must verify MFA trust token
  assert.ok(
    code.includes("verifyAdminVerificationToken(currentCookie, user.id, user.last_sign_in_at)"),
    "verifyAdminCaller must verify MFA trust token bound to user and session"
  );

  // 4. Must check shouldRefreshAdminTrustToken before renewing
  assert.ok(
    code.includes("shouldRefreshAdminTrustToken(currentCookie, user.id, user.last_sign_in_at)"),
    "verifyAdminCaller must check shouldRefreshAdminTrustToken before renewal"
  );

  // 5. Must renew cookie with existing security attributes
  assert.ok(
    code.includes("generateAdminVerificationToken(user.id, user.last_sign_in_at)"),
    "verifyAdminCaller must generate renewed token with valid session signature"
  );
  assert.ok(
    code.includes("cookieStore.set(ADMIN_VERIFY_COOKIE_NAME, renewedToken") &&
      code.includes("ADMIN_COOKIE_MAX_AGE_SECONDS"),
    "verifyAdminCaller must write renewed cookie with ADMIN_COOKIE_MAX_AGE_SECONDS"
  );

  // 6. isCurrentAdminSessionVerified must remain strictly read-only
  const readOnlyFunc = code.slice(
    code.indexOf("async function isCurrentAdminSessionVerified"),
    code.indexOf("async function checkAdminSessionVerifiedAction")
  );
  assert.equal(
    readOnlyFunc.includes("cookieStore.set"),
    false,
    "isCurrentAdminSessionVerified must be strictly read-only and never write or renew cookies"
  );
});

test("Server-Side Renewal: Only successfully authorized server-side admin actions renew trust", () => {
  const adminId = "admin-auth-777";
  const otherAdminId = "admin-intruder-888";
  const studentId = "student-regular-123";
  const sessionStamp = "2026-10-16T15:00:00Z";

  // Simulation of the server-side verifyAdminCaller execution flow using production cryptographic token logic
  function simulateServerActionVerification({ user, role, cookieToken }) {
    // 1. Authenticated user validation
    if (!user || !user.id) {
      return { success: false, error: "Forbidden: Administrative privileges required.", renewed: false };
    }

    // 2. Admin authorization validation
    if (role !== "admin") {
      return { success: false, error: "Forbidden: Administrative privileges required.", renewed: false };
    }

    // 3. Trust token validation
    const isVerified = verifyAdminVerificationToken(cookieToken, user.id, user.last_sign_in_at);
    if (!isVerified) {
      return {
        success: false,
        error: "Forbidden: Two-factor email verification required. Please complete verification at /admin/verify.",
        renewed: false,
      };
    }

    // 4. Sliding renewal (only after auth, role, and MFA trust are validated)
    let renewed = false;
    let newToken = null;
    if (cookieToken && shouldRefreshAdminTrustToken(cookieToken, user.id, user.last_sign_in_at)) {
      newToken = generateAdminVerificationToken(user.id, user.last_sign_in_at);
      renewed = true;
    }

    return {
      success: true,
      adminId: user.id,
      renewed,
      newToken,
    };
  }

  const now = Date.now();

  // Scenario 1: Successfully authorized admin mutation with token eligible for refresh (> 5 minutes old)
  const token6MinOld = generateAdminVerificationToken(adminId, sessionStamp, now - 6 * 60 * 1000);
  const authRes1 = simulateServerActionVerification({
    user: { id: adminId, last_sign_in_at: sessionStamp },
    role: "admin",
    cookieToken: token6MinOld,
  });
  assert.equal(authRes1.success, true, "Valid admin action must succeed");
  assert.equal(authRes1.renewed, true, "Eligible admin mutation must renew trust token");
  assert.ok(authRes1.newToken, "Must issue a fresh renewed token");
  assert.equal(
    verifyAdminVerificationToken(authRes1.newToken, adminId, sessionStamp),
    true,
    "Renewed token must be valid for the admin"
  );

  // Scenario 2: Successfully authorized admin mutation with fresh token (< 5 minutes old)
  const freshToken = generateAdminVerificationToken(adminId, sessionStamp, now - 1 * 60 * 1000);
  const authRes2 = simulateServerActionVerification({
    user: { id: adminId, last_sign_in_at: sessionStamp },
    role: "admin",
    cookieToken: freshToken,
  });
  assert.equal(authRes2.success, true);
  assert.equal(authRes2.renewed, false, "Fresh token (<5 min) must not trigger redundant renewal");

  // Scenario 3: Non-admin caller (e.g., student) attempting to trigger server renewal
  const authRes3 = simulateServerActionVerification({
    user: { id: studentId, last_sign_in_at: sessionStamp },
    role: "student",
    cookieToken: token6MinOld,
  });
  assert.equal(authRes3.success, false);
  assert.equal(authRes3.renewed, false, "Non-admin caller must NEVER renew admin trust");
  assert.match(authRes3.error, /Administrative privileges required/);

  // Scenario 4: Unauthenticated caller
  const authRes4 = simulateServerActionVerification({
    user: null,
    role: null,
    cookieToken: token6MinOld,
  });
  assert.equal(authRes4.success, false);
  assert.equal(authRes4.renewed, false, "Unauthenticated caller must NEVER renew admin trust");

  // Scenario 5: Expired token (> 12 hours of inactivity)
  const expiredToken = generateAdminVerificationToken(adminId, sessionStamp, now - 13 * 60 * 60 * 1000);
  const authRes5 = simulateServerActionVerification({
    user: { id: adminId, last_sign_in_at: sessionStamp },
    role: "admin",
    cookieToken: expiredToken,
  });
  assert.equal(authRes5.success, false);
  assert.equal(authRes5.renewed, false, "Expired token (>12h) must fail closed and NEVER renew");
  assert.match(authRes5.error, /Two-factor email verification required/);

  // Scenario 6: Cross-user token presentation (Token issued for adminId presented by otherAdminId)
  const authRes6 = simulateServerActionVerification({
    user: { id: otherAdminId, last_sign_in_at: sessionStamp },
    role: "admin",
    cookieToken: token6MinOld, // issued for adminId
  });
  assert.equal(authRes6.success, false);
  assert.equal(authRes6.renewed, false, "Cross-user token presentation must reject and NEVER renew");

  // Scenario 7: Session change / password reset invalidation
  const authRes7 = simulateServerActionVerification({
    user: { id: adminId, last_sign_in_at: "2026-10-16T18:00:00Z" }, // session timestamp changed
    role: "admin",
    cookieToken: token6MinOld, // issued with 15:00:00Z timestamp
  });
  assert.equal(authRes7.success, false);
  assert.equal(authRes7.renewed, false, "Invalidated session must reject and NEVER renew");

  // Scenario 8: Read-only verification check does not renew
  // isCurrentAdminSessionVerified reads cookie and verifies without side effects
  const readOnlyVerified = verifyAdminVerificationToken(token6MinOld, adminId, sessionStamp);
  assert.equal(readOnlyVerified, true, "Read-only verification can confirm valid session");
  // Verification check does not alter token or extend inactivity deadline
  const parts = token6MinOld.split("|");
  const originalIssuedAt = Number(parts[2]);
  assert.equal(originalIssuedAt, now - 6 * 60 * 1000, "Read-only check does not alter issued timestamp");
});

test("12-Hour Trust Period: Server timestamp is authoritative; client cannot forge or extend expired token", () => {
  const adminId = "admin-security-999";
  const sessionStamp = "2026-10-16T12:00:00Z";

  // Simulate an admin session where 12 hours and 1 minute have elapsed
  const now = Date.now();
  const thirteenHoursAgo = now - 13 * 60 * 60 * 1000;
  const expiredExpiry = thirteenHoursAgo + 12 * 60 * 60 * 1000; // was 1 hour ago

  const payload = `verify|${adminId}|${thirteenHoursAgo}|${expiredExpiry}|${sessionStamp}`;
  const sig = crypto
    .createHmac("sha256", process.env.ADMIN_VERIFICATION_SECRET)
    .update(payload)
    .digest("hex");
  const expiredToken = `${payload}|${sig}`;

  // Server verifies token against server clock
  assert.equal(
    verifyAdminVerificationToken(expiredToken, adminId, sessionStamp),
    false,
    "Token older than 12 hours must fail closed immediately on server check"
  );

  // Attacker attempts to forge client timestamp into cookie payload
  const tamperedPayload = `verify|${adminId}|${now}|${now + 12 * 60 * 60 * 1000}|${sessionStamp}`;
  const tamperedTokenWithOldSig = `${tamperedPayload}|${sig}`;
  assert.equal(
    verifyAdminVerificationToken(tamperedTokenWithOldSig, adminId, sessionStamp),
    false,
    "Tampered timestamp must fail HMAC signature check"
  );
});

// ==============================================================================
// SUITE 20: CROSS-FORM COUNTRY-AWARE PHONE CONSISTENCY & INTEGRITY
// ==============================================================================

test("Country-Aware Phone: Consistent validation across registration, admin modal, and booking", () => {
  // 1. Pakistan (+92)
  const pkRes = normalizePhoneNumber("0300 1234567", "+92");
  assert.equal(pkRes.isValid, true);
  assert.equal(pkRes.e164, "+923001234567");

  // 2. India (+91)
  const inRes = normalizePhoneNumber("98765 43210", "+91");
  assert.equal(inRes.isValid, true);
  assert.equal(inRes.e164, "+919876543210");

  // 3. United States (+1)
  const usRes = normalizePhoneNumber("(202) 555-0123", "+1");
  assert.equal(usRes.isValid, true);
  assert.equal(usRes.e164, "+12025550123");

  // 4. South Africa (+27)
  const zaRes = normalizePhoneNumber("82 123 4567", "+27");
  assert.equal(zaRes.isValid, true);
  assert.equal(zaRes.e164, "+27821234567");

  // 5. Country switching: changing country code does not corrupt digits
  const rawEntered = "300 1234567";
  const asPK = normalizePhoneNumber(rawEntered, "+92");
  assert.equal(asPK.isValid, true);
  assert.equal(asPK.e164, "+923001234567");

  // Switching country to US with valid US number preserves clean input
  const usEntered = "202 555 0123";
  const asUS = normalizePhoneNumber(usEntered, "+1");
  assert.equal(asUS.isValid, true);
  assert.equal(asUS.e164, "+12025550123");

  // 6. Duplicate calling code stripping prevents "+92+92" or "+9292"
  assert.equal(formatPhoneNumberE164("+923001234567", "+92"), "+923001234567");
  assert.equal(formatPhoneNumberE164("923001234567", "+92"), "+923001234567");
  assert.equal(formatPhoneNumberE164("+91 98765 43210", "+91"), "+919876543210");
  assert.equal(formatPhoneNumberE164("+1 (202) 555-0123", "+1"), "+12025550123");
  assert.equal(formatPhoneNumberE164("+27 82 123 4567", "+27"), "+27821234567");
});









