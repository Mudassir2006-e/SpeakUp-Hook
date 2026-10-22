/**
 * SpeakUp LMS — Google OAuth & Gmail API Delivery Engine
 * Provides secure OAuth connection management, token refresh, and
 * RFC 2822 MIME message delivery through the official Google Gmail REST API.
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { getHmacSecret } from "@/lib/auth/adminVerificationCore";

/**
 * Encrypts a sensitive credential using AES-256-GCM keyed by the server's authoritative secret.
 */
function encryptToken(plainText: string): string {
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getHmacSecret(), iv);
    const enc = Buffer.concat([cipher.update(plainText, "utf-8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `enc:${iv.toString("hex")}:${authTag.toString("hex")}:${enc.toString("hex")}`;
  } catch {
    return plainText;
  }
}

/**
 * Decrypts a sensitive credential encrypted via AES-256-GCM.
 */
function decryptToken(cipherText: string): string {
  try {
    if (!cipherText || !cipherText.startsWith("enc:")) return cipherText || "";
    const parts = cipherText.split(":");
    if (parts.length !== 4) return cipherText;
    const iv = Buffer.from(parts[1], "hex");
    const authTag = Buffer.from(parts[2], "hex");
    const enc = Buffer.from(parts[3], "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getHmacSecret(), iv);
    decipher.setAuthTag(authTag);
    return decipher.update(enc) + decipher.final("utf-8");
  } catch {
    return "";
  }
}

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
 * Strips accidental wrapping quotes or leading/trailing whitespace from environment values.
 */
function cleanEnvVal(val?: string): string {
  if (!val) return "";
  let trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Returns Google OAuth application configuration from environment variables.
 * Supports primary GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, as well as
 * common server aliases (GMAIL_CLIENT_ID, GOOGLE_OAUTH_CLIENT_ID).
 */
export function getGoogleOAuthConfig() {
  const clientId = cleanEnvVal(
    process.env.GOOGLE_CLIENT_ID ||
      process.env.GMAIL_CLIENT_ID ||
      process.env.GOOGLE_OAUTH_CLIENT_ID
  );
  const clientSecret = cleanEnvVal(
    process.env.GOOGLE_CLIENT_SECRET ||
      process.env.GMAIL_CLIENT_SECRET ||
      process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );
  const isConfigured = Boolean(clientId && clientSecret);
  return { clientId, clientSecret, isConfigured };
}

/**
 * Generates the Google OAuth authorization URL for connecting a Gmail account.
 */
export function generateGoogleOAuthUrl(originUrl?: string, stateParam?: string): { url?: string; error?: string } {
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
    state: stateParam || "connect_gmail",
  });

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
}

/**
 * Retrieves connected Gmail account details from cms_content.
 */
export async function getConnectedGmailAccount(): Promise<ConnectedGmailAccount> {
  // 1. Check environment variable (highest priority for static deployments)
  if (process.env.GMAIL_SENDER_EMAIL && process.env.GMAIL_REFRESH_TOKEN) {
    return {
      connected: true,
      email: process.env.GMAIL_SENDER_EMAIL,
      connectedAt: null,
      hasRefreshToken: true,
    };
  }

  // 2. Check Supabase Auth app_metadata (persistent, serverless-safe, multi-instance)
  try {
    const adminClient = createAdminClient();
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const userWithGmail =
      usersData?.users?.find(
        (u) => (u.app_metadata as any)?.portal_gmail?.has_refresh_token
      ) ||
      usersData?.users?.find(
        (u) => (u.app_metadata as any)?.portal_gmail?.email
      );
    const portalGmail = (userWithGmail?.app_metadata as any)?.portal_gmail;
    if (portalGmail && portalGmail.email && portalGmail.has_refresh_token) {
      return {
        connected: true,
        email: portalGmail.email,
        connectedAt: portalGmail.connected_at || null,
        hasRefreshToken: true,
      };
    }
  } catch (metaErr) {
    console.warn("[Gmail Storage] Non-blocking notice reading admin app_metadata:", metaErr);
  }

  // 3. Fallback: check cms_content & portal_email_credentials (legacy storage)
  try {
    const supabase = await getSupabase();
    const { data: record } = await supabase
      .from("cms_content")
      .select("published_data, draft_data")
      .eq("page_key", "portal_email")
      .maybeSingle();

    const config = (record?.published_data as any) || (record?.draft_data as any) || {};
    const gmail = config.connected_gmail;

    let hasRefreshToken = Boolean(process.env.GMAIL_REFRESH_TOKEN);
    if (!hasRefreshToken && (gmail?.has_refresh_token || gmail?.refresh_token)) {
      hasRefreshToken = true;
    }

    if (!hasRefreshToken) {
      try {
        const adminClient = createAdminClient();
        const { data: cred } = await (adminClient as any)
          .from("portal_email_credentials")
          .select("credential_value")
          .eq("credential_key", "gmail_refresh_token")
          .maybeSingle();
        if (cred?.credential_value) {
          hasRefreshToken = true;
        }
      } catch {}
    }

    if (gmail && gmail.email && hasRefreshToken) {
      return {
        connected: true,
        email: gmail.email,
        connectedAt: gmail.connected_at || null,
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
 * Stores authorized email and connection metadata in cms_content under portal_email,
 * and securely persists the refresh token in dedicated server-only private storage.
 * Under no circumstances are tokens written to public CMS data or exposed in client responses.
 */
export async function saveConnectedGmailAccount(params: {
  email: string;
  accessToken?: string;
  refreshToken: string;
  expiresIn?: number;
  adminUserId?: string;
}): Promise<boolean> {
  try {
    const now = new Date();
    const effectiveRefreshToken = params.refreshToken || process.env.GMAIL_REFRESH_TOKEN || "";

    // 1. Immediately update in-memory process environment
    if (effectiveRefreshToken) {
      process.env.GMAIL_REFRESH_TOKEN = effectiveRefreshToken;
    }
    if (params.email) {
      process.env.GMAIL_SENDER_EMAIL = params.email;
    }

    // 2. Durably and securely persist in Supabase auth.users app_metadata (serverless-safe, encrypted at rest)
    try {
      const adminClient = createAdminClient();
      let targetUser = null;
      if (params.adminUserId) {
        const { data: userData } = await adminClient.auth.admin.getUserById(params.adminUserId);
        targetUser = userData?.user;
      }
      if (!targetUser) {
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        targetUser =
          usersData?.users?.find(
            (u) =>
              u.app_metadata?.role === "admin" ||
              u.email?.toLowerCase().includes("admin") ||
              u.email?.toLowerCase() === params.email.toLowerCase() ||
              u.email?.toLowerCase() === "mudassir.ali2710@gmail.com"
          ) || usersData?.users?.[0];
      }

      if (targetUser) {
        const prevPortal = (targetUser.app_metadata?.portal_gmail as any) || {};
        const encrypted = effectiveRefreshToken
          ? encryptToken(effectiveRefreshToken)
          : prevPortal.encrypted_refresh_token;

        await adminClient.auth.admin.updateUserById(targetUser.id, {
          app_metadata: {
            ...targetUser.app_metadata,
            portal_gmail: {
              email: params.email,
              encrypted_refresh_token: encrypted,
              connected_at: now.toISOString(),
              has_refresh_token: Boolean(effectiveRefreshToken || encrypted),
            },
          },
        });
      }
    } catch (metaErr) {
      console.warn("[Gmail Storage] Notice: Unable to persist to admin app_metadata:", metaErr);
    }

    // 3. Durably save secret refresh token to dedicated server-only table if available
    try {
      const adminClient = createAdminClient();
      await (adminClient as any).from("portal_email_credentials").upsert(
        {
          credential_key: "gmail_refresh_token",
          credential_value: effectiveRefreshToken,
          updated_at: now.toISOString(),
        },
        { onConflict: "credential_key" }
      );
    } catch {
      // portal_email_credentials table may not be migrated yet
    }

    // 4. Save sanitized, non-secret metadata to cms_content if table is writable
    try {
      const supabase = await getSupabase();
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
          connected_at: now.toISOString(),
          has_refresh_token: Boolean(effectiveRefreshToken),
        },
        selected_provider: "gmail",
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
    } catch {
      // Non-blocking fallback if cms_content has restrictive permissions
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
    const now = new Date();

    // 1. Clear in-memory environment variables
    delete process.env.GMAIL_REFRESH_TOKEN;
    delete process.env.GMAIL_SENDER_EMAIL;

    // 2. Clear from Supabase auth.users app_metadata
    try {
      const adminClient = createAdminClient();
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      for (const u of usersData?.users || []) {
        if ((u.app_metadata as any)?.portal_gmail) {
          const newMeta = { ...u.app_metadata };
          delete (newMeta as any).portal_gmail;
          await adminClient.auth.admin.updateUserById(u.id, { app_metadata: newMeta });
        }
      }
    } catch {}

    // 3. Remove from legacy cms_content and dedicated credentials if writable
    try {
      const supabase = await getSupabase();
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
    } catch {}

    try {
      const adminClient = createAdminClient();
      await (adminClient as any)
        .from("portal_email_credentials")
        .delete()
        .eq("credential_key", "gmail_refresh_token");
    } catch {}

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

  // 1. Retrieve refresh token from server environment variable (highest security / static env)
  let refreshToken = process.env.GMAIL_REFRESH_TOKEN || "";

  // 2. Retrieve from Supabase auth.users app_metadata (persistent, decrypted at rest)
  if (!refreshToken) {
    try {
      const adminClient = createAdminClient();
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      const adminUser = usersData?.users?.find(
        (u) => (u.app_metadata as any)?.portal_gmail?.encrypted_refresh_token
      );
      const encToken = (adminUser?.app_metadata as any)?.portal_gmail?.encrypted_refresh_token;
      if (encToken) {
        refreshToken = decryptToken(encToken);
      }
    } catch {}
  }

  // 3. Retrieve from dedicated private table (portal_email_credentials)
  if (!refreshToken) {
    try {
      const adminClient = createAdminClient();
      const { data: cred } = await (adminClient as any)
        .from("portal_email_credentials")
        .select("credential_value")
        .eq("credential_key", "gmail_refresh_token")
        .maybeSingle();
      if (cred?.credential_value) {
        refreshToken = cred.credential_value;
      }
    } catch {}
  }

  // 4. Read-only legacy fallback: check legacy cms_content record before migration cleanup
  if (!refreshToken) {
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
  }

  if (!refreshToken) {
    return { error: "No Gmail refresh token is available. Please connect Gmail in Portal Email or configure GMAIL_REFRESH_TOKEN." };
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
      const errCode = (data.error || "").toString();
      const errDesc = (data.error_description || "").toString();
      if (
        errCode === "invalid_grant" ||
        errDesc.toLowerCase().includes("revoked") ||
        errDesc.toLowerCase().includes("expired")
      ) {
        return {
          error: "Google authorization has expired or was revoked. Please reconnect your account at /admin/portal-email.",
        };
      }
      return { error: errDesc || errCode || "Failed to refresh Google access token." };
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

/**
 * Evaluates whether Google OAuth and the connected Gmail account are operational for email dispatch.
 * Fails closed if OAuth credentials, account connection, or refresh tokens are missing.
 */
export async function isGmailOperational(): Promise<{ operational: boolean; email?: string; reason?: string }> {
  const { clientId, clientSecret, isConfigured } = getGoogleOAuthConfig();
  if (!isConfigured) {
    if (!clientId && !clientSecret) {
      return {
        operational: false,
        reason: "Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in server environment variables.",
      };
    } else if (!clientId) {
      return {
        operational: false,
        reason: "GOOGLE_CLIENT_ID is not configured in server environment variables.",
      };
    } else {
      return {
        operational: false,
        reason: "GOOGLE_CLIENT_SECRET is not configured in server environment variables.",
      };
    }
  }

  const account = await getConnectedGmailAccount();
  if (!account.connected || !account.email) {
    return {
      operational: false,
      reason: "No Google Gmail account is connected in Portal Email settings (/admin/portal-email).",
    };
  }

  if (!account.hasRefreshToken) {
    return {
      operational: false,
      reason: "Connected Google Gmail account is missing an OAuth refresh token. Please reconnect the account at /admin/portal-email.",
    };
  }

  return { operational: true, email: account.email };
}

