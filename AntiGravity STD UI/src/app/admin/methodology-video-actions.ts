"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export type MethodologyVideoSource = "youtube" | "vimeo" | "local" | "external";

export interface MethodologyVideoSettings {
  sourceType: MethodologyVideoSource;
  videoUrl: string;
  embedUrl: string;
  title: string;
  subtitle: string;
  badgeText: string;
  durationText: string;
  thumbnailUrl: string;
  suggestedThumbnails?: string[];
  aspectRatio: "16:9" | "9:16" | "4:3" | "1:1" | "auto";
  isActive: boolean;
  updatedAt: string;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

const CONFIG_PATH = path.join(process.cwd(), "src", "config", "methodology-video.json");

const DEFAULT_SETTINGS: MethodologyVideoSettings = {
  sourceType: "youtube",
  videoUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o",
  embedUrl: "https://www.youtube-nocookie.com/embed/iCvmsMzlF7o?autoplay=1&rel=0&modestbranding=1",
  title: "Guided LMS Walkthrough",
  subtitle: "Discover how the SpeakUp system works, how students enroll, and how to navigate the LMS.",
  badgeText: "Guided Walkthrough",
  durationText: "3:20 • Walkthrough",
  thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  suggestedThumbnails: [],
  aspectRatio: "16:9",
  isActive: true,
  updatedAt: new Date().toISOString(),
};

function readLocalSettings(): MethodologyVideoSettings {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, "utf-8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("Error reading methodology-video.json:", err);
  }
  return DEFAULT_SETTINGS;
}

function writeLocalSettings(settings: MethodologyVideoSettings): void {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing methodology-video.json:", err);
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

export async function normalizeMethodologyVideoUrl(
  url: string,
  sourceType: MethodologyVideoSource
): Promise<{ embedUrl: string; detectedAspect: "16:9" | "9:16" | "4:3" | "1:1" | "auto"; defaultThumb?: string }> {
  const trimmed = (url || "").trim();

  if (sourceType === "youtube" || trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
    let videoId = "";
    const ytMatch = trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
    );
    if (ytMatch) {
      videoId = ytMatch[1];
    } else if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      videoId = trimmed;
    }

    const isShorts = trimmed.includes("/shorts/");
    return {
      embedUrl: videoId
        ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
        : trimmed,
      detectedAspect: isShorts ? "9:16" : "16:9",
      defaultThumb: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined,
    };
  }

  if (sourceType === "vimeo" || trimmed.includes("vimeo.com")) {
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
    const vimeoId = vimeoMatch ? vimeoMatch[3] : "";
    return {
      embedUrl: vimeoId ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1` : trimmed,
      detectedAspect: "16:9",
    };
  }

  return {
    embedUrl: trimmed,
    detectedAspect: "16:9",
  };
}

export async function getMethodologyVideoSettingsAction(): Promise<ActionResponse<MethodologyVideoSettings>> {
  try {
    const settings = readLocalSettings();
    return { success: true, data: settings };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load methodology video settings.", data: DEFAULT_SETTINGS };
  }
}

export async function saveMethodologyVideoSettingsAction(
  updates: Partial<MethodologyVideoSettings>
): Promise<ActionResponse<MethodologyVideoSettings>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const current = readLocalSettings();
    const updated: MethodologyVideoSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.videoUrl && updates.sourceType) {
      const normalized = await normalizeMethodologyVideoUrl(updates.videoUrl, updates.sourceType);
      updated.embedUrl = normalized.embedUrl;
      if (!updates.thumbnailUrl && normalized.defaultThumb) {
        updated.thumbnailUrl = normalized.defaultThumb;
      }
    }

    writeLocalSettings(updated);

    try {
      let supabase: any;
      try {
        supabase = createAdminClient();
      } catch {
        supabase = await createClient();
      }
      await supabase.from("cms_content").upsert({
        page_key: "methodology_guided_video",
        published_data: updated,
        draft_data: updated,
        updated_at: updated.updatedAt,
        updated_by: authCheck.adminId,
      });
    } catch {}

    revalidatePath("/methodology");
    revalidatePath("/admin/pages");

    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save methodology video settings." };
  }
}

export async function removeMethodologyVideoAction(): Promise<ActionResponse<MethodologyVideoSettings>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const cleared: MethodologyVideoSettings = {
      ...DEFAULT_SETTINGS,
      videoUrl: "",
      embedUrl: "",
      isActive: false,
      updatedAt: new Date().toISOString(),
    };

    writeLocalSettings(cleared);
    revalidatePath("/methodology");

    return { success: true, data: cleared };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to remove methodology video." };
  }
}
