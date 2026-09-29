"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SpeakUpSymbol } from "@/components/Logo";

export default function RegisterPage() {
  const router = useRouter();
  const [profileType, setProfileType] = useState<"student" | "professional">("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [courseName, setCourseName] = useState("English Grammar Mastery — A1");
  const [receiptTid, setReceiptTid] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    course: string;
    receiptTid: string;
  } | null>(null);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmittedData({
        fullName: `${firstName} ${lastName}`.trim() || "Registered Scholar",
        email: email,
        phone: `${countryCode} ${phone}`,
        course: courseName,
        receiptTid: receiptTid,
      });
    }, 700);
  };

  if (submittedData) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg-main)] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-[500px] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl shadow-xl p-8 sm:p-10 text-center relative animate-in fade-in zoom-in-95 duration-200 my-auto">
          <div className="w-16 h-16 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)] mb-2 tracking-tight">
            Registration Received
          </h2>
          <p className="font-serif text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
            Your application has been received and is currently awaiting administrative approval.
          </p>

          {/* Dynamic Submitted Information */}
          <div className="bg-[var(--surface-low)] border border-[var(--surface-border)] rounded-xl p-5 text-left space-y-3 mb-6 font-serif text-xs sm:text-sm">
            <div className="flex justify-between items-center border-b border-[var(--surface-border)]/60 pb-2">
              <span className="text-[var(--text-muted)] font-display uppercase tracking-wider text-[11px] font-semibold">Name</span>
              <span className="font-bold text-[var(--text-main)]">{submittedData.fullName}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[var(--surface-border)]/60 pb-2">
              <span className="text-[var(--text-muted)] font-display uppercase tracking-wider text-[11px] font-semibold">Email</span>
              <span className="font-bold text-[var(--text-main)] truncate max-w-[200px] sm:max-w-[240px]">{submittedData.email}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[var(--surface-border)]/60 pb-2">
              <span className="text-[var(--text-muted)] font-display uppercase tracking-wider text-[11px] font-semibold">Phone</span>
              <span className="font-bold text-[var(--text-main)] whitespace-nowrap">{submittedData.phone}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[var(--surface-border)]/60 pb-2">
              <span className="text-[var(--text-muted)] font-display uppercase tracking-wider text-[11px] font-semibold">Course</span>
              <span className="font-bold text-[var(--text-main)] text-right truncate max-w-[200px]">{submittedData.course}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[var(--surface-border)]/60 pb-2">
              <span className="text-[var(--text-muted)] font-display uppercase tracking-wider text-[11px] font-semibold">Receipt TID</span>
              <span className="font-bold text-[var(--text-main)] font-mono text-right">{submittedData.receiptTid}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-[var(--text-muted)] font-display uppercase tracking-wider text-[11px] font-semibold">Current Status</span>
              <span className="inline-flex items-center gap-1.5 font-display text-[11px] uppercase tracking-wider font-bold text-[#d4af37] bg-[var(--surface-lowest)] px-2.5 py-1 rounded-full border border-[#d4af37]/40 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse"></span>
                <span>Waiting for Admin Approval</span>
              </span>
            </div>
          </div>

          {/* Next Steps Explanation */}
          <div className="bg-[var(--surface-lowest)] border border-[#d4af37]/30 rounded-xl p-4 mb-6 text-left">
            <h4 className="font-display text-xs uppercase tracking-wider font-bold text-[#d4af37] mb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>Next Step:</span>
            </h4>
            <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
              The application will be reviewed by the SpeakUp administration. After approval, the student will be able to sign in and access the LMS according to the existing enrollment/payment/verification workflow.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="flex-1 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all duration-300 font-display text-xs uppercase tracking-widest font-bold py-3.5 px-6 rounded-full shadow-xs"
            >
              Return to Home
            </Link>
            <Link
              href="/auth/login"
              className="flex-1 border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-widest font-bold py-3.5 px-6 rounded-full transition-all bg-[var(--surface-low)]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[540px] bg-[var(--surface-lowest)] border border-[var(--surface-border)] rounded-2xl shadow-sm p-8 sm:p-10 relative overflow-hidden transition-all mt-2 mb-8">
      {/* Top Logo & Headings */}
      <div className="flex flex-col items-center text-center mb-8">
        <SpeakUpSymbol sizeClass="w-16 h-16 mb-4" />
        <h1 className="font-display text-3xl font-bold text-[var(--text-main)] tracking-tight mb-2">
          Registration
        </h1>
        <p className="font-serif text-base text-[var(--text-muted)]">
          Join SpeakUp and accelerate your linguistic mastery.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="relative flex mb-6 bg-[var(--surface-low)] rounded-xl p-1 border border-[var(--surface-border)]">
        <Link
          href="/auth/login"
          className="w-1/2 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
        >
          Sign In
        </Link>
        <div className="w-1/2 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-center rounded-lg bg-[var(--surface-lowest)] text-[#d4af37] shadow-xs">
          Register
        </div>
      </div>

      {/* Auxiliary Bank Details / Terms buttons */}
      <div className="flex gap-2 mb-6">
        <Link
          href="/pricing#bank"
          className="flex-1 text-center py-2 px-3 border border-[var(--surface-border)] rounded-lg text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--surface-low)] hover:text-[#d4af37] transition-all font-semibold"
        >
          View Bank Accounts
        </Link>
        <Link
          href="/pricing?tab=terms"
          className="flex-1 text-center py-2 px-3 border border-[var(--surface-border)] rounded-lg text-[11px] font-display uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--surface-low)] hover:text-[#d4af37] transition-all font-semibold"
        >
          Read Terms &amp; Policies
        </Link>
      </div>

      {/* Important Notice */}
      <div className="bg-[var(--surface-low)] border-l-4 border-[#d4af37] p-4 mb-6 rounded-r-xl shadow-xs flex items-start gap-3">
        <span className="material-symbols-outlined text-[#d4af37] text-[20px] shrink-0 mt-0.5">info</span>
        <div className="text-xs font-serif text-[var(--text-main)] leading-relaxed">
          <strong className="block font-display uppercase tracking-wider font-bold mb-0.5">Important Instructions:</strong>
          After submitting registration, save your bank receipt. Course access will be unlocked by administration upon receipt verification.
        </div>
      </div>

      {/* Profile Type Toggle */}
      <div className="mb-6">
        <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2">
          I am registering as:
        </label>
        <div className="flex rounded-xl border border-[var(--surface-border)] p-1 bg-[var(--surface-low)]">
          <button
            type="button"
            onClick={() => setProfileType("student")}
            className={`flex-1 py-2.5 font-display text-xs font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              profileType === "student"
                ? "bg-[var(--surface-lowest)] text-[#d4af37] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => setProfileType("professional")}
            className={`flex-1 py-2.5 font-display text-xs font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              profileType === "professional"
                ? "bg-[var(--surface-lowest)] text-[#d4af37] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            Professional
          </button>
        </div>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleRegister} className="space-y-5">
        {/* First & Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="first-name">
              First Name *
            </label>
            <input
              id="first-name"
              required
              type="text"
              placeholder="Mudassir"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-[var(--surface-border)] rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
            />
          </div>
          <div>
            <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="last-name">
              Last Name *
            </label>
            <input
              id="last-name"
              required
              type="text"
              placeholder="Khan"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-[var(--surface-border)] rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="reg-email">
            Email Address *
          </label>
          <input
            id="reg-email"
            required
            type="email"
            placeholder="scholar@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[var(--surface-border)] rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="reg-phone">
            Phone Number *
          </label>
          <div className="flex border border-[var(--surface-border)] bg-[var(--surface-lowest)] rounded-xl overflow-hidden focus-within:border-[#d4af37]">
            <select
              aria-label="Country Code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="bg-[var(--surface-low)] px-3 py-3 border-r border-[var(--surface-border)] text-[var(--text-main)] font-serif text-sm focus:outline-none cursor-pointer"
            >
              <option value="+92">PK (+92)</option>
              <option value="+1">US (+1)</option>
              <option value="+44">UK (+44)</option>
              <option value="+971">UAE (+971)</option>
              <option value="+966">SA (+966)</option>
            </select>
            <input
              id="reg-phone"
              required
              type="tel"
              placeholder="300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3.5 font-serif text-base bg-transparent text-[var(--text-main)] border-none focus:outline-none"
            />
          </div>
        </div>

        {/* Preferred Course */}
        <div>
          <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="course-select">
            Preferred Course *
          </label>
          <select
            id="course-select"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className="w-full border border-[var(--surface-border)] rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all cursor-pointer"
          >
            <option value="English Grammar Mastery — A1">English Grammar Mastery — A1</option>
            <option value="Speak in 30 Days — Fluency">Speak in 30 Days — Fluency &amp; Cadence</option>
            <option value="Strategic Negotiation & Persuasion">Strategic Negotiation &amp; Persuasion</option>
            <option value="Professional Executive Series">Professional Executive Series</option>
            <option value="Global Leadership Intensive">Global Leadership Intensive</option>
          </select>
        </div>

        {/* Receipt TID */}
        <div>
          <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="receipt-tid">
            Receipt TID *
          </label>
          <input
            id="receipt-tid"
            required
            type="text"
            placeholder="Enter Receipt TID"
            value={receiptTid}
            onChange={(e) => setReceiptTid(e.target.value)}
            className="w-full border border-[var(--surface-border)] rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
          />
          <p className="mt-2 text-xs font-serif text-[var(--text-muted)] leading-relaxed">
            After completing your payment, please send your payment receipt/proof via WhatsApp for record verification.
          </p>
        </div>

        {/* Password */}
        <div>
          <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="reg-password">
            Password *
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className="w-full border border-[var(--surface-border)] rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility" : "visibility_off"}
              </span>
            </button>
          </div>
          <p className="mt-1.5 text-xs font-serif text-[var(--text-muted)]">
            Must be at least 8 characters, including a number and symbol.
          </p>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold mb-2" htmlFor="reg-confirm-password">
            Confirm Password *
          </label>
          <div className="relative">
            <input
              id="reg-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full border border-[var(--surface-border)] rounded-xl py-3.5 px-4 bg-[var(--surface-lowest)] text-[var(--text-main)] font-serif text-base focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showConfirmPassword ? "visibility" : "visibility_off"}
              </span>
            </button>
          </div>
        </div>

        {/* Terms Agreement Checkbox */}
        <div className="flex items-start gap-3 pt-2">
          <input
            id="terms"
            required
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 text-[#d4af37] focus:ring-[#d4af37] rounded border-[var(--surface-border)] cursor-pointer"
          />
          <label htmlFor="terms" className="font-serif text-sm text-[var(--text-muted)] cursor-pointer">
            I agree to the{" "}
            <Link href="/pricing?tab=terms" className="text-[#d4af37] underline hover:no-underline font-semibold">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[#d4af37] underline hover:no-underline font-semibold">
              Privacy Policy
            </Link>
            .
          </label>
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all duration-300 font-display text-xs uppercase tracking-widest font-bold rounded-full shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                <span>Registering...</span>
              </>
            ) : (
              <>
                <span>Register</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
