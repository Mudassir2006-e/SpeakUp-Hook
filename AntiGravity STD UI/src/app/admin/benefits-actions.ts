"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export interface CentralBenefitItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  isPublished: boolean;
  updatedAt: string;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

const BENEFITS_PATH = path.join(process.cwd(), "src", "config", "central-benefits.json");

function readBenefitsStore(): CentralBenefitItem[] {
  try {
    if (fs.existsSync(BENEFITS_PATH)) {
      const raw = fs.readFileSync(BENEFITS_PATH, "utf-8");
      const list = JSON.parse(raw || "[]");
      if (Array.isArray(list)) {
        return list.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    }
  } catch (err) {
    console.error("Error reading central-benefits.json:", err);
  }
  return [];
}

function writeBenefitsStore(items: CentralBenefitItem[]) {
  try {
    const dir = path.dirname(BENEFITS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BENEFITS_PATH, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing central-benefits.json:", err);
  }
}

async function verifyAdminCaller(): Promise<{ adminId: string } | { error: string }> {
  try {
    const { userId, role } = await getCurrentUserRole();
    if (!userId || role !== "admin") {
      return { error: "Forbidden: Administrative privileges required." };
    }
    return { adminId: userId };
  } catch {
    return { error: "Authentication verification failed." };
  }
}

/**
 * Retrieves all institutional benefits.
 */
export async function getCentralBenefitsAction(): Promise<ActionResponse<CentralBenefitItem[]>> {
  try {
    const items = readBenefitsStore();
    return { success: true, data: items };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load benefits.", data: [] };
  }
}

/**
 * Creates or updates an institutional benefit.
 */
export async function saveCentralBenefitAction(
  benefit: Partial<CentralBenefitItem> & { title: string; description: string }
): Promise<ActionResponse<CentralBenefitItem>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const title = benefit.title?.trim();
  const description = benefit.description?.trim();

  if (!title) {
    return { success: false, error: "Benefit title is required." };
  }
  if (!description) {
    return { success: false, error: "Benefit description is required." };
  }

  try {
    const items = readBenefitsStore();
    const now = new Date().toISOString();
    const id = benefit.id || `ben-${Date.now()}`;

    const record: CentralBenefitItem = {
      id,
      title,
      description,
      icon: benefit.icon?.trim() || "verified",
      order: benefit.order !== undefined ? benefit.order : items.length + 1,
      isPublished: benefit.isPublished !== undefined ? benefit.isPublished : true,
      updatedAt: now,
    };

    const existingIdx = items.findIndex((b) => b.id === id);
    if (existingIdx !== -1) {
      items[existingIdx] = record;
    } else {
      items.push(record);
    }

    writeBenefitsStore(items);

    // Sync to Supabase
    try {
      let supabase: any;
      try {
        supabase = createAdminClient();
      } catch {
        supabase = await createClient();
      }
      await supabase.from("cms_content").upsert({
        page_key: "central_benefits",
        published_data: { items },
        draft_data: { items },
        updated_at: now,
        updated_by: authCheck.adminId,
      });
    } catch {}

    revalidatePath("/lms-journey");
    revalidatePath("/benefits");
    revalidatePath("/about");
    revalidatePath("/admin/benefits");

    return { success: true, data: record };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save benefit." };
  }
}

/**
 * Reorders benefits list.
 */
export async function reorderCentralBenefitsAction(
  orderedIds: string[]
): Promise<ActionResponse<CentralBenefitItem[]>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const items = readBenefitsStore();
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const reordered: CentralBenefitItem[] = [];

    orderedIds.forEach((id, idx) => {
      const item = itemMap.get(id);
      if (item) {
        item.order = idx + 1;
        reordered.push(item);
      }
    });

    // Append any missing items
    items.forEach((item) => {
      if (!orderedIds.includes(item.id)) {
        item.order = reordered.length + 1;
        reordered.push(item);
      }
    });

    writeBenefitsStore(reordered);

    revalidatePath("/lms-journey");
    revalidatePath("/benefits");
    revalidatePath("/about");
    revalidatePath("/admin/benefits");

    return { success: true, data: reordered };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reorder benefits." };
  }
}

/**
 * Deletes an institutional benefit.
 */
export async function deleteCentralBenefitAction(
  benefitId: string
): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const items = readBenefitsStore();
    const filtered = items.filter((b) => b.id !== benefitId);
    writeBenefitsStore(filtered);

    // Sync to Supabase
    try {
      let supabase: any;
      try {
        supabase = createAdminClient();
      } catch {
        supabase = await createClient();
      }
      await supabase.from("cms_content").upsert({
        page_key: "central_benefits",
        published_data: { items: filtered },
        draft_data: { items: filtered },
        updated_at: new Date().toISOString(),
        updated_by: authCheck.adminId,
      });
    } catch {}

    revalidatePath("/lms-journey");
    revalidatePath("/benefits");
    revalidatePath("/about");
    revalidatePath("/admin/benefits");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete benefit." };
  }
}
