"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { useCmsContent } from "@/lib/cms/useCmsContent";

import { submitBookingRequestAction } from "./booking-actions";

function formatPersonName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export default function BookSessionPage() {
  const cms = useCmsContent("contact");
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    countryCode: "+92",
    phone: "",
    network: "",
    status: "professional",
    message: "",
    confirmed: false,
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCancel = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await submitBookingRequestAction({
        fullName: formData.fullName,
        email: formData.email,
        countryCode: formData.countryCode,
        phone: formData.phone,
        network: formData.network,
        status: formData.status,
        message: formData.message,
      });

      if (res.success) {
        setSubmitted(true);
      } else {
        setErrorMessage(res.error || "Failed to submit booking request. Please check your details.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] justify-center py-10 md:py-16 px-6">
      {/* Main Focused Booking Form Canvas */}
      <main className="w-full flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl bg-[var(--surface-lowest)] border border-[var(--surface-border)] p-8 md:p-12 shadow-md rounded-2xl transition-all">
          {/* Centered SpeakUp Logo Emblem Only */}
          <div className="flex justify-center mb-6">
            <Logo size="lg" showText={false} href="/" />
          </div>

          {!submitted ? (
            <>
              <div className="text-center mb-10">
                {/* Main Heading enclosed in stylish rectangular rounded box */}
                <div className="inline-flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-b from-[var(--surface-low)] to-[var(--surface-lowest)] border border-[#d4af37]/45 rounded-2xl shadow-[0_4px_24px_-6px_rgba(212,175,55,0.18)] mb-4">
                  <h1 className="font-display text-2xl sm:text-3xl text-[var(--text-main)] uppercase tracking-[0.08em] font-extrabold">
                    {cms.header?.heading || "Book a Session"}
                  </h1>
                </div>
                <p className="font-serif text-base md:text-lg text-[var(--text-muted)] leading-relaxed max-w-lg mx-auto">
                  {cms.header?.subheading || "Tell us a little about yourself and our academic advisors will contact you to establish your personalized schedule."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-serif text-sm flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">error</span>
                    <span>{errorMessage}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold" htmlFor="fullName">
                      Full Name *
                    </label>
                    <input
                      id="fullName"
                      required
                      type="text"
                      placeholder="Jane Doe"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-[var(--surface-lowest)] border border-[var(--surface-border)] p-3.5 font-serif text-base text-[var(--text-main)] focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all rounded-xl"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold" htmlFor="email">
                      Email Address *
                    </label>
                    <input
                      id="email"
                      required
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[var(--surface-lowest)] border border-[var(--surface-border)] p-3.5 font-serif text-base text-[var(--text-main)] focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Phone */}
                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold" htmlFor="phone">
                      Phone Number *
                    </label>
                    <div className="flex border border-[var(--surface-border)] bg-[var(--surface-lowest)] rounded-xl overflow-hidden focus-within:border-[#d4af37]">
                      <select
                        aria-label="Country Code"
                        value={formData.countryCode}
                        onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                        className="bg-[var(--surface-low)] px-3 py-3 border-r border-[var(--surface-border)] text-[var(--text-main)] font-serif text-sm focus:outline-none cursor-pointer"
                      >
                        <option value="+92">PK (+92)</option>
                        <option value="+1">US (+1)</option>
                        <option value="+44">UK (+44)</option>
                        <option value="+971">UAE (+971)</option>
                        <option value="+966">SA (+966)</option>
                        <option value="+91">IN (+91)</option>
                      </select>
                      <input
                        id="phone"
                        required
                        type="tel"
                        placeholder="300 1234567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full p-3.5 font-serif text-base bg-transparent text-[var(--text-main)] border-none focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Mobile Network */}
                  <div className="flex flex-col gap-2">
                    <label className="font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold" htmlFor="network">
                      Mobile Network
                    </label>
                    <select
                      id="network"
                      value={formData.network}
                      onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                      className="w-full bg-[var(--surface-lowest)] border border-[var(--surface-border)] p-3.5 font-serif text-base text-[var(--text-main)] focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-colors cursor-pointer rounded-xl"
                    >
                      <option value="">Select Network Provider</option>
                      <option value="jazz">Jazz / Mobilink</option>
                      <option value="zong">Zong</option>
                      <option value="ufone">Ufone</option>
                      <option value="telenor">Telenor</option>
                      <option value="sco">SCO</option>
                      <option value="verizon">Verizon</option>
                      <option value="att">AT&amp;T</option>
                      <option value="t-mobile">T-Mobile</option>
                      <option value="vodafone">Vodafone</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Current Status */}
                <div className="flex flex-col gap-2">
                  <label className="font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold">
                    Current Professional Status *
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { id: "professional", label: "Professional / Working" },
                      { id: "university", label: "University Student" },
                      { id: "college", label: "College / Intermediate" },
                      { id: "school", label: "School Student" },
                      { id: "other", label: "Other" },
                    ].map((statusItem) => (
                      <button
                        key={statusItem.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: statusItem.id })}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-display uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                          formData.status === statusItem.id
                            ? "bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] border-[#1a1a1a] dark:border-[#d4af37]"
                            : "bg-[var(--surface-low)] border-[var(--surface-border)] text-[var(--text-muted)] hover:border-[#d4af37]"
                        }`}
                      >
                        {statusItem.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div className="flex flex-col gap-2">
                  <label className="font-display text-xs uppercase tracking-wider text-[var(--text-main)] font-bold" htmlFor="message">
                    Anything you&apos;d like to ask?
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="Tell us about your learning goals or specific areas of communication you wish to focus on..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-[var(--surface-lowest)] border border-[var(--surface-border)] p-3.5 font-serif text-base text-[var(--text-main)] focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all rounded-xl resize-none"
                  />
                </div>

                {/* Confirmation Checkbox */}
                <div className="flex items-start gap-3 pt-2">
                  <input
                    id="confirmed"
                    required
                    type="checkbox"
                    checked={formData.confirmed}
                    onChange={(e) => setFormData({ ...formData, confirmed: e.target.checked })}
                    className="mt-1 w-4 h-4 text-[#d4af37] focus:ring-[#d4af37] rounded border-[var(--surface-border)] cursor-pointer"
                  />
                  <label htmlFor="confirmed" className="font-serif text-sm text-[var(--text-muted)] cursor-pointer">
                    I confirm that my contact details are accurate and authorize the SpeakUp academic advisory desk to contact me via phone/WhatsApp regarding this session.
                  </label>
                </div>

                {/* Submit & Cancel Actions */}
                <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full sm:w-auto px-8 py-4 border border-[var(--surface-border)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-low)] transition-all font-display text-xs uppercase tracking-widest font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-10 py-4 bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all duration-300 font-display text-xs uppercase tracking-widest font-bold rounded-full shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        <span>Scheduling...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Session Request</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-8 space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)]">
                Session Request Received!
              </h2>
              <p className="font-serif text-base text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-[var(--text-main)]">{formatPersonName(formData.fullName)}</strong>. Our academic admissions desk will review your details and connect with you at <strong className="text-[var(--text-main)] whitespace-nowrap">{formData.countryCode} {formData.phone}</strong> shortly.
              </p>
              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] font-display text-xs uppercase tracking-widest font-bold px-8 py-3.5 rounded-full hover:bg-[#d4af37] hover:text-white transition-all shadow-xs cursor-pointer"
                >
                  Return to Previous Page
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
