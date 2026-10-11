"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";

import {
  getAuthoritativeSenderIdentity,
  sendTestVerificationEmail,
} from "@/lib/email";
import { SUPABASE_AUTH_TEMPLATES } from "@/lib/email/templates";
import {
  getGoogleOAuthConfig,
  disconnectGmailAccount,
  ConnectedGmailAccount,
} from "@/lib/email/gmail";

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface PortalEmailSettings {
  adminLoginEmail: string;
  senderName: string;
  senderEmail: string;
  actualProviderSendingAddress?: string;
  replyToEmail?: string;
  avatarUrl: string | null;
  selectedProvider: "resend" | "gmail" | "smtp";
  connectedGmail: ConnectedGmailAccount & { isOAuthConfigured: boolean };
  isVerified?: boolean;
  providerNotice?: string;
  smtpConfig?: {
    host: string;
    port: number;
    username: string;
    isApiKeyConfigured: boolean;
  };
  deliveryStatus?: {
    appProvider: string;
    isApiKeyConfigured: boolean;
    siteUrl: string;
    authRedirects: {
      passwordReset: string;
      emailConfirmation: string;
      invite: string;
    };
    domain: string;
    dnsRecords: Array<{
      type: string;
      host: string;
      value: string;
      description: string;
    }>;
  };
}

/**
 * Validates that the current user has verified administrator privileges.
 */
async function verifyAdminCaller(): Promise<{ adminId: string; adminEmail: string } | { error: string }> {
  try {
    const { userId, role } = await getCurrentUserRole();
    if (!userId || role !== "admin") {
      return { error: "Forbidden: Administrative privileges required." };
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return {
      adminId: userId,
      adminEmail: user?.email || "admin@speakup.edu",
    };
  } catch {
    return {
      error: "Authentication verification failed.",
    };
  }
}

async function getSupabase(): Promise<any> {
  try {
    return createAdminClient() as any;
  } catch {
    return (await createClient()) as any;
  }
}

/**
 * Retrieves the authoritative Portal Email configuration from cms_content,
 * alongside the authenticated administrator's login email and SMTP details.
 */
export async function getPortalEmailSettingsAction(): Promise<ActionResponse<PortalEmailSettings>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const identity = await getAuthoritativeSenderIdentity();
    const targetDomain = identity.fromEmail.includes("@") ? identity.fromEmail.split("@")[1].toLowerCase() : "";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://speakup.edu";
    const hasApiKey = Boolean(process.env.RESEND_API_KEY);

    const deliveryStatus = {
      appProvider: "Resend (HTTP API)",
      isApiKeyConfigured: hasApiKey,
      siteUrl,
      authRedirects: {
        passwordReset: `${siteUrl}/auth/reset-password`,
        emailConfirmation: `${siteUrl}/auth/callback`,
        invite: `${siteUrl}/auth/reset-password`,
      },
      domain: targetDomain,
      dnsRecords: [
        {
          type: "TXT (SPF)",
          host: "@",
          value: "v=spf1 include:amazonses.com ~all",
          description: "Authorizes outbound mail dispatch from Resend on your apex domain.",
        },
        {
          type: "CNAME (DKIM)",
          host: `resend._domainkey.${targetDomain || "domain"}`,
          value: "feedback-smtp.us-east-1.amazonses.com",
          description: "Cryptographically signs outbound emails to verify sender authenticity.",
        },
        {
          type: "TXT (DMARC)",
          host: `_dmarc.${targetDomain || "domain"}`,
          value: "v=DMARC1; p=none;",
          description: "Aligns SPF and DKIM reporting for Google, Yahoo, and Outlook deliverability.",
        },
        {
          type: "MX (Inbound)",
          host: `feedback.${targetDomain || "domain"}`,
          value: "feedback-smtp.us-east-1.amazonses.com",
          description: "Handles return-path and bounce handling notifications.",
        },
      ],
    };

    const oauthConfig = getGoogleOAuthConfig();

    return {
      success: true,
      data: {
        adminLoginEmail: authCheck.adminEmail,
        senderName: identity.fromName,
        senderEmail: identity.fromEmail,
        actualProviderSendingAddress: identity.fromEmail,
        replyToEmail: identity.replyTo || undefined,
        avatarUrl: identity.avatarUrl,
        selectedProvider: identity.selectedProvider,
        connectedGmail: {
          connected: identity.connectedGmail?.connected ?? false,
          email: identity.connectedGmail?.email ?? null,
          connectedAt: identity.connectedGmail?.connectedAt ?? null,
          hasRefreshToken: identity.connectedGmail?.hasRefreshToken ?? false,
          isOAuthConfigured: oauthConfig.isConfigured,
        },
        isVerified: identity.isVerified,
        providerNotice: identity.providerNotice,
        smtpConfig: identity.smtpConfig,
        deliveryStatus,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to load portal email settings.",
    };
  }
}

/**
 * Validates and saves the branded outbound portal email identity to cms_content.
 */
export async function savePortalEmailSettingsAction(payload: {
  senderName: string;
  senderEmail?: string;
  replyToEmail?: string;
  avatarUrl?: string | null;
  selectedProvider?: "resend" | "gmail" | "smtp";
}): Promise<ActionResponse<PortalEmailSettings>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const senderName = (payload.senderName || "").trim() || "SpeakUp Team";
  const replyToEmail = (payload.replyToEmail || "").trim().toLowerCase();

  // Validate Name: 2 - 60 characters
  if (senderName.length < 2 || senderName.length > 60) {
    return { success: false, error: "Portal Sender Name must be between 2 and 60 characters." };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (replyToEmail && !emailRegex.test(replyToEmail)) {
    return { success: false, error: "Please provide a valid Reply-To email address or leave it blank." };
  }

  // Actual authorized sending address from Resend
  const configuredFrom = process.env.EMAIL_FROM_ADDRESS || "";
  const actualProviderSendingAddress = configuredFrom || "onboarding@resend.dev";
  let senderEmail = actualProviderSendingAddress;

  if (payload.senderEmail?.trim()) {
    const candidate = payload.senderEmail.trim().toLowerCase();
    if (candidate === "onboarding@resend.dev" || (configuredFrom && candidate === configuredFrom.toLowerCase())) {
      senderEmail = candidate;
    }
  }

  // Domain Verification check
  const targetDomain = senderEmail.split("@")[1]?.toLowerCase() || "resend.dev";
  const isVerified = targetDomain === "resend.dev" || (configuredFrom !== "" && targetDomain === (configuredFrom.split("@")[1]?.toLowerCase() || ""));

  const providerNotice = isVerified
    ? targetDomain === "resend.dev"
      ? "Using Resend default sender (onboarding@resend.dev). Outbound headers are formatted as SpeakUp Team <onboarding@resend.dev>. Replies will be routed to your Reply-To address."
      : `Verified custom domain (${targetDomain}) via Resend.`
    : `Sender domain "${targetDomain}" is not verified in Resend. System safely sends via onboarding@resend.dev with replies to your contact email.`;

  try {
    const supabase = await getSupabase();
    const now = new Date().toISOString();

    const cleanAvatar = payload.avatarUrl && !payload.avatarUrl.startsWith("data:") ? payload.avatarUrl : null;

    const { data: existing } = await supabase
      .from("cms_content")
      .select("id, version, published_data, draft_data")
      .eq("page_key", "portal_email")
      .maybeSingle();

    const prevConfig = (existing?.published_data as any) || (existing?.draft_data as any) || {};

    const dataToStore = {
      ...prevConfig,
      sender_name: senderName,
      sender_email: senderEmail,
      reply_to_email: replyToEmail || null,
      avatar_url: cleanAvatar,
      selected_provider: payload.selectedProvider || prevConfig.selected_provider || "resend",
      updated_at: now,
      updated_by: authCheck.adminId,
    };

    if (existing?.id) {
      await supabase
        .from("cms_content")
        .update({
          draft_data: dataToStore,
          published_data: dataToStore,
          version: (existing.version || 1) + 1,
          updated_at: now,
          updated_by: authCheck.adminId,
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("cms_content")
        .insert({
          page_key: "portal_email",
          draft_data: dataToStore,
          published_data: dataToStore,
          version: 1,
          updated_at: now,
          updated_by: authCheck.adminId,
        });
    }

    revalidatePath("/admin/portal-email");
    revalidatePath("/admin/emails");

    const identity = await getAuthoritativeSenderIdentity();
    const oauthConfig = getGoogleOAuthConfig();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://speakup.edu";
    const hasApiKey = Boolean(process.env.RESEND_API_KEY);

    const deliveryStatus = {
      appProvider: "Resend (HTTP API)",
      isApiKeyConfigured: hasApiKey,
      siteUrl,
      authRedirects: {
        passwordReset: `${siteUrl}/auth/reset-password`,
        emailConfirmation: `${siteUrl}/auth/callback`,
        invite: `${siteUrl}/auth/reset-password`,
      },
      domain: targetDomain,
      dnsRecords: [
        {
          type: "TXT (SPF)",
          host: "@",
          value: "v=spf1 include:amazonses.com ~all",
          description: "Authorizes outbound mail dispatch from Resend on your apex domain.",
        },
        {
          type: "CNAME (DKIM)",
          host: `resend._domainkey.${targetDomain || "domain"}`,
          value: "feedback-smtp.us-east-1.amazonses.com",
          description: "Cryptographically signs outbound emails to verify sender authenticity.",
        },
        {
          type: "TXT (DMARC)",
          host: `_dmarc.${targetDomain || "domain"}`,
          value: "v=DMARC1; p=none;",
          description: "Aligns SPF and DKIM reporting for Google, Yahoo, and Outlook deliverability.",
        },
        {
          type: "MX (Inbound)",
          host: `feedback.${targetDomain || "domain"}`,
          value: "feedback-smtp.us-east-1.amazonses.com",
          description: "Handles return-path and bounce handling notifications.",
        },
      ],
    };

    return {
      success: true,
      data: {
        adminLoginEmail: authCheck.adminEmail,
        senderName,
        senderEmail,
        actualProviderSendingAddress: senderEmail,
        replyToEmail: replyToEmail || undefined,
        avatarUrl: cleanAvatar,
        selectedProvider: identity.selectedProvider,
        connectedGmail: {
          connected: identity.connectedGmail?.connected ?? false,
          email: identity.connectedGmail?.email ?? null,
          connectedAt: identity.connectedGmail?.connectedAt ?? null,
          hasRefreshToken: identity.connectedGmail?.hasRefreshToken ?? false,
          isOAuthConfigured: oauthConfig.isConfigured,
        },
        isVerified,
        providerNotice,
        smtpConfig: identity.smtpConfig,
        deliveryStatus,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to persist portal email settings.",
    };
  }
}

/**
 * Dispatches a real test verification email to verify sender identity,
 * From address, Reply-To address, and logo rendering.
 */
export async function sendPortalEmailTestAction(
  testRecipientEmail: string
): Promise<ActionResponse<{ resendId?: string; fromHeader?: string; recipient: string }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

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

    revalidatePath("/admin/portal-email");
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
 * Uploads a profile picture for the branded outbound portal identity to Supabase Storage.
 */
export async function uploadPortalEmailAvatarAction(
  formData: FormData
): Promise<ActionResponse<{ avatarUrl: string }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No image file provided." };
  }

  const allowedMime = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMime.includes(file.type)) {
    return {
      success: false,
      error: "Invalid file type. Only JPEG, PNG, and WebP images are permitted.",
    };
  }

  if (file.size > 2 * 1024 * 1024) {
    return {
      success: false,
      error: "Image exceeds 2MB limit. Please select an image under 2MB.",
    };
  }

  try {
    const adminClient = createAdminClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const fileName = `portal_email_sender_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error for portal email avatar:", uploadError);
      return { success: false, error: "Failed to upload image to Supabase Storage." };
    }

    const { data: publicData } = adminClient.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const publicUrl = publicData.publicUrl;

    return {
      success: true,
      data: { avatarUrl: publicUrl },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to process portal email image upload.",
    };
  }
}

/**
 * Retrieves the branded HTML email templates formatted for Supabase Authentication
 * (confirmation, recovery, invite).
 */
export async function getSupabaseAuthEmailTemplatesAction() {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  return {
    success: true,
    data: SUPABASE_AUTH_TEMPLATES,
  };
}

/**
 * Disconnects the linked Gmail account and reverts provider to Resend.
 */
export async function disconnectGmailAction(): Promise<ActionResponse<boolean>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const ok = await disconnectGmailAccount();
  revalidatePath("/admin/portal-email");
  revalidatePath("/admin/emails");
  return { success: ok };
}

/**
 * Selects the active outgoing email delivery provider ("resend" | "gmail" | "smtp").
 */
export async function selectEmailProviderAction(
  provider: "resend" | "gmail" | "smtp"
): Promise<ActionResponse<boolean>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const supabase = await getSupabase();
    const { data: existing } = await supabase
      .from("cms_content")
      .select("id, published_data, draft_data")
      .eq("page_key", "portal_email")
      .maybeSingle();

    const prev = (existing?.published_data as any) || (existing?.draft_data as any) || {};
    const updated = {
      ...prev,
      selected_provider: provider,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await supabase
        .from("cms_content")
        .update({
          published_data: updated,
          draft_data: updated,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", existing.id);
    } else {
      await supabase.from("cms_content").insert({
        page_key: "portal_email",
        title: "Portal Email Configuration",
        published_data: updated,
        draft_data: updated,
        version: 1,
      } as any);
    }

    revalidatePath("/admin/portal-email");
    revalidatePath("/admin/emails");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to switch provider." };
  }
}


