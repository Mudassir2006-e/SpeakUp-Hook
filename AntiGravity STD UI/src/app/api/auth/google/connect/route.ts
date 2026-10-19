import { NextRequest, NextResponse } from "next/server";
import { generateGoogleOAuthUrl } from "@/lib/email/gmail";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { isCurrentAdminSessionVerified } from "@/lib/auth/adminVerification";
import { generateOAuthState } from "@/lib/auth/adminVerificationCore";

export async function GET(req: NextRequest) {
  try {
    const { userId, role } = await getCurrentUserRole();
    if (!userId || role !== "admin") {
      return NextResponse.redirect(new URL("/auth/login?error=admin_required", req.url));
    }

    const isMfaVerified = await isCurrentAdminSessionVerified();
    const errorRedirectTarget = isMfaVerified ? "/admin/portal-email" : "/admin/verify";

    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const origin = `${proto}://${host}`;

    // Cryptographically sign state bound to the authenticated admin and timestamp
    const secureState = generateOAuthState(userId);

    const { url, error } = generateGoogleOAuthUrl(origin, secureState);
    if (error || !url) {
      return NextResponse.redirect(
        new URL(`${errorRedirectTarget}?oauth_error=${encodeURIComponent(error || "OAuth configuration error")}`, req.url)
      );
    }

    return NextResponse.redirect(url);
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/admin/verify?oauth_error=${encodeURIComponent(err?.message || "OAuth exception")}`, req.url)
    );
  }
}
