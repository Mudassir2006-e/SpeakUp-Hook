import { sendBrandedEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, html, text, replyTo } = body;

    if (!to || !subject || !html) {
      return Response.json(
        { error: "Missing required fields (to, subject, html)" },
        { status: 400 }
      );
    }

    const res = await sendBrandedEmail({
      to,
      subject,
      html,
      text,
      replyTo,
    });

    if (!res.success) {
      return Response.json({ error: res.error }, { status: 500 });
    }

    return Response.json({ success: true, resendId: res.resendId, fromHeader: res.fromHeader });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Failed to send email" },
      { status: 500 }
    );
  }
}