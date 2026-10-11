import { NextResponse } from "next/server";
import { processQueuedEmails } from "@/lib/email/queue";

export const dynamic = "force-dynamic";

/**
 * Durable Queue Runner Endpoint
 * Can be triggered via:
 * 1. Vercel Cron (cron: "* /10 * * * *")
 * 2. External HTTP webhooks (e.g. cron-job.org)
 * 3. Supabase pg_cron via pg_net
 * 4. Internal Admin Panel queue dispatch
 */
export async function GET(req: Request) {
  return handleQueueExecution(req);
}

export async function POST(req: Request) {
  return handleQueueExecution(req);
}

async function handleQueueExecution(req: Request) {
  try {
    // Verify optional CRON_SECRET if configured
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow internal local requests if in development
      const host = req.headers.get("host") || "";
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
      if (!isLocal) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await processQueuedEmails();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Cron email queue execution error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to process queue" },
      { status: 500 }
    );
  }
}
