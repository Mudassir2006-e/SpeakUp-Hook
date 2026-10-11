"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export interface MethodologyMediaItem {
  id: string;
  url: string;
  title?: string;
  caption?: string;
  order: number;
  fitMode?: "cover" | "contain"; // "Fill Frame" (cover) vs "Fit to Frame" (contain)
  objectPosition?: string;       // e.g. "center", "top", "bottom", "left", "right"
}

export interface MethodologyMediaConfig {
  items: MethodologyMediaItem[];
  publishedItems: MethodologyMediaItem[];
  updated_at: string;
}

const CONFIG_PATH = path.join(process.cwd(), "src", "config", "methodology-media.json");

const DEFAULT_CONFIG: MethodologyMediaConfig = {
  items: [
    {
      id: "meth-1",
      url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      title: "Interactive Lecture Classroom",
      caption: "High-definition masterclasses with granular pause control, phonetic guidance, and synchronized study notes.",
      order: 1,
    },
    {
      id: "meth-2",
      url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
      title: "Acoustic Drill & Cadence Lab",
      caption: "Precision verbal cadence drills, oral articulation directives, and self-evaluation pacing benchmarks.",
      order: 2,
    },
    {
      id: "meth-3",
      url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
      title: "Executive Boardroom Simulation",
      caption: "Simulated high-pressure rhetoric scenarios and defense seminars to cement natural subconscious fluency.",
      order: 3,
    },
    {
      id: "meth-4",
      url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80",
      title: "Personalized Feedback Matrix",
      caption: "Comprehensive mentor evaluation summaries focusing on voice modulation, syntactic clarity, and rhetoric.",
      order: 4,
    },
  ],
  publishedItems: [
    {
      id: "meth-1",
      url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      title: "Interactive Lecture Classroom",
      caption: "High-definition masterclasses with granular pause control, phonetic guidance, and synchronized study notes.",
      order: 1,
    },
    {
      id: "meth-2",
      url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
      title: "Acoustic Drill & Cadence Lab",
      caption: "Precision verbal cadence drills, oral articulation directives, and self-evaluation pacing benchmarks.",
      order: 2,
    },
    {
      id: "meth-3",
      url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
      title: "Executive Boardroom Simulation",
      caption: "Simulated high-pressure rhetoric scenarios and defense seminars to cement natural subconscious fluency.",
      order: 3,
    },
    {
      id: "meth-4",
      url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80",
      title: "Personalized Feedback Matrix",
      caption: "Comprehensive mentor evaluation summaries focusing on voice modulation, syntactic clarity, and rhetoric.",
      order: 4,
    },
  ],
  updated_at: new Date().toISOString(),
};

function readLocalConfig(): MethodologyMediaConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("Error reading methodology-media.json:", err);
  }
  return DEFAULT_CONFIG;
}

function writeLocalConfig(cfg: MethodologyMediaConfig): void {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing methodology-media.json:", err);
  }
}

async function verifyAdmin(): Promise<boolean> {
  try {
    const { userId, role } = await getCurrentUserRole();
    return Boolean(userId && role === "admin");
  } catch {
    return false;
  }
}

async function getSupabaseClient() {
  try {
    return createAdminClient() as any;
  } catch {
    return (await createClient()) as any;
  }
}

/**
 * Public action: Retrieves published methodology media for the Home page slider showcase.
 */
export async function getPublishedMethodologyMediaAction(): Promise<{
  success: boolean;
  data: MethodologyMediaItem[];
  error?: string;
}> {
  try {
    // 1. Try DB first
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("methodology_media")
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true });

      if (!error && data && data.length > 0) {
        return {
          success: true,
          data: data.map((d: any) => ({
            id: d.id,
            url: d.image_url,
            title: d.caption || "",
            caption: d.caption || "",
            order: d.display_order,
          })),
        };
      }
    } catch {
      // Fall through to local config
    }

    // 2. Local config fallback
    const config = readLocalConfig();
    const published = config.publishedItems && config.publishedItems.length > 0
      ? config.publishedItems
      : config.items;

    return {
      success: true,
      data: published,
    };
  } catch (err: any) {
    return {
      success: false,
      data: DEFAULT_CONFIG.publishedItems,
      error: err?.message,
    };
  }
}

/**
 * Admin action: Retrieves draft and published methodology media items.
 */
export async function getMethodologyMediaAction(): Promise<{
  success: boolean;
  data?: {
    items: MethodologyMediaItem[];
    publishedItems: MethodologyMediaItem[];
    updated_at: string;
  };
  error?: string;
}> {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized: Administrator privileges required." };
  }

  const config = readLocalConfig();
  return {
    success: true,
    data: config,
  };
}

/**
 * Admin action: Saves draft methodology media items without affecting the public site.
 */
export async function saveMethodologyMediaDraftAction(
  items: MethodologyMediaItem[]
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized: Administrator privileges required." };
  }

  if (!Array.isArray(items)) {
    return { success: false, error: "Invalid items array." };
  }

  try {
    const config = readLocalConfig();
    config.items = items.slice(0, 10).map((it, idx) => ({
      ...it,
      order: idx + 1,
    }));
    config.updated_at = new Date().toISOString();
    writeLocalConfig(config);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save draft." };
  }
}

/**
 * Admin action: Publishes the draft items to the public website.
 */
export async function publishMethodologyMediaAction(
  items: MethodologyMediaItem[]
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized: Administrator privileges required." };
  }

  try {
    const validItems = items.map((it, idx) => ({
      ...it,
      order: idx + 1,
    }));

    const config = readLocalConfig();
    config.items = validItems;
    config.publishedItems = validItems;
    config.updated_at = new Date().toISOString();
    writeLocalConfig(config);

    // Sync to Supabase methodology_media if available
    try {
      const supabase = await getSupabaseClient();
      // Delete existing and reinsert with display_order
      await supabase.from("methodology_media").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      for (const it of validItems) {
        await supabase.from("methodology_media").insert({
          image_url: it.url,
          caption: it.title || it.caption || "",
          display_order: it.order,
          is_published: true,
        });
      }
    } catch (dbErr) {
      console.warn("Notice: DB sync methodology_media fallback:", dbErr);
    }

    revalidatePath("/");
    revalidatePath("/methodology");
    revalidatePath("/admin/edit");
    revalidatePath("/admin/edit-page");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to publish methodology media." };
  }
}

/**
 * Admin action: Permanently deletes a methodology media item/reference.
 */
export async function deleteMethodologyMediaItemAction(
  itemId: string
): Promise<{ success: boolean; data?: MethodologyMediaItem[]; error?: string }> {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized: Administrator privileges required." };
  }

  try {
    const config = readLocalConfig();
    config.items = config.items
      .filter((it) => it.id !== itemId)
      .map((it, idx) => ({ ...it, order: idx + 1 }));
    config.publishedItems = (config.publishedItems || [])
      .filter((it) => it.id !== itemId)
      .map((it, idx) => ({ ...it, order: idx + 1 }));
    config.updated_at = new Date().toISOString();
    writeLocalConfig(config);

    // Sync deletion to Supabase
    try {
      const supabase = await getSupabaseClient();
      await supabase.from("methodology_media").delete().eq("id", itemId);
    } catch (dbErr) {
      console.warn("Notice: DB sync methodology_media delete fallback:", dbErr);
    }

    revalidatePath("/");
    revalidatePath("/methodology");
    revalidatePath("/admin/edit");

    return { success: true, data: config.items };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete methodology media item." };
  }
}

/**
 * Admin action: Reverts unpublished draft back to the latest published state.
 */
export async function revertMethodologyMediaDraftAction(): Promise<{
  success: boolean;
  data?: MethodologyMediaItem[];
  error?: string;
}> {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized: Administrator privileges required." };
  }

  try {
    const config = readLocalConfig();
    const published = config.publishedItems || [];
    config.items = JSON.parse(JSON.stringify(published));
    config.updated_at = new Date().toISOString();
    writeLocalConfig(config);

    return {
      success: true,
      data: config.items,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to revert draft." };
  }
}

/**
 * Admin action: Uploads a screenshot/image asset for Methodology Media showcase.
 */
export async function uploadMethodologyMediaImageAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; fileName?: string; error?: string }> {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized: Administrator privileges required." };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No image file provided." };
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { success: false, error: "Only JPEG, PNG, and WebP images are supported." };
  }

  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: "Image file exceeds maximum allowed limit of 8 MB." };
  }

  try {
    const adminClient = createAdminClient();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `methodology_media/${Date.now()}_${sanitizedName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("website_assets")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (!uploadError) {
      const { data: pubData } = adminClient.storage.from("website_assets").getPublicUrl(storagePath);
      return { success: true, url: pubData.publicUrl, fileName: file.name };
    }

    // Try fallback to avatars bucket or local uploads
    const { error: avatarError } = await adminClient.storage
      .from("avatars")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (!avatarError) {
      const { data: pubData } = adminClient.storage.from("avatars").getPublicUrl(storagePath);
      return { success: true, url: pubData.publicUrl, fileName: file.name };
    }

    // Local filesystem fallback
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "methodology");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const localFileName = `${Date.now()}_${sanitizedName}`;
    fs.writeFileSync(path.join(uploadsDir, localFileName), buffer);

    return {
      success: true,
      url: `/uploads/methodology/${localFileName}`,
      fileName: file.name,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to process image upload." };
  }
}
