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
} from "./templates";
import {
  getConnectedGmailAccount,
  sendEmailViaGmail,
  ConnectedGmailAccount,
} from "./gmail";

export interface AuthoritativeSenderIdentity {
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  avatarUrl: string | null;
  provider: "Resend" | "Gmail" | "SMTP";
  selectedProvider: "resend" | "gmail" | "smtp";
  isVerified: boolean;
  providerNotice: string;
  connectedGmail?: ConnectedGmailAccount;
  smtpConfig: {
    host: string;
    port: number;
    username: string;
    isApiKeyConfigured: boolean;
  };
}

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | null;
  attachments?: Array<{
    filename: string;
    content: string; // base64 string
    contentType?: string;
  }>;
  templateId?: string | null;
}

export interface SendEmailResult {
  success: boolean;
  resendId?: string;
  fromHeader?: string;
  provider?: string;
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
  let fromEmail = process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev";
  let replyTo = process.env.EMAIL_REPLY_TO || null;
  let avatarUrl: string | null = null;
  let selectedProvider: "resend" | "gmail" | "smtp" = "resend";

  let connectedGmail: ConnectedGmailAccount = {
    connected: false,
    email: null,
    connectedAt: null,
    hasRefreshToken: false,
  };

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
    if (portalConfig.selected_provider) {
      selectedProvider = portalConfig.selected_provider;
    }

    connectedGmail = await getConnectedGmailAccount();

    if (selectedProvider === "gmail" && connectedGmail.connected && connectedGmail.email) {
      fromEmail = connectedGmail.email;
    } else if (portalConfig.sender_email?.trim()) {
      const candidateEmail = portalConfig.sender_email.trim();
      const configuredEnv = (process.env.EMAIL_FROM_ADDRESS || "").toLowerCase();
      if (
        candidateEmail.toLowerCase() === "onboarding@resend.dev" ||
        (configuredEnv && candidateEmail.toLowerCase() === configuredEnv)
      ) {
        fromEmail = candidateEmail;
      } else if (!replyTo && candidateEmail.includes("@")) {
        // If owner put their contact email in sender_email previously, preserve it as replyTo
        replyTo = candidateEmail;
      }
    }

    if (portalConfig.avatar_url && !portalConfig.avatar_url.startsWith("data:")) {
      avatarUrl = portalConfig.avatar_url;
    }
  } catch {
    // Non-blocking fallback to environment variables
  }

  // Domain verification logic
  const targetDomain = fromEmail.includes("@") ? fromEmail.split("@")[1].toLowerCase() : "";
  const configuredFromEnv = process.env.EMAIL_FROM_ADDRESS || "";
  const configuredDomain = configuredFromEnv.includes("@")
    ? configuredFromEnv.split("@")[1].toLowerCase()
    : "";

  const isVerified =
    selectedProvider === "gmail"
      ? connectedGmail.connected
      : targetDomain === "resend.dev" ||
        (configuredDomain !== "" && targetDomain === configuredDomain);

  const providerLabel = selectedProvider === "gmail" ? "Gmail" : selectedProvider === "smtp" ? "SMTP" : "Resend";

  const providerNotice = selectedProvider === "gmail"
    ? connectedGmail.connected
      ? `Sending directly through authorized Google Gmail account (${connectedGmail.email}).`
      : "Gmail is selected as provider, but no Google account is connected. Please connect with Google OAuth."
    : isVerified
    ? targetDomain === "resend.dev"
      ? "Using Resend default sender (onboarding@resend.dev). Outbound headers are formatted as SpeakUp Team <onboarding@resend.dev>. Replies will be routed to your Reply-To address."
      : `Verified custom domain (${targetDomain}) via Resend.`
    : `Sender domain "${targetDomain}" is not verified in Resend. System safely sends via onboarding@resend.dev with replies to your contact email.`;

  const hasApiKey = Boolean(process.env.RESEND_API_KEY);

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
    smtpConfig: {
      host: "smtp.resend.com",
      port: 465,
      username: "resend",
      isApiKeyConfigured: hasApiKey,
    },
  };
}

/**
 * Dispatches a branded email via the selected provider (Resend or Gmail) and logs the transaction.
 */
export async function sendBrandedEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const identity = await getAuthoritativeSenderIdentity();
  const supabase = await getSupabase();

  const recipientList = Array.isArray(payload.to) ? payload.to : [payload.to];
  const primaryRecipient = recipientList[0];
  const fromHeader = `${identity.fromName} <${identity.fromEmail}>`;
  const effectiveReplyTo = payload.replyTo || identity.replyTo || undefined;

  // PROVIDER 1: GMAIL
  if (identity.selectedProvider === "gmail") {
    if (!identity.connectedGmail?.connected || !identity.connectedGmail.email) {
      const errMsg = "Gmail provider is selected, but no authorized Google account is connected. Connect Gmail in Portal Email or select Resend.";
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
        fromName: identity.fromName,
        fromEmail: identity.fromEmail,
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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "RESEND_API_KEY is not configured on the server.",
    };
  }

  const resend = new Resend(apiKey);

  try {
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
      if (
        errMsg.toLowerCase().includes("domain") ||
        errMsg.toLowerCase().includes("verify") ||
        errMsg.toLowerCase().includes("from")
      ) {
        errMsg = `Sender verification error: Domain for "${identity.fromEmail}" is unverified in your email provider (Resend). ${errMsg}`;
      }

      // Log failure to database
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

      return {
        success: false,
        fromHeader,
        error: errMsg,
      };
    }

    const resendId = result.data?.id || undefined;

    // Log success to database
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
    const errMsg = err?.message || "Unexpected exception during email dispatch.";

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

    return {
      success: false,
      fromHeader,
      error: errMsg,
    };
  }
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

