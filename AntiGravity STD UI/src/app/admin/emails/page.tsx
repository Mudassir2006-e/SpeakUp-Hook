"use client";

import React, { useEffect, useState, useMemo, useTransition } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  getEmailCenterDataAction,
  createEmailTemplateAction,
  updateEmailTemplateAction,
  deleteEmailTemplateAction,
  sendAdminEmailBatchAction,
  cancelQueuedEmailAction,
  processQueuedEmailsAction,
  EmailTemplateItem,
  EmailLogItem,
  StudentRecipientItem,
  EmailMetrics,
  SenderIdentity,
} from "@/app/admin/email-actions";
import VisualEmailEditor from "@/components/admin/VisualEmailEditor";
import InitialsAvatar from "@/components/InitialsAvatar";

type TabType = "overview" | "compose" | "templates" | "logs";

export default function AdminEmailCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Core Data
  const [metrics, setMetrics] = useState<EmailMetrics>({
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalPending: 0,
    isDeliveredReliable: false,
  });
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<EmailLogItem[]>([]);
  const [students, setStudents] = useState<StudentRecipientItem[]>([]);
  const [courses, setCourses] = useState<Array<{ id: string; title: string; slug: string }>>([]);
  const [senderIdentity, setSenderIdentity] = useState<SenderIdentity>({
    adminLoginEmail: "admin@speakup.edu",
    fromName: "SpeakUp",
    fromEmail: "onboarding@resend.dev",
    provider: "Resend",
    isCustomDomainConfigured: false,
  });
  const [dbPermissionsGranted, setDbPermissionsGranted] = useState(true);

  // Notification Toast
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  // ---------------------------------------------------------
  // Fetch initial data
  // ---------------------------------------------------------
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getEmailCenterDataAction();
      if (res.success && res.data) {
        setMetrics(res.data.metrics);
        setTemplates(res.data.templates);
        setRecentLogs(res.data.recentLogs);
        setStudents(res.data.students);
        setCourses(res.data.courses);
        if (res.data.senderIdentity) {
          setSenderIdentity(res.data.senderIdentity);
        }
        setDbPermissionsGranted(res.data.dbPermissionsGranted);
      } else {
        showToast("error", res.error || "Failed to load Email Center data.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Unexpected network error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ---------------------------------------------------------
  // COMPOSE TAB STATE
  // ---------------------------------------------------------
  type RecipientMode = "specific" | "course" | "all";
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("specific");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState<string>("");

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [composerSubject, setComposerSubject] = useState<string>("");
  const [composerBody, setComposerBody] = useState<string>("");
  const [composerView, setComposerView] = useState<"edit" | "preview">("edit");
  const [showSendConfirmModal, setShowSendConfirmModal] = useState<boolean>(false);
  const [sendResultSummary, setSendResultSummary] = useState<{
    sent: number;
    failed: number;
    queued?: number;
    isScheduled?: boolean;
    scheduledFor?: string;
    details: Array<{ email: string; success: boolean; error?: string }>;
  } | null>(null);

  // Batching, Scheduling & Campaign States
  const [batchSize, setBatchSize] = useState<5 | 10>(10);
  const [schedule, setSchedule] = useState<"now" | "morning" | "evening">("now");
  const [campaignName, setCampaignName] = useState<string>("");
  const [previewRecipientIndex, setPreviewRecipientIndex] = useState<number>(0);

  interface ComposerAttachment {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    base64?: string;
  }
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAttachFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", `File "${file.name}" exceeds the 5MB attachment size limit.`);
      return;
    }
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    const isDoc =
      file.name.toLowerCase().endsWith(".doc") ||
      file.name.toLowerCase().endsWith(".docx") ||
      file.name.toLowerCase().endsWith(".txt");

    if (!isPdf && !isImage && !isDoc) {
      showToast("error", "Only PDF, image, and document formats are supported as attachments.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      setAttachments((prev) => [
        ...prev,
        {
          id: `${file.name}-${Date.now()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || (isPdf ? "application/pdf" : "application/octet-stream"),
          base64,
        },
      ]);
      showToast("success", `Attachment "${file.name}" (${formatFileSize(file.size)}) added.`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    showToast("info", "Attachment removed.");
  };

  // Compute resolved target recipients based on mode
  const targetRecipients = useMemo(() => {
    if (recipientMode === "all") {
      return students.map((s) => ({
        email: s.email,
        full_name: s.full_name,
        course_name: s.courses.length > 0 ? s.courses[0].title : undefined,
      }));
    } else if (recipientMode === "course") {
      if (!selectedCourseId) return [];
      const courseObj = courses.find((c) => c.id === selectedCourseId);
      const enrolled = students.filter((s) => s.courses.some((c) => c.id === selectedCourseId));
      return enrolled.map((s) => ({
        email: s.email,
        full_name: s.full_name,
        course_name: courseObj?.title || undefined,
      }));
    } else {
      // specific
      const selectedSet = new Set(selectedStudentIds);
      return students
        .filter((s) => selectedSet.has(s.id))
        .map((s) => ({
          email: s.email,
          full_name: s.full_name,
          course_name: s.courses.length > 0 ? s.courses[0].title : undefined,
        }));
    }
  }, [recipientMode, students, selectedStudentIds, selectedCourseId, courses]);

  // Handle template selection in composer
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const t = templates.find((item) => item.id === templateId);
    if (t) {
      setComposerSubject(t.subject);
      setComposerBody(t.body);
    }
  };

  // Helper to insert placeholder tag into subject or body
  const insertPlaceholder = (tag: string, target: "subject" | "body") => {
    if (target === "subject") {
      setComposerSubject((prev) => prev + " " + tag);
    } else {
      setComposerBody((prev) => prev + " " + tag);
    }
  };

  // Compute live preview with selected recipient from targetRecipients
  const previewData = useMemo(() => {
    const validIndex =
      targetRecipients.length > 0
        ? Math.min(Math.max(0, previewRecipientIndex), targetRecipients.length - 1)
        : 0;

    const sample = targetRecipients[validIndex] || {
      email: "ahmed.khan@speakup.edu",
      full_name: "Muhammad Ahmed Khan",
      course_name: courses[0]?.title || "English Fluency Masterclass",
    };

    const fullName = sample.full_name?.trim() || "Muhammad Ahmed Khan";
    const nameParts = fullName ? fullName.split(/\s+/) : [];
    const firstName = nameParts.length > 0 ? nameParts[0] : "Muhammad";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Ahmed Khan";
    const courseName = sample.course_name || "SpeakUp Course";

    let resolvedSub = composerSubject
      .split("{{full_name}}").join(fullName)
      .split("{{name}}").join(fullName)
      .split("{{first_name}}").join(firstName)
      .split("{{last_name}}").join(lastName)
      .split("{{email}}").join(sample.email)
      .split("{{course_name}}").join(courseName);

    let resolvedHtml = composerBody
      .split("{{full_name}}").join(fullName)
      .split("{{name}}").join(fullName)
      .split("{{first_name}}").join(firstName)
      .split("{{last_name}}").join(lastName)
      .split("{{email}}").join(sample.email)
      .split("{{course_name}}").join(courseName);

    // Identify unresolved placeholders
    const subjectMatches = resolvedSub.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g) || [];
    const bodyMatches = resolvedHtml.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g) || [];
    const unresolved = Array.from(new Set([...subjectMatches, ...bodyMatches]));

    return {
      sample,
      validIndex,
      totalRecipients: targetRecipients.length,
      resolvedSub,
      resolvedHtml,
      unresolved,
    };
  }, [targetRecipients, previewRecipientIndex, composerSubject, composerBody, courses]);

  // Handle actual sending or scheduling
  const handleExecuteSend = () => {
    if (targetRecipients.length === 0) {
      showToast("error", "No recipients selected.");
      return;
    }
    if (!composerSubject.trim()) {
      showToast("error", "Email subject is required.");
      return;
    }
    if (!composerBody.trim()) {
      showToast("error", "Email body is required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await sendAdminEmailBatchAction({
          recipients: targetRecipients,
          subject: composerSubject,
          body: composerBody,
          templateId: selectedTemplateId || null,
          batchSize,
          schedule,
          campaignName: campaignName.trim() || undefined,
          attachments: attachments.map((a) => ({
            filename: a.name,
            content: a.base64 || "",
            size: a.size,
            contentType: a.type,
          })),
        });

        if (res.success && res.data) {
          setSendResultSummary({
            sent: res.data.sentCount,
            failed: res.data.failedCount,
            queued: res.data.queuedCount,
            isScheduled: res.data.isScheduled,
            scheduledFor: res.data.scheduledFor,
            details: res.data.details,
          });
          setShowSendConfirmModal(false);
          if (res.data.isScheduled) {
            showToast(
              "success",
              `Campaign scheduled! ${res.data.queuedCount || targetRecipients.length} messages queued for ${
                res.data.scheduledFor
                  ? new Date(res.data.scheduledFor).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "scheduled time"
              }.`
            );
          } else {
            showToast(
              "success",
              `Processed in batches of ${batchSize}: ${res.data.sentCount} sent, ${res.data.failedCount} failed.`
            );
          }
          // Refresh logs & metrics
          loadData();
        } else {
          showToast("error", res.error || "Failed to dispatch emails.");
        }
      } catch (err: any) {
        showToast("error", err?.message || "Unexpected send exception.");
      }
    });
  };

  // ---------------------------------------------------------
  // TEMPLATES TAB STATE
  // ---------------------------------------------------------
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateModalMode, setTemplateModalMode] = useState<"create" | "edit" | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplateItem | null>(null);
  const [templateFormName, setTemplateFormName] = useState("");
  const [templateFormSubject, setTemplateFormSubject] = useState("");
  const [templateFormBody, setTemplateFormBody] = useState("");
  const [showDeleteTemplateModal, setShowDeleteTemplateModal] = useState<EmailTemplateItem | null>(null);
  const [showPreviewTemplateModal, setShowPreviewTemplateModal] = useState<EmailTemplateItem | null>(null);

  const openCreateTemplateModal = () => {
    setActiveTemplate(null);
    setTemplateFormName("");
    setTemplateFormSubject("");
    setTemplateFormBody(
      '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">\n  <h2>Hello {{first_name}},</h2>\n  <p>Write your message here.</p>\n</div>'
    );
    setTemplateModalMode("create");
  };

  const openEditTemplateModal = (t: EmailTemplateItem) => {
    setActiveTemplate(t);
    setTemplateFormName(t.name);
    setTemplateFormSubject(t.subject);
    setTemplateFormBody(t.body);
    setTemplateModalMode("edit");
  };

  const handleSaveTemplate = () => {
    if (!templateFormName.trim() || !templateFormSubject.trim() || !templateFormBody.trim()) {
      showToast("error", "Name, subject, and body are required.");
      return;
    }

    startTransition(async () => {
      try {
        if (templateModalMode === "create") {
          const res = await createEmailTemplateAction({
            name: templateFormName,
            subject: templateFormSubject,
            body: templateFormBody,
          });
          if (res.success && res.data) {
            setTemplates((prev) => [res.data!, ...prev]);
            setTemplateModalMode(null);
            showToast("success", "Template created successfully.");
          } else {
            showToast("error", res.error || "Failed to create template.");
          }
        } else if (templateModalMode === "edit" && activeTemplate) {
          const res = await updateEmailTemplateAction(activeTemplate.id, {
            name: templateFormName,
            subject: templateFormSubject,
            body: templateFormBody,
          });
          if (res.success && res.data) {
            setTemplates((prev) => prev.map((t) => (t.id === activeTemplate.id ? res.data! : t)));
            setTemplateModalMode(null);
            showToast("success", "Template updated successfully.");
          } else {
            showToast("error", res.error || "Failed to update template.");
          }
        }
      } catch (err: any) {
        showToast("error", err?.message || "Failed to save template.");
      }
    });
  };

  const handleDeleteTemplate = (id: string) => {
    startTransition(async () => {
      try {
        const res = await deleteEmailTemplateAction(id);
        if (res.success) {
          setTemplates((prev) => prev.filter((t) => t.id !== id));
          setShowDeleteTemplateModal(null);
          showToast("success", "Template removed.");
        } else {
          showToast("error", res.error || "Failed to delete template.");
        }
      } catch (err: any) {
        showToast("error", err?.message || "Failed to delete template.");
      }
    });
  };

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase().trim();
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  // ---------------------------------------------------------
  // LOGS TAB STATE
  // ---------------------------------------------------------
  const [logsStatusFilter, setLogsStatusFilter] = useState<string>("all");
  const [logsSearch, setLogsSearch] = useState<string>("");
  const [inspectLogModal, setInspectLogModal] = useState<EmailLogItem | null>(null);

  const filteredLogs = useMemo(() => {
    return recentLogs.filter((log) => {
      if (logsStatusFilter !== "all" && log.status?.toLowerCase() !== logsStatusFilter.toLowerCase()) {
        return false;
      }
      if (logsSearch.trim()) {
        const q = logsSearch.toLowerCase().trim();
        const matchesEmail = log.recipient_email?.toLowerCase().includes(q);
        const matchesSubject = log.subject?.toLowerCase().includes(q);
        const matchesId = log.resend_id?.toLowerCase().includes(q);
        if (!matchesEmail && !matchesSubject && !matchesId) return false;
      }
      return true;
    });
  }, [recentLogs, logsStatusFilter, logsSearch]);

  const handleCancelQueuedEmail = (logId: string) => {
    startTransition(async () => {
      try {
        const res = await cancelQueuedEmailAction(logId);
        if (res.success) {
          showToast("info", "Scheduled delivery has been cancelled.");
          loadData();
        } else {
          showToast("error", res.error || "Failed to cancel scheduled email.");
        }
      } catch (err: any) {
        showToast("error", err?.message || "Failed to cancel scheduled email.");
      }
    });
  };

  const [processingQueue, setProcessingQueue] = useState(false);

  const handleProcessDueQueue = async () => {
    setProcessingQueue(true);
    try {
      const res = await processQueuedEmailsAction(25);
      if (res.success && res.data) {
        if (res.data.processedCount === 0) {
          showToast("info", "No queued messages are due for delivery at this moment.");
        } else {
          showToast(
            "success",
            `Durable queue executed: ${res.data.sentCount} sent, ${res.data.failedCount} failed.`
          );
        }
        loadData();
      } else {
        showToast("error", res.error || "Failed to execute queued emails.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Unexpected exception during queue execution.");
    } finally {
      setProcessingQueue(false);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <AdminHeader
        title="Email Center"
        subtitle="SpeakUp Academic Administration & Access Control"
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Prominent Page Heading matching Admin Overview & Student Overview */}
        <section className="rounded-2xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#d4af37]"></span>
              <span className="font-display text-[11px] uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                Resend Verified Delivery System
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-main)] tracking-tight">
              Email Center
            </h1>
            <p className="font-serif text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
              Compose visual student announcements, attach official PDF certificates, manage communication templates, and monitor delivery history.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("compose")}
              className="px-4 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c29d2b] text-black font-display text-xs uppercase tracking-wider font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              <span>Compose Email</span>
            </button>
          </div>
        </section>
        {/* Toast Feedback */}
        {toast && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between shadow-md transition-all ${
              toast.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : toast.type === "error"
                ? "bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300"
                : "bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="material-symbols-outlined text-[18px]">
                {toast.type === "success" ? "check_circle" : toast.type === "error" ? "error" : "info"}
              </span>
              <span>{toast.text}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-xs uppercase font-bold tracking-wider opacity-70 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Database Permission Notice (if tables need grant) */}
        {!dbPermissionsGranted && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[var(--text-main)] space-y-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl shrink-0 mt-0.5">
                database
              </span>
              <div className="space-y-1 flex-1">
                <h2 className="text-sm font-bold font-display uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Supabase Database Permissions Notice
                </h2>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  The tables <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono">email_templates</code> and{" "}
                  <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono">email_logs</code> exist in your Supabase database, but PostgreSQL permissions for <code className="font-mono">service_role</code> and <code className="font-mono">authenticated</code> need to be granted.
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;\nGRANT ALL ON TABLE public.email_templates TO anon, authenticated, service_role;\nGRANT ALL ON TABLE public.email_logs TO anon, authenticated, service_role;`
                      );
                      showToast("success", "Grant SQL copied to clipboard! Run in Supabase SQL editor.");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-display text-xs uppercase tracking-wider font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copy Grant SQL</span>
                  </button>
                  <button
                    onClick={loadData}
                    className="px-3 py-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[var(--surface-low)] text-xs font-display uppercase tracking-wider font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    <span>Check Again</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#141416] rounded-2xl border border-[var(--surface-border)] shadow-xs overflow-x-auto">
          {[
            { id: "overview", label: "Overview & Analytics", icon: "analytics" },
            { id: "compose", label: "Compose & Send", icon: "send" },
            { id: "templates", label: "Email Templates", icon: "drafts" },
            { id: "logs", label: "History & Logs", icon: "history" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#d4af37] text-black font-bold shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)]"
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${isActive ? "text-black" : "text-[var(--text-muted)]"}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Sent */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Accepted by Resend
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">outgoing_mail</span>
                  </div>
                </div>
                <div className="text-3xl font-display font-bold text-[var(--text-main)]">
                  {metrics.totalSent}
                </div>
                <p className="text-[11px] font-serif text-[var(--text-muted)]">
                  Dispatched and acknowledged via Resend API
                </p>
              </div>

              {/* Confirmed Delivered */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Confirmed Delivered
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
                  </div>
                </div>
                <div className="text-3xl font-display font-bold text-[var(--text-main)]">
                  {metrics.isDeliveredReliable ? metrics.totalDelivered : "—"}
                </div>
                <p className="text-[11px] font-serif text-[var(--text-muted)]">
                  {metrics.isDeliveredReliable
                    ? "Verified inbox delivery receipts"
                    : "Webhook delivery telemetry not configured"}
                </p>
              </div>

              {/* Failed Sends */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Failed Attempts
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                  </div>
                </div>
                <div className="text-3xl font-display font-bold text-[var(--text-main)]">
                  {metrics.totalFailed}
                </div>
                <p className="text-[11px] font-serif text-[var(--text-muted)]">
                  Rejected by provider or invalid addresses
                </p>
              </div>

              {/* Active Templates */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Email Templates
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">drafts</span>
                  </div>
                </div>
                <div className="text-3xl font-display font-bold text-[var(--text-main)]">
                  {templates.length}
                </div>
                <p className="text-[11px] font-serif text-[var(--text-muted)]">
                  Pre-configured transactional templates
                </p>
              </div>
            </div>

            {/* Quick Actions & Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-4">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-main)]">
                  Email Actions
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab("compose")}
                    className="w-full p-3.5 rounded-xl bg-[#d4af37] hover:bg-[#c29d2b] text-black font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>Compose New Email</span>
                    </span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("templates");
                      openCreateTemplateModal();
                    }}
                    className="w-full p-3.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[var(--surface-low)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">post_add</span>
                      <span>Create New Template</span>
                    </span>
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("logs")}
                    className="w-full p-3.5 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] bg-white dark:bg-[var(--surface-low)] text-[var(--text-main)] font-display text-xs uppercase tracking-wider font-semibold transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">manage_search</span>
                      <span>View Delivery Logs</span>
                    </span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-display uppercase tracking-wider font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Provider Notice</span>
                  </div>
                  <p className="text-[var(--text-muted)] font-serif leading-relaxed">
                    Outbound communications route through verified Resend endpoints with strict server-side authentication and recipient privacy preservation.
                  </p>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-main)]">
                    Recent Email Operations
                  </h2>
                  <button
                    onClick={() => setActiveTab("logs")}
                    className="text-xs font-display uppercase tracking-wider text-[#d4af37] hover:underline font-bold"
                  >
                    View All
                  </button>
                </div>

                {recentLogs.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <span className="material-symbols-outlined text-4xl text-[var(--text-muted)]">
                      inbox
                    </span>
                    <p className="font-display text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                      No email log records found
                    </p>
                    <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                      Sent transactional emails and administrative broadcasts will appear here in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--surface-border)] overflow-hidden">
                    {recentLogs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="py-3 flex items-center justify-between gap-4 hover:bg-[#f9f5ed]/50 dark:hover:bg-[var(--surface-low)]/50 px-2 rounded-lg transition-colors"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-serif font-bold text-[var(--text-main)] truncate">
                            {log.recipient_email}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {log.subject}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider font-bold ${
                              log.status === "sent"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : log.status === "failed"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : log.status === "delivered"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {log.status}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono hidden sm:inline">
                            {new Date(log.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <button
                            onClick={() => setInspectLogModal(log)}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[#d4af37] cursor-pointer"
                            title="Inspect Details"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: COMPOSE & SEND */}
        {/* ========================================================================= */}
        {activeTab === "compose" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Configuration */}
            <div className="lg:col-span-2 space-y-6">
              {/* Audience Selection Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-4">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center justify-between">
                  <span>1. Select Recipients</span>
                  <span className="text-xs text-[#d4af37] font-semibold">
                    {targetRecipients.length} Recipient{targetRecipients.length === 1 ? "" : "s"} Selected
                  </span>
                </h2>

                {/* Mode Selector Buttons */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-[#f9f5ed] dark:bg-[var(--surface-low)] rounded-xl border border-[var(--surface-border)]">
                  {[
                    { id: "specific", label: "Select Students", icon: "person_search" },
                    { id: "course", label: "By Course", icon: "menu_book" },
                    { id: "all", label: "All Active", icon: "groups" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setRecipientMode(mode.id as RecipientMode)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-display uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                        recipientMode === mode.id
                          ? "bg-white dark:bg-[#141416] text-[#141416] dark:text-[#f7f0e8] font-bold shadow-2xs border border-[var(--surface-border)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{mode.icon}</span>
                      <span>{mode.label}</span>
                    </button>
                  ))}
                </div>

                {/* Mode 1: By Course */}
                {recipientMode === "course" && (
                  <div className="space-y-2">
                    <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                      Filter by Enrolled Course:
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[var(--surface-low)] text-[var(--text-main)] text-sm focus:border-[#d4af37] focus:outline-none"
                    >
                      <option value="">-- Choose an Approved Course --</option>
                      {courses.map((c) => {
                        const count = students.filter((s) =>
                          s.courses.some((sc) => sc.id === c.id)
                        ).length;
                        return (
                          <option key={c.id} value={c.id}>
                            {c.title} ({count} student{count === 1 ? "" : "s"})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Mode 2: Specific Individual Students */}
                {recipientMode === "specific" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[var(--text-muted)]">
                          search
                        </span>
                        <input
                          type="text"
                          placeholder="Search students by name or email..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedStudentIds.length === students.length) {
                            setSelectedStudentIds([]);
                          } else {
                            setSelectedStudentIds(students.map((s) => s.id));
                          }
                        }}
                        className="px-3 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer shrink-0"
                      >
                        {selectedStudentIds.length === students.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    {/* Student List Box */}
                    <div className="max-h-52 overflow-y-auto divide-y divide-[var(--surface-border)] border border-[var(--surface-border)] rounded-xl custom-scroll">
                      {students.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                          No registered student accounts found.
                        </div>
                      ) : (
                        students
                          .filter((s) => {
                            if (!studentSearch.trim()) return true;
                            const q = studentSearch.toLowerCase().trim();
                            return (
                              (s.full_name && s.full_name.toLowerCase().includes(q)) ||
                              s.email.toLowerCase().includes(q)
                            );
                          })
                          .map((s) => {
                            const isChecked = selectedStudentIds.includes(s.id);
                            return (
                              <label
                                key={s.id}
                                className={`flex items-center gap-3 p-2.5 text-xs hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)] cursor-pointer transition-colors ${
                                  isChecked ? "bg-[#d4af37]/10" : ""
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStudentIds((prev) => [...prev, s.id]);
                                    } else {
                                      setSelectedStudentIds((prev) =>
                                        prev.filter((id) => id !== s.id)
                                      );
                                    }
                                  }}
                                  className="w-4 h-4 rounded text-[#d4af37] focus:ring-[#d4af37] accent-[#d4af37]"
                                />
                                <InitialsAvatar
                                  name={s.full_name}
                                  avatarUrl={s.avatar_url}
                                  sizeClass="w-8 h-8"
                                  textSizeClass="text-[11px]"
                                />
                                <div className="min-w-0 flex-1">
                                  <span className="font-semibold text-[var(--text-main)] block truncate">
                                    {s.full_name || "Unnamed Student"}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] block truncate">
                                    {s.email}
                                  </span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-muted)]">
                                  {s.courses.length} course{s.courses.length === 1 ? "" : "s"}
                                </span>
                              </label>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}

                {/* Mode 3: All Active Students Notice */}
                {recipientMode === "all" && (
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-300 space-y-1">
                    <p className="font-bold font-display uppercase tracking-wider">
                      Broadcast to All Active Students
                    </p>
                    <p className="font-serif">
                      This will send an individual email to all {students.length} registered students in the LMS. An explicit confirmation step will be required before sending.
                    </p>
                  </div>
                )}
              </div>

              {/* Campaign Configuration & Batch Dispatch Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#d4af37]">tune</span>
                    <span>2. Campaign & Batching Schedule</span>
                  </h2>
                  <span className="text-[11px] font-display uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                    Configurable Dispatch Parameters
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campaign Name (Optional) */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold flex items-center justify-between">
                      <span>Campaign Name (Optional)</span>
                      <span className="text-[10px] text-[var(--text-muted)]">e.g. Fall 2026 Orientation / Midterm Notice</span>
                    </label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Enter optional campaign or batch identifier..."
                      className="w-full px-3.5 py-2 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  {/* Batch Size Selector (5 or 10) */}
                  <div className="space-y-2">
                    <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                      Recipients Per Batch:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBatchSize(10)}
                        className={`p-2.5 rounded-xl border text-xs font-display uppercase tracking-wider font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                          batchSize === 10
                            ? "bg-[#d4af37]/15 border-[#d4af37] text-[#8a6d1b] dark:text-[#d4af37] font-bold"
                            : "border-[var(--surface-border)] text-[var(--text-muted)] hover:border-[#d4af37]/50"
                        }`}
                      >
                        <span className="text-sm font-bold">10 Students</span>
                        <span className="text-[10px] lowercase text-[var(--text-muted)]">standard batching</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchSize(5)}
                        className={`p-2.5 rounded-xl border text-xs font-display uppercase tracking-wider font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                          batchSize === 5
                            ? "bg-[#d4af37]/15 border-[#d4af37] text-[#8a6d1b] dark:text-[#d4af37] font-bold"
                            : "border-[var(--surface-border)] text-[var(--text-muted)] hover:border-[#d4af37]/50"
                        }`}
                      >
                        <span className="text-sm font-bold">5 Students</span>
                        <span className="text-[10px] lowercase text-[var(--text-muted)]">conservative pacing</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] font-serif">
                      Automatic polite inter-batch delays prevent provider throttling.
                    </p>
                  </div>

                  {/* Schedule Selector (Now / Morning / Evening) */}
                  <div className="space-y-2">
                    <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                      Delivery Timing & Schedule:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSchedule("now")}
                        className={`p-2 rounded-xl border text-xs font-display uppercase tracking-wider font-semibold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                          schedule === "now"
                            ? "bg-[#d4af37] text-black font-bold shadow-2xs border-[#d4af37]"
                            : "border-[var(--surface-border)] text-[var(--text-muted)] hover:border-[#d4af37]/50"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">bolt</span>
                        <span className="text-[11px]">Send Now</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSchedule("morning")}
                        className={`p-2 rounded-xl border text-xs font-display uppercase tracking-wider font-semibold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                          schedule === "morning"
                            ? "bg-[#d4af37] text-black font-bold shadow-2xs border-[#d4af37]"
                            : "border-[var(--surface-border)] text-[var(--text-muted)] hover:border-[#d4af37]/50"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">wb_sunny</span>
                        <span className="text-[11px]">Morning 9AM</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSchedule("evening")}
                        className={`p-2 rounded-xl border text-xs font-display uppercase tracking-wider font-semibold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                          schedule === "evening"
                            ? "bg-[#d4af37] text-black font-bold shadow-2xs border-[#d4af37]"
                            : "border-[var(--surface-border)] text-[var(--text-muted)] hover:border-[#d4af37]/50"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">nights_stay</span>
                        <span className="text-[11px]">Evening 6PM</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] font-serif">
                      {schedule === "now"
                        ? "Dispatches immediately upon confirmation."
                        : `Queues individual messages for scheduled delivery with automatic recovery.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Editor Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-main)]">
                    3. Draft Email Message
                  </h2>
                  {/* Template Picker */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold hidden sm:inline">
                      Template:
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--surface-border)] bg-white dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                    >
                      <option value="">-- Choose Template (Optional) --</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject Line */}
                <div className="space-y-1.5">
                  <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold flex items-center justify-between">
                    <span>Subject Line *</span>
                    <span className="text-[11px] lowercase text-[var(--text-muted)]">
                      {"e.g. Welcome to {{course_name}}"}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={composerSubject}
                    onChange={(e) => setComposerSubject(e.target.value)}
                    placeholder="Enter email subject line..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[var(--surface-low)] text-sm text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none font-medium"
                  />
                  {/* Subject Placeholders Quick Insert */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                      Insert personalization tag:
                    </span>
                    {["{{full_name}}", "{{course_name}}", "{{email}}"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertPlaceholder(tag, "subject")}
                        className="px-2 py-0.5 rounded-md bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] hover:border-[#d4af37] text-[10px] font-mono text-[var(--text-main)] cursor-pointer transition-colors"
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Verified Sender Notice (Phase 8 Requirement 7: Separate Admin Login and Sender Email) */}
                <div className="p-4 rounded-xl bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#d4af37]">verified_user</span>
                      <span className="font-display uppercase tracking-wider text-[11px] font-bold text-[var(--text-main)]">
                        Configured Sender Identity & Authentication Separation
                      </span>
                    </div>
                    <span className="text-[10px] font-display uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Server-Side Isolated</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#141416] border border-[var(--surface-border)] space-y-0.5">
                      <span className="text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                        Admin Authentication Account (Private)
                      </span>
                      <p className="font-mono text-xs font-bold text-[var(--text-main)] truncate" title={senderIdentity.adminLoginEmail}>
                        {senderIdentity.adminLoginEmail}
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)] font-serif block">
                        Used strictly for Admin Panel login; never exposed to students
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#141416] border border-[var(--surface-border)] space-y-0.5">
                      <span className="text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                        Displayed Outbound Sender (Student-Facing)
                      </span>
                      <p className="font-mono text-xs font-bold text-[#8a6d1b] dark:text-[#d4af37] truncate" title={`${senderIdentity.fromName} <${senderIdentity.fromEmail}>`}>
                        {senderIdentity.fromName} &lt;{senderIdentity.fromEmail}&gt;
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)] font-serif block">
                        {senderIdentity.isCustomDomainConfigured
                          ? "Custom verified domain enabled"
                          : "Default provider delivery address (Resend)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Normal Visual Email Composer (Phase 7 Part 1 Requirement) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-display uppercase tracking-wider text-[var(--text-main)] font-bold block">
                        Message Content (Visual Composer) *
                      </label>
                      <p className="text-[11px] font-serif text-[var(--text-muted)]">
                        Compose your email naturally with formatted text, lists, and links. No HTML required.
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setComposerView("edit")}
                        className={`px-3 py-1 rounded-lg text-xs font-display uppercase tracking-wider font-semibold cursor-pointer ${
                          composerView === "edit"
                            ? "bg-[#d4af37] text-black font-bold shadow-2xs"
                            : "text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/10"
                        }`}
                      >
                        Composer
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerView("preview")}
                        className={`px-3 py-1 rounded-lg text-xs font-display uppercase tracking-wider font-semibold cursor-pointer ${
                          composerView === "preview"
                            ? "bg-[#d4af37] text-black font-bold shadow-2xs"
                            : "text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/10"
                        }`}
                      >
                        Preview with Scholar
                      </button>
                    </div>
                  </div>

                  {composerView === "edit" ? (
                    <div className="space-y-3">
                      <VisualEmailEditor
                        value={composerBody}
                        onChange={(html) => setComposerBody(html)}
                        onAttachFile={handleAttachFile}
                        placeholder="Write your email naturally here... Type your announcement, schedule update, or student notice."
                        onInsertPlaceholder={(tag) => {
                          // Tag inserted into visual editor
                        }}
                        minHeight="280px"
                      />

                      {/* Display attached files list with remove option */}
                      {attachments.length > 0 && (
                        <div className="p-4 rounded-xl border border-[var(--surface-border)] bg-[#f9f5ed]/60 dark:bg-[var(--surface-low)]/40 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-display uppercase tracking-wider font-bold text-[var(--text-main)] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-[#d4af37]">attachment</span>
                              <span>Attached Files ({attachments.length})</span>
                            </span>
                            <span className="text-[11px] font-mono text-[var(--text-muted)]">
                              Total: {formatFileSize(attachments.reduce((sum, a) => sum + a.size, 0))}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {attachments.map((att) => (
                              <div
                                key={att.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-[#141416] border border-[var(--surface-border)] text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="material-symbols-outlined text-[#d4af37] text-[18px]">
                                    {att.name.toLowerCase().endsWith(".pdf")
                                      ? "picture_as_pdf"
                                      : att.type.startsWith("image/")
                                      ? "image"
                                      : "description"}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-[var(--text-main)] truncate max-w-xs sm:max-w-md">
                                      {att.name}
                                    </p>
                                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                      {formatFileSize(att.size)} • Real Email Attachment
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachment(att.id)}
                                  className="p-1 rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                  title="Remove Attachment"
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full min-h-[300px] p-6 rounded-2xl border border-[var(--surface-border)] bg-white dark:bg-black/40 overflow-y-auto custom-scroll shadow-xs space-y-4">
                      <div className="p-3 bg-[#f9f5ed] dark:bg-[var(--surface-low)] rounded-xl border border-[var(--surface-border)] text-xs font-serif space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-display uppercase tracking-wider text-[10px] text-[var(--text-muted)]">
                            Recipient:
                          </span>
                          <span className="font-bold text-[var(--text-main)]">
                            {previewData.sample.full_name || "Muhammad Ahmed Khan"}
                          </span>
                          <span className="text-[var(--text-muted)]">
                            ({previewData.sample.email})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-display uppercase tracking-wider text-[10px] text-[var(--text-muted)]">
                            Subject:
                          </span>
                          <span className="font-semibold text-[var(--text-main)]">
                            {previewData.resolvedSub || "No subject set"}
                          </span>
                        </div>
                      </div>
                      <div
                        className="prose dark:prose-invert max-w-none text-sm leading-relaxed p-2"
                        dangerouslySetInnerHTML={{ __html: previewData.resolvedHtml || "<p className='italic text-muted'>Empty message body.</p>" }}
                      />
                    </div>
                  )}

                  {/* Unresolved Placeholders Warning */}
                  {previewData.unresolved.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">
                        warning
                      </span>
                      <span>
                        Unrecognized tags detected:{" "}
                        <strong className="font-mono">{previewData.unresolved.join(", ")}</strong>. These will not be substituted automatically.
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                <div className="pt-3 border-t border-[var(--surface-border)] flex items-center justify-between">
                  <div className="text-xs text-[var(--text-muted)] font-serif">
                    Anti-duplicate protection and private recipient delivery enabled.
                  </div>
                  <button
                    type="button"
                    disabled={isPending || targetRecipients.length === 0 || !composerSubject.trim() || !composerBody.trim()}
                    onClick={() => setShowSendConfirmModal(true)}
                    className="px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c29d2b] disabled:opacity-50 text-black font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    <span>Review & Send Email</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col: Live Recipient & Message Inspector */}
            <div className="space-y-6">
              {/* Preview Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#d4af37]">preview</span>
                    <span>Recipient Sample Preview</span>
                  </h3>
                  {previewData.totalRecipients > 1 && (
                    <div className="flex items-center gap-1 bg-[#f9f5ed] dark:bg-[var(--surface-low)] px-2 py-0.5 rounded-lg border border-[var(--surface-border)] text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewRecipientIndex((prev) => Math.max(0, prev - 1))}
                        disabled={previewData.validIndex === 0}
                        className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        title="Previous Recipient"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      </button>
                      <span className="font-mono text-[11px] font-bold text-[var(--text-main)] px-1">
                        {previewData.validIndex + 1} of {previewData.totalRecipients}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewRecipientIndex((prev) =>
                            Math.min(previewData.totalRecipients - 1, prev + 1)
                          )
                        }
                        disabled={previewData.validIndex >= previewData.totalRecipients - 1}
                        className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                        title="Next Recipient"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[var(--text-muted)] font-display uppercase tracking-wider text-[10px] font-semibold">
                    <span>
                      {previewData.totalRecipients > 1
                        ? `Live Recipient (${previewData.validIndex + 1}/${previewData.totalRecipients})`
                        : "Simulated Sample"}
                    </span>
                    <span className="text-[#d4af37]">Personalized</span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif">
                      <strong>To:</strong> {previewData.sample.full_name || "Student"} &lt;{previewData.sample.email}&gt;
                    </p>
                    <p className="font-serif">
                      <strong>Subject:</strong> {previewData.resolvedSub || "(Empty Subject)"}
                    </p>
                    {previewData.sample.course_name && (
                      <p className="font-serif text-[11px] text-[var(--text-muted)]">
                        <strong>Course:</strong> {previewData.sample.course_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="font-display uppercase tracking-wider text-[10px] text-[var(--text-muted)] font-semibold block">
                    Supported Placeholders:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-serif">
                    <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-[var(--surface-border)]">
                      <code className="text-[#8a6d1b] dark:text-[#d4af37] font-bold block font-mono">{"{{first_name}}"}</code>
                      <span className="text-[var(--text-muted)]">Recipient first name</span>
                    </div>
                    <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-[var(--surface-border)]">
                      <code className="text-[#8a6d1b] dark:text-[#d4af37] font-bold block font-mono">{"{{last_name}}"}</code>
                      <span className="text-[var(--text-muted)]">Recipient last name</span>
                    </div>
                    <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-[var(--surface-border)]">
                      <code className="text-[#8a6d1b] dark:text-[#d4af37] font-bold block font-mono">{"{{email}}"}</code>
                      <span className="text-[var(--text-muted)]">Recipient email</span>
                    </div>
                    <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-[var(--surface-border)]">
                      <code className="text-[#8a6d1b] dark:text-[#d4af37] font-bold block font-mono">{"{{course_name}}"}</code>
                      <span className="text-[var(--text-muted)]">Enrolled course title</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Security Checklist */}
                <div className="p-3.5 rounded-xl border border-[var(--surface-border)] space-y-2 text-xs">
                  <span className="font-display uppercase tracking-wider text-[10px] font-bold text-[var(--text-main)] block">
                    Security & Compliance
                  </span>
                  <ul className="space-y-1.5 text-[11px] text-[var(--text-muted)] font-serif">
                    <li className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                      <span>Individual sending: no address leakage</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                      <span>Server-side verification with admin RLS</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                      <span>Audit entry logged in database for each send</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Last Send Results Card (if any) */}
              {sendResultSummary && (
                <div className="p-5 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                      {sendResultSummary.isScheduled ? "Campaign Scheduled" : "Latest Send Summary"}
                    </h3>
                    <button
                      onClick={() => setSendResultSummary(null)}
                      className="text-[10px] text-[var(--text-muted)] hover:underline cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>

                  {sendResultSummary.isScheduled ? (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold">
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                        <span>{sendResultSummary.queued || 0} Emails Queued</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] font-serif">
                        Scheduled for:{" "}
                        <strong className="text-[var(--text-main)]">
                          {sendResultSummary.scheduledFor
                            ? new Date(sendResultSummary.scheduledFor).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Scheduled window"}
                        </strong>
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block font-display">
                          {sendResultSummary.sent}
                        </span>
                        <span className="text-[10px] uppercase font-display font-semibold text-emerald-700 dark:text-emerald-300">
                          Delivered
                        </span>
                      </div>
                      <div className="flex-1 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                        <span className="text-xl font-bold text-rose-600 dark:text-rose-400 block font-display">
                          {sendResultSummary.failed}
                        </span>
                        <span className="text-[10px] uppercase font-display font-semibold text-rose-700 dark:text-rose-300">
                          Failed
                        </span>
                      </div>
                    </div>
                  )}

                  {sendResultSummary.failed > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const failedEmails = new Set(
                          sendResultSummary.details
                            .filter((d) => !d.success)
                            .map((d) => d.email.toLowerCase())
                        );
                        const failedStudentIds = students
                          .filter((s) => failedEmails.has(s.email.toLowerCase()))
                          .map((s) => s.id);
                        setSelectedStudentIds(failedStudentIds);
                        setRecipientMode("specific");
                        showToast(
                          "info",
                          `Selected ${failedStudentIds.length} failed recipient(s) for safe retry.`
                        );
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-display text-[10px] uppercase tracking-wider font-bold border border-rose-500/20 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">replay</span>
                      <span>Retry Failed Recipients ({sendResultSummary.failed})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: EMAIL TEMPLATES */}
        {/* ========================================================================= */}
        {activeTab === "templates" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[var(--text-muted)]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search templates by title or subject..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={openCreateTemplateModal}
                className="px-4 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c29d2b] text-black font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Create Template</span>
              </button>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] space-y-3">
                <span className="material-symbols-outlined text-4xl text-[var(--text-muted)]">
                  drafts
                </span>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-[var(--text-main)]">
                  No Templates Found
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto font-serif">
                  Create reusable templates for onboarding announcements, course welcome messages, or enrollment approvals.
                </p>
                <button
                  type="button"
                  onClick={openCreateTemplateModal}
                  className="px-4 py-2 rounded-xl border border-[#d4af37] text-[#8a6d1b] dark:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold cursor-pointer"
                >
                  Create Your First Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#d4af37]/50 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-sm font-bold text-[var(--text-main)] tracking-tight">
                          {t.name}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#d4af37]/15 text-[#8a6d1b] dark:text-[#d4af37] font-display uppercase tracking-wider font-bold shrink-0">
                          Template
                        </span>
                      </div>
                      <p className="text-xs font-serif text-[var(--text-muted)] line-clamp-1">
                        <strong>Subject:</strong> {t.subject}
                      </p>
                      <div className="text-[11px] font-mono text-[var(--text-muted)] line-clamp-3 bg-black/5 dark:bg-white/5 p-2.5 rounded-lg border border-[var(--surface-border)]">
                        {t.body.replace(/<[^>]*>?/gm, " ").slice(0, 140)}...
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--surface-border)] flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowPreviewTemplateModal(t)}
                          className="p-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                          title="Preview Template"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectTemplate(t.id);
                            setActiveTab("compose");
                          }}
                          className="p-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[#d4af37] cursor-pointer"
                          title="Use in Composer"
                        >
                          <span className="material-symbols-outlined text-[16px]">send</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditTemplateModal(t)}
                          className="p-1.5 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                          title="Edit Template"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteTemplateModal(t)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title="Delete Template"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: HISTORY & LOGS */}
        {/* ========================================================================= */}
        {activeTab === "logs" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {["all", "sent", "failed", "delivered", "queued", "pending"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setLogsStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                      logsStatusFilter === status
                        ? "bg-[#d4af37] text-black font-bold shadow-2xs"
                        : "border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {recentLogs.some((l) => l.status === "queued") && (
                  <button
                    type="button"
                    onClick={handleProcessDueQueue}
                    disabled={processingQueue}
                    className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-xs font-display uppercase tracking-wider font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Execute any scheduled emails whose time has arrived"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${processingQueue ? "animate-spin" : ""}`}>
                      {processingQueue ? "progress_activity" : "schedule_send"}
                    </span>
                    <span>Process Due Queue</span>
                  </button>
                )}
                <div className="relative max-w-xs w-full">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[var(--text-muted)]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search recipient or subject..."
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                />
              </div>
            </div>
            </div>

            {/* Logs Table */}
            <div className="rounded-2xl bg-white dark:bg-[#141416] border border-[var(--surface-border)] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f9f5ed] dark:bg-[var(--surface-low)] border-b border-[var(--surface-border)] text-[var(--text-muted)] font-display uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">Recipient</th>
                      <th className="py-3.5 px-4 font-bold">Subject Line</th>
                      <th className="py-3.5 px-4 font-bold">Provider Status</th>
                      <th className="py-3.5 px-4 font-bold">Provider ID</th>
                      <th className="py-3.5 px-4 font-bold">Date & Time</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--surface-border)]">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-serif">
                          No matching email history records found.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-[#f9f5ed]/50 dark:hover:bg-[var(--surface-low)]/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-semibold text-[var(--text-main)]">
                            {log.recipient_email}
                          </td>
                          <td className="py-3 px-4 text-[var(--text-main)] max-w-xs truncate font-serif">
                            {log.subject}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider font-bold inline-flex items-center gap-1 ${
                                log.status === "sent"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : log.status === "failed"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                  : log.status === "delivered"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                  : log.status === "queued"
                                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                  : log.status === "cancelled"
                                  ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              <span>{log.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                            {log.resend_id ? (
                              <span className="truncate max-w-[120px] inline-block" title={log.resend_id}>
                                {log.resend_id.slice(0, 12)}...
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-4 text-[var(--text-muted)] font-mono text-[11px]">
                            {new Date(log.sent_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {log.status === "queued" && (
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleCancelQueuedEmail(log.id)}
                                  className="px-2 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-display text-[10px] uppercase tracking-wider font-semibold cursor-pointer transition-colors"
                                  title="Cancel Queued Message"
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setInspectLogModal(log)}
                                className="px-2.5 py-1 rounded-lg border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)] font-display text-[10px] uppercase tracking-wider font-semibold cursor-pointer inline-flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">info</span>
                                <span>Inspect</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SEND CONFIRMATION STEP */}
      {/* ========================================================================= */}
      {showSendConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#141416] border border-[var(--surface-border)] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#d4af37] text-2xl">verified_user</span>
                  <span>Confirm Outbound Delivery</span>
                </h3>
                <p className="text-xs font-serif text-[var(--text-muted)]">
                  Verify recipient count and message parameters before dispatching through Resend.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSendConfirmModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] space-y-2 text-xs">
              {campaignName.trim() && (
                <div className="flex justify-between py-1 border-b border-[var(--surface-border)]">
                  <span className="text-[var(--text-muted)] font-display uppercase tracking-wider font-semibold">
                    Campaign Name:
                  </span>
                  <span className="font-bold text-[#8a6d1b] dark:text-[#d4af37]">
                    {campaignName.trim()}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-[var(--surface-border)]">
                <span className="text-[var(--text-muted)] font-display uppercase tracking-wider font-semibold">
                  Recipients Count:
                </span>
                <span className="font-bold text-[var(--text-main)] font-mono">
                  {targetRecipients.length} student{targetRecipients.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--surface-border)]">
                <span className="text-[var(--text-muted)] font-display uppercase tracking-wider font-semibold">
                  Batch Dispatching:
                </span>
                <span className="font-bold text-[var(--text-main)] font-mono">
                  {batchSize} students per batch (polite pacing)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--surface-border)]">
                <span className="text-[var(--text-muted)] font-display uppercase tracking-wider font-semibold">
                  Delivery Timing:
                </span>
                <span className="font-bold text-blue-700 dark:text-blue-400">
                  {schedule === "now"
                    ? "Immediate Dispatch (Send Now)"
                    : schedule === "morning"
                    ? "Scheduled for Morning (9:00 AM)"
                    : "Scheduled for Evening (6:00 PM)"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--surface-border)]">
                <span className="text-[var(--text-muted)] font-display uppercase tracking-wider font-semibold">
                  Subject Line:
                </span>
                <span className="font-medium text-[var(--text-main)] truncate max-w-[240px]">
                  {composerSubject}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)] font-display uppercase tracking-wider font-semibold">
                  Delivery Mode:
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Private Individual Dispatches (no cross-visibility)
                </span>
              </div>
              {attachments.length > 0 && (
                <div className="flex justify-between py-1 border-t border-[var(--surface-border)]">
                  <span className="text-[var(--text-muted)] font-display uppercase tracking-wider font-semibold">
                    Attached Files:
                  </span>
                  <span className="font-semibold text-[#8a6d1b] dark:text-[#d4af37]">
                    {attachments.length} file{attachments.length === 1 ? "" : "s"} ({formatFileSize(attachments.reduce((sum, a) => sum + a.size, 0))})
                  </span>
                </div>
              )}
            </div>

            {targetRecipients.length > 5 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300">
                You are about to email <strong>{targetRecipients.length}</strong> students. Automatic polite delays between batches ({batchSize} per batch) prevent provider rate limits.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSendConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] hover:border-[#d4af37] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleExecuteSend}
                className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c29d2b] disabled:opacity-50 text-black font-display text-xs uppercase tracking-wider font-bold shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                    <span>{schedule === "now" ? "Dispatching..." : "Scheduling..."}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      {schedule === "now" ? "send" : "schedule"}
                    </span>
                    <span>{schedule === "now" ? "Confirm & Send Now" : "Confirm & Schedule Queue"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT TEMPLATE */}
      {/* ========================================================================= */}
      {templateModalMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#141416] border border-[var(--surface-border)] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-[var(--text-main)]">
                  {templateModalMode === "create" ? "Create New Email Template" : "Edit Email Template"}
                </h3>
                <p className="text-xs font-serif text-[var(--text-muted)]">
                  Define reusable placeholders like <code className="font-mono text-[#d4af37]">{"{{first_name}}"}</code> and <code className="font-mono text-[#d4af37]">{"{{course_name}}"}</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplateModalMode(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold block mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Course Welcome & Orientation"
                  value={templateFormName}
                  onChange={(e) => setTemplateFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold block mb-1">
                  Default Subject *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Welcome to {{course_name}}"
                  value={templateFormSubject}
                  onChange={(e) => setTemplateFormSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[var(--surface-low)] text-xs text-[var(--text-main)] focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold block mb-1">
                  Email Body Content (Visual Composer) *
                </label>
                <VisualEmailEditor
                  value={templateFormBody}
                  onChange={(html) => setTemplateFormBody(html)}
                  placeholder="Draft template message content visually here..."
                  minHeight="200px"
                />
              </div>

              {/* Supported Placeholders quick pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Personalization Tag:
                </span>
                {["{{full_name}}", "{{course_name}}", "{{email}}"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTemplateFormBody((prev) => prev + " " + tag)}
                    className="px-2 py-0.5 rounded-md bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] text-[10px] font-mono text-[var(--text-main)] cursor-pointer"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--surface-border)]">
              <button
                type="button"
                onClick={() => setTemplateModalMode(null)}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveTemplate}
                className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c29d2b] disabled:opacity-50 text-black font-display text-xs uppercase tracking-wider font-bold shadow-xs cursor-pointer"
              >
                {isPending ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PREVIEW TEMPLATE */}
      {/* ========================================================================= */}
      {showPreviewTemplateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#141416] border border-[var(--surface-border)] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-[var(--text-main)]">
                  Preview: {showPreviewTemplateModal.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-serif">
                  Rendered with sample student profile data
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewTemplateModal(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#f9f5ed] dark:bg-[var(--surface-low)] text-xs font-serif border border-[var(--surface-border)] space-y-1">
              <p>
                <strong>Subject:</strong>{" "}
                {showPreviewTemplateModal.subject
                  .replace(/\{\{full_name\}\}/g, "Muhammad Ahmed Khan")
                  .replace(/\{\{first_name\}\}/g, "Muhammad")
                  .replace(/\{\{course_name\}\}/g, "English Fluency Masterclass")}
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto p-4 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-black/40 text-xs custom-scroll">
              <div
                dangerouslySetInnerHTML={{
                  __html: showPreviewTemplateModal.body
                    .replace(/\{\{full_name\}\}/g, "Muhammad Ahmed Khan")
                    .replace(/\{\{first_name\}\}/g, "Muhammad")
                    .replace(/\{\{last_name\}\}/g, "Ahmed Khan")
                    .replace(/\{\{email\}\}/g, "ahmed.khan@speakup.edu")
                    .replace(/\{\{course_name\}\}/g, "English Fluency Masterclass"),
                }}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowPreviewTemplateModal(null)}
                className="px-4 py-2 rounded-xl bg-[#d4af37] text-black font-display text-xs uppercase tracking-wider font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE TEMPLATE CONFIRMATION */}
      {/* ========================================================================= */}
      {showDeleteTemplateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#141416] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="font-display text-base font-bold uppercase tracking-wider">
                Delete Template?
              </h3>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-serif leading-relaxed">
              Are you sure you want to delete template <strong>&quot;{showDeleteTemplateModal.name}&quot;</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteTemplateModal(null)}
                className="px-4 py-2 rounded-xl border border-[var(--surface-border)] text-xs font-display uppercase tracking-wider font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDeleteTemplate(showDeleteTemplateModal.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-display text-xs uppercase tracking-wider font-bold cursor-pointer"
              >
                {isPending ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: INSPECT EMAIL LOG DETAILS */}
      {/* ========================================================================= */}
      {inspectLogModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#141416] border border-[var(--surface-border)] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#d4af37] text-xl">receipt_long</span>
                  <span>Delivery Record Details</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  ID: {inspectLogModal.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectLogModal(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#f9f5ed] dark:bg-[var(--surface-low)] border border-[var(--surface-border)] divide-y divide-[var(--surface-border)] text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-[var(--text-muted)] font-display uppercase tracking-wider font-semibold">
                  Recipient Address:
                </span>
                <span className="font-semibold text-[var(--text-main)] font-mono">
                  {inspectLogModal.recipient_email}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-[var(--text-muted)] font-display uppercase tracking-wider font-semibold">
                  Subject:
                </span>
                <span className="font-serif text-[var(--text-main)] truncate max-w-[240px]">
                  {inspectLogModal.subject}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-[var(--text-muted)] font-display uppercase tracking-wider font-semibold">
                  Delivery Status:
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-display uppercase tracking-wider font-bold text-[10px] ${
                    inspectLogModal.status === "sent"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : inspectLogModal.status === "failed"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {inspectLogModal.status}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-[var(--text-muted)] font-display uppercase tracking-wider font-semibold">
                  Resend Delivery ID:
                </span>
                <span className="font-mono text-[11px] text-[var(--text-main)]">
                  {inspectLogModal.resend_id || "None recorded"}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-[var(--text-muted)] font-display uppercase tracking-wider font-semibold">
                  Dispatch Timestamp:
                </span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  {new Date(inspectLogModal.sent_at).toLocaleString()}
                </span>
              </div>
              {inspectLogModal.error_message && (
                <div className="py-2 space-y-1">
                  <span className="text-rose-600 font-display uppercase tracking-wider font-semibold block">
                    Provider Error Details:
                  </span>
                  <p className="font-mono text-[11px] text-rose-700 dark:text-rose-300 p-2 rounded bg-rose-500/10 border border-rose-500/20">
                    {inspectLogModal.error_message}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              {inspectLogModal.status === "queued" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    handleCancelQueuedEmail(inspectLogModal.id);
                    setInspectLogModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-display text-xs uppercase tracking-wider font-bold cursor-pointer transition-colors"
                >
                  Cancel Queued Delivery
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setInspectLogModal(null)}
                className="px-4 py-2 rounded-xl bg-[#d4af37] text-black font-display text-xs uppercase tracking-wider font-bold cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
