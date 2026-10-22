import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  checkAdminMfaCookie,
  shouldRefreshAdminTrustToken,
  generateAdminVerificationToken,
  ADMIN_VERIFY_COOKIE_NAME,
  ADMIN_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/adminVerificationCore";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Refresh session & resolve user + role + account status
  const { supabaseResponse, user, role, isSuspended, isSessionRevoked, isPendingApproval, isRejected } = await updateSession(request);

  // Security Headers: Comprehensive defense in depth (CSP, frame options, MIME protection)
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("X-Frame-Options", "SAMEORIGIN");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  supabaseResponse.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://*.googleusercontent.com; media-src 'self' data: blob: https://*.supabase.co https://*.googlevideo.com https://*.youtube.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://drive.google.com; connect-src 'self' https://*.supabase.co https://api.openai.com https://generativelanguage.googleapis.com https://graph.facebook.com; object-src 'none'; base-uri 'self'; form-action 'self';"
  );

  // HTTPS Enforcement: In production behind reverse proxy, enforce secure transport
  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host");
  if (process.env.NODE_ENV === "production" && proto === "http" && host && !host.includes("localhost")) {
    return NextResponse.redirect(`https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`, 301);
  }

  // Session Invalidation: If session was issued before a recent password change, revoke immediately
  if (isSessionRevoked && (pathname.startsWith("/lms") || pathname.startsWith("/admin"))) {
    const revokedUrl = new URL("/auth/login", request.url);
    revokedUrl.searchParams.set("error", "session_revoked");
    const res = NextResponse.redirect(revokedUrl);
    // Expire all auth and session cookies comprehensively
    request.cookies.getAll().forEach((c) => {
      if (c.name.startsWith("sb-") || c.name.includes("token") || c.name.includes("auth")) {
        res.cookies.delete(c.name);
      }
    });
    return res;
  }

  // Account Status Enforcement: If authenticated account is suspended, block access to protected zones
  if (user && isSuspended && (pathname.startsWith("/lms") || pathname.startsWith("/admin"))) {
    const suspendedUrl = new URL("/auth/login", request.url);
    suspendedUrl.searchParams.set("error", "account_suspended");
    return NextResponse.redirect(suspendedUrl);
  }

  // Student Account Pending/Rejected Enforcement: Block students from LMS until approved
  if (user && role !== "admin" && (pathname === "/lms" || pathname.startsWith("/lms/"))) {
    if (isPendingApproval) {
      const pendingUrl = new URL("/auth/login", request.url);
      pendingUrl.searchParams.set("error", "account_pending");
      return NextResponse.redirect(pendingUrl);
    }
    if (isRejected) {
      const rejectedUrl = new URL("/auth/login", request.url);
      rejectedUrl.searchParams.set("error", "account_rejected");
      return NextResponse.redirect(rejectedUrl);
    }
  }

  // 2. Protect Admin Routes (/admin and /admin/*)
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Unauthenticated visitors -> redirect to login
    if (!user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated non-admin (e.g. student) -> redirect safely to LMS Dashboard
    if (role !== "admin") {
      const studentUrl = new URL("/lms/dashboard", request.url);
      return NextResponse.redirect(studentUrl);
    }

    // Two-Factor Admin Verification Enforcement:
    const isVerifyRoute = pathname === "/admin/verify";
    const isMfaVerified = checkAdminMfaCookie(request.cookies, user);

    if (isVerifyRoute) {
      // If already verified, redirect from /admin/verify to main /admin dashboard
      if (isMfaVerified) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return supabaseResponse;
    }

    // If not verified, redirect to /admin/verify before allowing access to any admin route
    if (!isMfaVerified) {
      const verifyUrl = new URL("/admin/verify", request.url);
      if (pathname !== "/admin") {
        verifyUrl.searchParams.set("redirect", pathname);
      }
      return NextResponse.redirect(verifyUrl);
    }

    // Active admin request within 12-hour trust period:
    // Only genuine qualifying administrative activity extends the 12-hour sliding inactivity window.
    // Passive background requests, Next.js link prefetches, automated polls, and arbitrary POSTs MUST NOT renew trust.
    const isPrefetch =
      request.headers.get("purpose") === "prefetch" ||
      request.headers.get("sec-purpose") === "prefetch" ||
      request.headers.get("x-middleware-prefetch") === "1" ||
      request.headers.get("next-router-prefetch") === "1";

    const fetchDest = request.headers.get("sec-fetch-dest");
    const fetchMode = request.headers.get("sec-fetch-mode");
    // Fetch Metadata classification signal for top-level document navigations:
    // Note: Fetch Metadata is a browser-request classification signal, not biometric proof of physical human presence.
    const isDocumentNav =
      (fetchDest === "document" || (!fetchDest && request.headers.get("accept")?.includes("text/html"))) &&
      fetchMode !== "no-cors";

    // Proxy renewal: Strictly qualifying, non-prefetch top-level document GET navigations.
    // POST / Next-Action requests are excluded from proxy renewal; mutations must be validated and renewed server-side.
    const isQualifyingActivity = !isPrefetch && !isVerifyRoute && request.method === "GET" && isDocumentNav;

    const currentCookie = request.cookies.get(ADMIN_VERIFY_COOKIE_NAME)?.value;
    if (
      isQualifyingActivity &&
      currentCookie &&
      shouldRefreshAdminTrustToken(currentCookie, user.id, user.last_sign_in_at)
    ) {
      const renewedToken = generateAdminVerificationToken(user.id, user.last_sign_in_at);
      supabaseResponse.cookies.set(ADMIN_VERIFY_COOKIE_NAME, renewedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
        path: "/",
      });
    }

    // Authenticated and MFA-verified admin -> prevent caching sensitive admin content in browser history
    supabaseResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    supabaseResponse.headers.set("Pragma", "no-cache");

    return supabaseResponse;
  }

  // 3. Protect LMS Routes (/lms and /lms/*)
  if (pathname === "/lms" || pathname.startsWith("/lms/")) {
    // Unauthenticated visitors -> redirect to login
    if (!user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated users (students and inspecting administrators) -> prevent caching sensitive session content
    supabaseResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    supabaseResponse.headers.set("Pragma", "no-cache");

    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
