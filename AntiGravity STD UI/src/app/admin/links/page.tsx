"use client";

import React, { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  getSocialLinksAction,
  saveDraftSocialLinksAction,
  publishSocialLinksAction,
  SocialLinksData,
} from "../links-actions";

export default function AdminLinksPage() {
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<SocialLinksData>({
    linkedin: "",
    instagram: "",
    facebook: "",
    facebookActive: false,
    websiteDomain: "",
    websiteDomainActive: false,
    websiteDomainStatus: "Not Configured",
    whatsappNumber: "+92 300 0000000",
  });
  const [published, setPublished] = useState<SocialLinksData>({
    linkedin: "",
    instagram: "",
    facebook: "",
    facebookActive: false,
    websiteDomain: "",
    websiteDomainActive: false,
    websiteDomainStatus: "Not Configured",
    whatsappNumber: "+92 300 0000000",
  });

  const [savingDomain, setSavingDomain] = useState(false);
  const [publishingDomain, setPublishingDomain] = useState(false);

  const [savingFacebook, setSavingFacebook] = useState(false);
  const [publishingFacebook, setPublishingFacebook] = useState(false);

  const [savingSocials, setSavingSocials] = useState(false);
  const [publishingSocials, setPublishingSocials] = useState(false);

  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [publishingWhatsApp, setPublishingWhatsApp] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    async function loadLinks() {
      setLoading(true);
      try {
        const res = await getSocialLinksAction();
        if (res.success && res.data) {
          setDraft(res.data.draft);
          setPublished(res.data.published);
        }
      } catch (err: any) {
        showToast("error", err?.message || "Failed to load links configuration.");
      } finally {
        setLoading(false);
      }
    }
    loadLinks();
  }, []);

  // Generic partial saver for draft
  const handleSaveDraftPartial = async (
    updates: Partial<SocialLinksData>,
    setLoadingState: (v: boolean) => void,
    successMessage: string
  ) => {
    const updatedDraft = { ...draft, ...updates };
    setLoadingState(true);
    try {
      const res = await saveDraftSocialLinksAction(updatedDraft);
      if (res.success && res.data) {
        setDraft(res.data);
        showToast("success", successMessage);
      } else {
        showToast("error", res.error || "Failed to save draft.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to save draft.");
    } finally {
      setLoadingState(false);
    }
  };

  // Generic partial publisher
  const handlePublishPartial = async (
    updates: Partial<SocialLinksData>,
    setLoadingState: (v: boolean) => void,
    successMessage: string
  ) => {
    const updatedPayload = { ...draft, ...updates };
    setLoadingState(true);
    try {
      const res = await publishSocialLinksAction(updatedPayload);
      if (res.success && res.data) {
        setPublished(res.data);
        setDraft(res.data);
        showToast("success", successMessage);
      } else {
        showToast("error", res.error || "Failed to publish.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to publish.");
    } finally {
      setLoadingState(false);
    }
  };

  // Domain verification helper
  const domainStatus = draft.websiteDomainActive && draft.websiteDomain
    ? draft.websiteDomainStatus || "Pending Verification"
    : "Not Configured";

  const isFacebookActive = Boolean(draft.facebookActive);

  return (
    <div className="min-h-screen pb-16">
      <AdminHeader
        title="Links"
        subtitle="Manage Website Domain, Facebook URL, and institutional platform channels"
      />

      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 space-y-8">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-display font-semibold transition-all shadow-xs ${
              toast.type === "success"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {toast.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{toast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-xs uppercase tracking-wider underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Workflow Info Callout */}
        <div className="rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#141416] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-display uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
              Independent Channel Architecture
            </span>
            <p className="font-serif text-xs text-[var(--text-muted)] max-w-lg leading-relaxed">
              Website Domain and Facebook URL operate independently. Entering a URL stages it as a draft; clicking Publish pushes verified links to production.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11px] font-display font-bold uppercase tracking-wider border border-emerald-500/25 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Live Sync Active
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD A: WEBSITE DOMAIN CONFIGURATION (REQUIREMENT 8A) */}
        {/* ========================================================================= */}
        <section className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--surface-border)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center font-bold shrink-0">
                <span className="material-symbols-outlined text-[22px]">language</span>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                  Website Domain
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  Official custom domain for the SpeakUp public web application.
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[10px] font-display uppercase tracking-wider font-bold px-3 py-1 rounded-full border ${
                  domainStatus === "Configured"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                    : domainStatus === "Pending Verification"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                    : domainStatus === "Error"
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                    : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
                }`}
              >
                {domainStatus}
              </span>
            </div>
          </div>

          {/* Configuration State Controls */}
          {!draft.websiteDomainActive ? (
            <div className="p-5 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Domain Configuration Inactive
                </h4>
                <p className="font-serif text-xs text-[var(--text-muted)] max-w-md">
                  Currently running on default environment hostname. Activate this card to assign your purchased or custom web address.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    websiteDomainActive: true,
                    websiteDomainStatus: draft.websiteDomain ? "Pending Verification" : "Not Configured",
                  })
                }
                className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
                <span>Configure / Activate Domain</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Domain URL *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveDraftPartial(
                        { websiteDomainActive: false, websiteDomainStatus: "Not Configured" },
                        setSavingDomain,
                        "Website domain deactivated. Reset to default environment hostname."
                      )
                    }
                    className="text-[11px] font-display uppercase text-rose-600 hover:underline cursor-pointer"
                  >
                    Deactivate Configuration
                  </button>
                </div>
                <input
                  type="url"
                  value={draft.websiteDomain || ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      websiteDomain: e.target.value,
                      websiteDomainStatus: e.target.value.trim() ? "Pending Verification" : "Not Configured",
                    })
                  }
                  placeholder="https://speakup.edu.pk"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none font-mono"
                />
              </div>

              {/* Status and Verification Notice */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-serif text-[var(--text-muted)] space-y-1">
                <div className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400">
                  <span className="material-symbols-outlined text-[15px]">info</span>
                  <span>Domain Verification State: {domainStatus}</span>
                </div>
                <p>
                  Entering a domain does not claim it is connected. Production DNS CNAME / A records must be pointed to SpeakUp servers. DNS verification occurs upon propagation.
                </p>
                {published.websiteDomain && (
                  <p className="pt-1 text-[11px] font-mono text-[var(--text-main)]">
                    Current Live Value: <code className="font-bold">{published.websiteDomain}</code>
                  </p>
                )}
              </div>

              {/* Domain Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  disabled={savingDomain}
                  onClick={() =>
                    handleSaveDraftPartial(
                      {
                        websiteDomain: draft.websiteDomain,
                        websiteDomainActive: true,
                        websiteDomainStatus: draft.websiteDomain?.trim() ? "Pending Verification" : "Not Configured",
                      },
                      setSavingDomain,
                      "Website domain draft saved successfully."
                    )
                  }
                  className="px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141416] text-[var(--text-main)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                >
                  {savingDomain && <span className="w-3 h-3 border-2 border-[var(--text-main)] border-t-transparent rounded-full animate-spin"></span>}
                  <span>Save Draft Domain</span>
                </button>

                <button
                  type="button"
                  disabled={publishingDomain}
                  onClick={() =>
                    handlePublishPartial(
                      {
                        websiteDomain: draft.websiteDomain,
                        websiteDomainActive: true,
                        websiteDomainStatus: draft.websiteDomain?.trim() ? "Pending Verification" : "Not Configured",
                      },
                      setPublishingDomain,
                      "Website domain published to live application!"
                    )
                  }
                  className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-50 text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  {publishingDomain && <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span>}
                  <span>Publish Domain</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* CARD B: FACEBOOK URL CONFIGURATION (REQUIREMENT 8B) */}
        {/* ========================================================================= */}
        <section className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--surface-border)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-600/30 text-blue-600 flex items-center justify-center font-bold shrink-0">
                <span className="text-base font-display">f</span>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                  Facebook URL
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  Public institutional Facebook page. Inactive by default; hidden from public website until published.
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[10px] font-display uppercase tracking-wider font-bold px-3 py-1 rounded-full border ${
                  published.facebookActive && published.facebook
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                    : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
                }`}
              >
                {published.facebookActive && published.facebook ? "Active on Website" : "Inactive (Hidden)"}
              </span>
            </div>
          </div>

          {/* Activation Controls */}
          {!isFacebookActive ? (
            <div className="p-5 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Facebook Channel Inactive
                </h4>
                <p className="font-serif text-xs text-[var(--text-muted)] max-w-md">
                  The Facebook icon is currently hidden on the public website footer. Activate configuration to specify a URL and make it visible.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    facebookActive: true,
                  })
                }
                className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_link</span>
                <span>Activate Facebook URL</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Facebook Destination URL *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handlePublishPartial(
                        { facebook: "", facebookActive: false },
                        setPublishingFacebook,
                        "Facebook URL deactivated and hidden from the public website."
                      )
                    }
                    className="text-[11px] font-display uppercase text-rose-600 hover:underline cursor-pointer"
                  >
                    Deactivate (Hide from Website)
                  </button>
                </div>
                <input
                  type="url"
                  value={draft.facebook || ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      facebook: e.target.value,
                    })
                  }
                  placeholder="https://www.facebook.com/speakup"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-serif text-[var(--text-muted)]">
                <span>
                  Live Status:{" "}
                  {published.facebookActive && published.facebook ? (
                    <code className="text-[var(--text-main)] font-mono font-semibold">{published.facebook}</code>
                  ) : (
                    <span className="italic text-[var(--text-muted)]">Inactive (Hidden from public footer)</span>
                  )}
                </span>
                {draft.facebook && (
                  <a
                    href={draft.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#d4af37] hover:underline inline-flex items-center gap-1 font-display text-[10px] uppercase font-bold"
                  >
                    <span>Test link</span>
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </a>
                )}
              </div>

              {/* Facebook Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
                <button
                  type="button"
                  disabled={savingFacebook}
                  onClick={() =>
                    handleSaveDraftPartial(
                      { facebook: draft.facebook, facebookActive: true },
                      setSavingFacebook,
                      "Facebook draft saved successfully."
                    )
                  }
                  className="px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141416] text-[var(--text-main)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                >
                  {savingFacebook && <span className="w-3 h-3 border-2 border-[var(--text-main)] border-t-transparent rounded-full animate-spin"></span>}
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  disabled={publishingFacebook}
                  onClick={() =>
                    handlePublishPartial(
                      { facebook: draft.facebook, facebookActive: true },
                      setPublishingFacebook,
                      "Facebook URL published to public website!"
                    )
                  }
                  className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-50 text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  {publishingFacebook && <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span>}
                  <span>Publish to Website</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* PRESERVED SOCIAL PLATFORMS: LINKEDIN & INSTAGRAM */}
        {/* ========================================================================= */}
        <section className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-[var(--surface-border)] pb-3">
            <h3 className="font-display text-base font-bold text-[var(--text-main)]">
              Primary Social Channels (LinkedIn &amp; Instagram)
            </h3>
            <p className="font-serif text-xs text-[var(--text-muted)]">
              Official institutional social media presence displayed in the website footer.
            </p>
          </div>

          <div className="space-y-4">
            {/* LinkedIn */}
            <div className="space-y-1.5">
              <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                LinkedIn URL *
              </label>
              <input
                type="url"
                required
                value={draft.linkedin}
                onChange={(e) => setDraft({ ...draft, linkedin: e.target.value })}
                placeholder="https://www.linkedin.com/company/speakup"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none font-mono"
              />
            </div>

            {/* Instagram */}
            <div className="space-y-1.5">
              <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Instagram URL *
              </label>
              <input
                type="url"
                required
                value={draft.instagram}
                onChange={(e) => setDraft({ ...draft, instagram: e.target.value })}
                placeholder="https://www.instagram.com/speakup"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
            <button
              type="button"
              disabled={savingSocials}
              onClick={() =>
                handleSaveDraftPartial(
                  { linkedin: draft.linkedin, instagram: draft.instagram },
                  setSavingSocials,
                  "LinkedIn and Instagram drafts saved."
                )
              }
              className="px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141416] text-[var(--text-main)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
            >
              {savingSocials && <span className="w-3 h-3 border-2 border-[var(--text-main)] border-t-transparent rounded-full animate-spin"></span>}
              <span>Save Socials Draft</span>
            </button>

            <button
              type="button"
              disabled={publishingSocials}
              onClick={() =>
                handlePublishPartial(
                  { linkedin: draft.linkedin, instagram: draft.instagram },
                  setPublishingSocials,
                  "LinkedIn and Instagram links published to live website!"
                )
              }
              className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-50 text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              {publishingSocials && <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span>}
              <span>Publish Socials</span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* WHATSAPP ADMINISTRATION CONTACT (REQUIREMENT 15) */}
        {/* ========================================================================= */}
        <section className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--surface-border)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <span className="material-symbols-outlined text-[22px]">chat</span>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                  WhatsApp Administration Contact
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)]">
                  Single centralized WhatsApp contact number connected to all website and Student LMS contact actions.
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-display uppercase tracking-wider font-bold px-3 py-1 rounded-full border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Live: {published.whatsappNumber || "+92 300 0000000"}</span>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  WhatsApp Contact Number *
                </label>
                {draft.whatsappNumber !== published.whatsappNumber && (
                  <span className="text-[10px] font-display uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">
                    Unpublished Draft Changes
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={draft.whatsappNumber || ""}
                onChange={(e) => setDraft({ ...draft, whatsappNumber: e.target.value })}
                placeholder="+92 300 0000000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none font-mono"
              />
              <p className="font-serif text-[11px] text-[var(--text-muted)]">
                Format: Include country code (e.g. +92XXXXXXXXXX or 0092XXXXXXXXXX). Clean numeric digits will be passed to WhatsApp click links automatically.
              </p>
            </div>

            {/* Live Synchronized Destinations Callout */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] text-xs font-serif text-[var(--text-muted)] space-y-1">
              <div className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase text-[var(--text-main)]">
                <span className="material-symbols-outlined text-[15px] text-emerald-500">sync</span>
                <span>Centralized Destination Integration</span>
              </div>
              <p>
                Publishing this number automatically updates all WhatsApp touchpoints: Homepage seat reservation, Privacy &amp; Compliance desk, Student LMS event advisories, and course payment proof instructions. Saving as draft keeps the change staging-only without disrupting public students.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
            <button
              type="button"
              disabled={savingWhatsApp}
              onClick={() =>
                handleSaveDraftPartial(
                  { whatsappNumber: draft.whatsappNumber },
                  setSavingWhatsApp,
                  "WhatsApp contact number saved as draft."
                )
              }
              className="px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[#141416] text-[var(--text-main)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
            >
              {savingWhatsApp && <span className="w-3 h-3 border-2 border-[var(--text-main)] border-t-transparent rounded-full animate-spin"></span>}
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={publishingWhatsApp}
              onClick={() =>
                handlePublishPartial(
                  { whatsappNumber: draft.whatsappNumber },
                  setPublishingWhatsApp,
                  "WhatsApp contact published! All website and LMS touchpoints updated."
                )
              }
              className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-50 text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              {publishingWhatsApp && <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></span>}
              <span>Publish</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
