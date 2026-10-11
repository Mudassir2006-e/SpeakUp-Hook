"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface LmsEvent {
  id: string;
  title: string;
  description: string;
  dayDate: string;
  time: string;
  essentialInfo?: string;
  created_at?: string;
  updated_at?: string;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

const EVENTS_STORE_PATH = path.join(process.cwd(), "src", "config", "central-events.json");

function readEventsStore(): LmsEvent[] {
  try {
    if (fs.existsSync(EVENTS_STORE_PATH)) {
      const content = fs.readFileSync(EVENTS_STORE_PATH, "utf-8");
      return JSON.parse(content || "[]");
    }
  } catch (err) {
    console.error("Error reading events store:", err);
  }
  return [];
}

function writeEventsStore(events: LmsEvent[]) {
  try {
    fs.writeFileSync(EVENTS_STORE_PATH, JSON.stringify(events, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing events store:", err);
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
 * Retrieves all upcoming events from the single centralized data store.
 * Consumed by both the Main Website and Student LMS.
 */
export async function getCentralEventsAction(): Promise<ActionResponse<LmsEvent[]>> {
  try {
    const events = readEventsStore();
    return { success: true, data: events };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load events.", data: [] };
  }
}

/**
 * Creates or updates an upcoming event.
 */
export async function saveCentralEventAction(
  eventData: Omit<LmsEvent, "id"> & { id?: string }
): Promise<ActionResponse<LmsEvent>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const title = eventData.title?.trim();
  if (!title) {
    return { success: false, error: "Event Title is required." };
  }
  if (!eventData.dayDate?.trim()) {
    return { success: false, error: "Event Date is required." };
  }

  const events = readEventsStore();
  const id = eventData.id || `event_${Date.now()}`;
  const now = new Date().toISOString();

  const record: LmsEvent = {
    id,
    title,
    description: eventData.description?.trim() || "",
    dayDate: eventData.dayDate.trim(),
    time: eventData.time?.trim() || "06:00 PM PKT",
    essentialInfo: eventData.essentialInfo?.trim() || "",
    created_at: eventData.created_at || now,
    updated_at: now,
  };

  const existingIdx = events.findIndex((e) => e.id === id);
  if (existingIdx !== -1) {
    events[existingIdx] = record;
  } else {
    events.push(record);
  }

  writeEventsStore(events);

  // Sync with Supabase cms_content if present
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }
    await supabase.from("cms_content").upsert({
      page_key: "central_events",
      published_data: { events },
      draft_data: { events },
      updated_at: now,
    });
  } catch {
    // Non-blocking
  }

  revalidatePath("/");
  revalidatePath("/lms/events");
  revalidatePath("/admin/events");

  return { success: true, data: record };
}

/**
 * Deletes an upcoming event.
 */
export async function deleteCentralEventAction(eventId: string): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const events = readEventsStore();
  const filtered = events.filter((e) => e.id !== eventId);
  writeEventsStore(filtered);

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }
    await supabase.from("cms_content").upsert({
      page_key: "central_events",
      published_data: { events: filtered },
      draft_data: { events: filtered },
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Non-blocking
  }

  revalidatePath("/");
  revalidatePath("/lms/events");
  revalidatePath("/admin/events");

  return { success: true };
}
