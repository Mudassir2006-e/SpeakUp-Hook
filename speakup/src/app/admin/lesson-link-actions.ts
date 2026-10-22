"use server";

import fs from "fs";
import path from "path";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { validateAndFormatUrl } from "@/lib/urlValidation";
import type { LessonLinkButton, LessonLinkItemRecord } from "@/types/linkButton";

const LINKS_STORE_PATH = path.join(process.cwd(), "src", "config", "central-lesson-links.json");
const CURRICULUM_PATH = path.join(process.cwd(), "src", "config", "central-curriculum.json");

function safeRevalidatePath(p: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    if (typeof revalidatePath === "function") revalidatePath(p);
  } catch {}
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
      return fallback;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

import { verifyAdminCaller as verifyAdminMfaCaller } from "@/lib/auth/adminVerification";

/**
 * Validates admin caller permissions with mandatory two-factor email verification.
 */
async function verifyAdminCaller(): Promise<{ adminId: string } | { error: string }> {
  return verifyAdminMfaCaller();
}

/**
 * Loads the current lesson links store, reading from Supabase cms_content first
 * and falling back to local JSON if uninitialized.
 */
async function getStoredLessonLinks(): Promise<Record<string, LessonLinkItemRecord>> {
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }
    const { data: dbData, error: dbErr } = await supabase
      .from("cms_content")
      .select("published_data")
      .eq("page_key", "lesson_links")
      .maybeSingle();

    if (!dbErr && dbData?.published_data && typeof dbData.published_data === "object") {
      return dbData.published_data as Record<string, LessonLinkItemRecord>;
    }
  } catch (e) {
    console.warn("DB lesson links store lookup notice:", e);
  }

  return readJsonFile<Record<string, LessonLinkItemRecord>>(LINKS_STORE_PATH, {});
}

/**
 * Retrieves the Link Button configuration for a given lesson.
 * Checks Supabase cms_content first, then local JSON storage and curriculum definitions.
 */
export async function getLessonLinkAction(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<ActionResponse<LessonLinkButton | null>> {
  try {
    // 1. Authoritative check: retrieve from Supabase cms_content table
    try {
      let supabase: any;
      try {
        supabase = createAdminClient();
      } catch {
        supabase = await createClient();
      }
      const { data: dbData, error: dbErr } = await supabase
        .from("cms_content")
        .select("published_data")
        .eq("page_key", "lesson_links")
        .maybeSingle();

      if (!dbErr && dbData?.published_data && typeof dbData.published_data === "object") {
        const linksStore = dbData.published_data as Record<string, LessonLinkItemRecord>;
        const storeKey = `${courseId}_${moduleId}_${lessonId}`;

        if (linksStore[storeKey]) {
          const item = linksStore[storeKey];
          return {
            success: true,
            data: {
              enabled: item.enabled,
              text: item.text,
              url: item.url,
              description: item.description,
            },
          };
        }

        if (linksStore[lessonId]) {
          const item = linksStore[lessonId];
          return {
            success: true,
            data: {
              enabled: item.enabled,
              text: item.text,
              url: item.url,
              description: item.description,
            },
          };
        }
      }
    } catch (dbReadErr) {
      console.warn("DB lesson links lookup notice:", dbReadErr);
    }

    // 2. Fallback: check central-lesson-links.json
    const linksStore = readJsonFile<Record<string, LessonLinkItemRecord>>(LINKS_STORE_PATH, {});
    const storeKey = `${courseId}_${moduleId}_${lessonId}`;

    if (linksStore[storeKey]) {
      const item = linksStore[storeKey];
      return {
        success: true,
        data: {
          enabled: item.enabled,
          text: item.text,
          url: item.url,
          description: item.description,
        },
      };
    }

    if (linksStore[lessonId]) {
      const item = linksStore[lessonId];
      return {
        success: true,
        data: {
          enabled: item.enabled,
          text: item.text,
          url: item.url,
          description: item.description,
        },
      };
    }

    // 3. Fallback: check central-curriculum.json
    const curriculum = readJsonFile<Record<string, { modules: any[] }>>(CURRICULUM_PATH, {});
    const normCourseId = courseId.toLowerCase().trim();

    let matchedLesson: any = null;
    for (const [cKey, cVal] of Object.entries(curriculum)) {
      if (cKey.toLowerCase() === normCourseId && Array.isArray(cVal.modules)) {
        for (const m of cVal.modules) {
          if (m.id === moduleId && Array.isArray(m.lessons)) {
            matchedLesson = m.lessons.find((l: any) => l.id === lessonId);
            if (matchedLesson) break;
          }
        }
      }
      if (matchedLesson) break;
    }

    if (matchedLesson?.link_button) {
      return { success: true, data: matchedLesson.link_button };
    }

    if (matchedLesson?.link_button_url) {
      return {
        success: true,
        data: {
          enabled: matchedLesson.link_button_enabled ?? true,
          text: matchedLesson.link_button_text || "Open Learning Resource",
          url: matchedLesson.link_button_url,
          description: matchedLesson.link_button_description || "",
        },
      };
    }

    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load lesson link button.",
    };
  }
}

/**
 * Saves or updates a Link Button configuration for a specific lesson.
 * Persists to Supabase cms_content (page_key: 'lesson_links'), updates curriculum,
 * and synchronizes local JSON fallback storage.
 */
export async function saveLessonLinkAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
  data: {
    enabled: boolean;
    text: string;
    url: string;
    description?: string;
  }
): Promise<ActionResponse<LessonLinkButton>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const cleanText = (data.text || "").trim() || "Open Learning Resource";
  const cleanDescription = (data.description || "").trim();

  // Validate URL when link is enabled or URL is provided
  if (data.enabled || data.url?.trim()) {
    const urlValidation = validateAndFormatUrl(data.url);
    if (!urlValidation.isValid) {
      return {
        success: false,
        error: urlValidation.error || "Please enter a valid website URL.",
      };
    }
    data.url = urlValidation.formattedUrl;
  } else {
    data.url = data.url?.trim() || "";
  }

  try {
    const now = new Date().toISOString();
    const linkButtonConfig: LessonLinkButton = {
      enabled: Boolean(data.enabled),
      text: cleanText,
      url: data.url,
      description: cleanDescription,
    };

    // 1. Retrieve current links store (DB first, merged with local JSON fallback)
    const linksStore = await getStoredLessonLinks();
    const storeKey = `${courseId}_${moduleId}_${lessonId}`;

    const linkRecord: LessonLinkItemRecord = {
      ...linkButtonConfig,
      courseId,
      moduleId,
      lessonId,
      updatedAt: now,
    };

    linksStore[storeKey] = linkRecord;
    linksStore[lessonId] = linkRecord;

    // 2. Persist to Supabase cms_content table
    let dbPersisted = false;
    try {
      let supabase: any;
      try {
        supabase = createAdminClient();
      } catch {
        supabase = await createClient();
      }
      const { error: dbErr } = await supabase.from("cms_content").upsert(
        {
          page_key: "lesson_links",
          published_data: linksStore,
          draft_data: linksStore,
          updated_at: now,
          updated_by: authCheck.adminId,
        },
        { onConflict: "page_key" }
      );

      if (!dbErr) {
        dbPersisted = true;
      } else {
        console.error("Database lesson links upsert error:", dbErr.message);
      }
    } catch (dbErr) {
      console.warn("Database lesson links upsert notice:", dbErr);
    }

    // 3. Update local fallback stores for offline/development environments
    writeJsonFile(LINKS_STORE_PATH, linksStore);

    const curriculum = readJsonFile<Record<string, { modules: any[] }>>(CURRICULUM_PATH, {});
    const normCourseId = courseId.toLowerCase().trim();

    for (const [cKey, cVal] of Object.entries(curriculum)) {
      if (cKey.toLowerCase() === normCourseId && Array.isArray(cVal.modules)) {
        for (const m of cVal.modules) {
          if (m.id === moduleId && Array.isArray(m.lessons)) {
            const lIdx = m.lessons.findIndex((l: any) => l.id === lessonId);
            if (lIdx !== -1) {
              m.lessons[lIdx].link_button = linkButtonConfig;
              m.lessons[lIdx].link_button_text = linkButtonConfig.text;
              m.lessons[lIdx].link_button_url = linkButtonConfig.url;
              m.lessons[lIdx].link_button_enabled = linkButtonConfig.enabled;
              m.lessons[lIdx].link_button_description = linkButtonConfig.description;
            }
          }
        }
      }
    }
    writeJsonFile(CURRICULUM_PATH, curriculum);

    // 4. Fail cleanly if persistent cloud write failed in production
    if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to persist lesson link configuration to the database. Please try again.",
      };
    }

    // 5. Touch updated_at on Supabase lessons table if row exists
    try {
      const adminClient = createAdminClient();
      await (adminClient as any).from("lessons").update({
        updated_at: now,
      }).eq("id", lessonId);
    } catch {}

    safeRevalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
    safeRevalidatePath(`/admin/courses/${courseId}/modules/${moduleId}`);
    safeRevalidatePath(`/admin/edit-course-outline`);
    safeRevalidatePath(`/lms/learn`);

    return {
      success: true,
      data: linkButtonConfig,
      message: "Link Button successfully configured and persisted.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save Link Button.",
    };
  }
}

/**
 * Deletes / removes the Link Button for a given lesson.
 * Removes from Supabase cms_content (page_key: 'lesson_links'), curriculum,
 * and local JSON fallback stores.
 */
export async function deleteLessonLinkAction(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const now = new Date().toISOString();
    const linksStore = await getStoredLessonLinks();
    const storeKey = `${courseId}_${moduleId}_${lessonId}`;
    delete linksStore[storeKey];
    delete linksStore[lessonId];

    // 1. Persist deletion to Supabase cms_content table
    let dbPersisted = false;
    try {
      let supabase: any;
      try {
        supabase = createAdminClient();
      } catch {
        supabase = await createClient();
      }
      const { error: dbErr } = await supabase.from("cms_content").upsert(
        {
          page_key: "lesson_links",
          published_data: linksStore,
          draft_data: linksStore,
          updated_at: now,
          updated_by: authCheck.adminId,
        },
        { onConflict: "page_key" }
      );

      if (!dbErr) {
        dbPersisted = true;
      } else {
        console.error("Database lesson links delete error:", dbErr.message);
      }
    } catch (dbErr) {
      console.warn("Database lesson links delete notice:", dbErr);
    }

    // 2. Remove from local fallback stores
    writeJsonFile(LINKS_STORE_PATH, linksStore);

    const curriculum = readJsonFile<Record<string, { modules: any[] }>>(CURRICULUM_PATH, {});
    const normCourseId = courseId.toLowerCase().trim();

    for (const [cKey, cVal] of Object.entries(curriculum)) {
      if (cKey.toLowerCase() === normCourseId && Array.isArray(cVal.modules)) {
        for (const m of cVal.modules) {
          if (m.id === moduleId && Array.isArray(m.lessons)) {
            const lIdx = m.lessons.findIndex((l: any) => l.id === lessonId);
            if (lIdx !== -1) {
              delete m.lessons[lIdx].link_button;
              delete m.lessons[lIdx].link_button_text;
              delete m.lessons[lIdx].link_button_url;
              delete m.lessons[lIdx].link_button_enabled;
              delete m.lessons[lIdx].link_button_description;
            }
          }
        }
      }
    }
    writeJsonFile(CURRICULUM_PATH, curriculum);

    // 3. Fail cleanly if persistent cloud write failed in production
    if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to remove lesson link from the database. Please try again.",
      };
    }

    safeRevalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
    safeRevalidatePath(`/admin/courses/${courseId}/modules/${moduleId}`);
    safeRevalidatePath(`/admin/edit-course-outline`);
    safeRevalidatePath(`/lms/learn`);

    return {
      success: true,
      message: "Link Button removed successfully.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete Link Button.",
    };
  }
}
