"use client";

import React, { useState, useEffect, useRef } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import InitialsAvatar from "@/components/InitialsAvatar";
import {
  getPortalEmailSettingsAction,
  savePortalEmailSettingsAction,
  uploadPortalEmailAvatarAction,
  sendPortalEmailTestAction,
  getSupabaseAuthEmailTemplatesAction,
  disconnectGmailAction,
  selectEmailProviderAction,
  PortalEmailSettings,
} from "../portal-email-actions";
import { validateEmail, validateName } from "@/lib/validation";

export default function PortalEmailPage() {
  const [loading, setLoading] = useState(true);
  const [adminLoginEmail, setAdminLoginEmail] = useState("");
  const [senderName, setSenderName] = useState("SpeakUp Team");
  const [senderEmail, setSenderEmail] = useState("onboarding@resend.dev");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [providerNotice, setProviderNotice] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<"gmail" | "resend">("gmail");
  const [connectedGmail, setConnectedGmail] = useState<{
    connected: boolean;
    email: string | null;
    connectedAt: string | null;
    hasRefreshToken: boolean;
    isOAuthConfigured: boolean;
  }>({
    connected: false,
    email: null,
    connectedAt: null,
    hasRefreshToken: false,
    isOAuthConfigured: false,
  });
  const [disconnectingGmail, setDisconnectingGmail] = useState(false);
  const [switchingProvider, setSwitchingProvider] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<PortalEmailSettings["deliveryStatus"] | null>(null);

  // Test Email Verification State
  const [testRecipient, setTestRecipient] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    resendId?: string;
    fromHeader?: string;
  } | null>(null);

  // Picture Editor State (Interactive Crop / Zoom / Pan)
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarScale, setAvatarScale] = useState(1);
  const [avatarOffsetX, setAvatarOffsetX] = useState(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Form saving state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  // Supabase Auth Templates Modal
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesData, setTemplatesData] = useState<{
    confirmation?: { subject: string; html: string };
    recovery?: { subject: string; html: string };
    invite?: { subject: string; html: string };
  } | null>(null);
  const [activeTemplateTab, setActiveTemplateTab] = useState<"confirmation" | "recovery" | "invite">("confirmation");
  const [copiedTemplateTab, setCopiedTemplateTab] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: "success" | "error" | "warning", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const handleOpenTemplatesModal = async () => {
    setShowTemplatesModal(true);
    if (!templatesData) {
      setTemplatesLoading(true);
      try {
        const res = await getSupabaseAuthEmailTemplatesAction();
        if (res.success && res.data) {
          setTemplatesData(res.data);
        }
      } catch (e) {
        console.error("Failed to load email templates", e);
      } finally {
        setTemplatesLoading(false);
      }
    }
  };

  const handleCopyTemplateHtml = (htmlContent: string, tabKey: string) => {
    navigator.clipboard.writeText(htmlContent);
    setCopiedTemplateTab(tabKey);
    setTimeout(() => setCopiedTemplateTab(null), 2500);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await getPortalEmailSettingsAction();
        if (res.success && res.data) {
          setAdminLoginEmail(res.data.adminLoginEmail || "");
          setSenderName(res.data.senderName || "SpeakUp Team");
          setSenderEmail(res.data.actualProviderSendingAddress || res.data.senderEmail || "onboarding@resend.dev");
          setReplyToEmail(res.data.replyToEmail || "");
          setAvatarUrl(res.data.avatarUrl || null);
          setIsVerified(res.data.isVerified ?? true);
          setProviderNotice(res.data.providerNotice || "");
          if (res.data.selectedProvider) {
            setSelectedProvider(res.data.selectedProvider);
          }
          if (res.data.connectedGmail) {
            setConnectedGmail(res.data.connectedGmail);
          }
          if (res.data.deliveryStatus) {
            setDeliveryStatus(res.data.deliveryStatus);
          }
          if (res.data.adminLoginEmail) {
            setTestRecipient(res.data.adminLoginEmail);
          }
        }
      } catch (err: any) {
        showToast("error", err?.message || "Failed to load portal email configuration.");
      } finally {
        setLoading(false);
      }
    }
    loadData();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("gmail_connected") === "true") {
        showToast("success", "Gmail account successfully authorized and linked via Google OAuth!");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get("error")) {
        showToast("error", decodeURIComponent(params.get("error") || "OAuth connection failed."));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleSelectProvider = async (provider: "gmail" | "resend") => {
    if (provider === "gmail" && !connectedGmail.connected) {
      showToast("warning", "Gmail is not connected yet. Please connect an authorized Gmail account via Google OAuth below.");
    }
    setSelectedProvider(provider);
    setSwitchingProvider(true);
    try {
      const res = await selectEmailProviderAction(provider);
      if (res.success) {
        showToast("success", `Active delivery provider updated to ${provider === "resend" ? "Resend" : "Gmail"}.`);
      } else {
        showToast("error", res.error || "Failed to switch provider.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update provider.");
    } finally {
      setSwitchingProvider(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm("Are you sure you want to disconnect this Gmail account? Outbound mail delivery will revert to Resend.")) {
      return;
    }
    setDisconnectingGmail(true);
    try {
      const res = await disconnectGmailAction();
      if (res.success) {
        setConnectedGmail({
          connected: false,
          email: null,
          connectedAt: null,
          hasRefreshToken: false,
          isOAuthConfigured: connectedGmail.isOAuthConfigured,
        });
        setSelectedProvider("resend");
        showToast("success", "Gmail account disconnected. Delivery reverted to Resend.");
      } else {
        showToast("error", res.error || "Failed to disconnect Gmail.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Error disconnecting Gmail.");
    } finally {
      setDisconnectingGmail(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      showToast("error", "Only PNG, JPG, and WEBP formats are supported.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "Image must be under 2MB.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPendingAvatar(objectUrl);
    setAvatarScale(1);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!pendingAvatar && !avatarUrl) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - avatarOffsetX, y: e.clientY - avatarOffsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setAvatarOffsetX(e.clientX - dragStart.x);
    setAvatarOffsetY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile) {
      showToast("success", "Display orientation adjusted.");
      return;
    }

    setAvatarSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await uploadPortalEmailAvatarAction(formData);

      if (res.success && res.data?.avatarUrl) {
        setAvatarUrl(res.data.avatarUrl);
        setPendingAvatar(null);
        setSelectedFile(null);
        showToast("success", "Sender profile picture uploaded and saved.");
      } else {
        showToast("error", res.error || "Failed to upload image.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Image upload failed.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    setPendingAvatar(null);
    setSelectedFile(null);
    setAvatarScale(1);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
    showToast("success", "Portal sender picture removed. Initials fallback active.");
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameCheck = validateName(senderName, "Public Sender Name");
    if (!nameCheck.valid) {
      showToast("error", nameCheck.error || "Invalid sender name.");
      return;
    }

    if (replyToEmail.trim()) {
      const replyCheck = validateEmail(replyToEmail.trim());
      if (!replyCheck.valid) {
        showToast("error", "Please enter a valid Reply-To email address or leave it blank.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await savePortalEmailSettingsAction({
        senderName: senderName.trim(),
        replyToEmail: replyToEmail.trim() || undefined,
        avatarUrl: avatarUrl,
        selectedProvider: selectedProvider,
      });

      if (res.success && res.data) {
        setSenderName(res.data.senderName || "SpeakUp Team");
        setSenderEmail(res.data.actualProviderSendingAddress || res.data.senderEmail || "onboarding@resend.dev");
        setReplyToEmail(res.data.replyToEmail || "");
        setIsVerified(res.data.isVerified ?? true);
        if (res.data.selectedProvider) {
          setSelectedProvider(res.data.selectedProvider);
        }
        if (res.data.connectedGmail) {
          setConnectedGmail(res.data.connectedGmail);
        }
        if (res.data.deliveryStatus) {
          setDeliveryStatus(res.data.deliveryStatus);
        }
        if (res.data.providerNotice) {
          setProviderNotice(res.data.providerNotice);
          showToast("warning", res.data.providerNotice);
        } else {
          showToast("success", "Public email identity saved successfully.");
        }
      } else {
        showToast("error", res.error || "Failed to save configuration.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Save operation failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    const target = (testRecipient || adminLoginEmail).trim();
    const emailCheck = validateEmail(target);
    if (!emailCheck.valid) {
      showToast("error", emailCheck.error || "Please enter a valid recipient email for the test.");
      return;
    }

    setTestingEmail(true);
    setTestResult(null);

    try {
      const res = await sendPortalEmailTestAction(target);
      if (res.success && res.data) {
        setTestResult({
          success: true,
          message: `Provider accepted the test email for dispatch to ${target}. Note: Provider acceptance confirms successful API delivery; inbox placement depends on destination mail filtering and domain authentication (SPF/DKIM).`,
          resendId: res.data.resendId,
          fromHeader: res.data.fromHeader,
        });
        showToast("success", "Verification test email accepted by provider!");
      } else {
        setTestResult({
          success: false,
          message: res.error || "Failed to dispatch test verification email.",
        });
        showToast("error", res.error || "Failed to dispatch test verification email.");
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Unexpected exception during test dispatch.",
      });
      showToast("error", err?.message || "Test dispatch error.");
    } finally {
      setTestingEmail(false);
    }
  };

  const activeDisplayAvatar = pendingAvatar || avatarUrl;
  const actualEffectiveSender =
    selectedProvider === "gmail" && connectedGmail.connected && connectedGmail.email
      ? connectedGmail.email
      : senderEmail || "onboarding@resend.dev";
  const targetDomain = senderEmail.includes("@") ? senderEmail.split("@")[1].toLowerCase() : "";

  return (
    <div className="min-h-screen pb-20">
      <AdminHeader
        title="Portal Email"
        subtitle="Centralized management of public email identity, delivery pipelines, and DNS alignment"
      />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-8 space-y-10">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-display font-semibold transition-all shadow-xs ${
              toast.type === "success"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                : toast.type === "warning"
                ? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {toast.type === "success" ? "check_circle" : toast.type === "warning" ? "warning" : "error"}
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

        {/* Identity Separation Callout */}
        <div className="rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-[#141416] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[11px] font-display uppercase tracking-wider font-bold text-[var(--text-muted)]">
              Administrator Login Session (Private &amp; Unexposed)
            </span>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#d4af37]">lock</span>
              <span className="font-mono text-xs text-[var(--text-main)] font-semibold">
                {adminLoginEmail || "Loading..."}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-display font-bold uppercase tracking-wider">
                Admin Session Only
              </span>
            </div>
          </div>
          <p className="font-serif text-xs text-[var(--text-muted)] md:max-w-md leading-relaxed">
            Your personal administrator login email is kept strictly private. Recipients only see the configured public sender identity below for all student LMS emails, notifications, and course decisions.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: PUBLIC EMAIL IDENTITY */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--surface-border)] pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center font-display text-xs font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                  1
                </span>
                <h2 className="font-display text-xl font-bold text-[var(--text-main)]">
                  Public Email Identity
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#8a6d1b] dark:text-[#d4af37] text-[10px] font-display font-bold uppercase tracking-wider">
                  Public Facing
                </span>
              </div>
              <p className="font-serif text-xs text-[var(--text-muted)] mt-1">
                Configure the public sender persona, display name, verified sending email address, Reply-To destination, and SpeakUp logo displayed to students.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Logo & Sender Details Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Logo / Sender Avatar */}
              <div className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 shadow-xs space-y-6">
                <div className="border-b border-[var(--surface-border)] pb-3">
                  <h3 className="font-display text-sm font-bold text-[var(--text-main)]">
                    SpeakUp Logo &amp; Sender Avatar
                  </h3>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    Official emblem used in email headers and notifications. Stored securely with fallback to institutional initials.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Interactive Crop Frame */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      className="w-32 h-32 rounded-full border-2 border-[#d4af37] bg-[#f9f5ed] dark:bg-[#1b1b1e] relative overflow-hidden flex items-center justify-center cursor-move select-none shadow-md shrink-0"
                      title="Click and drag to position logo"
                    >
                      {activeDisplayAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeDisplayAvatar}
                          alt="Portal Sender Avatar"
                          className="max-w-none pointer-events-none transition-transform"
                          style={{
                            transform: `translate(${avatarOffsetX}px, ${avatarOffsetY}px) scale(${avatarScale})`,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <InitialsAvatar
                          name={senderName || "SpeakUp LMS"}
                          sizeClass="w-full h-full"
                          textSizeClass="text-2xl"
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)]">
                      Drag to Reposition
                    </span>
                  </div>

                  {/* Picture Controls */}
                  <div className="flex-1 space-y-4 w-full">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                    />

                    {/* Zoom Slider */}
                    {activeDisplayAvatar && (
                      <div className="space-y-1 p-3 rounded-xl bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]/40 border border-[var(--surface-border)]">
                        <div className="flex items-center justify-between text-xs font-display">
                          <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px]">
                            Scale ({Math.round(avatarScale * 100)}%)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAvatarScale((s) => Math.max(0.5, s - 0.1))}
                              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs"
                              title="Zoom Out"
                            >
                              <span className="material-symbols-outlined text-[14px]">remove</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAvatarScale((s) => Math.min(3, s + 0.1))}
                              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs"
                              title="Zoom In"
                            >
                              <span className="material-symbols-outlined text-[14px]">add</span>
                            </button>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.05"
                          value={avatarScale}
                          onChange={(e) => setAvatarScale(parseFloat(e.target.value))}
                          className="w-full accent-[#d4af37] cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] text-xs font-display uppercase tracking-wider font-semibold text-[var(--text-main)] inline-flex items-center gap-2 cursor-pointer shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#d4af37]">photo_library</span>
                        <span>{activeDisplayAvatar ? "Replace Logo" : "Upload Logo"}</span>
                      </button>

                      {Boolean(avatarUrl || pendingAvatar) && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="px-3.5 py-2 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
                        >
                          Remove Logo
                        </button>
                      )}

                      {selectedFile && (
                        <button
                          type="button"
                          onClick={handleSaveAvatar}
                          disabled={avatarSaving}
                          className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          {avatarSaving && <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>}
                          <span>Save Logo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Public Sender Settings Form */}
              <div className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 shadow-xs space-y-6">
                <div className="border-b border-[var(--surface-border)] pb-3">
                  <h3 className="font-display text-sm font-bold text-[var(--text-main)]">
                    Public Email Identity
                  </h3>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    Configure the authoritative public sender display name and genuine contact reply-to inbox for student correspondence.
                  </p>
                </div>

                <form onSubmit={handleSaveChanges} className="space-y-4">
                  {/* Public Sender Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                      Public Sender Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g. SpeakUp Team"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                    />
                    <p className="font-serif text-[11px] text-[var(--text-muted)]">
                      The authoritative branded display name recipients see in their inbox header (defaults to &ldquo;SpeakUp Team&rdquo;).
                    </p>
                  </div>

                  {/* Public Reply-To Email */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                        Public Reply-To Email Address (Owner&apos;s Real Contact Email)
                      </label>
                      <span className="text-[10px] font-display uppercase tracking-wider font-semibold text-[#8a6d1b] dark:text-[#d4af37]">
                        Used For Replies
                      </span>
                    </div>
                    <input
                      type="email"
                      value={replyToEmail}
                      onChange={(e) => setReplyToEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com or contact@speakup.edu"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none font-mono"
                    />
                    <p className="font-serif text-[11px] text-[var(--text-muted)]">
                      The owner&apos;s genuine contact email. When students reply, emails route directly to this address. It is strictly used for replies and never falsely presented as the actual sending address.
                    </p>
                  </div>

                  {/* Read-Only Notice for Actual Sending Address */}
                  <div className="p-3.5 rounded-xl bg-[var(--surface-low)]/50 border border-[var(--surface-border)] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-display uppercase tracking-wider font-bold text-[var(--text-muted)]">
                        Actual Provider Sending Address (Read-Only)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] font-semibold">
                        {actualEffectiveSender}
                      </span>
                    </div>
                    <p className="font-serif text-[11px] text-[var(--text-muted)] leading-relaxed">
                      {selectedProvider === "gmail"
                        ? "Application messages dispatch directly through your authorized Gmail account via Google's official REST API."
                        : "Application messages dispatch through Resend's authorized provider address to maintain DKIM/SPF compliance."}
                      {" "}Managed under <strong>Section 2: Backend Email Delivery</strong> below.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] disabled:opacity-50 text-[#141416] text-xs font-display uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
                    >
                      {saving ? (
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">save</span>
                      )}
                      <span>{saving ? "Saving Changes..." : "Save Public Identity"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Col: Live Inbox Preview */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--surface-border)] pb-3">
                  <span className="material-symbols-outlined text-[18px] text-[#d4af37]">visibility</span>
                  <h3 className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Effective Recipient Preview
                  </h3>
                </div>

                <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                  Real-time visualization of how the public sender identity appears in student inboxes.
                </p>

                {/* Mock Email Message Header Card */}
                <div className="rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed]/80 dark:bg-[var(--surface-low)]/60 p-4 space-y-3 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border border-[#d4af37]/60 overflow-hidden shrink-0 bg-white dark:bg-[#141416]">
                      {activeDisplayAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeDisplayAvatar}
                          alt={senderName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <InitialsAvatar
                          name={senderName || "SpeakUp Team"}
                          sizeClass="w-full h-full"
                          textSizeClass="text-base"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xs font-bold text-[var(--text-main)] truncate">
                        {senderName || "SpeakUp Team"}
                      </p>
                      <p className="font-mono text-[11px] text-[var(--text-muted)] truncate">
                        {actualEffectiveSender}
                      </p>
                      {replyToEmail ? (
                        <p className="font-serif text-[10px] text-[var(--text-muted)] truncate">
                          Reply-To: {replyToEmail}
                        </p>
                      ) : (
                        <p className="font-serif text-[10px] text-[var(--text-muted)] truncate">
                          Reply-To: {actualEffectiveSender}
                        </p>
                      )}
                      <span className="inline-block mt-0.5 text-[10px] font-display uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                        to student
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--surface-border)]/60 space-y-1">
                    <p className="font-display text-xs font-semibold text-[var(--text-main)]">
                      Course Enrollment Update — English Grammar Mastery
                    </p>
                    <p className="font-serif text-[11px] text-[var(--text-muted)] line-clamp-2">
                      Dear Scholar, your course access request has been reviewed by the academic admissions committee...
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-[11px] font-serif text-[var(--text-muted)] space-y-1.5">
                  <span className="font-display uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37] block text-[10px]">
                    Effective Outbound Header
                  </span>
                  <div className="font-mono text-[10.5px] text-[var(--text-main)] break-all space-y-0.5">
                    <div><strong>From:</strong> &quot;{senderName || "SpeakUp Team"}&quot; &lt;{actualEffectiveSender}&gt;</div>
                    <div><strong>Reply-To:</strong> {replyToEmail || actualEffectiveSender}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] font-serif text-blue-900 dark:text-blue-300 space-y-1">
                  <span className="font-display uppercase tracking-wider font-bold text-blue-900 dark:text-blue-200 block text-[10px]">
                    Recipient Client Display
                  </span>
                  <p>
                    Recipients see <strong>{senderName || "SpeakUp Team"}</strong> as the public sender name. Outgoing delivery uses <strong>{selectedProvider === "gmail" ? "Authorized Gmail Account" : "Resend HTTP API"}</strong>. Student replies route directly to your genuine Reply-To address.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-serif text-amber-800 dark:text-amber-300 space-y-1">
                  <span className="font-display uppercase tracking-wider font-bold text-amber-900 dark:text-amber-200 block text-[10px]">
                    Client Avatar Delivery Notice
                  </span>
                  <p>
                    Body logos render consistently across all web and mobile inboxes. Small circular profile avatars beside the sender in Gmail/Apple Mail require BIMI or Gravatar associated with the sender domain.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: BACKEND EMAIL DELIVERY */}
        {/* ========================================================================= */}
        <section className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--surface-border)] pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center font-display text-xs font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                  2
                </span>
                <h2 className="font-display text-xl font-bold text-[var(--text-main)]">
                  Backend Email Delivery
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-400 text-[10px] font-display font-bold uppercase tracking-wider">
                  Infrastructure &amp; Security
                </span>
              </div>
              <p className="font-serif text-xs text-[var(--text-muted)] mt-1">
                Monitor live delivery status across application and authentication services, DNS verification requirements, and dispatch verified test emails.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Panel A: Outbound Email Delivery Provider & Connect Gmail */}
            <div className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#d4af37]">outgoing_mail</span>
                  <h3 className="font-display text-sm font-bold text-[var(--text-main)]">
                    Application Email Delivery
                  </h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider ${
                  selectedProvider === "gmail"
                    ? connectedGmail.connected
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25"
                    : deliveryStatus?.isApiKeyConfigured
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25"
                }`}>
                  {selectedProvider === "gmail"
                    ? connectedGmail.connected
                      ? "Gmail API Active"
                      : "OAuth Connect Needed"
                    : deliveryStatus?.isApiKeyConfigured
                    ? "Resend API Active"
                    : "API Key Pending"}
                </span>
              </div>

              {/* Provider Selection Tabs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-display uppercase tracking-wider font-bold text-[var(--text-muted)]">
                    Select Delivery Provider
                  </span>
                  {switchingProvider && (
                    <span className="text-[10px] font-display text-[#d4af37] animate-pulse">Switching...</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectProvider("gmail")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedProvider === "gmail"
                        ? "border-[#d4af37] bg-[#d4af37]/15 ring-1 ring-[#d4af37]"
                        : "border-[var(--surface-border)] hover:border-[#d4af37]/40 bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-display text-xs font-bold text-[var(--text-main)]">Gmail</span>
                      {connectedGmail.connected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-serif mt-0.5">Google OAuth (Recommended)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectProvider("resend")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedProvider === "resend"
                        ? "border-[#d4af37] bg-[#d4af37]/15 ring-1 ring-[#d4af37]"
                        : "border-[var(--surface-border)] hover:border-[#d4af37]/40 bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]"
                    }`}
                  >
                    <span className="font-display text-xs font-bold text-[var(--text-main)] block">Resend</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-serif mt-0.5">HTTP API (Fallback)</span>
                  </button>
                </div>
              </div>

              {/* Provider Specific Details & Google OAuth Connect */}
              {selectedProvider === "gmail" && (
                <div className="p-4 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/5 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-[#ea4335]">mail</span>
                      <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                        Google OAuth Gmail Delivery
                      </h4>
                    </div>
                    <span className={`text-[10px] font-display uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      connectedGmail.connected
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                    }`}>
                      {connectedGmail.connected ? "Connected" : "Not Connected"}
                    </span>
                  </div>

                  {connectedGmail.connected ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-white dark:bg-[#141416] border border-[var(--surface-border)] space-y-1 text-xs font-mono">
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--text-muted)]">Connected Account:</span>
                          <span className="font-bold text-[var(--text-main)]">{connectedGmail.email}</span>
                        </div>
                        {connectedGmail.connectedAt && (
                          <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)]">
                            <span>Authorized At:</span>
                            <span>{new Date(connectedGmail.connectedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-[10px] text-emerald-600 dark:text-emerald-400">
                          <span>Token Refresh:</span>
                          <span>Active (Offline Refresh Token)</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="font-serif text-[11px] text-[var(--text-muted)] leading-relaxed">
                          All student LMS application emails dispatch directly through your authorized Gmail account via Google&apos;s REST API.
                        </p>
                        <button
                          type="button"
                          onClick={handleDisconnectGmail}
                          disabled={disconnectingGmail}
                          className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-display uppercase tracking-wider font-semibold cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {disconnectingGmail ? "Disconnecting..." : "Disconnect"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                        To send SpeakUp emails directly from your personal or Google Workspace email address, authorize SpeakUp via official Google OAuth consent.
                      </p>

                      <div className="flex items-center gap-3">
                        <a
                          href="/api/auth/google/connect"
                          className="px-4 py-2.5 rounded-xl bg-[#141416] text-[#d4af37] hover:bg-[#2a2a2e] font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">lock_open</span>
                          <span>Connect Gmail Account</span>
                        </a>
                      </div>

                      {!connectedGmail.isOAuthConfigured && (
                        <p className="font-serif text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 leading-relaxed">
                          Note: Server requires <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> environment variables to initiate Google OAuth consent.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Authoritative Settings Summary Box */}
              <div className="space-y-2 text-xs font-serif text-[var(--text-muted)] leading-relaxed">
                <div className="p-3.5 rounded-xl bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] space-y-2 font-mono text-[11px] text-[var(--text-main)]">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Active Delivery Engine:</span>
                    <span className="font-bold uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37]">
                      {selectedProvider === "gmail" ? "Gmail (Google REST API)" : "Resend (HTTP API)"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Delivery Status:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedProvider === "gmail"
                        ? connectedGmail.connected
                          ? "Authorized & Ready"
                          : "Awaiting OAuth Connection"
                        : deliveryStatus?.isApiKeyConfigured
                        ? "Resend API Active"
                        : "API Key Pending"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Public Contact Email:</span>
                    <span>{replyToEmail || "None (Using Provider Address)"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Connected Email Account:</span>
                    <span>{connectedGmail.email || "Not Connected"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Actual Provider Address:</span>
                    <span className="font-bold">{actualEffectiveSender} <span className="text-[10px] font-sans font-normal text-emerald-600 dark:text-emerald-400 ml-1">(Read-only)</span></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Effective Outbound Header:</span>
                    <span>&quot;{senderName || "SpeakUp Team"}&quot; &lt;{actualEffectiveSender}&gt;</span>
                  </div>
                </div>
              </div>

              {/* Sender Test Email Tool */}
              <div className="pt-2 border-t border-[var(--surface-border)] space-y-3">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">send</span>
                  <h4 className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                    Send Verification Test Email
                  </h4>
                </div>
                <p className="font-serif text-[11.5px] text-[var(--text-muted)]">
                  Dispatches a genuine test message through the configured provider to verify sender headers, Reply-To routing, and branded template styling.
                </p>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="recipient@example.com"
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={testingEmail}
                    className="px-4 py-2 rounded-xl bg-[#141416] text-[#d4af37] hover:bg-[#2a2a2e] disabled:opacity-50 text-xs font-display uppercase tracking-wider font-bold cursor-pointer shrink-0 inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    {testingEmail ? (
                      <span className="w-3.5 h-3.5 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">send</span>
                    )}
                    <span>{testingEmail ? "Sending..." : "Send Test"}</span>
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-serif leading-relaxed space-y-1.5 animate-in fade-in duration-200 ${
                      testResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-display font-bold">
                      <span className="material-symbols-outlined text-[16px]">
                        {testResult.success ? "check_circle" : "error"}
                      </span>
                      <span>{testResult.success ? "Provider Accepted Dispatch" : "Delivery Error"}</span>
                    </div>
                    <p>{testResult.message}</p>
                    {testResult.resendId && (
                      <p className="font-mono text-[10px] opacity-80">
                        Resend Message ID: {testResult.resendId}
                      </p>
                    )}
                    {testResult.fromHeader && (
                      <p className="font-mono text-[10px] opacity-80">
                        Header Dispatched: {testResult.fromHeader}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Panel B: Supabase Auth Email Delivery (Custom SMTP & Redirects) */}
            <div className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#d4af37]">security</span>
                  <h3 className="font-display text-sm font-bold text-[var(--text-main)]">
                    Supabase Auth Custom SMTP
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-[10px] font-display font-bold uppercase tracking-wider">
                  Dashboard Config
                </span>
              </div>

              <p className="font-serif text-xs text-[var(--text-muted)] leading-relaxed">
                Supabase Authentication dispatches student signup confirmation, password resets, and admin invitations via its internal auth daemon. To align Auth emails with your public sender identity, enter these parameters in <strong>Supabase Dashboard &gt; Authentication &gt; SMTP Settings</strong>:
              </p>

              {/* Safe Connection Settings */}
              <div className="p-3.5 rounded-xl bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-xs font-mono space-y-1.5 text-[var(--text-main)]">
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Sender Name:</span> <strong>{senderName || "SpeakUp LMS"}</strong></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Sender Email:</span> <strong>{senderEmail || "onboarding@resend.dev"}</strong> <span className="text-[10px] font-sans text-emerald-600 dark:text-emerald-400 ml-1">(Provider Authorized)</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Host:</span> <span>smtp.resend.com</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Port:</span> <span>465 (SSL) / 587 (TLS)</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">User:</span> <span>resend</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Password:</span> <span className="text-[#8a6d1b] dark:text-[#d4af37]">[Server RESEND_API_KEY]</span></div>
              </div>

              {/* Redirect Configuration Status */}
              <div className="space-y-2 pt-2 border-t border-[var(--surface-border)]">
                <h4 className="font-display text-xs uppercase tracking-wider font-bold text-[var(--text-main)]">
                  Authentication Redirect Routes
                </h4>
                <div className="space-y-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--surface-low)]/40 border border-[var(--surface-border)]">
                    <span>Password Reset:</span>
                    <span className="text-[var(--text-main)] font-semibold">/auth/reset-password</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--surface-low)]/40 border border-[var(--surface-border)]">
                    <span>Email Confirmation:</span>
                    <span className="text-[var(--text-main)] font-semibold">/auth/callback</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-[var(--surface-low)]/40 border border-[var(--surface-border)]">
                    <span>Student Invite:</span>
                    <span className="text-[var(--text-main)] font-semibold">/auth/reset-password</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenTemplatesModal}
                className="w-full py-2.5 px-3 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#8a6d1b] dark:text-[#f3e5ab] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">mark_email_read</span>
                <span>View &amp; Copy Branded Auth Templates</span>
              </button>
            </div>
          </div>

          {/* Panel C: Domain Verification & Required DNS Configuration */}
          <div className="bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--surface-border)] pb-4">
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text-main)]">
                  Domain Verification &amp; Required DNS Configuration
                </h3>
                <p className="font-serif text-xs text-[var(--text-muted)] mt-0.5">
                  DNS records required at your domain registrar for authoritative inbox delivery under <strong>{targetDomain || "your domain"}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-[var(--text-main)]">
                  Target: {targetDomain || "resend.dev"}
                </span>
                <span
                  className={`text-[10px] font-display uppercase tracking-wider font-bold px-2 py-1 rounded-lg ${
                    isVerified
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25"
                  }`}
                >
                  {isVerified ? "Verified Sending Identity" : "DNS Setup Required"}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--surface-border)] text-[var(--text-muted)] font-display uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-4">Record Type</th>
                    <th className="py-2.5 pr-4">Host / Name</th>
                    <th className="py-2.5 pr-4">Value / Destination</th>
                    <th className="py-2.5">Verification Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border)]">
                  {deliveryStatus?.dnsRecords?.map((rec, i) => (
                    <tr key={i} className="hover:bg-[#f9f5ed]/40 dark:hover:bg-[var(--surface-low)]/30">
                      <td className="py-3 pr-4 font-bold text-[#8a6d1b] dark:text-[#d4af37]">{rec.type}</td>
                      <td className="py-3 pr-4 text-[var(--text-main)]">{rec.host}</td>
                      <td className="py-3 pr-4 text-[var(--text-muted)] break-all max-w-xs">{rec.value}</td>
                      <td className="py-3 font-serif text-[11px] text-[var(--text-muted)]">{rec.description}</td>
                    </tr>
                  )) || (
                    <>
                      <tr>
                        <td className="py-3 pr-4 font-bold text-[#8a6d1b] dark:text-[#d4af37]">TXT (SPF)</td>
                        <td className="py-3 pr-4 text-[var(--text-main)]">@</td>
                        <td className="py-3 pr-4 text-[var(--text-muted)]">v=spf1 include:amazonses.com ~all</td>
                        <td className="py-3 font-serif text-[11px] text-[var(--text-muted)]">Authorizes outbound email dispatch on your apex domain</td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-4 font-bold text-[#8a6d1b] dark:text-[#d4af37]">CNAME (DKIM)</td>
                        <td className="py-3 pr-4 text-[var(--text-main)]">resend._domainkey</td>
                        <td className="py-3 pr-4 text-[var(--text-muted)]">feedback-smtp.us-east-1.amazonses.com</td>
                        <td className="py-3 font-serif text-[11px] text-[var(--text-muted)]">Cryptographically signs emails to prove authenticity</td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-4 font-bold text-[#8a6d1b] dark:text-[#d4af37]">TXT (DMARC)</td>
                        <td className="py-3 pr-4 text-[var(--text-main)]">_dmarc</td>
                        <td className="py-3 pr-4 text-[var(--text-muted)]">v=DMARC1; p=none;</td>
                        <td className="py-3 font-serif text-[11px] text-[var(--text-muted)]">Protects against phishing and aligns SPF/DKIM reporting</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl bg-[#f9f5ed]/80 dark:bg-[var(--surface-low)]/40 border border-[var(--surface-border)] text-xs font-serif text-[var(--text-muted)] flex items-start gap-3">
              <span className="material-symbols-outlined text-[18px] text-[#d4af37] shrink-0 mt-0.5">help</span>
              <p className="leading-relaxed">
                Add these records in your DNS management panel (Cloudflare, GoDaddy, Namecheap, Route 53). Propagation typically completes in 5 to 60 minutes. Once verified, all outbound student emails dispatch directly under your apex domain without spam filter friction.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Supabase Auth Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#141416] border border-[var(--surface-border)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#d4af37]">palette</span>
                <div>
                  <h3 className="font-display text-sm font-bold text-[var(--text-main)]">
                    Branded Supabase Auth Email Templates
                  </h3>
                  <p className="font-serif text-xs text-[var(--text-muted)]">
                    Copy and paste these templates into Supabase Dashboard &gt; Authentication &gt; Email Templates
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[var(--text-muted)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Template Selector Tabs */}
            <div className="flex gap-2 border-b border-[var(--surface-border)] pb-2">
              <button
                type="button"
                onClick={() => setActiveTemplateTab("confirmation")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTemplateTab === "confirmation"
                    ? "bg-[#d4af37] text-black font-semibold"
                    : "bg-neutral-100 dark:bg-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                1. Signup Confirmation
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplateTab("recovery")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTemplateTab === "recovery"
                    ? "bg-[#d4af37] text-black font-semibold"
                    : "bg-neutral-100 dark:bg-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                2. Reset Password
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplateTab("invite")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTemplateTab === "invite"
                    ? "bg-[#d4af37] text-black font-semibold"
                    : "bg-neutral-100 dark:bg-neutral-800 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                3. Student Invite
              </button>
            </div>

            {templatesLoading ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[#d4af37]">progress_activity</span>
                Loading templates...
              </div>
            ) : templatesData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[var(--text-muted)]">Subject: </span>
                    <strong className="text-[var(--text-main)]">
                      {templatesData[activeTemplateTab]?.subject}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyTemplateHtml(
                        templatesData[activeTemplateTab]?.html || "",
                        activeTemplateTab
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      copiedTemplateTab === activeTemplateTab
                        ? "bg-emerald-600 text-white"
                        : "bg-[#d4af37] text-black hover:bg-[#c29d2b]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copiedTemplateTab === activeTemplateTab ? "check" : "content_copy"}
                    </span>
                    {copiedTemplateTab === activeTemplateTab ? "Copied HTML!" : "Copy HTML"}
                  </button>
                </div>

                <div className="relative">
                  <pre className="p-3 bg-[#111] text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60 border border-[var(--surface-border)]">
                    {templatesData[activeTemplateTab]?.html}
                  </pre>
                </div>

                <p className="text-[11px] font-serif text-[var(--text-muted)]">
                  Contains genuine Supabase tokens (<code className="text-[#d4af37]">{"{{ .ConfirmationURL }}"}</code>), SpeakUp Gold branding, and responsive email styling.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
