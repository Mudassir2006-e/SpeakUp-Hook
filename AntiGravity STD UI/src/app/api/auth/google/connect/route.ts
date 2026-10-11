import { NextRequest, NextResponse } from "next/server";
import { generateGoogleOAuthUrl } from "@/lib/email/gmail";
import { getCurrentUserRole } from "@/lib/auth/roles";

export async function GET(req: NextRequest) {
  try {
    const { userId, role } = await getCurrentUserRole();
    if (!userId || role !== "admin") {
      return NextResponse.redirect(new URL("/auth/login?error=admin_required", req.url));
    }

    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const origin = `${proto}://${host}`;

    const { url, error } = generateGoogleOAuthUrl(origin);
    if (error || !url) {
      return NextResponse.redirect(
        new URL(`/admin/portal-email?oauth_error=${encodeURIComponent(error || "OAuth configuration error")}`, req.url)
      );
    }

    return NextResponse.redirect(url);
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/admin/portal-email?oauth_error=${encodeURIComponent(err?.message || "OAuth exception")}`, req.url)
    );
  }
}
