"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyAdminCaller as verifyAdminMfaCaller } from "@/lib/auth/adminVerification";

export interface CentralFaqItem {
  id: string;
  question: string;
  answer: string;
  category: "General" | "Registration" | "LMS" | "Certificate" | "Learning Path" | "Pricing" | "Courses" | "Payment" | string;
  status: "published" | "draft";
  order_index?: number;
  updated_at?: string;
}

export type CentralFaq = CentralFaqItem;

const FAQS_FILE_PATH = path.join(process.cwd(), "src", "config", "central-faqs.json");

async function verifyAdminCaller(): Promise<{ adminId: string } | { error: string }> {
  return verifyAdminMfaCaller();
}

function readCentralFaqs(): CentralFaqItem[] {
  try {
    if (!fs.existsSync(FAQS_FILE_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(FAQS_FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read central-faqs.json", err);
    return [];
  }
}

function writeCentralFaqs(faqs: CentralFaqItem[]): void {
  try {
    const dir = path.dirname(FAQS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FAQS_FILE_PATH, JSON.stringify(faqs, null, 2), "utf-8");
  } catch (err) {
    console.warn("Local central-faqs.json write skipped in serverless environment:", err);
  }
}

/**
 * Retrieves all FAQs.
 * Authoritative: checks Supabase cms_content first with local JSON file fallback.
 */
export async function getCentralFaqsAction(): Promise<{
  success: boolean;
  data: CentralFaqItem[];
  error?: string;
}> {
  try {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from("cms_content")
        .select("published_data")
        .eq("page_key", "faqs")
        .maybeSingle();

      if (!error && data?.published_data?.faqs && Array.isArray(data.published_data.faqs)) {
        return { success: true, data: data.published_data.faqs };
      }
    } catch (e) {
      console.warn("DB FAQs fetch notice, using fallback:", e);
    }

    const faqs = readCentralFaqs();
    return { success: true, data: faqs };
  } catch (err: any) {
    return { success: false, data: [], error: err?.message || "Failed to load FAQs." };
  }
}

/**
 * Creates or updates an FAQ.
 * Authoritative: verifies admin credentials and persists to Supabase cms_content.
 */
export async function saveCentralFaqAction(
  faq: Partial<CentralFaqItem> & { question: string; answer: string; category: string }
): Promise<{ success: boolean; data?: CentralFaqItem; error?: string }> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const question = faq.question.trim();
    const answer = faq.answer.trim();
    const category = faq.category.trim();

    if (!question) {
      return { success: false, error: "Question is required." };
    }
    if (!answer) {
      return { success: false, error: "Answer is required." };
    }

    const currentFaqs = (await getCentralFaqsAction()).data || readCentralFaqs();
    const faqId = faq.id || `faq-${Date.now()}`;
    const existingIndex = currentFaqs.findIndex((f) => f.id === faqId);
    const now = new Date().toISOString();

    const updatedItem: CentralFaqItem = {
      id: faqId,
      question,
      answer,
      category,
      status: faq.status || "published",
      order_index: faq.order_index ?? (existingIndex >= 0 ? currentFaqs[existingIndex].order_index : currentFaqs.length + 1),
      updated_at: now,
    };

    if (existingIndex >= 0) {
      currentFaqs[existingIndex] = updatedItem;
    } else {
      currentFaqs.push(updatedItem);
    }

    let dbPersisted = false;
    try {
      const adminClient = createAdminClient();
      const { error: dbErr } = await (adminClient as any).from("cms_content").upsert(
        {
          page_key: "faqs",
          published_data: { faqs: currentFaqs },
          draft_data: { faqs: currentFaqs },
          updated_at: now,
          updated_by: authCheck.adminId,
        },
        { onConflict: "page_key" }
      );
      if (!dbErr) {
        dbPersisted = true;
      } else {
        console.error("Database FAQ upsert error:", dbErr.message);
      }
    } catch (dbEx) {
      console.warn("Database FAQ upsert exception:", dbEx);
    }

    writeCentralFaqs(currentFaqs);

    if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to persist FAQ to database. Please try again.",
      };
    }

    revalidatePath("/faq");
    revalidatePath("/admin/faqs");
    return { success: true, data: updatedItem };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save FAQ." };
  }
}

/**
 * Deletes an FAQ.
 * Authoritative: verifies admin credentials and updates Supabase cms_content.
 */
export async function deleteCentralFaqAction(
  faqId: string
): Promise<{ success: boolean; error?: string }> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const currentFaqs = (await getCentralFaqsAction()).data || readCentralFaqs();
    const filtered = currentFaqs.filter((f) => f.id !== faqId);
    const now = new Date().toISOString();

    let dbPersisted = false;
    try {
      const adminClient = createAdminClient();
      const { error: dbErr } = await (adminClient as any).from("cms_content").upsert(
        {
          page_key: "faqs",
          published_data: { faqs: filtered },
          draft_data: { faqs: filtered },
          updated_at: now,
          updated_by: authCheck.adminId,
        },
        { onConflict: "page_key" }
      );
      if (!dbErr) {
        dbPersisted = true;
      } else {
        console.error("Database FAQ delete update error:", dbErr.message);
      }
    } catch (dbEx) {
      console.warn("Database FAQ delete update exception:", dbEx);
    }

    writeCentralFaqs(filtered);

    if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to delete FAQ in database. Please try again.",
      };
    }

    revalidatePath("/faq");
    revalidatePath("/admin/faqs");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete FAQ." };
  }
}
