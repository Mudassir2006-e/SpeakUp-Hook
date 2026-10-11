import { NextResponse } from "next/server";
import { sendBrandedEmail } from "@/lib/email";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { validateEmail } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Protected internal route for sending branded emails.
 * STRICTLY PROTECTED: Requires verified administrator session or valid CRON_SECRET / INTERNAL_API_SECRET bearer token.
 * Prevents unauthorized third parties from using SpeakUp as an open mail relay.
 */
export async function POST(request: Request) {
  try {
    // 1. Authorization Verification
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const internalSecret = process.env.INTERNAL_API_SECRET;

    const hasBearerAuth = Boolean(
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (internalSecret && authHeader === `Bearer ${internalSecret}`)
    );

    if (!hasBearerAuth) {
      const { userId, role } = await getCurrentUserRole();
      if (!userId || role !== "admin") {
        return NextResponse.json(
          { error: "Forbidden: Administrative authentication or valid authorization token required." },
          { status: 401 }
        );
      }
    }

    // 2. Input Parsing & Validation
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { to, subject, html, text, replyTo } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: 'to', 'subject', and 'html' must be provided." },
        { status: 400 }
      );
    }

    const emailCheck = validateEmail(to);
    if (!emailCheck.valid) {
      return NextResponse.json({ error: emailCheck.error || "Invalid recipient email address" }, { status: 400 });
    }

    if (typeof subject !== "string" || subject.length > 250) {
      return NextResponse.json({ error: "Subject must be under 250 characters" }, { status: 400 });
    }

    if (typeof html !== "string" || html.length > 100000) {
      return NextResponse.json({ error: "HTML content exceeds maximum allowable length" }, { status: 400 });
    }

    // 3. Dispatch Email
    const res = await sendBrandedEmail({
      to,
      subject,
      html,
      text,
      replyTo,
    });

    if (!res.success) {
      return NextResponse.json({ error: res.error || "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      resendId: res.resendId,
      fromHeader: res.fromHeader,
      provider: res.provider,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error occurred while sending email" },
      { status: 500 }
    );
  }
}