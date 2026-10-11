/**
 * SpeakUp LMS — Durable Server-Side Queue Processor
 * Executes scheduled emails once their timestamp arrives, supporting
 * external cron jobs, Vercel cron, and admin panel on-demand execution.
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendBrandedEmail } from "@/lib/email";

async function getSupabase(): Promise<any> {
  try {
    return createAdminClient() as any;
  } catch {
    return (await createClient()) as any;
  }
}

export interface QueueProcessResult {
  processedCount: number;
  sentCount: number;
  failedCount: number;
  details: Array<{
    id: string;
    email: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Scans email_logs for queued records where scheduled timestamp has arrived,
 * dispatches them via the active configured provider, and updates their status.
 */
export async function processQueuedEmails(batchLimit = 20): Promise<QueueProcessResult> {
  const supabase = await getSupabase();
  const now = new Date().toISOString();

  // Find due queued messages
  const { data: queuedItems, error } = await supabase
    .from("email_logs")
    .select("id, recipient_email, subject, template_id, error_message, sent_at")
    .eq("status", "queued")
    .lte("sent_at", now)
    .order("sent_at", { ascending: true })
    .limit(batchLimit);

  if (error || !queuedItems || queuedItems.length === 0) {
    return {
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      details: [],
    };
  }

  // Pre-load referenced templates
  const templateIds = Array.from(
    new Set(queuedItems.map((q: any) => q.template_id).filter(Boolean))
  );

  const templateMap = new Map<string, { body: string; subject: string }>();
  if (templateIds.length > 0) {
    const { data: tData } = await supabase
      .from("email_templates")
      .select("id, body, subject")
      .in("id", templateIds);

    (tData || []).forEach((t: any) => {
      templateMap.set(t.id, { body: t.body, subject: t.subject });
    });
  }

  let sentCount = 0;
  let failedCount = 0;
  const details: Array<{ id: string; email: string; success: boolean; error?: string }> = [];

  for (const item of queuedItems) {
    let messageBody = "";

    // 1. Try to extract stored message body from payload in error_message
    if (item.error_message) {
      try {
        const parsed = JSON.parse(item.error_message);
        if (parsed && typeof parsed.body === "string") {
          messageBody = parsed.body;
        }
      } catch {
        // Not a JSON payload, standard schedule note
      }
    }

    // 2. Fall back to referenced template body
    if (!messageBody && item.template_id && templateMap.has(item.template_id)) {
      messageBody = templateMap.get(item.template_id)!.body;
    }

    // 3. Fallback to basic notification if body was missing
    if (!messageBody) {
      messageBody = `<p>This is a scheduled message regarding: <strong>${item.subject}</strong></p>`;
    }

    try {
      const result = await sendBrandedEmail({
        to: item.recipient_email,
        subject: item.subject,
        html: messageBody,
        text: messageBody.replace(/<[^>]*>/g, ""),
        templateId: item.template_id || undefined,
      });

      if (result.success) {
        sentCount++;
        await supabase
          .from("email_logs")
          .update({
            status: "sent",
            resend_id: result.resendId || null,
            error_message: null,
            sent_at: new Date().toISOString(),
          } as any)
          .eq("id", item.id);

        details.push({ id: item.id, email: item.recipient_email, success: true });
      } else {
        failedCount++;
        await supabase
          .from("email_logs")
          .update({
            status: "failed",
            error_message: result.error || "Scheduled dispatch failed",
            sent_at: new Date().toISOString(),
          } as any)
          .eq("id", item.id);

        details.push({
          id: item.id,
          email: item.recipient_email,
          success: false,
          error: result.error,
        });
      }
    } catch (err: any) {
      failedCount++;
      await supabase
        .from("email_logs")
        .update({
          status: "failed",
          error_message: err?.message || "Execution error during queue dispatch",
          sent_at: new Date().toISOString(),
        } as any)
        .eq("id", item.id);

      details.push({
        id: item.id,
        email: item.recipient_email,
        success: false,
        error: err?.message,
      });
    }

    // Small delay between sends to respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  return {
    processedCount: queuedItems.length,
    sentCount,
    failedCount,
    details,
  };
}
