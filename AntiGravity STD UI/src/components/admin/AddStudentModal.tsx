"use client";

import React, { useState } from "react";
import {
  createAdminStudentAction,
  type CreateStudentPayload,
  type CreatedStudentResult,
} from "@/app/admin/actions";
import {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
} from "@/lib/validation";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentCreated: (result: CreatedStudentResult) => void;
}

const COUNTRY_CODES = [
  { code: "+92", country: "Pakistan (+92)" },
  { code: "+1", country: "United States / Canada (+1)" },
  { code: "+44", country: "United Kingdom (+44)" },
  { code: "+971", country: "UAE (+971)" },
  { code: "+966", country: "Saudi Arabia (+966)" },
  { code: "+49", country: "Germany (+49)" },
  { code: "+33", country: "France (+33)" },
  { code: "+61", country: "Australia (+61)" },
  { code: "+91", country: "India (+91)" },
];

export default function AddStudentModal({
  isOpen,
  onClose,
  onStudentCreated,
}: AddStudentModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [setupMethod, setSetupMethod] = useState<"invite" | "password">("invite");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<CreatedStudentResult | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setCountryCode("+92");
    setPhone("");
    setSetupMethod("invite");
    setPassword("");
    setShowPassword(false);
    setFieldErrors({});
    setServerError(null);
    setSuccessResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
    let gen = "SpkUp!";
    for (let i = 0; i < 8; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(gen);
    setShowPassword(true);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Validate fields
    const errors: Record<string, string> = {};

    const fnCheck = validateName(firstName, "First Name");
    if (!fnCheck.valid) errors.firstName = fnCheck.error!;

    const lnCheck = validateName(lastName, "Last Name");
    if (!lnCheck.valid) errors.lastName = lnCheck.error!;

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) errors.email = emailCheck.error!;

    const phoneCheck = validatePhone(phone, countryCode);
    if (!phoneCheck.valid) errors.phone = phoneCheck.error!;

    if (setupMethod === "password") {
      const passCheck = validatePassword(password);
      if (!passCheck.valid) errors.password = passCheck.error!;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    const payload: CreateStudentPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      countryCode,
      phone: phone.trim(),
      setupMethod,
      password: setupMethod === "password" ? password : undefined,
    };

    try {
      const res = await createAdminStudentAction(payload);
      if (res.success && res.data) {
        setSuccessResult(res.data);
        onStudentCreated(res.data);
      } else {
        setServerError(res.error || "Failed to create student account.");
      }
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while communicating with the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] bg-white dark:bg-[#141418] text-[var(--text-main)] border border-[var(--surface-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--surface-border)] bg-[#faf8f4] dark:bg-[#18181e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">person_add</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="add-student-modal-title"
                  className="font-display text-base sm:text-lg font-bold text-[var(--text-main)] leading-tight"
                >
                  Manual Student Registration
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] border border-[#d4af37]/30">
                  Role: Student
                </span>
              </div>
              <p className="font-serif text-xs text-[var(--text-muted)] mt-0.5">
                Register a student directly into SpeakUp LMS with authentic Supabase credentials.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-border)]/40 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {successResult ? (
            /* Success State Confirmation */
            <div className="py-6 px-4 text-center space-y-5 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>

              <div className="space-y-2">
                <h4 className="font-display text-lg font-bold text-[var(--text-main)]">
                  Student Account Successfully Created
                </h4>
                <p className="font-serif text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                  {successResult.message}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] p-4 max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-[var(--surface-border)]/60 pb-2">
                  <span className="text-[var(--text-muted)] font-display uppercase tracking-wider text-[11px] font-semibold">
                    Student Name
                  </span>
                  <span className="font-bold text-[var(--text-main)]">{successResult.fullName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[var(--surface-border)]/60 pb-2">
                  <span className="text-[var(--text-muted)] font-display uppercase tracking-wider text-[11px] font-semibold">
                    Email Address
                  </span>
                  <span className="font-bold text-[var(--text-main)] font-mono">{successResult.email}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[var(--surface-border)]/60 pb-2">
                  <span className="text-[var(--text-muted)] font-display uppercase tracking-wider text-[11px] font-semibold">
                    Assigned Role
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-display text-[11px]">
                    Student
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[var(--text-muted)] font-display uppercase tracking-wider text-[11px] font-semibold">
                    Course Access
                  </span>
                  <span className="font-display text-[11px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    No Courses Enrolled
                  </span>
                </div>
              </div>

              {/* Policy Reminder */}
              <div className="rounded-xl bg-[#faf8f4] dark:bg-[#18181e] border border-[#d4af37]/30 p-3.5 max-w-md mx-auto text-left flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#d4af37] shrink-0 mt-0.5">
                  info
                </span>
                <p className="font-serif text-[11px] text-[var(--text-muted)] leading-relaxed">
                  <strong>Course Approval Reminder:</strong> In accordance with SpeakUp LMS security rules,
                  no courses are unlocked automatically. The student must request access to their curriculum
                  from the Student LMS, which will appear in your Students list for review.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141416] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
                >
                  + Add Another Student
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#d4af37] hover:bg-[#b5952f] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs transition-all cursor-pointer"
                >
                  Done &amp; View in List
                </button>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Server Error Alert */}
              {serverError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-serif text-xs leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  <div className="flex-1">{serverError}</div>
                </div>
              )}

              {/* Policy Callout Banner */}
              <div className="rounded-xl border border-[#d4af37]/30 bg-[#faf8f4] dark:bg-[#18181e] p-3.5 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#d4af37] text-[18px] shrink-0 mt-0.5">
                  verified_user
                </span>
                <div className="font-serif text-[11px] text-[var(--text-muted)] leading-relaxed">
                  <strong className="font-display uppercase tracking-wider font-bold text-[var(--text-main)] block mb-0.5">
                    Separation of Account &amp; Course Approval
                  </strong>
                  Manual registration creates the student&apos;s authentication record only. No courses are
                  granted automatically. The student will log in and apply for course access separately.
                </div>
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="student-first-name"
                    className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-1.5"
                  >
                    First Name *
                  </label>
                  <input
                    id="student-first-name"
                    type="text"
                    required
                    placeholder="e.g. Mudassir"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (fieldErrors.firstName) {
                        setFieldErrors((prev) => ({ ...prev, firstName: "" }));
                      }
                    }}
                    className={`w-full py-2.5 px-3.5 rounded-xl border bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-xs focus:outline-none transition-all ${
                      fieldErrors.firstName
                        ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-[var(--surface-border)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                    }`}
                  />
                  {fieldErrors.firstName && (
                    <p className="mt-1 font-serif text-[11px] text-rose-500">{fieldErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="student-last-name"
                    className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-1.5"
                  >
                    Last Name *
                  </label>
                  <input
                    id="student-last-name"
                    type="text"
                    required
                    placeholder="e.g. Ali"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (fieldErrors.lastName) {
                        setFieldErrors((prev) => ({ ...prev, lastName: "" }));
                      }
                    }}
                    className={`w-full py-2.5 px-3.5 rounded-xl border bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-xs focus:outline-none transition-all ${
                      fieldErrors.lastName
                        ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-[var(--surface-border)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                    }`}
                  />
                  {fieldErrors.lastName && (
                    <p className="mt-1 font-serif text-[11px] text-rose-500">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label
                  htmlFor="student-email"
                  className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-1.5"
                >
                  Student Email Address *
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--text-muted)] pointer-events-none">
                    mail
                  </span>
                  <input
                    id="student-email"
                    type="email"
                    required
                    placeholder="student.scholar@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: "" }));
                      }
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-xs focus:outline-none transition-all ${
                      fieldErrors.email
                        ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-[var(--surface-border)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 font-serif text-[11px] text-rose-500">{fieldErrors.email}</p>
                )}
              </div>

              {/* Phone Number with Country Code */}
              <div>
                <label
                  htmlFor="student-phone"
                  className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-1.5"
                >
                  Phone / WhatsApp Number *
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    aria-label="Country Code"
                    className="w-40 sm:w-48 py-2.5 px-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-xs focus:outline-none focus:border-[#d4af37] cursor-pointer"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.country}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--text-muted)] pointer-events-none">
                      call
                    </span>
                    <input
                      id="student-phone"
                      type="tel"
                      required
                      placeholder="e.g. 0300 1234567"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (fieldErrors.phone) {
                          setFieldErrors((prev) => ({ ...prev, phone: "" }));
                        }
                      }}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-xs focus:outline-none transition-all ${
                        fieldErrors.phone
                          ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-[var(--surface-border)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                      }`}
                    />
                  </div>
                </div>
                {fieldErrors.phone && (
                  <p className="mt-1 font-serif text-[11px] text-rose-500">{fieldErrors.phone}</p>
                )}
              </div>

              {/* Password & Account Setup Method */}
              <div className="space-y-3 pt-2 border-t border-[var(--surface-border)]">
                <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold">
                  Account Setup &amp; Password Method *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSetupMethod("invite")}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      setupMethod === "invite"
                        ? "border-[#d4af37] bg-[#d4af37]/10 text-[var(--text-main)] shadow-2xs"
                        : "border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[18px] text-[#8a6d1b] dark:text-[#d4af37]">
                        outgoing_mail
                      </span>
                      <span className="font-display text-xs uppercase tracking-wider font-bold">
                        Email Invitation
                      </span>
                    </div>
                    <p className="font-serif text-[11px] text-[var(--text-muted)] leading-snug">
                      Dispatches a secure invitation link. The student establishes their own password.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSetupMethod("password")}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      setupMethod === "password"
                        ? "border-[#d4af37] bg-[#d4af37]/10 text-[var(--text-main)] shadow-2xs"
                        : "border-[var(--surface-border)] bg-[var(--surface-lowest)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[18px] text-[#8a6d1b] dark:text-[#d4af37]">
                        password
                      </span>
                      <span className="font-display text-xs uppercase tracking-wider font-bold">
                        Temporary Password
                      </span>
                    </div>
                    <p className="font-serif text-[11px] text-[var(--text-muted)] leading-snug">
                      Specify an initial password. Student can log in immediately and change it in settings.
                    </p>
                  </button>
                </div>

                {setupMethod === "password" && (
                  <div className="pt-2 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="temporary-password"
                        className="font-display text-[11px] uppercase tracking-wider text-[var(--text-main)] font-semibold"
                      >
                        Initial Temporary Password *
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[11px] font-display uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37] hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                        <span>Generate Random</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        id="temporary-password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="At least 8 characters (letters + numbers)"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) {
                            setFieldErrors((prev) => ({ ...prev, password: "" }));
                          }
                        }}
                        className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-xs focus:outline-none transition-all ${
                          fieldErrors.password
                            ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                            : "border-[var(--surface-border)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="font-serif text-[11px] text-rose-500">{fieldErrors.password}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[var(--surface-border)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl border border-[var(--surface-border)] hover:border-[var(--text-muted)] bg-white dark:bg-[#141416] text-[var(--text-muted)] hover:text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b5952f] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs transition-all active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        progress_activity
                      </span>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                      <span>Create Student Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
