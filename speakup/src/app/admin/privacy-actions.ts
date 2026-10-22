"use server";

import fs from "fs";
import path from "path";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyAdminCaller as verifyAdminMfaCaller } from "@/lib/auth/adminVerification";

function safeRevalidatePath(p: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    if (typeof revalidatePath === "function") revalidatePath(p);
  } catch {}
}

export interface CentralPrivacyItem {
  id: string;
  number: number;
  title: string;
  content: string;
}

export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const PRIVACY_FILE = path.join(process.cwd(), "src", "config", "central-privacy.json");

const DEFAULT_PRIVACY: CentralPrivacyItem[] = [
  {
    id: "priv-1",
    number: 1,
    title: "Certification Integrity & Public Registry",
    content:
      "Upon successful completion of course requirements, certificates are assigned a permanent serial code. Third-party employers may only verify certificate authenticity and completion date via our registry.",
  },
  {
    id: "priv-2",
    number: 2,
    title: "Governance Inquiries & Account Deletion",
    content:
      "Students maintain the right to review registered personal information or request data archiving upon course completion by contacting our academic administration desk at admissions@speakup.com.",
  },
];

async function verifyAdminCaller(): Promise<{ adminId: string } | { error: string }> {
  return verifyAdminMfaCaller();
}

function readPrivacyFile(): CentralPrivacyItem[] {
  try {
    if (!fs.existsSync(PRIVACY_FILE)) {
      return DEFAULT_PRIVACY;
    }
    const raw = fs.readFileSync(PRIVACY_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_PRIVACY;
  } catch {
    return DEFAULT_PRIVACY;
  }
}

function writePrivacyFile(items: CentralPrivacyItem[]): void {
  try {
    const dir = path.dirname(PRIVACY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PRIVACY_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.warn("Local central-privacy.json write skipped in serverless environment:", err);
  }
}

/**
 * Retrieves all dynamic privacy policy sections.
 * Authoritative: checks Supabase cms_content first with local JSON file fallback.
 */
export async function getCentralPrivacyAction(): Promise<ActionResponse<CentralPrivacyItem[]>> {
  try {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from("cms_content")
        .select("published_data")
        .eq("page_key", "privacy")
        .maybeSingle();

      if (!error && data?.published_data?.items && Array.isArray(data.published_data.items)) {
        return { success: true, data: data.published_data.items };
      }
    } catch (e) {
      console.warn("DB privacy fetch notice, using fallback:", e);
    }

    const sections = readPrivacyFile();
    return { success: true, data: sections };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load privacy policy.",
      data: DEFAULT_PRIVACY,
    };
  }
}

/**
 * Saves and publishes the dynamic privacy policy sections.
 * Authoritative: verifies admin identity and persists to Supabase cms_content.
 */
export async function saveCentralPrivacyAction(
  items: CentralPrivacyItem[]
): Promise<ActionResponse<CentralPrivacyItem[]>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    if (!Array.isArray(items)) {
      return { success: false, error: "Invalid privacy sections format." };
    }

    // Renumber sequentially 1..N
    const normalized: CentralPrivacyItem[] = items.map((item, idx) => ({
      id: item.id || `priv-${Date.now()}-${idx}`,
      number: idx + 1,
      title: item.title.trim(),
      content: item.content.trim(),
    }));

    let dbPersisted = false;
    try {
      const adminClient = createAdminClient();
      const now = new Date().toISOString();
      const { error: dbErr } = await (adminClient as any).from("cms_content").upsert(
        {
          page_key: "privacy",
          published_data: { items: normalized },
          draft_data: { items: normalized },
          updated_at: now,
          updated_by: authCheck.adminId,
        },
        { onConflict: "page_key" }
      );
      if (!dbErr) {
        dbPersisted = true;
      } else {
        console.error("Database privacy upsert error:", dbErr.message);
      }
    } catch (dbEx) {
      console.warn("Database privacy upsert exception:", dbEx);
    }

    // Synchronize to local file for development environments
    writePrivacyFile(normalized);

    if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to persist Privacy Policy to database. Please try again.",
      };
    }

    safeRevalidatePath("/privacy");
    safeRevalidatePath("/admin/edit-page");

    return {
      success: true,
      data: normalized,
      message: "Privacy Policy sections published successfully.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save privacy sections.",
    };
  }
}
