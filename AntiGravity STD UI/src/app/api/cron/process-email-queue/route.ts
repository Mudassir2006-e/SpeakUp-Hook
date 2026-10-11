import { NextResponse } from "next/server";
import { processQueuedEmails } from "@/lib/email/queue";
import { getCurrentUserRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * Durable Queue Runner Endpoint
 * Can be triggered via:
 * 1. Vercel Cron (cron: "0 8,20 * * *" or "* /10 * * * *") with Authorization: Bearer <CRON_SECRET>
 * 2. External HTTP webhooks with valid CRON_SECRET header
 * 3. Supabase pg_cron via pg_net with CRON_SECRET header
 * 4. Internal Admin Panel queue dispatch (authenticated admin session)
 */
export async function GET(req: Request) {
  return handleQueueExecution(req);
}

export async function POST(req: Request) {
  return handleQueueExecution(req);
}

async function handleQueueExecution(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const isDev = process.env.NODE_ENV === "development";

    let isAuthorized = false;

    // 1. Direct bearer token authentication for cron workers
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true;
    }

    // 2. Local development bypass (strictly bound to NODE_ENV, not spoofable Host header)
    if (!isAuthorized && isDev) {
      isAuthorized = true;
    }

    // 3. Fallback: Authenticated admin session
    if (!isAuthorized) {
      try {
        const { userId, role } = await getCurrentUserRole();
        if (userId && role === "admin") {
          isAuthorized = true;
        }
      } catch {}
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid CRON_SECRET bearer token or administrative session required." },
        { status: 401 }
      );
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
