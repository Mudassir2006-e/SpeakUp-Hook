"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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

async function verifyAdminCaller() {
  try {
    const { userId, role } = await getCurrentUserRole();
    if (!userId || role !== "admin") {
      return { error: "Unauthorized: Admin privileges required." };
    }
    return { adminId: userId };
  } catch {
    return { error: "Authentication verification failed." };
  }
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
    const store = readFreeDemoConfig();
    const normalized = courseId.trim().toLowerCase();
    const match = Object.entries(store.courseDemos).find(
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
    const store = readFreeDemoConfig();
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
    const store = readFreeDemoConfig();
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
    const store = readFreeDemoConfig();
    store.generalDemos = store.generalDemos.filter((d) => d.id !== demoId);
    writeFreeDemoConfig(store);

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
    const store = readFreeDemoConfig();
    if (store.courseDemos[courseId]) {
      delete store.courseDemos[courseId];
      writeFreeDemoConfig(store);
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
