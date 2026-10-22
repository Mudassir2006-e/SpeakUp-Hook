"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { verifyAdminCaller as verifyAdminMfaCaller } from "@/lib/auth/adminVerification";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export interface CentralTeacherItem {
  id: string;
  name: string;
  title: string;
  description: string;
  subject?: string;
  initials: string;
  avatarUrl?: string;
  order: number;
  isPublished: boolean;
  featuredOnAboutBanner?: boolean;
  avatarFitMode?: "cover" | "contain";
  avatarPosition?: string;
  updatedAt: string;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

const TEACHERS_PATH = path.join(process.cwd(), "src", "config", "central-teachers.json");
const FOUNDER_PATH = path.join(process.cwd(), "src", "config", "central-founder.json");

function readTeachersStore(): CentralTeacherItem[] {
  try {
    if (fs.existsSync(TEACHERS_PATH)) {
      const raw = fs.readFileSync(TEACHERS_PATH, "utf-8");
      const list = JSON.parse(raw || "[]");
      if (Array.isArray(list)) {
        return list.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    }
  } catch (err) {
    console.error("Error reading central-teachers.json:", err);
  }
  return [];
}

function writeTeachersStore(items: CentralTeacherItem[]) {
  try {
    const dir = path.dirname(TEACHERS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TEACHERS_PATH, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing central-teachers.json:", err);
  }
}

async function verifyAdminCaller(): Promise<{ adminId: string } | { error: string }> {
  return verifyAdminMfaCaller();
}

/**
 * Retrieves all teachers / faculty members.
 */
export async function getCentralTeachersAction(): Promise<ActionResponse<CentralTeacherItem[]>> {
  try {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from("cms_content")
        .select("published_data")
        .eq("page_key", "site_faculty")
        .maybeSingle();

      if (!error && (data as any)?.published_data && Array.isArray((data as any).published_data)) {
        return { success: true, data: data.published_data };
      }
    } catch (e) {
      console.warn("DB faculty fetch notice:", e);
    }

    const items = readTeachersStore();
    return { success: true, data: items };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load teachers.", data: [] };
  }
}

/**
 * Creates or updates a teacher / faculty member.
 */
export async function saveCentralTeacherAction(
  teacher: Partial<CentralTeacherItem> & { name: string; title: string; description: string }
): Promise<ActionResponse<CentralTeacherItem>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const name = teacher.name?.trim();
  const title = teacher.title?.trim();
  const description = teacher.description?.trim();

  if (!name) {
    return { success: false, error: "Teacher name is required." };
  }
  if (!title) {
    return { success: false, error: "Teacher role/title is required." };
  }
  if (!description) {
    return { success: false, error: "Teacher description is required." };
  }

  try {
    const items = (await getCentralTeachersAction()).data || readTeachersStore();
    const now = new Date().toISOString();
    const id = teacher.id || `tea-${Date.now()}`;

    // Auto-generate initials if not specified
    const initials =
      teacher.initials?.trim().toUpperCase() ||
      name
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() ||
      "T";

    const updatedItem: CentralTeacherItem = {
      id,
      name,
      title,
      description,
      initials,
      avatarUrl: teacher.avatarUrl || "",
      order: typeof teacher.order === "number" ? teacher.order : items.length + 1,
      isPublished: teacher.isPublished !== false,
      updatedAt: now,
    };

    const existingIndex = items.findIndex((i) => i.id === id);
    if (existingIndex >= 0) {
      items[existingIndex] = updatedItem;
    } else {
      items.push(updatedItem);
    }

    items.sort((a, b) => (a.order || 0) - (b.order || 0));
    writeTeachersStore(items);

    // Sync to Supabase cms_content
    let dbPersisted = false;
    try {
      let supabaseClient: any;
      try {
        supabaseClient = createAdminClient();
      } catch {
        supabaseClient = await createClient();
      }

      const { error: dbErr } = await supabaseClient.from("cms_content").upsert(
        {
          page_key: "site_faculty",
          published_data: items,
          draft_data: items,
          updated_at: now,
          updated_by: authCheck.adminId,
        },
        { onConflict: "page_key" }
      );
      if (!dbErr) {
        dbPersisted = true;
      } else {
        console.error("Database faculty upsert error:", dbErr.message);
      }
    } catch (dbErr) {
      console.warn("Database faculty upsert exception:", dbErr);
    }

    if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to persist teacher to database. Please try again.",
      };
    }

    revalidatePath("/admin/teachers");
    revalidatePath("/about");
    revalidatePath("/faculty");

    return { success: true, data: updatedItem };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save teacher." };
  }
}

/**
 * Permanently deletes a teacher record.
 */
export async function deleteCentralTeacherAction(id: string): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const items = (await getCentralTeachersAction()).data || readTeachersStore();
    const filtered = items.filter((i) => i.id !== id);
    filtered.forEach((item, idx) => {
      item.order = idx + 1;
    });

    writeTeachersStore(filtered);

    // Sync to Supabase cms_content
    let dbPersisted = false;
    try {
      let supabaseClient: any;
      try {
        supabaseClient = createAdminClient();
      } catch {
        supabaseClient = await createClient();
      }

      const { error: dbErr } = await supabaseClient.from("cms_content").upsert(
        {
          page_key: "site_faculty",
          published_data: filtered,
          draft_data: filtered,
          updated_at: new Date().toISOString(),
          updated_by: authCheck.adminId,
        },
        { onConflict: "page_key" }
      );
      if (!dbErr) {
        dbPersisted = true;
      }
    } catch (err) {
      console.warn("Database faculty delete exception:", err);
    }

    if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to delete teacher from database. Please try again.",
      };
    }

    revalidatePath("/admin/teachers");
    revalidatePath("/about");
    revalidatePath("/faculty");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete teacher." };
  }
}

/**
 * Updates display order of teachers.
 */
export async function reorderCentralTeachersAction(orderedIds: string[]): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const items = readTeachersStore();
    const idMap = new Map(items.map((i) => [i.id, i]));
    const reordered: CentralTeacherItem[] = [];

    orderedIds.forEach((id, idx) => {
      const item = idMap.get(id);
      if (item) {
        item.order = idx + 1;
        reordered.push(item);
        idMap.delete(id);
      }
    });

    // Append any unreferenced items
    idMap.forEach((item) => {
      item.order = reordered.length + 1;
      reordered.push(item);
    });

    writeTeachersStore(reordered);

    revalidatePath("/admin/teachers");
    revalidatePath("/about");
    revalidatePath("/faculty");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reorder teachers." };
  }
}

/**
 * Uploads a teacher profile picture with format & size validation.
 */
export async function uploadTeacherAvatarAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No image file provided." };
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return { success: false, error: "Only JPEG, PNG, and WebP images are supported." };
  }

  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: "Image file exceeds maximum allowed limit of 8 MB." };
  }

  try {
    const adminClient = createAdminClient();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `faculty/${Date.now()}_${sanitizedName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("website_assets")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.warn("Notice: Storage bucket fallback:", uploadError.message);
      // Fallback: save to public/uploads/faculty only in local development
      if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
        try {
          const publicDir = path.join(process.cwd(), "public", "uploads", "faculty");
          if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
          }
          const localFileName = `${Date.now()}_${sanitizedName}`;
          fs.writeFileSync(path.join(publicDir, localFileName), buffer);
          return { success: true, url: `/uploads/faculty/${localFileName}` };
        } catch (fsErr) {
          console.warn("Local faculty picture write skipped:", fsErr);
        }
      }
      return { success: false, error: "Failed to upload teacher picture to storage." };
    }

    const { data: publicData } = adminClient.storage
      .from("website_assets")
      .getPublicUrl(storagePath);

    return { success: true, url: publicData.publicUrl };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to upload teacher picture." };
  }
}

// ==========================================
// FOUNDER / ABOUT PAGE TEACHER PHOTO (SECTION 8)
// ==========================================

export interface FounderTeacherPhotoData {
  photoUrl: string;
  zoom: number;
  posX: number;
  posY: number;
  fitMode: "cover" | "contain";
  position: "center" | "top" | "bottom";
  updatedAt: string;
}

const DEFAULT_FOUNDER_PHOTO: FounderTeacherPhotoData = {
  photoUrl: "",
  zoom: 1,
  posX: 0,
  posY: 0,
  fitMode: "cover",
  position: "center",
  updatedAt: "2026-10-10T12:00:00.000Z",
};

function readFounderStore(): FounderTeacherPhotoData {
  try {
    if (fs.existsSync(FOUNDER_PATH)) {
      const raw = fs.readFileSync(FOUNDER_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_FOUNDER_PHOTO, ...parsed };
    }
  } catch (err) {
    console.error("Error reading central-founder.json:", err);
  }
  return DEFAULT_FOUNDER_PHOTO;
}

function writeFounderStore(data: FounderTeacherPhotoData): void {
  try {
    const dir = path.dirname(FOUNDER_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FOUNDER_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing central-founder.json:", err);
  }
}

export async function getFounderTeacherPhotoAction(): Promise<ActionResponse<FounderTeacherPhotoData>> {
  try {
    const data = readFounderStore();
    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to load founder photo.",
      data: DEFAULT_FOUNDER_PHOTO,
    };
  }
}

export async function saveFounderTeacherPhotoAction(
  update: Partial<FounderTeacherPhotoData>
): Promise<ActionResponse<FounderTeacherPhotoData>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const current = readFounderStore();
    const updated: FounderTeacherPhotoData = {
      ...current,
      ...update,
      photoUrl: update.photoUrl ?? current.photoUrl ?? "",
      zoom: typeof update.zoom === "number" ? update.zoom : current.zoom,
      posX: typeof update.posX === "number" ? update.posX : current.posX,
      posY: typeof update.posY === "number" ? update.posY : current.posY,
      fitMode: update.fitMode || current.fitMode || "cover",
      position: update.position || current.position || "center",
      updatedAt: new Date().toISOString(),
    };

    writeFounderStore(updated);

    revalidatePath("/about");
    revalidatePath("/admin/teachers");
    revalidatePath("/admin/edit-page");

    return {
      success: true,
      data: updated,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save founder photo." };
  }
}

export async function deleteFounderTeacherPhotoAction(): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const cleared: FounderTeacherPhotoData = {
      photoUrl: "",
      zoom: 1,
      posX: 0,
      posY: 0,
      fitMode: "cover",
      position: "center",
      updatedAt: new Date().toISOString(),
    };

    writeFounderStore(cleared);

    revalidatePath("/about");
    revalidatePath("/admin/teachers");
    revalidatePath("/admin/edit-page");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to remove founder photo." };
  }
}
