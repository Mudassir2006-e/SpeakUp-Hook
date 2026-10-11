/**
 * SpeakUp LMS — Google OAuth & Gmail API Delivery Engine
 * Provides secure OAuth connection management, token refresh, and
 * RFC 2822 MIME message delivery through the official Google Gmail REST API.
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface ConnectedGmailAccount {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  hasRefreshToken: boolean;
}

async function getSupabase(): Promise<any> {
  try {
    return createAdminClient() as any;
  } catch {
    return (await createClient()) as any;
  }
}

/**
 * Returns Google OAuth application configuration from environment variables.
 */
export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const isConfigured = Boolean(clientId && clientSecret);
  return { clientId, clientSecret, isConfigured };
}

/**
 * Generates the Google OAuth authorization URL for connecting a Gmail account.
 */
export function generateGoogleOAuthUrl(originUrl?: string): { url?: string; error?: string } {
  const { clientId, isConfigured } = getGoogleOAuthConfig();
  if (!isConfigured) {
    return {
      error:
        "Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in server environment variables.",
    };
  }

  const baseOrigin = originUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectUri = `${baseOrigin.replace(/\/$/, "")}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent",
    state: "connect_gmail",
  });

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
}

/**
 * Retrieves connected Gmail account details from cms_content.
 */
export async function getConnectedGmailAccount(): Promise<ConnectedGmailAccount> {
  try {
    const supabase = await getSupabase();
    const { data: record } = await supabase
      .from("cms_content")
      .select("published_data, draft_data")
      .eq("page_key", "portal_email")
      .maybeSingle();

    const config = (record?.published_data as any) || (record?.draft_data as any) || {};
    const gmail = config.connected_gmail;

    if (gmail && gmail.email && (gmail.refresh_token || process.env.GMAIL_REFRESH_TOKEN)) {
      return {
        connected: true,
        email: gmail.email,
        connectedAt: gmail.connected_at || null,
        hasRefreshToken: Boolean(gmail.refresh_token || process.env.GMAIL_REFRESH_TOKEN),
      };
    }

    // Check environment fallback
    if (process.env.GMAIL_SENDER_EMAIL && process.env.GMAIL_REFRESH_TOKEN) {
      return {
        connected: true,
        email: process.env.GMAIL_SENDER_EMAIL,
        connectedAt: null,
        hasRefreshToken: true,
      };
    }
  } catch (err) {
    console.warn("Could not retrieve connected Gmail status:", err);
  }

  return {
    connected: false,
    email: null,
    connectedAt: null,
    hasRefreshToken: false,
  };
}

/**
 * Stores OAuth tokens and authorized email in cms_content under portal_email.
 */
export async function saveConnectedGmailAccount(params: {
  email: string;
  accessToken?: string;
  refreshToken: string;
  expiresIn?: number;
}): Promise<boolean> {
  try {
    const supabase = await getSupabase();
    const now = new Date();
    const tokenExpiry = params.expiresIn ? Date.now() + params.expiresIn * 1000 : undefined;

    const { data: existing } = await supabase
      .from("cms_content")
      .select("id, published_data, draft_data")
      .eq("page_key", "portal_email")
      .maybeSingle();

    const prev = (existing?.published_data as any) || {};

    const updatedData = {
      ...prev,
      connected_gmail: {
        email: params.email,
        access_token: params.accessToken || null,
        refresh_token: params.refreshToken,
        token_expiry: tokenExpiry,
        connected_at: now.toISOString(),
      },
      updated_at: now.toISOString(),
    };

    if (existing?.id) {
      await supabase
        .from("cms_content")
        .update({
          published_data: updatedData,
          draft_data: updatedData,
          updated_at: now.toISOString(),
        } as any)
        .eq("id", existing.id);
    } else {
      await supabase.from("cms_content").insert({
        page_key: "portal_email",
        title: "Portal Email Configuration",
        published_data: updatedData,
        draft_data: updatedData,
        version: 1,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      } as any);
    }

    return true;
  } catch (err) {
    console.error("Failed to save connected Gmail account:", err);
    return false;
  }
}

/**
 * Disconnects the linked Gmail account from cms_content.
 */
export async function disconnectGmailAccount(): Promise<boolean> {
  try {
    const supabase = await getSupabase();
    const now = new Date();

    const { data: existing } = await supabase
      .from("cms_content")
      .select("id, published_data")
      .eq("page_key", "portal_email")
      .maybeSingle();

    if (existing?.id) {
      const prev = (existing.published_data as any) || {};
      const updatedData = {
        ...prev,
        connected_gmail: null,
        selected_provider: "resend",
        updated_at: now.toISOString(),
      };

      await supabase
        .from("cms_content")
        .update({
          published_data: updatedData,
          draft_data: updatedData,
          updated_at: now.toISOString(),
        } as any)
        .eq("id", existing.id);
    }
    return true;
  } catch (err) {
    console.error("Failed to disconnect Gmail account:", err);
    return false;
  }
}

/**
 * Obtains a fresh access token using the stored refresh token.
 */
async function getFreshGmailAccessToken(): Promise<{ token?: string; error?: string }> {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  // Retrieve refresh token from cms_content or environment
  let refreshToken = process.env.GMAIL_REFRESH_TOKEN || "";
  try {
    const supabase = await getSupabase();
    const { data: record } = await supabase
      .from("cms_content")
      .select("published_data")
      .eq("page_key", "portal_email")
      .maybeSingle();
    const config = (record?.published_data as any) || {};
    if (config.connected_gmail?.refresh_token) {
      refreshToken = config.connected_gmail.refresh_token;
    }
  } catch {}

  if (!refreshToken) {
    return { error: "No Gmail refresh token is available. Please connect Gmail in Portal Email." };
  }

  if (!clientId || !clientSecret) {
    return { error: "Google OAuth Client ID or Client Secret is not configured." };
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { error: data.error_description || data.error || "Failed to refresh Google access token." };
    }

    return { token: data.access_token };
  } catch (err: any) {
    return { error: err?.message || "Network exception refreshing Google access token." };
  }
}

/**
 * Helper to encode string to RFC 4648 Base64URL without padding.
 */
function base64UrlEncode(str: string): string {
  const base64 = Buffer.from(str, "utf-8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Sends an email via Google Gmail REST API.
 */
export async function sendEmailViaGmail(payload: {
  fromName: string;
  fromEmail: string;
  to: string | string[];
  replyTo?: string | null;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: string; contentType?: string }>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const tokenRes = await getFreshGmailAccessToken();
  if (!tokenRes.token) {
    return { success: false, error: tokenRes.error || "Could not authenticate with Gmail." };
  }

  const recipients = Array.isArray(payload.to) ? payload.to.join(", ") : payload.to;
  const boundary = `__SpeakUp_Boundary_${Date.now()}__`;

  let rawEmail = "";
  rawEmail += `From: "${payload.fromName}" <${payload.fromEmail}>\r\n`;
  rawEmail += `To: ${recipients}\r\n`;
  if (payload.replyTo) {
    rawEmail += `Reply-To: ${payload.replyTo}\r\n`;
  }
  rawEmail += `Subject: =?utf-8?B?${Buffer.from(payload.subject).toString("base64")}?=\r\n`;
  rawEmail += `MIME-Version: 1.0\r\n`;

  if (payload.attachments && payload.attachments.length > 0) {
    rawEmail += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    rawEmail += `--${boundary}\r\n`;
    rawEmail += `Content-Type: text/html; charset="UTF-8"\r\n`;
    rawEmail += `Content-Transfer-Encoding: base64\r\n\r\n`;
    rawEmail += `${Buffer.from(payload.html).toString("base64")}\r\n\r\n`;

    for (const att of payload.attachments) {
      rawEmail += `--${boundary}\r\n`;
      rawEmail += `Content-Type: ${att.contentType || "application/octet-stream"}; name="${att.filename}"\r\n`;
      rawEmail += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
      rawEmail += `Content-Transfer-Encoding: base64\r\n\r\n`;
      rawEmail += `${att.content}\r\n\r\n`;
    }

    rawEmail += `--${boundary}--\r\n`;
  } else {
    rawEmail += `Content-Type: text/html; charset="UTF-8"\r\n`;
    rawEmail += `Content-Transfer-Encoding: base64\r\n\r\n`;
    rawEmail += `${Buffer.from(payload.html).toString("base64")}\r\n`;
  }

  const encodedMessage = base64UrlEncode(rawEmail);

  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenRes.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `Gmail API delivery error (${res.status})`,
      };
    }

    return { success: true, messageId: data.id };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network exception dispatching message via Gmail API.",
    };
  }
}
