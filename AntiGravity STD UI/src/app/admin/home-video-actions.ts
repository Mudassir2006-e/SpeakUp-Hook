"use server";

import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

export type HomeVideoSource = "youtube" | "instagram" | "facebook" | "vimeo" | "local" | "external";

export interface HomeVideoSettings {
  sourceType: HomeVideoSource;
  videoUrl: string;
  embedUrl: string;
  title: string;
  subtitle: string;
  badgeText: string;
  durationText: string;
  thumbnailUrl: string;
  suggestedThumbnails: string[];
  aspectRatio: "16:9" | "9:16" | "4:3" | "1:1" | "auto";
  isActive: boolean;
  updatedAt: string;
}

const CONFIG_PATH = path.join(process.cwd(), "src", "config", "home-video.json");

const DEFAULT_SETTINGS: HomeVideoSettings = {
  sourceType: "youtube",
  videoUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o",
  embedUrl: "https://www.youtube-nocookie.com/embed/iCvmsMzlF7o?autoplay=1&rel=0&modestbranding=1",
  title: "Discover SpeakUp",
  subtitle: "Explore our premier communication training, executive programs, and student transformation.",
  badgeText: "Brand Showcase",
  durationText: "2:45 • Overview",
  thumbnailUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
  suggestedThumbnails: [],
  aspectRatio: "16:9",
  isActive: true,
  updatedAt: new Date().toISOString(),
};

function readLocalSettings(): HomeVideoSettings {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, "utf-8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("Error reading home-video.json:", err);
  }
  return DEFAULT_SETTINGS;
}

function writeLocalSettings(settings: HomeVideoSettings): void {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing home-video.json:", err);
  }
}

/**
 * Normalizes an external video URL into a safe embed URL
 */
export async function normalizeVideoUrl(
  url: string,
  sourceType: HomeVideoSource
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

  if (sourceType === "instagram" || trimmed.includes("instagram.com")) {
    // Normalizes instagram post / reel URL to embed
    let clean = trimmed.split("?")[0].replace(/\/$/, "");
    if (!clean.endsWith("/embed")) {
      clean = `${clean}/embed`;
    }
    const isReel = trimmed.includes("/reel/");
    return {
      embedUrl: clean,
      detectedAspect: isReel ? "9:16" : "1:1",
    };
  }

  if (sourceType === "facebook" || trimmed.includes("facebook.com") || trimmed.includes("fb.watch")) {
    const encoded = encodeURIComponent(trimmed);
    const isReel = trimmed.includes("/reel/") || trimmed.includes("/reels/");
    return {
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=0`,
      detectedAspect: isReel ? "9:16" : "16:9",
    };
  }

  return {
    embedUrl: trimmed,
    detectedAspect: "auto",
  };
}

/**
 * Retrieves the current Home Video settings
 */
export async function getHomeVideoSettingsAction(): Promise<{
  success: boolean;
  data: HomeVideoSettings;
}> {
  try {
    const supabase = await createClient();
    const { data: record, error } = await (supabase as any)
      .from("cms_content")
      .select("content")
      .eq("page_key", "home_promotional_video")
      .maybeSingle();

    if (!error && (record as any)?.content && typeof (record as any).content === "object") {
      const merged: HomeVideoSettings = {
        ...DEFAULT_SETTINGS,
        ...(record.content as Partial<HomeVideoSettings>),
      };
      // Keep local sync in background
      writeLocalSettings(merged);
      return { success: true, data: merged };
    }
  } catch (err) {
    console.warn("Supabase fetch failed for home video settings, using local store:", err);
  }

  // Fallback to local store
  const local = readLocalSettings();
  return { success: true, data: local };
}

/**
 * Saves Home Video settings
 */
export async function saveHomeVideoSettingsAction(
  settings: Partial<HomeVideoSettings>
): Promise<{ success: boolean; data?: HomeVideoSettings; error?: string }> {
  try {
    const current = (await getHomeVideoSettingsAction()).data;
    const updated: HomeVideoSettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    // If videoUrl or sourceType changed, re-normalize embedUrl
    if (settings.videoUrl || settings.sourceType) {
      const srcType = updated.sourceType;
      const norm = await normalizeVideoUrl(updated.videoUrl, srcType);
      updated.embedUrl = norm.embedUrl;
      if (!settings.aspectRatio && norm.detectedAspect !== "auto") {
        updated.aspectRatio = norm.detectedAspect;
      }
      if (norm.defaultThumb && (!updated.thumbnailUrl || updated.thumbnailUrl === DEFAULT_SETTINGS.thumbnailUrl)) {
        updated.thumbnailUrl = norm.defaultThumb;
      }
    }

    // Persist to local config
    writeLocalSettings(updated);

    // Persist to Supabase cms_content
    try {
      const supabase = await createClient();
      await (supabase as any).from("cms_content").upsert(
        {
          page_key: "home_promotional_video",
          content: updated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "page_key" }
      );
    } catch (dbErr) {
      console.warn("Supabase upsert failed for home video, local config saved:", dbErr);
    }

    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save home video settings" };
  }
}

/**
 * Handles local video file upload (from desktop, tablet, or mobile file picker)
 */
export async function uploadHomeVideoFileAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get("video") as File;
    if (!file) {
      return { success: false, error: "No video file provided" };
    }

    // Validate mime type
    const validMimes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-matroska",
    ];
    if (!validMimes.includes(file.type) && !file.name.match(/\.(mp4|webm|ogg|mov|mkv)$/i)) {
      return { success: false, error: "Invalid video format. Please upload MP4, WebM, or MOV." };
    }

    // Validate size limit (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: "Video file exceeds 100MB limit." };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads/videos
    const uploadDir = path.join(process.cwd(), "public", "uploads", "videos");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.name) || ".mp4";
    const filename = `home-promo-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/videos/${filename}`;
    return { success: true, url: publicUrl };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to upload video" };
  }
}

/**
 * Handles custom thumbnail image upload
 */
export async function uploadHomeVideoThumbnailAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get("thumbnail") as File;
    if (!file) {
      return { success: false, error: "No image file provided" };
    }

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validMimes.includes(file.type)) {
      return { success: false, error: "Invalid image format. Allowed: JPG, PNG, WebP." };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Image file exceeds 5MB limit." };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "thumbnails");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.name) || ".jpg";
    const filename = `promo-thumb-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/thumbnails/${filename}`;
    return { success: true, url: publicUrl };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to upload thumbnail" };
  }
}

/**
 * Saves a base64 frame captured from uploaded video to server as a suggested thumbnail
 */
export async function saveFrameThumbnailAction(
  dataUrl: string,
  frameIndex: number
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    if (!dataUrl || !dataUrl.startsWith("data:image")) {
      return { success: false, error: "Invalid image data" };
    }

    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const uploadDir = path.join(process.cwd(), "public", "uploads", "thumbnails");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `promo-frame-${frameIndex}-${Date.now()}.jpg`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/thumbnails/${filename}`;
    return { success: true, url: publicUrl };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save frame thumbnail" };
  }
}
