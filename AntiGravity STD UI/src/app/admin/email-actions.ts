"use server";

import { Resend } from "resend";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { getAuthoritativeSenderIdentity } from "@/lib/email";
import { renderEmailLayout } from "@/lib/email/templates";

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface EmailTemplateItem {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface EmailLogItem {
  id: string;
  recipient_email: string;
  subject: string;
  template_id: string | null;
  status: "sent" | "failed" | "pending" | "delivered" | string;
  resend_id: string | null;
  error_message: string | null;
  sent_at: string;
}

export interface StudentRecipientItem {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  phone: string | null;
  status: string;
  courses: Array<{ id: string; title: string; slug: string }>;
}

export interface SenderIdentity {
  adminLoginEmail: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  provider: string;
  isCustomDomainConfigured: boolean;
}

export interface EmailAttachmentPayload {
  filename: string;
  content: string; // base64 string
  contentType?: string;
  size?: number;
}

export interface EmailMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalPending: number;
  isDeliveredReliable: boolean;
}

/**
 * Validates that the current user has verified administrator privileges.
 */
async function verifyAdminCaller(): Promise<{ adminId: string; adminEmail?: string } | { error: string }> {
  try {
    const { userId, role } = await getCurrentUserRole();
    if (!userId || role !== "admin") {
      return { error: "Forbidden: Administrative privileges required." };
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { adminId: userId, adminEmail: user?.email || undefined };
  } catch {
    return {
      error: "Authentication verification failed.",
    };
  }
}

/**
 * Helper to get an authorized Supabase client.
 */
async function getSupabase(): Promise<any> {
  try {
    return createAdminClient() as any;
  } catch {
    return (await createClient()) as any;
  }
}

/**
 * Resolves standard placeholders in template text using real recipient data.
 * Supported: {{first_name}}, {{last_name}}, {{email}}, {{course_name}}
 */
export async function resolveTemplatePlaceholders(
  text: string,
  recipient: {
    email: string;
    full_name?: string | null;
    course_name?: string | null;
  }
): Promise<{ resolved: string; unresolvedPlaceholders: string[] }> {
  const fullName = recipient.full_name?.trim() || "";
  const nameParts = fullName ? fullName.split(/\s+/) : [];
  const firstName = nameParts.length > 0 ? nameParts[0] : recipient.email.split("@")[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const courseName = recipient.course_name || "SpeakUp Course";

  const substitutions: Record<string, string> = {
    "{{full_name}}": fullName || (recipient.email ? recipient.email.split("@")[0] : "Student"),
    "{{name}}": fullName || (recipient.email ? recipient.email.split("@")[0] : "Student"),
    "{{first_name}}": firstName,
    "{{last_name}}": lastName,
    "{{email}}": recipient.email,
    "{{course_name}}": courseName,
  };

  let resolved = text;
  for (const [placeholder, val] of Object.entries(substitutions)) {
    resolved = resolved.split(placeholder).join(val);
  }

  // Detect any remaining unresolved {{...}} placeholders
  const matches = resolved.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g) || [];
  const unresolvedPlaceholders = Array.from(new Set(matches));

  return { resolved, unresolvedPlaceholders };
}

/**
 * Loads Email Center initial data: metrics, templates, recent logs, students, and courses.
 */
export async function getEmailCenterDataAction(): Promise<
  ActionResponse<{
    metrics: EmailMetrics;
    templates: EmailTemplateItem[];
    recentLogs: EmailLogItem[];
    students: StudentRecipientItem[];
    courses: Array<{ id: string; title: string; slug: string }>;
    senderIdentity: SenderIdentity;
    dbPermissionsGranted: boolean;
    dbPermissionErrorNotice?: string;
  }>
> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await getSupabase();
  let dbPermissionsGranted = true;
  let dbPermissionErrorNotice: string | undefined;

  // Authoritative Sender Identity resolution: Admin authentication login vs displayed outbound email
  const adminLoginEmail = authCheck.adminEmail || "Admin Account";
  const identity = await getAuthoritativeSenderIdentity();

  const senderIdentity: SenderIdentity = {
    adminLoginEmail,
    fromName: identity.fromName,
    fromEmail: identity.fromEmail,
    replyTo: identity.replyTo,
    provider: "Resend",
    isCustomDomainConfigured: identity.isVerified,
  };

  // 1. Fetch Templates
  let templates: EmailTemplateItem[] = [];
  const { data: tData, error: tErr } = await supabase
    .from("email_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (tErr) {
    if (tErr.message.includes("permission denied") || tErr.code === "42501") {
      dbPermissionsGranted = false;
      dbPermissionErrorNotice =
        "Supabase table permissions for 'email_templates' and 'email_logs' need to be granted. Please execute supabase/email_schema.sql in the Supabase SQL editor.";
    }
  } else if (tData) {
    templates = tData as EmailTemplateItem[];
  }

  // 2. Fetch Logs & Metrics
  let recentLogs: EmailLogItem[] = [];
  let totalSent = 0;
  let totalFailed = 0;
  let totalPending = 0;
  let totalDelivered = 0;

  const { data: lData, error: lErr } = await supabase
    .from("email_logs")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(50);

  if (lErr) {
    if (lErr.message.includes("permission denied") || lErr.code === "42501") {
      dbPermissionsGranted = false;
      dbPermissionErrorNotice =
        "Supabase table permissions for 'email_templates' and 'email_logs' need to be granted. Please execute supabase/email_schema.sql in the Supabase SQL editor.";
    }
  } else if (lData) {
    recentLogs = lData as EmailLogItem[];
    recentLogs.forEach((l) => {
      const status = l.status?.toLowerCase();
      if (status === "sent") totalSent++;
      else if (status === "failed") totalFailed++;
      else if (status === "pending") totalPending++;
      else if (status === "delivered") totalDelivered++;
    });
  }

  // 3. Fetch Registered Students with Approved Courses
  const { data: pData } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, phone, role, status")
    .eq("role", "student");

  const { data: cData } = await supabase
    .from("courses")
    .select("id, title, slug");

  const { data: eData } = await supabase
    .from("course_enrollments")
    .select("user_id, course_id, status")
    .eq("status", "approved");

  const courseMap = new Map<string, { id: string; title: string; slug: string }>();
  ((cData || []) as any[]).forEach((c: any) => {
    courseMap.set(c.id, { id: c.id, title: c.title, slug: c.slug });
  });

  const enrollmentsByUser = new Map<string, Array<{ id: string; title: string; slug: string }>>();
  ((eData || []) as any[]).forEach((e: any) => {
    const c = courseMap.get(e.course_id);
    if (c) {
      const list = enrollmentsByUser.get(e.user_id) || [];
      list.push(c);
      enrollmentsByUser.set(e.user_id, list);
    }
  });

  const students: StudentRecipientItem[] = ((pData || []) as any[]).map((p: any) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name || null,
    avatar_url: p.avatar_url || null,
    phone: p.phone || null,
    status: p.status || "active",
    courses: enrollmentsByUser.get(p.id) || [],
  }));

  const courses = ((cData || []) as any[]).map((c: any) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
  }));

  return {
    success: true,
    data: {
      metrics: {
        totalSent,
        totalDelivered,
        totalFailed,
        totalPending,
        isDeliveredReliable: totalDelivered > 0, // Explicitly truthful: delivery webhooks indicate actual delivered receipts
      },
      templates,
      recentLogs,
      students,
      courses,
      senderIdentity,
      dbPermissionsGranted,
      dbPermissionErrorNotice,
    },
  };
}

/**
 * Creates a new email template.
 */
export async function createEmailTemplateAction(data: {
  name: string;
  subject: string;
  body: string;
}): Promise<ActionResponse<EmailTemplateItem>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  if (!data.name?.trim() || !data.subject?.trim() || !data.body?.trim()) {
    return { success: false, error: "Name, subject, and body are all required." };
  }

  try {
    const supabase = await getSupabase();
    const { data: created, error } = await supabase
      .from("email_templates")
      .insert({
        name: data.name.trim(),
        subject: data.subject.trim(),
        body: data.body.trim(),
      } as any)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/emails");
    return { success: true, data: created as EmailTemplateItem };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create email template." };
  }
}

/**
 * Updates an existing email template.
 */
export async function updateEmailTemplateAction(
  id: string,
  data: {
    name: string;
    subject: string;
    body: string;
  }
): Promise<ActionResponse<EmailTemplateItem>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  if (!id || !data.name?.trim() || !data.subject?.trim() || !data.body?.trim()) {
    return { success: false, error: "Template ID, name, subject, and body are all required." };
  }

  try {
    const supabase = await getSupabase();
    const { data: updated, error } = await supabase
      .from("email_templates")
      .update({
        name: data.name.trim(),
        subject: data.subject.trim(),
        body: data.body.trim(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/emails");
    return { success: true, data: updated as EmailTemplateItem };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update email template." };
  }
}

/**
 * Deletes an email template.
 */
export async function deleteEmailTemplateAction(id: string): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  if (!id) {
    return { success: false, error: "Template ID is required." };
  }

  try {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from("email_templates")
      .delete()
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/emails");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete email template." };
  }
}

/**
 * Sends administrative emails to selected recipients with privacy preservation,
 * placeholder resolution, anti-duplicate protection, and accurate database logging.
 */
export async function sendAdminEmailBatchAction(params: {
  recipients: Array<{
    email: string;
    full_name?: string | null;
    course_name?: string | null;
  }>;
  subject: string;
  body: string;
  templateId?: string | null;
  attachments?: EmailAttachmentPayload[];
  batchSize?: 5 | 10;
  schedule?: "now" | "morning" | "evening";
  campaignName?: string;
}): Promise<
  ActionResponse<{
    totalRequested: number;
    sentCount: number;
    failedCount: number;
    queuedCount?: number;
    isScheduled?: boolean;
    scheduledFor?: string;
    details: Array<{ email: string; success: boolean; resendId?: string; error?: string; status?: string }>;
  }>
> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const { recipients, subject, body, templateId, attachments, batchSize = 10, schedule = "now", campaignName } = params;

  if (!recipients || recipients.length === 0) {
    return { success: false, error: "At least one recipient must be selected." };
  }

  const MAX_RECIPIENTS = 50;
  if (recipients.length > MAX_RECIPIENTS) {
    return {
      success: false,
      error: `Recipient limit exceeded. For safety and rate limits, maximum ${MAX_RECIPIENTS} recipients can be emailed per batch.`,
    };
  }

  if (!subject?.trim()) {
    return { success: false, error: "Email subject line is required." };
  }

  if (!body?.trim()) {
    return { success: false, error: "Email message body is required." };
  }

  const supabase = await getSupabase();
  const identity = await getAuthoritativeSenderIdentity();

  // Validate provider requirements
  if (identity.selectedProvider === "gmail" && !identity.connectedGmail?.connected) {
    return {
      success: false,
      error: "Active delivery provider is set to Gmail, but no authorized Gmail account is connected. Please connect Gmail via Google OAuth in Portal Email settings.",
    };
  }

  if (identity.selectedProvider === "resend" && !process.env.RESEND_API_KEY) {
    return {
      success: false,
      error: "Active delivery provider is set to Resend, but RESEND_API_KEY is not configured on the server.",
    };
  }

  const configuredFromName = identity.fromName;
  const configuredFromEmail = identity.fromEmail;
  const configuredReplyTo = identity.replyTo;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Server-side validation of attachments
  if (attachments && attachments.length > 0) {
    let totalSize = 0;
    for (const att of attachments) {
      if (!att.filename?.trim() || !att.content) {
        return { success: false, error: "Invalid attachment: filename and content are required." };
      }
      if (att.size) {
        if (att.size > 5 * 1024 * 1024) {
          return {
            success: false,
            error: `Attachment "${att.filename}" exceeds the 5MB file size limit.`,
          };
        }
        totalSize += att.size;
      }
    }
    if (totalSize > 10 * 1024 * 1024) {
      return { success: false, error: "Total email attachments exceed the 10MB limit." };
    }
  }

  // Handle scheduled campaigns (Morning 9:00 AM or Evening 6:00 PM)
  if (schedule !== "now") {
    const now = new Date();
    const scheduledDate = new Date();
    if (schedule === "morning") {
      scheduledDate.setHours(9, 0, 0, 0);
      if (scheduledDate <= now) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }
    } else if (schedule === "evening") {
      scheduledDate.setHours(18, 0, 0, 0);
      if (scheduledDate <= now) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }
    }

    const scheduledDetails: Array<{ email: string; success: boolean; status: string }> = [];

    for (const recipient of recipients) {
      const email = recipient.email?.trim().toLowerCase();
      if (!email || !emailRegex.test(email)) {
        scheduledDetails.push({ email: recipient.email || "unknown", success: false, status: "invalid" });
        continue;
      }

      const { resolved: resolvedSubject } = await resolveTemplatePlaceholders(subject, recipient);
      const { resolved: resolvedBody } = await resolveTemplatePlaceholders(body, recipient);

      try {
        const queuePayload = JSON.stringify({
          body: resolvedBody,
          campaign: campaignName || null,
          scheduledFor: scheduledDate.toISOString(),
          label: `Scheduled for ${schedule === "morning" ? "Morning (9:00 AM)" : "Evening (6:00 PM)"}`,
        });

        await supabase.from("email_logs").insert({
          recipient_email: email,
          subject: resolvedSubject,
          template_id: templateId || null,
          status: "queued",
          error_message: queuePayload,
          sent_at: scheduledDate.toISOString(),
        } as any);
        scheduledDetails.push({ email, success: true, status: "queued" });
      } catch {
        scheduledDetails.push({ email, success: false, status: "error" });
      }
    }

    revalidatePath("/admin/emails");
    return {
      success: true,
      data: {
        totalRequested: recipients.length,
        sentCount: 0,
        failedCount: 0,
        queuedCount: scheduledDetails.filter((d) => d.success).length,
        isScheduled: true,
        scheduledFor: scheduledDate.toISOString(),
        details: scheduledDetails,
      },
    };
  }

  // Send Now flow in configurable batches of 5 or 10
  const { sendBrandedEmail } = await import("@/lib/email");
  const details: Array<{ email: string; success: boolean; resendId?: string; error?: string; status?: string }> = [];
  let sentCount = 0;
  let failedCount = 0;

  // Process in batches of 5 or 10
  const normalizedBatchSize = batchSize === 5 ? 5 : 10;
  const batches: Array<typeof recipients> = [];
  for (let i = 0; i < recipients.length; i += normalizedBatchSize) {
    batches.push(recipients.slice(i, i + normalizedBatchSize));
  }

  for (const batch of batches) {
    for (const recipient of batch) {
      const email = recipient.email?.trim().toLowerCase();

      // 1. Address validation
      if (!email || !emailRegex.test(email)) {
        failedCount++;
        const errMsg = "Invalid recipient email address format.";
        details.push({ email: recipient.email || "unknown", success: false, error: errMsg, status: "failed" });

        try {
          await supabase.from("email_logs").insert({
            recipient_email: recipient.email || "invalid",
            subject: subject.trim(),
            template_id: templateId || null,
            status: "failed",
            error_message: errMsg,
            sent_at: new Date().toISOString(),
          } as any);
        } catch {}
        continue;
      }

      // 2. Duplicate send prevention: Check if identical email sent to this address in last 5 minutes
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: recentDuplicate } = await supabase
          .from("email_logs")
          .select("id")
          .eq("recipient_email", email)
          .eq("subject", subject.trim())
          .eq("status", "sent")
          .gte("sent_at", fiveMinutesAgo)
          .maybeSingle();

        if (recentDuplicate) {
          details.push({
            email,
            success: true,
            status: "skipped_duplicate",
            error: "Already sent in this window (anti-duplicate safety)",
          });
          continue;
        }
      } catch {}

      // 3. Resolve placeholders individually for this recipient
      const { resolved: resolvedSubject } = await resolveTemplatePlaceholders(subject, recipient);
      const { resolved: resolvedHtml } = await resolveTemplatePlaceholders(body, recipient);

      let finalHtml = resolvedHtml;
      if (!finalHtml.includes("<!DOCTYPE") && !finalHtml.includes("<html")) {
        finalHtml = renderEmailLayout(resolvedHtml, {
          senderName: configuredFromName,
          senderEmail: configuredFromEmail,
          replyTo: configuredReplyTo,
          avatarUrl: identity.avatarUrl,
        });
      }

      // 4. Send email individually using authoritative configured provider
      try {
        const sendResult = await sendBrandedEmail({
          to: email,
          subject: resolvedSubject,
          html: finalHtml,
          attachments: attachments?.map((att) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
          })),
        });

        if (!sendResult.success) {
          failedCount++;
          const errMsg = sendResult.error || "Email delivery failed";
          details.push({ email, success: false, error: errMsg, status: "failed" });

          try {
            await supabase.from("email_logs").insert({
              recipient_email: email,
              subject: resolvedSubject,
              template_id: templateId || null,
              status: "failed",
              error_message: errMsg,
              sent_at: new Date().toISOString(),
            } as any);
          } catch {}
        } else {
          sentCount++;
          const providerMsgId = sendResult.resendId || null;
          details.push({ email, success: true, resendId: providerMsgId || undefined, status: "sent" });

          try {
            await supabase.from("email_logs").insert({
              recipient_email: email,
              subject: resolvedSubject,
              template_id: templateId || null,
              status: "sent",
              resend_id: providerMsgId,
              error_message: campaignName ? `Campaign: ${campaignName}` : null,
              sent_at: new Date().toISOString(),
            } as any);
          } catch {}
        }
      } catch (err: any) {
        failedCount++;
        const errMsg = err?.message || "Unexpected exception during send";
        details.push({ email, success: false, error: errMsg, status: "failed" });

        try {
          await supabase.from("email_logs").insert({
            recipient_email: email,
            subject: resolvedSubject,
            template_id: templateId || null,
            status: "failed",
            error_message: errMsg,
            sent_at: new Date().toISOString(),
          } as any);
        } catch {}
      }

      // Polite 50ms delay between recipient dispatches
      if (recipients.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    // Inter-batch pause (200ms) to respect rate limits
    if (batches.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  revalidatePath("/admin/emails");
  revalidatePath("/admin/dashboard");

  return {
    success: true,
    data: {
      totalRequested: recipients.length,
      sentCount,
      failedCount,
      details,
    },
  };
}

/**
 * Queries email logs with filters.
 */
export async function getEmailLogsAction(params: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionResponse<{ logs: EmailLogItem[]; total: number }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const supabase = await getSupabase();
    let query = supabase
      .from("email_logs")
      .select("*", { count: "exact" })
      .order("sent_at", { ascending: false });

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    if (params.search?.trim()) {
      const q = `%${params.search.trim()}%`;
      query = query.or(`recipient_email.ilike.${q},subject.ilike.${q}`);
    }

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        logs: (data as EmailLogItem[]) || [],
        total: count || 0,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch email logs." };
  }
}

/**
 * Uploads an image for the visual email composer without disrupting composition.
 * Preserves the original file name, validates size (< 5MB) and formats (JPEG, PNG, WebP).
 */
export async function uploadEmailAssetAction(
  formData: FormData
): Promise<ActionResponse<{ url: string; fileName: string; size: number; base64?: string }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No image file provided." };
  }

  // Validate format
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { success: false, error: "Only JPEG, PNG, WebP, and GIF images are supported." };
  }

  // Validate size (< 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "Image exceeds 5 MB limit." };
  }

  try {
    const adminClient = createAdminClient();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `email_assets/${Date.now()}_${sanitizedName}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    const { error: uploadError } = await adminClient.storage
      .from("avatars")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.warn("Storage upload warning, using local public fallback:", uploadError.message);
      const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(publicUploadsDir)) {
        fs.mkdirSync(publicUploadsDir, { recursive: true });
      }
      const localFileName = `email_${Date.now()}_${sanitizedName}`;
      fs.writeFileSync(path.join(publicUploadsDir, localFileName), buffer);
      return {
        success: true,
        data: {
          url: `/uploads/${localFileName}`,
          fileName: file.name,
          size: file.size,
          base64: base64Data,
        },
      };
    }

    const { data: pubData } = adminClient.storage.from("avatars").getPublicUrl(storagePath);
    return {
      success: true,
      data: {
        url: pubData.publicUrl,
        fileName: file.name,
        size: file.size,
        base64: base64Data,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to process image upload." };
  }
}

/**
 * Sends a test verification email from the Email Center to confirm sender identity and logo display.
 */
export async function sendEmailCenterTestAction(
  testRecipientEmail: string
): Promise<ActionResponse<{ resendId?: string; fromHeader?: string; recipient: string }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const { sendTestVerificationEmail } = await import("@/lib/email");
  const recipient = (testRecipientEmail || "").trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!recipient || !emailRegex.test(recipient)) {
    return { success: false, error: "Please provide a valid test recipient email address." };
  }

  try {
    const res = await sendTestVerificationEmail(recipient);
    if (!res.success) {
      return {
        success: false,
        error: res.error || "Failed to dispatch test verification email.",
      };
    }

    revalidatePath("/admin/emails");
    return {
      success: true,
      data: {
        resendId: res.resendId,
        fromHeader: res.fromHeader,
        recipient,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unexpected exception during test email dispatch.",
    };
  }
}

/**
 * Cancels or pauses an unsent queued email from email_logs.
 */
export async function cancelQueuedEmailAction(id: string): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  if (!id) {
    return { success: false, error: "Email log ID is required." };
  }

  try {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from("email_logs")
      .update({
        status: "cancelled",
        error_message: "Delivery cancelled by administrator before dispatch",
      } as any)
      .eq("id", id)
      .eq("status", "queued");

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/emails");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to cancel queued email." };
  }
}

/**
 * Manually or programmatically executes queued emails whose scheduled time has arrived.
 */
export async function processQueuedEmailsAction(batchLimit = 20): Promise<ActionResponse<{
  processedCount: number;
  sentCount: number;
  failedCount: number;
}>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const { processQueuedEmails } = await import("@/lib/email/queue");
    const result = await processQueuedEmails(batchLimit);

    revalidatePath("/admin/emails");
    return {
      success: true,
      data: {
        processedCount: result.processedCount,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to process queued emails.",
    };
  }
}

