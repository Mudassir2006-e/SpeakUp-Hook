"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { verifyAdminCaller as verifyAdminMfaCaller } from "@/lib/auth/adminVerification";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface FreeDemoEntry {
  id: string;
  type: "course" | "general";
  title: string;
  description?: string;
  courseId?: string;
  courseTitle?: string;
  moduleId?: string;
  moduleTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  videoUrl: string;
  videoSource?: string;
  duration?: string;
  instructor?: string;
  thumbnail?: string;
  isPublished?: boolean;
  order?: number;
  updatedAt: string;
}

export interface FreeDemoStore {
  courseDemos: Record<string, FreeDemoEntry>;
  generalDemos: FreeDemoEntry[];
}

const CONFIG_PATH = path.join(process.cwd(), "src", "config", "free-demo-config.json");

function readFreeDemoConfig(): FreeDemoStore {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(raw || "{}");

      // Backward compatibility: If format is old key-based course map
      if (!parsed.courseDemos && !parsed.generalDemos) {
        const courseDemos: Record<string, FreeDemoEntry> = {};
        for (const [key, val] of Object.entries(parsed)) {
          const entry = val as any;
          courseDemos[key] = {
            id: key,
            type: "course",
            title: `${entry.courseTitle || key} — ${entry.lessonTitle || "Lesson Demo"}`,
            courseId: entry.courseId || key,
            courseTitle: entry.courseTitle || "",
            moduleId: entry.moduleId || "",
            moduleTitle: entry.moduleTitle || "",
            lessonId: entry.lessonId || "",
            lessonTitle: entry.lessonTitle || "",
            videoUrl: entry.videoUrl || "",
            videoSource: entry.videoSource || "youtube",
            duration: "Included LMS",
            instructor: "SpeakUp Faculty",
            thumbnail: "https://images.unsplash.com/photo-1527866959252-deab85ef7d1b?auto=format&fit=crop&w=1200&q=80",
            updatedAt: entry.updatedAt || new Date().toISOString(),
          };
        }
        return {
          courseDemos,
          generalDemos: [
            {
              id: "gen-demo-1",
              type: "general",
              title: "SpeakUp Platform & Executive Defense Masterclass Demo",
              description: "Comprehensive platform overview showcasing executive speaking defense, cadence drills, and student feedback walkthrough.",
              videoUrl: "https://www.youtube.com/watch?v=iCvmsMzlF7o",
              videoSource: "youtube",
              duration: "4:15 • Platform Demo",
              instructor: "Sir Mudassir Ali & Senior Faculty",
              thumbnail: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
              isPublished: true,
              updatedAt: new Date().toISOString(),
            },
          ],
        };
      }

      return {
        courseDemos: parsed.courseDemos || {},
        generalDemos: parsed.generalDemos || [],
      };
    }
  } catch (err) {
    console.error("Error reading free-demo-config.json:", err);
  }
  return { courseDemos: {}, generalDemos: [] };
}

function writeFreeDemoConfig(store: FreeDemoStore) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing free-demo-config.json:", err);
  }
}

async function verifyAdminCaller(): Promise<{ adminId: string } | { error: string }> {
  return verifyAdminMfaCaller();
}

/**
 * Retrieves all configured demos (both course-linked and general).
 */
export async function getFreeDemoConfigAction(): Promise<{
  success: boolean;
  data?: Record<string, FreeDemoEntry>;
  generalDemos?: FreeDemoEntry[];
  allDemos?: FreeDemoEntry[];
  error?: string;
}> {
  try {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from("cms_content")
        .select("published_data")
        .eq("page_key", "free_demo_config")
        .maybeSingle();

      if (!error && (data as any)?.published_data && typeof (data as any).published_data === "object") {
        const parsed = data.published_data;
        if (parsed.courseDemos || parsed.generalDemos) {
          const store: FreeDemoStore = {
            courseDemos: parsed.courseDemos || {},
            generalDemos: parsed.generalDemos || [],
          };
          writeFreeDemoConfig(store);
          const allDemos = [
            ...Object.values(store.courseDemos),
            ...store.generalDemos,
          ];
          return {
            success: true,
            data: store.courseDemos,
            generalDemos: store.generalDemos,
            allDemos,
          };
        }
      }
    } catch (e) {
      console.warn("DB free demo fetch notice:", e);
    }

    const store = readFreeDemoConfig();
    const allDemos = [
      ...Object.values(store.courseDemos),
      ...store.generalDemos,
    ];
    return {
      success: true,
      data: store.courseDemos,
      generalDemos: store.generalDemos,
      allDemos,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load free demo configurations." };
  }
}

/**
 * Retrieves free demo for a specific course.
 */
export async function getCourseFreeDemoAction(courseId: string): Promise<{
  success: boolean;
  data?: FreeDemoEntry | null;
  error?: string;
}> {
  try {
    const config = await getFreeDemoConfigAction();
    const courseDemos = config.data || readFreeDemoConfig().courseDemos;
    const normalized = courseId.trim().toLowerCase();
    const match = Object.entries(courseDemos).find(
      ([key]) => key.toLowerCase() === normalized
    );
    return { success: true, data: match ? match[1] : null };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to retrieve course free demo." };
  }
}

/**
 * Saves a course-linked Free Demo video.
 */
export async function saveFreeDemoAction(params: {
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  videoUrl: string;
  videoSource?: string;
  thumbnail?: string;
}): Promise<{
  success: boolean;
  data?: FreeDemoEntry;
  error?: string;
}> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  if (!params.courseId || !params.videoUrl) {
    return { success: false, error: "Course ID and a valid video are required to set a Free Demo." };
  }

  try {
    const configRes = await getFreeDemoConfigAction();
    const store: FreeDemoStore = {
      courseDemos: configRes.data || readFreeDemoConfig().courseDemos,
      generalDemos: configRes.generalDemos || readFreeDemoConfig().generalDemos,
    };

    const entry: FreeDemoEntry = {
      id: params.courseId,
      type: "course",
      title: `${params.courseTitle} — ${params.lessonTitle || "Lesson Demo"}`,
      courseId: params.courseId,
      courseTitle: params.courseTitle,
      moduleId: params.moduleId,
      moduleTitle: params.moduleTitle,
      lessonId: params.lessonId,
      lessonTitle: params.lessonTitle,
      videoUrl: params.videoUrl,
      videoSource: params.videoSource || "youtube",
      duration: "Included LMS",
      instructor: "SpeakUp Faculty",
      thumbnail: params.thumbnail || "https://images.unsplash.com/photo-1527866959252-deab85ef7d1b?auto=format&fit=crop&w=1200&q=80",
      updatedAt: new Date().toISOString(),
    };

    store.courseDemos[params.courseId] = entry;
    writeFreeDemoConfig(store);

    let dbPersisted = false;
    try {
      let supabase: any;
      try {
        supabase = createAdminClient();
      } catch {
        supabase = await createClient();
      }
      const { error: dbErr } = await supabase.from("cms_content").upsert({
        page_key: "free_demo_config",
        published_data: store,
        draft_data: store,
        updated_at: new Date().toISOString(),
        updated_by: authCheck.adminId,
      }, { onConflict: "page_key" });

      if (!dbErr) {
        dbPersisted = true;
      }
    } catch (dbErr) {
      console.warn("Database free demo upsert notice:", dbErr);
    }

    if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to persist free demo configuration to database. Please try again.",
      };
    }

    revalidatePath("/");
    revalidatePath("/demo");
    revalidatePath("/courses");
    revalidatePath("/course-outline");
    revalidatePath("/admin/courses");
    revalidatePath("/admin/demos");

    return { success: true, data: entry };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save free demo." };
  }
}

/**
 * Saves a General Demonstration video (not tied to any specific course).
 */
export async function saveGeneralDemoAction(params: {
  id?: string;
  title: string;
  description?: string;
  videoUrl: string;
  videoSource?: string;
  duration?: string;
  instructor?: string;
  thumbnail?: string;
}): Promise<{
  success: boolean;
  data?: FreeDemoEntry;
  error?: string;
}> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  if (!params.title?.trim() || !params.videoUrl?.trim()) {
    return { success: false, error: "Title and video URL are required for a General Demonstration." };
  }

  try {
    const configRes = await getFreeDemoConfigAction();
    const store: FreeDemoStore = {
      courseDemos: configRes.data || readFreeDemoConfig().courseDemos,
      generalDemos: configRes.generalDemos || readFreeDemoConfig().generalDemos,
    };

    const id = params.id || `gen-demo-${Date.now()}`;
    const now = new Date().toISOString();

    const entry: FreeDemoEntry = {
      id,
      type: "general",
      title: params.title.trim(),
      description: params.description?.trim() || "General demonstration of SpeakUp methodology and learning tools.",
      videoUrl: params.videoUrl.trim(),
      videoSource: params.videoSource || "youtube",
      duration: params.duration?.trim() || "Overview",
      instructor: params.instructor?.trim() || "SpeakUp Academic Team",
      thumbnail: params.thumbnail?.trim() || "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
      isPublished: true,
      updatedAt: now,
    };

    const existingIdx = store.generalDemos.findIndex((d) => d.id === id);
    if (existingIdx !== -1) {
      store.generalDemos[existingIdx] = entry;
    } else {
      store.generalDemos.push(entry);
    }

    writeFreeDemoConfig(store);

    let dbPersisted = false;
    try {
      let supabase: any;
      try {
        supabase = createAdminClient();
      } catch {
        supabase = await createClient();
      }
      const { error: dbErr } = await supabase.from("cms_content").upsert({
        page_key: "free_demo_config",
        published_data: store,
        draft_data: store,
        updated_at: now,
        updated_by: authCheck.adminId,
      }, { onConflict: "page_key" });

      if (!dbErr) {
        dbPersisted = true;
      }
    } catch (dbErr) {
      console.warn("Database general demo upsert notice:", dbErr);
    }

    if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to persist general demo to database. Please try again.",
      };
    }

    revalidatePath("/demo");
    revalidatePath("/admin/demos");

    return { success: true, data: entry };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save general demo." };
  }
}

/**
 * Deletes a General Demonstration video.
 */
export async function deleteGeneralDemoAction(demoId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const configRes = await getFreeDemoConfigAction();
    const store: FreeDemoStore = {
      courseDemos: configRes.data || readFreeDemoConfig().courseDemos,
      generalDemos: (configRes.generalDemos || readFreeDemoConfig().generalDemos).filter((d) => d.id !== demoId),
    };
    writeFreeDemoConfig(store);

    let dbPersisted = false;
    try {
      let supabase: any;
      try {
        supabase = createAdminClient();
      } catch {
        supabase = await createClient();
      }
      const { error: dbErr } = await supabase.from("cms_content").upsert({
        page_key: "free_demo_config",
        published_data: store,
        draft_data: store,
        updated_at: new Date().toISOString(),
        updated_by: authCheck.adminId,
      }, { onConflict: "page_key" });

      if (!dbErr) {
        dbPersisted = true;
      }
    } catch (dbErr) {
      console.warn("Database delete general demo notice:", dbErr);
    }

    if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to delete general demo from database. Please try again.",
      };
    }

    revalidatePath("/demo");
    revalidatePath("/admin/demos");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete general demo." };
  }
}

/**
 * Deletes / removes Free Demo for a course.
 */
export async function deleteFreeDemoAction(courseId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const configRes = await getFreeDemoConfigAction();
    const store: FreeDemoStore = {
      courseDemos: { ...(configRes.data || readFreeDemoConfig().courseDemos) },
      generalDemos: configRes.generalDemos || readFreeDemoConfig().generalDemos,
    };
    delete store.courseDemos[courseId];
    writeFreeDemoConfig(store);

    let dbPersisted = false;
    try {
      let supabase: any;
      try {
        supabase = createAdminClient();
      } catch {
        supabase = await createClient();
      }
      const { error: dbErr } = await supabase.from("cms_content").upsert({
        page_key: "free_demo_config",
        published_data: store,
        draft_data: store,
        updated_at: new Date().toISOString(),
        updated_by: authCheck.adminId,
      }, { onConflict: "page_key" });

      if (!dbErr) {
        dbPersisted = true;
      }
    } catch (dbErr) {
      console.warn("Database delete course demo notice:", dbErr);
    }

    if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to delete course demo from database. Please try again.",
      };
    }

    revalidatePath("/");
    revalidatePath("/demo");
    revalidatePath("/courses");
    revalidatePath("/course-outline");
    revalidatePath("/admin/courses");
    revalidatePath("/admin/demos");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete free demo." };
  }
}
