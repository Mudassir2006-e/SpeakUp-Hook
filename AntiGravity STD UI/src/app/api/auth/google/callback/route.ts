import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthConfig, saveConnectedGmailAccount } from "@/lib/email/gmail";
import { getCurrentUserRole } from "@/lib/auth/roles";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/admin/portal-email?oauth_error=${encodeURIComponent(errorParam)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/admin/portal-email?oauth_error=No+authorization+code+provided", req.url)
    );
  }

  try {
    const { userId, role } = await getCurrentUserRole();
    if (!userId || role !== "admin") {
      return NextResponse.redirect(new URL("/auth/login?error=admin_required", req.url));
    }

    const { clientId, clientSecret, isConfigured } = getGoogleOAuthConfig();
    if (!isConfigured) {
      return NextResponse.redirect(
        new URL("/admin/portal-email?oauth_error=Google+OAuth+not+configured+on+server", req.url)
      );
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      const err = tokenData.error_description || tokenData.error || "Token exchange failed";
      return NextResponse.redirect(
        new URL(`/admin/portal-email?oauth_error=${encodeURIComponent(err)}`, req.url)
      );
    }

    // Retrieve authorized email address from Google userinfo
    let authorizedEmail = "";
    if (tokenData.access_token) {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        authorizedEmail = userInfo.email || "";
      }
    }

    if (!authorizedEmail) {
      return NextResponse.redirect(
        new URL("/admin/portal-email?oauth_error=Could+not+determine+authorized+Google+email", req.url)
      );
    }

    await saveConnectedGmailAccount({
      email: authorizedEmail,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    });

    return NextResponse.redirect(
      new URL(`/admin/portal-email?connected=gmail&email=${encodeURIComponent(authorizedEmail)}`, req.url)
    );
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/admin/portal-email?oauth_error=${encodeURIComponent(err?.message || "OAuth processing error")}`, req.url)
    );
  }
}
