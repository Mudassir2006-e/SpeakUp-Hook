/**
 * SpeakUp LMS — Unified Email Service
 * Authoritative outbound email sender, identity resolver, provider integration (Resend),
 * and database logging.
 */

import { Resend } from "resend";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  getTestVerificationEmailHtml,
  getStudentAccountApprovedEmailHtml,
  getCourseEnrollmentDecisionEmailHtml,
  getPasswordResetEmailHtml,
  getPasswordSetupEmailHtml,
  getWelcomeStudentEmailHtml,
  getWelcomeStudentEmailText,
  WelcomeStudentEmailParams,
} from "./templates";
import {
  getConnectedGmailAccount,
  sendEmailViaGmail,
  isGmailOperational,
  ConnectedGmailAccount,
} from "./gmail";

export { isGmailOperational };

export type EmailProvider = "gmail" | "resend";

export interface AuthoritativeSenderIdentity {
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  avatarUrl: string | null;
  provider: "Gmail" | "Resend";
  selectedProvider: EmailProvider;
  isVerified: boolean;
  providerNotice: string;
  connectedGmail?: ConnectedGmailAccount;
}

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  replyTo?: string | null;
  attachments?: Array<{
    filename: string;
    content: string; // base64 string
    contentType?: string;
  }>;
  templateId?: string | null;
  provider?: EmailProvider;
}

export interface SendEmailResult {
  success: boolean;
  resendId?: string;
  fromHeader?: string;
  provider?: string;
  deliveredTo?: string;
  error?: string;
}

async function getSupabase(): Promise<any> {
  try {
    return createAdminClient() as any;
  } catch {
    return (await createClient()) as any;
  }
}

/**
 * Resolves the authoritative sender identity configured in Portal Email (cms_content),
 * falling back to environment variables and system defaults.
 */
export async function getAuthoritativeSenderIdentity(): Promise<AuthoritativeSenderIdentity> {
  let fromName = process.env.EMAIL_FROM_NAME || "SpeakUp Team";
  let fromEmail = process.env.EMAIL_FROM_ADDRESS || "";
  let replyTo = process.env.EMAIL_REPLY_TO || process.env.PORTAL_CONTACT_EMAIL || null;
  let avatarUrl: string | null = null;

  let connectedGmail: ConnectedGmailAccount = {
    connected: false,
    email: null,
    connectedAt: null,
    hasRefreshToken: false,
  };

  try {
    connectedGmail = await getConnectedGmailAccount();
  } catch {
    // Non-blocking
  }

  // Primary provider logic: If Gmail is connected, default to Gmail as primary sender.
  // Otherwise use explicitly configured portal setting, EMAIL_PROVIDER, or Resend if available.
  let selectedProvider: EmailProvider = connectedGmail.connected
    ? "gmail"
    : (process.env.EMAIL_PROVIDER as EmailProvider) || (process.env.RESEND_API_KEY ? "resend" : "gmail");

  try {
    const supabase = await getSupabase();
    const { data: portalRecord } = await supabase
      .from("cms_content")
      .select("published_data, draft_data")
      .eq("page_key", "portal_email")
      .maybeSingle();

    const portalConfig =
      (portalRecord?.published_data as any) || (portalRecord?.draft_data as any) || {};

    if (portalConfig.sender_name?.trim()) {
      fromName = portalConfig.sender_name.trim();
    }
    if (portalConfig.reply_to_email?.trim()) {
      replyTo = portalConfig.reply_to_email.trim();
    }
    if (portalConfig.selected_provider === "resend" || portalConfig.selected_provider === "gmail") {
      selectedProvider = portalConfig.selected_provider;
    }

    if (portalConfig.avatar_url && !portalConfig.avatar_url.startsWith("data:")) {
      avatarUrl = portalConfig.avatar_url;
    }
  } catch {
    // Non-blocking fallback to environment variables
  }

  // Canonical sender address resolution
  if (selectedProvider === "gmail" && connectedGmail.connected && connectedGmail.email) {
    fromEmail = connectedGmail.email;
  } else if (!fromEmail) {
    fromEmail = process.env.EMAIL_FROM_ADDRESS || (selectedProvider === "resend" ? "onboarding@resend.dev" : "");
  }

  const isVerified =
    selectedProvider === "gmail"
      ? connectedGmail.connected
      : Boolean(process.env.RESEND_API_KEY);

  const providerLabel: "Gmail" | "Resend" = selectedProvider === "gmail" ? "Gmail" : "Resend";

  const providerNotice =
    selectedProvider === "gmail"
      ? connectedGmail.connected
        ? `Sending directly through authorized Google Gmail account (${connectedGmail.email}).`
        : "Gmail is selected as provider, but no Google account is connected. Please connect with Google OAuth in Portal Email."
      : isVerified
      ? "Using Resend HTTP API delivery provider."
      : "Resend is selected as provider, but RESEND_API_KEY is not configured on the server.";

  return {
    fromName,
    fromEmail,
    replyTo,
    avatarUrl,
    provider: providerLabel,
    selectedProvider,
    isVerified,
    providerNotice,
    connectedGmail,
  };
}

export type { WelcomeStudentEmailParams };

/**
 * Dispatches a branded email via the selected provider (Resend or Gmail) and logs the transaction.
 */
export async function sendBrandedEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const identity = await getAuthoritativeSenderIdentity();
  const supabase = await getSupabase();

  const recipientList = Array.isArray(payload.to) ? payload.to : [payload.to];
  const primaryRecipient = recipientList[0];
  const chosenProvider: EmailProvider = payload.provider || identity.selectedProvider || "resend";
  const effectiveReplyTo = payload.replyTo || identity.replyTo || undefined;

  let effectiveFromEmail = identity.fromEmail;
  if (chosenProvider === "gmail") {
    effectiveFromEmail = identity.connectedGmail?.email || identity.fromEmail;
  } else {
    effectiveFromEmail = identity.fromEmail || "onboarding@resend.dev";
  }
  const effectiveFromName = payload.fromName?.trim() || identity.fromName || "SpeakUp Team";
  const fromHeader = `${effectiveFromName} <${effectiveFromEmail}>`;

  // PROVIDER 1: GMAIL
  if (chosenProvider === "gmail") {
    if (!identity.connectedGmail?.connected || !identity.connectedGmail.email) {
      const errMsg = "Active delivery provider is set to Gmail, but no authorized Google account is connected. Please connect Gmail in Portal Email settings or select Resend.";
      try {
        await supabase.from("email_logs").insert({
          recipient_email: primaryRecipient,
          subject: payload.subject,
          template_id: payload.templateId || null,
          status: "failed",
          error_message: errMsg,
          sent_at: new Date().toISOString(),
        } as any);
      } catch {}
      return { success: false, fromHeader, error: errMsg };
    }

    try {
      const gmailRes = await sendEmailViaGmail({
        fromName: effectiveFromName,
        fromEmail: identity.connectedGmail.email,
        to: recipientList,
        replyTo: effectiveReplyTo,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        attachments: payload.attachments,
      });

      if (!gmailRes.success) {
        try {
          await supabase.from("email_logs").insert({
            recipient_email: primaryRecipient,
            subject: payload.subject,
            template_id: payload.templateId || null,
            status: "failed",
            error_message: gmailRes.error || "Gmail dispatch failed",
            sent_at: new Date().toISOString(),
          } as any);
        } catch {}
        return { success: false, fromHeader, error: gmailRes.error };
      }

      try {
        await supabase.from("email_logs").insert({
          recipient_email: primaryRecipient,
          subject: payload.subject,
          template_id: payload.templateId || null,
          status: "sent",
          resend_id: gmailRes.messageId || null,
          error_message: null,
          sent_at: new Date().toISOString(),
        } as any);
      } catch {}

      return {
        success: true,
        resendId: gmailRes.messageId,
        fromHeader,
        provider: "gmail",
      };
    } catch (err: any) {
      const errMsg = err?.message || "Unexpected exception dispatching via Gmail.";
      try {
        await supabase.from("email_logs").insert({
          recipient_email: primaryRecipient,
          subject: payload.subject,
          template_id: payload.templateId || null,
          status: "failed",
          error_message: errMsg,
          sent_at: new Date().toISOString(),
        } as any);
      } catch {}
      return { success: false, fromHeader, error: errMsg };
    }
  }

  // PROVIDER 2: RESEND
  if (chosenProvider === "resend") {
    const rawApiKey = process.env.RESEND_API_KEY;
    const apiKey = rawApiKey ? rawApiKey.trim().replace(/^["']|["']$/g, "") : "";
    if (!apiKey) {
      const errMsg = "Active delivery provider is set to Resend, but RESEND_API_KEY is not configured on the server.";
      try {
        await supabase.from("email_logs").insert({
          recipient_email: primaryRecipient,
          subject: payload.subject,
          template_id: payload.templateId || null,
          status: "failed",
          error_message: errMsg,
          sent_at: new Date().toISOString(),
        } as any);
      } catch {}
      return { success: false, fromHeader, error: errMsg };
    }

    try {
      const resend = new Resend(apiKey);
      const sendData: any = {
        from: fromHeader,
        to: recipientList,
        subject: payload.subject,
        html: payload.html,
      };

      if (effectiveReplyTo) {
        sendData.reply_to = effectiveReplyTo;
      }
      if (payload.text) {
        sendData.text = payload.text;
      }
      if (payload.attachments && payload.attachments.length > 0) {
        sendData.attachments = payload.attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
        }));
      }

      const result = await resend.emails.send(sendData);

      if (result.error) {
        let errMsg = result.error.message || "Resend email delivery failure";

        // Check for Resend free-tier sandbox policy:
        if (errMsg.toLowerCase().includes("own email address")) {
          // Automatic fallback to authorized Gmail if operational and provider was not explicitly pinned to resend
          if (!payload.provider) {
            const gmailStatus = await isGmailOperational();
            if (gmailStatus.operational && gmailStatus.email) {
              try {
                const gmailRes = await sendEmailViaGmail({
                  fromName: effectiveFromName,
                  fromEmail: gmailStatus.email,
                  to: recipientList,
                  replyTo: effectiveReplyTo,
                  subject: payload.subject,
                  html: payload.html,
                  text: payload.text,
                  attachments: payload.attachments,
                });
                if (gmailRes.success) {
                  try {
                    await supabase.from("email_logs").insert({
                      recipient_email: primaryRecipient,
                      subject: payload.subject,
                      template_id: payload.templateId || null,
                      status: "sent",
                      resend_id: gmailRes.messageId || null,
                      error_message: null,
                      sent_at: new Date().toISOString(),
                    } as any);
                  } catch {}
                  return {
                    success: true,
                    resendId: gmailRes.messageId,
                    fromHeader: `${effectiveFromName} <${gmailStatus.email}>`,
                    provider: "gmail",
                  };
                }
              } catch {
                // Non-blocking fallback to reporting standard error
              }
            }
          }

          errMsg = `Email delivery restriction: Domain for "${effectiveFromEmail}" is in unverified sandbox mode in your email provider (Resend). Resend sandbox mode only permits test dispatch to the Resend account owner. To send emails to recipients (${primaryRecipient}), please verify your custom domain in Resend Dashboard (resend.com/domains) or select Portal Email (Gmail).`;
        } else if (
          errMsg.toLowerCase().includes("domain") ||
          errMsg.toLowerCase().includes("verify") ||
          errMsg.toLowerCase().includes("from")
        ) {
          errMsg = `Sender verification error: Domain for "${effectiveFromEmail}" is unverified in your email provider (Resend). ${errMsg}`;
        }

        try {
          await supabase.from("email_logs").insert({
            recipient_email: primaryRecipient,
            subject: payload.subject,
            template_id: payload.templateId || null,
            status: "failed",
            error_message: errMsg,
            sent_at: new Date().toISOString(),
          } as any);
        } catch {}

        return { success: false, fromHeader, error: errMsg };
      }

      const resendId = result.data?.id || undefined;
      try {
        await supabase.from("email_logs").insert({
          recipient_email: primaryRecipient,
          subject: payload.subject,
          template_id: payload.templateId || null,
          status: "sent",
          resend_id: resendId || null,
          error_message: null,
          sent_at: new Date().toISOString(),
        } as any);
      } catch {}

      return {
        success: true,
        resendId,
        fromHeader,
        provider: "resend",
      };
    } catch (err: any) {
      const errMsg = err?.message || "Unexpected exception during Resend email dispatch.";
      try {
        await supabase.from("email_logs").insert({
          recipient_email: primaryRecipient,
          subject: payload.subject,
          template_id: payload.templateId || null,
          status: "failed",
          error_message: errMsg,
          sent_at: new Date().toISOString(),
        } as any);
      } catch {}

      return { success: false, fromHeader, error: errMsg };
    }
  }

  return { success: false, fromHeader, error: "No email dispatch provider resolved." };
}

/**
 * Sends an identity verification test email to verify sender name, from address,
 * reply-to behavior, and template logo rendering.
 */
export async function sendTestVerificationEmail(
  recipientEmail: string
): Promise<SendEmailResult> {
  const identity = await getAuthoritativeSenderIdentity();

  const html = getTestVerificationEmailHtml({
    recipientEmail,
    senderName: identity.fromName,
    senderEmail: identity.fromEmail,
    replyTo: identity.replyTo,
    avatarUrl: identity.avatarUrl,
    providerNotice: identity.providerNotice,
  });

  return sendBrandedEmail({
    to: recipientEmail,
    subject: `[Test Verification] Outbound Email from ${identity.fromName}`,
    html,
  });
}

/**
 * Sends an email notification when a student's account is approved by an administrator.
 */
export async function sendStudentAccountApprovedEmail(params: {
  studentEmail: string;
  studentName?: string;
}): Promise<SendEmailResult> {
  const identity = await getAuthoritativeSenderIdentity();

  const html = getStudentAccountApprovedEmailHtml({
    studentName: params.studentName,
    studentEmail: params.studentEmail,
    senderName: identity.fromName,
    senderEmail: identity.fromEmail,
    replyTo: identity.replyTo,
    avatarUrl: identity.avatarUrl,
  });

  return sendBrandedEmail({
    to: params.studentEmail,
    subject: `Account Approved: Welcome to SpeakUp LMS!`,
    html,
  });
}

/**
 * Sends an email notification when a student's course access request is approved or rejected.
 */
export async function sendCourseEnrollmentDecisionEmail(params: {
  studentEmail: string;
  studentName?: string;
  courseTitle: string;
  decision: "approved" | "rejected";
}): Promise<SendEmailResult> {
  const identity = await getAuthoritativeSenderIdentity();

  const html = getCourseEnrollmentDecisionEmailHtml({
    studentName: params.studentName,
    studentEmail: params.studentEmail,
    courseTitle: params.courseTitle,
    decision: params.decision,
    senderName: identity.fromName,
    senderEmail: identity.fromEmail,
    replyTo: identity.replyTo,
    avatarUrl: identity.avatarUrl,
  });

  const subject =
    params.decision === "approved"
      ? `Enrollment Approved: ${params.courseTitle} is now unlocked!`
      : `Update regarding your course request for ${params.courseTitle}`;

  return sendBrandedEmail({
    to: params.studentEmail,
    subject,
    html,
  });
}

/**
 * Sends a branded password reset email with the secure Supabase recovery link.
 */
export async function sendStudentPasswordResetEmail(params: {
  studentEmail: string;
  studentName?: string;
  resetLink: string;
}): Promise<SendEmailResult> {
  const identity = await getAuthoritativeSenderIdentity();

  const html = getPasswordResetEmailHtml({
    studentName: params.studentName,
    studentEmail: params.studentEmail,
    resetLink: params.resetLink,
    senderName: identity.fromName,
    senderEmail: identity.fromEmail,
    replyTo: identity.replyTo,
    avatarUrl: identity.avatarUrl,
  });

  return sendBrandedEmail({
    to: params.studentEmail,
    subject: `Reset your SpeakUp LMS password`,
    html,
  });
}

/**
 * Sends a branded password setup / invite email with the secure Supabase setup link.
 */
export async function sendStudentPasswordSetupEmail(params: {
  studentEmail: string;
  studentName?: string;
  setupLink: string;
}): Promise<SendEmailResult> {
  const identity = await getAuthoritativeSenderIdentity();

  const html = getPasswordSetupEmailHtml({
    studentName: params.studentName,
    studentEmail: params.studentEmail,
    setupLink: params.setupLink,
    senderName: identity.fromName,
    senderEmail: identity.fromEmail,
    replyTo: identity.replyTo,
    avatarUrl: identity.avatarUrl,
  });

  return sendBrandedEmail({
    to: params.studentEmail,
    subject: `Welcome to SpeakUp LMS — Set up your password`,
    html,
  });
}


// Helper to send welcome email to new student
export async function sendWelcomeStudentEmail(
  params: WelcomeStudentEmailParams & {
    provider?: EmailProvider;
  }
): Promise<SendEmailResult> {
  const html = getWelcomeStudentEmailHtml(params);
  const text = getWelcomeStudentEmailText(params);

  const studentFirst = params.studentName?.trim() ? params.studentName.trim() : "Student";
  const subject = `Welcome to SpeakUp, ${studentFirst}!`;

  return sendBrandedEmail({
    to: params.studentEmail,
    subject,
    html,
    text,
    replyTo: params.replyTo || undefined,
    templateId: "welcome_student",
    provider: params.provider,
  });
}

/**
 * Resolves the authoritative administrator login email addresses from trusted server-side sources.
 * Never accepts unauthenticated client-supplied input or returns hardcoded placeholder addresses.
 */
export async function resolveAuthoritativeAdminEmails(): Promise<string[]> {
  const adminEmails: Set<string> = new Set();

  // 1. Check current authenticated session
  try {
    const { getCurrentUserRole } = await import("@/lib/auth/roles");
    const { role, email } = await getCurrentUserRole();
    if (role === "admin" && email && email.includes("@")) {
      adminEmails.add(email.trim().toLowerCase());
    }
  } catch {
    // Non-blocking session lookup
  }

  // 2. Query trusted server-side administrator records from Supabase
  try {
    const adminClient = createAdminClient();

    // Check Supabase Auth admin API
    try {
      const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers();
      if (!authErr && authData?.users) {
        for (const user of authData.users) {
          const authRole = user.app_metadata?.role || user.user_metadata?.role;
          if (authRole === "admin" && user.email && user.email.includes("@")) {
            adminEmails.add(user.email.trim().toLowerCase());
          }
        }
      }
    } catch {
      // Non-blocking Auth admin lookup
    }

    // Check profiles table where role = 'admin'
    try {
      const { data: profileAdmins, error: profErr } = await (adminClient as any)
        .from("profiles")
        .select("email, role")
        .eq("role", "admin");

      if (!profErr && profileAdmins) {
        for (const p of profileAdmins) {
          if (p.email && typeof p.email === "string" && p.email.includes("@")) {
            adminEmails.add(p.email.trim().toLowerCase());
          }
        }
      }
    } catch {
      // Non-blocking profiles lookup
    }
  } catch {
    // Database connection non-blocking fallback
  }

  // 3. Fallback to ADMIN_GMAIL_ADDRESS environment variable if no admin resolved yet
  if (adminEmails.size === 0 && process.env.ADMIN_GMAIL_ADDRESS) {
    const envAdmin = process.env.ADMIN_GMAIL_ADDRESS.trim().toLowerCase();
    if (envAdmin.includes("@")) {
      adminEmails.add(envAdmin);
    }
  }

  const result = Array.from(adminEmails);

  if (result.length === 0) {
    console.error("[Admin Email Resolution] Operational notice: No authoritative administrator login email could be resolved from trusted sources.");
  }

  return result;
}

/**
 * Resolves the primary authoritative administrator login email.
 * Returns null if no administrator email can be resolved safely.
 */
export async function resolveAuthoritativeAdminEmail(): Promise<string | null> {
  const emails = await resolveAuthoritativeAdminEmails();
  return emails.length > 0 ? emails[0] : null;
}

/**
 * Sends an email notification strictly to the verified administrator login email(s).
 * Enforces server-side administrator identity resolution — never trusts client input.
 */
export async function sendAdminNotificationEmail(payload: {
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | null;
}): Promise<SendEmailResult> {
  const recipients = await resolveAuthoritativeAdminEmails();

  if (recipients.length === 0) {
    const errMsg = "Operational error: No authoritative administrator login email could be resolved.";
    console.error(`[Admin Notification] ${errMsg}`);
    return { success: false, error: errMsg };
  }

  return sendBrandedEmail({
    to: recipients,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: payload.replyTo,
  });
}
