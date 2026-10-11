"use server";

import fs from "fs";
import path from "path";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { CMS_DEFAULT_PAGES, CmsPageData } from "@/config/cmsDefaultContent";
import { revalidatePath } from "next/cache";

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Validates that the current user has verified administrator privileges.
 */
async function verifyAdminCaller(): Promise<{ adminId: string } | { error: string }> {
  try {
    const { userId, role } = await getCurrentUserRole();
    if (!userId || role !== "admin") {
      return { error: "Forbidden: Administrative privileges required." };
    }
    return { adminId: userId };
  } catch {
    return {
      error: "Authentication verification failed.",
    };
  }
}

/**
 * Helper to get authorized Supabase client.
 */
async function getSupabase(): Promise<any> {
  try {
    return createAdminClient() as any;
  } catch {
    return (await createClient()) as any;
  }
}

/**
 * Fetches CMS page data. Merges database draft/published record with default structure.
 */
export async function getCmsPageDataAction(
  pageKey: string
): Promise<ActionResponse<{ pageData: CmsPageData; isPublished: boolean; version: number }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const defaultPage = CMS_DEFAULT_PAGES[pageKey] || CMS_DEFAULT_PAGES["home"];

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("cms_content")
      .select("*")
      .eq("page_key", pageKey)
      .maybeSingle();

    if (error || !data) {
      // Return default configuration
      return {
        success: true,
        data: {
          pageData: defaultPage,
          isPublished: false,
          version: 1,
        },
      };
    }

    // Merge saved draft data with default structure
    const savedDraft = (data.draft_data as any) || {};
    const mergedSections = { ...defaultPage.sections };

    for (const [secId, secObj] of Object.entries(savedDraft)) {
      if (mergedSections[secId]) {
        mergedSections[secId] = {
          ...mergedSections[secId],
          fields: {
            ...mergedSections[secId].fields,
            ...((secObj as any).fields || {}),
          },
        };
      } else {
        mergedSections[secId] = secObj as any;
      }
    }

    return {
      success: true,
      data: {
        pageData: {
          ...defaultPage,
          sections: mergedSections,
        },
        isPublished: Boolean(data.published_data),
        version: data.version || 1,
      },
    };
  } catch (err: any) {
    return {
      success: true,
      data: {
        pageData: defaultPage,
        isPublished: false,
        version: 1,
      },
    };
  }
}

/**
 * Saves draft changes for a specific page in the cms_content table.
 */
export async function saveCmsPageDraftAction(
  pageKey: string,
  sectionsData: Record<string, any>
): Promise<ActionResponse<{ version: number }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const supabase = await getSupabase();
    const now = new Date().toISOString();

    // Check existing
    const { data: existing } = await supabase
      .from("cms_content")
      .select("id, version")
      .eq("page_key", pageKey)
      .maybeSingle();

    let newVersion = (existing?.version || 0) + 1;

      try {
        if (existing?.id) {
          await supabase
            .from("cms_content")
            .update({
              draft_data: sectionsData,
              version: newVersion,
              updated_at: now,
              updated_by: authCheck.adminId,
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("cms_content")
            .insert({
              page_key: pageKey,
              draft_data: sectionsData,
              version: 1,
              updated_at: now,
              updated_by: authCheck.adminId,
            });
        }
      } catch (dbErr) {
        console.warn("DB draft save notice:", dbErr);
      }

      // Always persist to local draft store for immediate retrieval
      const store = readDraftStore();
      store[pageKey] = sectionsData;
      writeDraftStore(store);

      revalidatePath("/admin/pages");
      revalidatePath("/admin/edit");
      revalidatePath("/admin/edit-page");
      revalidatePath("/admin/courses");
      return { success: true, data: { version: newVersion } };
    } catch (err: any) {
      const store = readDraftStore();
      store[pageKey] = sectionsData;
      writeDraftStore(store);
      return { success: true, data: { version: 1 } };
    }
  }

const PUBLISHED_STORE_PATH = path.join(process.cwd(), "src", "config", "cms-published.json");
const DRAFT_STORE_PATH = path.join(process.cwd(), "src", "config", "cms-drafts.json");
const REVISIONS_STORE_PATH = path.join(process.cwd(), "src", "config", "cms-revisions.json");

export interface CmsRevision {
  id: string;
  version: number;
  timestamp: string;
  adminId: string;
  pageKey: string;
  data: Record<string, any>;
  notes?: string;
}

function readPublishedStore(): Record<string, any> {
  try {
    if (fs.existsSync(PUBLISHED_STORE_PATH)) {
      const data = fs.readFileSync(PUBLISHED_STORE_PATH, "utf-8");
      return JSON.parse(data || "{}");
    }
  } catch {
    // Ignore read errors
  }
  return {};
}

function writePublishedStore(store: Record<string, any>) {
  try {
    fs.writeFileSync(PUBLISHED_STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to published store:", err);
  }
}

function readDraftStore(): Record<string, any> {
  try {
    if (fs.existsSync(DRAFT_STORE_PATH)) {
      const data = fs.readFileSync(DRAFT_STORE_PATH, "utf-8");
      return JSON.parse(data || "{}");
    }
  } catch {
    // Ignore read errors
  }
  return {};
}

function writeDraftStore(store: Record<string, any>) {
  try {
    fs.writeFileSync(DRAFT_STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to draft store:", err);
  }
}

function readRevisionsStore(): Record<string, CmsRevision[]> {
  try {
    if (fs.existsSync(REVISIONS_STORE_PATH)) {
      const data = fs.readFileSync(REVISIONS_STORE_PATH, "utf-8");
      return JSON.parse(data || "{}");
    }
  } catch {}
  return {};
}

function writeRevisionsStore(store: Record<string, CmsRevision[]>) {
  try {
    fs.writeFileSync(REVISIONS_STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to revisions store:", err);
  }
}

/**
 * Uploads an image asset for website/course frame-based replacement.
 * Supports JPEG, PNG, WebP with a 5MB size limit.
 */
export async function uploadWebsiteAssetAction(
  formData: FormData
): Promise<ActionResponse<{ url: string; fileName: string; size: number }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No image file provided." };
  }

  // Validate format
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return { success: false, error: "Only JPEG, PNG, and WebP images are supported." };
  }

  // Validate size (< 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "Image file exceeds maximum allowed limit of 5 MB." };
  }

  try {
    const adminClient = createAdminClient();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `website_assets/${Date.now()}_${sanitizedName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("avatars")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase storage upload warning, using local public fallback:", uploadError.message);
      const publicUploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(publicUploadsDir)) {
        fs.mkdirSync(publicUploadsDir, { recursive: true });
      }
      const localFileName = `${Date.now()}_${sanitizedName}`;
      fs.writeFileSync(path.join(publicUploadsDir, localFileName), buffer);
      return {
        success: true,
        data: { url: `/uploads/${localFileName}`, fileName: file.name, size: file.size },
      };
    }

    const { data: pubData } = adminClient.storage.from("avatars").getPublicUrl(storagePath);
    return {
      success: true,
      data: { url: pubData.publicUrl, fileName: file.name, size: file.size },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to process image upload." };
  }
}

export interface UploadedMaterialData {
  url: string;
  fileName: string;
  fileType: "image" | "pdf" | "video" | "document";
  size: number;
}

/**
 * Uploads learning materials (images, PDFs, videos, worksheets, documents)
 * for Lecture Notes and Reading Sessions.
 * Stores in Supabase Storage with local public fallback.
 */
export async function uploadLearningMaterialAction(
  formData: FormData
): Promise<ActionResponse<UploadedMaterialData>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No learning material file provided." };
  }

  // Detect type
  let detectedType: "image" | "pdf" | "video" | "document" = "document";
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|gif|svg)$/i.test(name)) {
    detectedType = "image";
  } else if (mime === "application/pdf" || name.endsWith(".pdf")) {
    detectedType = "pdf";
  } else if (mime.startsWith("video/") || /\.(mp4|webm|ogg|mov|m4v)$/i.test(name)) {
    detectedType = "video";
  } else {
    detectedType = "document";
  }

  // Max 50 MB limit
  if (file.size > 50 * 1024 * 1024) {
    return { success: false, error: "Material file exceeds maximum size limit of 50 MB." };
  }

  try {
    const adminClient = createAdminClient();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `learning_materials/${Date.now()}_${sanitizedName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Try Supabase Storage
    const { error: uploadError } = await adminClient.storage
      .from("avatars")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      console.warn("Notice: Storing learning material via public fallback storage:", uploadError.message);
      const publicUploadsDir = path.join(process.cwd(), "public", "uploads", "materials");
      if (!fs.existsSync(publicUploadsDir)) {
        fs.mkdirSync(publicUploadsDir, { recursive: true });
      }
      const localFileName = `${Date.now()}_${sanitizedName}`;
      fs.writeFileSync(path.join(publicUploadsDir, localFileName), buffer);
      return {
        success: true,
        data: {
          url: `/uploads/materials/${localFileName}`,
          fileName: file.name,
          fileType: detectedType,
          size: file.size,
        },
      };
    }

    const { data: pubData } = adminClient.storage.from("avatars").getPublicUrl(storagePath);
    return {
      success: true,
      data: {
        url: pubData.publicUrl,
        fileName: file.name,
        fileType: detectedType,
        size: file.size,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to process learning material upload." };
  }
}

/**
 * Retrieves the latest saved draft for a page or course layout.
 */
export async function getCmsDraftAction(
  pageKey: string
): Promise<ActionResponse<{ draftData: Record<string, any>; version: number }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    let draftData: Record<string, any> = {};
    let version = 1;

    try {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from("cms_content")
        .select("draft_data, version")
        .eq("page_key", pageKey)
        .maybeSingle();

      if (data?.draft_data) {
        draftData = data.draft_data;
        version = data.version || 1;
      }
    } catch {
      // Fallback to draft store
    }

    if (!draftData || Object.keys(draftData).length === 0) {
      const store = readDraftStore();
      if (store[pageKey]) {
        draftData = store[pageKey];
      }
    }

    return { success: true, data: { draftData, version } };
  } catch (err: any) {
    return { success: true, data: { draftData: {}, version: 1 } };
  }
}

/**
 * Public action: Fetches published CMS content for any public or student LMS page.
 * Returns a simplified key-value map per section: { [sectionId]: { [fieldId]: value } }.
 */
export async function getPublishedCmsPageAction(
  pageKey: string
): Promise<ActionResponse<Record<string, Record<string, any>>>> {
  try {
    let publishedSections: Record<string, any> | null = null;

    // 1. Try reading from Supabase cms_content where published_data is not null
    try {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from("cms_content")
        .select("published_data")
        .eq("page_key", pageKey)
        .maybeSingle();

      if (data?.published_data && Object.keys(data.published_data).length > 0) {
        publishedSections = data.published_data;
      }
    } catch {
      // Fallback to local published store
    }

    // 2. If not found in DB or DB error, check local published store
    if (!publishedSections) {
      const localStore = readPublishedStore();
      if (localStore[pageKey]) {
        publishedSections = localStore[pageKey];
      }
    }

    if (!publishedSections) {
      return { success: true, data: {} };
    }

    // 3. Extract simplified key-value pairs and selectors
    const simplified: Record<string, any> = {};
    const selectorsMap: Record<string, any> = {};

    for (const [key, obj] of Object.entries(publishedSections)) {
      if ((obj as any)?.fields) {
        simplified[key] = {};
        for (const [fId, fObj] of Object.entries((obj as any).fields)) {
          simplified[key][fId] = (fObj as any)?.value;
        }
      } else if ((obj as any)?.value !== undefined) {
        selectorsMap[key] = obj;
        simplified[key] = (obj as any).value;
      } else {
        simplified[key] = obj;
      }
    }

    simplified.__selectors = selectorsMap;
    simplified.__raw = publishedSections;

    return { success: true, data: simplified };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch published content." };
  }
}

/**
 * Public action: Returns the published selector-level modifications for client DOM hydration.
 */
export async function getPublishedSelectorsAction(
  pageKey: string
): Promise<ActionResponse<Record<string, { selector: string; type: "text" | "image"; value: string; objectFit?: string }>>> {
  try {
    let publishedSections: Record<string, any> | null = null;
    try {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from("cms_content")
        .select("published_data")
        .eq("page_key", pageKey)
        .maybeSingle();

      if (data?.published_data && Object.keys(data.published_data).length > 0) {
        publishedSections = data.published_data;
      }
    } catch {}

    if (!publishedSections) {
      const localStore = readPublishedStore();
      if (localStore[pageKey]) {
        publishedSections = localStore[pageKey];
      }
    }

    if (!publishedSections) {
      return { success: true, data: {} };
    }

    const selectors: Record<string, any> = {};
    for (const [key, val] of Object.entries(publishedSections)) {
      if ((val as any)?.value !== undefined) {
        selectors[key] = val;
      }
    }

    return { success: true, data: selectors };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch published selectors." };
  }
}

/**
 * Reverts the unpublished draft back to the latest published state (Requirement 16).
 * Safe rollback that does NOT overwrite or damage published content.
 */
export async function revertCmsPageDraftAction(
  pageKey: string
): Promise<ActionResponse<{ draftData: Record<string, any>; version: number }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const supabase = await getSupabase();
    const now = new Date().toISOString();

    // 1. Fetch current published data
    let publishedData: Record<string, any> = {};
    const { data: existing } = await supabase
      .from("cms_content")
      .select("id, published_data, version")
      .eq("page_key", pageKey)
      .maybeSingle();

    if (existing?.published_data && Object.keys(existing.published_data).length > 0) {
      publishedData = existing.published_data;
    } else {
      const localPub = readPublishedStore();
      if (localPub[pageKey]) {
        publishedData = localPub[pageKey];
      }
    }

    // 2. Set draft_data = publishedData in Supabase
    if (existing?.id) {
      await supabase
        .from("cms_content")
        .update({
          draft_data: publishedData,
          updated_at: now,
          updated_by: authCheck.adminId,
        })
        .eq("id", existing.id);
    }

    // 3. Update local draft store
    const draftStore = readDraftStore();
    draftStore[pageKey] = publishedData;
    writeDraftStore(draftStore);

    // 4. Record revision
    try {
      await supabase.from("cms_revisions").insert({
        page_key: pageKey,
        version: existing?.version || 1,
        revision_type: "reverted",
        content_data: publishedData,
        created_by: authCheck.adminId,
      });
    } catch {}

    revalidatePath("/admin/pages");
    revalidatePath("/admin/edit");
    revalidatePath("/admin/edit-page");

    return {
      success: true,
      data: {
        draftData: publishedData,
        version: existing?.version || 1,
      },
    };
  } catch (err: any) {
    const localPub = readPublishedStore();
    const publishedData = localPub[pageKey] || {};
    const draftStore = readDraftStore();
    draftStore[pageKey] = publishedData;
    writeDraftStore(draftStore);

    return {
      success: true,
      data: {
        draftData: publishedData,
        version: 1,
      },
    };
  }
}

/**
 * Publishes the saved draft changes, setting published_data = draft_data.
 */
export async function publishCmsPageAction(
  pageKey: string,
  sectionsData: Record<string, any>
): Promise<ActionResponse<{ version: number }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const supabase = await getSupabase();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from("cms_content")
      .select("id, version")
      .eq("page_key", pageKey)
      .maybeSingle();

    let version = (existing?.version || 1) + 1;

    // 1. Update Supabase cms_content
    try {
      if (existing?.id) {
        await supabase
          .from("cms_content")
          .update({
            draft_data: sectionsData,
            published_data: sectionsData,
            version,
            updated_at: now,
            updated_by: authCheck.adminId,
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("cms_content")
          .insert({
            page_key: pageKey,
            draft_data: sectionsData,
            published_data: sectionsData,
            version: 1,
            updated_at: now,
            updated_by: authCheck.adminId,
          });
      }
    } catch (dbErr) {
      console.error("DB update error in publishCmsPageAction:", dbErr);
    }

    // 2. Persist to local published store for instantaneous, robust frontend consumption
    const store = readPublishedStore();
    store[pageKey] = sectionsData;
    writePublishedStore(store);

    // Also update draft store so draft matches published state
    const dStore = readDraftStore();
    dStore[pageKey] = sectionsData;
    writeDraftStore(dStore);

    // 3. Record snapshot in revisions store
    try {
      const revStore = readRevisionsStore();
      if (!revStore[pageKey]) revStore[pageKey] = [];
      const newRev: CmsRevision = {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        version,
        timestamp: now,
        adminId: authCheck.adminId,
        pageKey,
        data: sectionsData,
        notes: `Published version ${version}`,
      };
      revStore[pageKey].unshift(newRev);
      if (revStore[pageKey].length > 30) {
        revStore[pageKey] = revStore[pageKey].slice(0, 30);
      }
      writeRevisionsStore(revStore);
    } catch (revErr) {
      console.warn("Failed to record revision history:", revErr);
    }

    // 4. Revalidate Next.js cache for public and student routes
    revalidatePath("/");
    revalidatePath("/courses");
    revalidatePath("/about");
    revalidatePath("/pricing");
    revalidatePath("/faq");
    revalidatePath("/methodology");
    revalidatePath("/book-session");
    revalidatePath("/lms/dashboard");
    revalidatePath("/lms/courses");
    revalidatePath("/admin/pages");

    return { success: true, data: { version } };
  } catch (err: any) {
    return { success: true, data: { version: 1 } };
  }
}

/**
 * Retrieves the revision history for a CMS page.
 */
export async function getCmsPageRevisionsAction(
  pageKey: string
): Promise<ActionResponse<CmsRevision[]>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error, data: [] };
  }
  const store = readRevisionsStore();
  const revisions = store[pageKey] || [];
  return { success: true, data: revisions };
}

/**
 * Restores a previously published CMS page revision.
 */
export async function restoreCmsPageRevisionAction(
  pageKey: string,
  revisionId: string
): Promise<ActionResponse<{ restoredData: Record<string, any>; version: number }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const store = readRevisionsStore();
  const revisions = store[pageKey] || [];
  const targetRev = revisions.find((r) => r.id === revisionId);
  if (!targetRev) {
    return { success: false, error: "Revision not found." };
  }

  const now = new Date().toISOString();
  const newVersion = (targetRev.version || 1) + 1;

  // 1. Update published and draft store
  const pubStore = readPublishedStore();
  pubStore[pageKey] = targetRev.data;
  writePublishedStore(pubStore);

  const draftStore = readDraftStore();
  draftStore[pageKey] = targetRev.data;
  writeDraftStore(draftStore);

  // 2. Sync to Supabase
  try {
    const supabase = await getSupabase();
    await supabase.from("cms_content").upsert({
      page_key: pageKey,
      draft_data: targetRev.data,
      published_data: targetRev.data,
      version: newVersion,
      updated_at: now,
      updated_by: authCheck.adminId,
    });
  } catch {}

  // 3. Add restore entry to revision store
  const newRev: CmsRevision = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    version: newVersion,
    timestamp: now,
    adminId: authCheck.adminId,
    pageKey,
    data: targetRev.data,
    notes: `Restored from version ${targetRev.version}`,
  };
  revisions.unshift(newRev);
  store[pageKey] = revisions.slice(0, 30);
  writeRevisionsStore(store);

  // 4. Revalidate paths
  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath("/about");
  revalidatePath("/pricing");
  revalidatePath("/faq");
  revalidatePath("/methodology");
  revalidatePath("/book-session");
  revalidatePath("/admin/pages");

  return { success: true, data: { restoredData: targetRev.data, version: newVersion } };
}

/**
 * Loads all courses for simple course creation & editing.
 */
export async function getAllCoursesForEditorAction(): Promise<
  ActionResponse<
    Array<{
      id: string;
      slug: string;
      title: string;
      description: string;
      level: string;
      thumbnail_url: string | null;
      is_published: boolean;
      created_at: string;
    }>
  >
> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("courses")
      .select("id, slug, title, description, level, thumbnail_url, is_published, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load courses." };
  }
}

/**
 * Simple Course Creator/Editor: Creates or updates course without complicated navigation.
 */
export async function saveCourseSimpleAction(params: {
  id?: string;
  title: string;
  slug: string;
  description: string;
  level: string;
  thumbnail_url?: string;
  is_published?: boolean;
}): Promise<ActionResponse<{ id: string; slug: string }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const title = params.title?.trim();
  const slug = params.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const description = params.description?.trim() || "";
  const level = params.level?.trim() || "All Levels";

  if (!title) {
    return { success: false, error: "Course Name is required." };
  }
  if (!slug) {
    return { success: false, error: "Course Slug is required." };
  }

  try {
    const supabase = await getSupabase();

    if (params.id) {
      // Update existing course
      const { data, error } = await supabase
        .from("courses")
        .update({
          title,
          slug,
          description,
          level,
          thumbnail_url: params.thumbnail_url || null,
          is_published: params.is_published ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)
        .select("id, slug")
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      revalidatePath("/courses");
      revalidatePath("/admin/courses");
      revalidatePath("/admin/pages");
      return { success: true, data: { id: data.id, slug: data.slug } };
    } else {
      // Create new course
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title,
          slug,
          description,
          level,
          thumbnail_url: params.thumbnail_url || null,
          is_published: params.is_published ?? true,
        })
        .select("id, slug")
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      revalidatePath("/courses");
      revalidatePath("/admin/courses");
      revalidatePath("/admin/pages");
      return { success: true, data: { id: data.id, slug: data.slug } };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save course." };
  }
}

/**
 * Public action: Fetches published courses from Supabase for the live course catalog.
 */
export async function getPublicCoursesAction(): Promise<
  ActionResponse<
    Array<{
      id: string;
      slug: string;
      title: string;
      description: string;
      level: string;
      thumbnail_url: string | null;
      is_published: boolean;
      created_at: string;
    }>
  >
> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("courses")
      .select("id, slug, title, description, level, thumbnail_url, is_published, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to fetch public courses." };
  }
}

const CENTRAL_COURSES_PATH = path.join(process.cwd(), "src", "config", "central-courses.json");

function readCentralCoursesStore(): any[] {
  try {
    if (fs.existsSync(CENTRAL_COURSES_PATH)) {
      const data = fs.readFileSync(CENTRAL_COURSES_PATH, "utf-8");
      return JSON.parse(data || "[]");
    }
  } catch {
    // Ignore read errors
  }
  return [];
}

function writeCentralCoursesStore(courses: any[]) {
  try {
    fs.writeFileSync(CENTRAL_COURSES_PATH, JSON.stringify(courses, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to central courses store:", err);
  }
}

/**
 * Loads all central course records (drafts & published) for Admin management.
 */
export async function getCentralCoursesAction(): Promise<ActionResponse<any[]>> {
  try {
    const store = readCentralCoursesStore();
    return { success: true, data: store };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load courses." };
  }
}

/**
 * Saves a course record centrally as a Draft or Published course.
 * Single source of truth for pricing, duration, availability, and description.
 */
export async function saveCentralCourseAction(params: {
  id?: string;
  title: string;
  slug?: string;
  description: string;
  price: number;
  price_usd?: number;
  availability: "available" | "upcoming";
  duration_weeks: number;
  status: "draft" | "published";
  level?: string;
  image?: string;
}): Promise<ActionResponse<{ id: string; slug: string; course: any }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const title = params.title?.trim();
  if (!title) {
    return { success: false, error: "Course Name is required." };
  }

  const status = params.status === "published" ? "published" : "draft";

  // Price validation: Required if publishing
  const price = Number(params.price);
  if (status === "published" && (!price || price <= 0 || isNaN(price))) {
    return { success: false, error: "Course Price is required to publish a course." };
  }

  const duration_weeks = Number(params.duration_weeks) || 4;
  const availability =
    params.availability === "upcoming" || (params.availability as string) === "unavailable"
      ? "upcoming"
      : "available";
  const slug =
    params.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") ||
    title.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

  const id = params.id || slug || `course-${Date.now()}`;
  const now = new Date().toISOString();

  const store = readCentralCoursesStore();
  const existingIdx = store.findIndex((c) => c.id === id || c.slug === slug);

  // Both USD and PKR prices come directly from saved course data without auto-conversion
  const price_usd =
    params.price_usd !== undefined && params.price_usd !== null
      ? Number(params.price_usd)
      : existingIdx !== -1
      ? (store[existingIdx].price_usd ?? 0)
      : 0;

  const courseRecord = {
    id,
    slug,
    title,
    description: params.description?.trim() || "",
    price: price || 0,
    price_usd,
    availability,
    duration_weeks,
    status,
    level: params.level || (existingIdx !== -1 ? store[existingIdx].level : "A1"),
    image: params.image || (existingIdx !== -1 ? store[existingIdx].image : "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80"),
    created_at: existingIdx !== -1 ? store[existingIdx].created_at : now,
    updated_at: now,
  };

  if (existingIdx !== -1) {
    store[existingIdx] = courseRecord;
  } else {
    store.push(courseRecord);
  }

  writeCentralCoursesStore(store);

  // Sync with Supabase courses table (non-blocking fallback)
  try {
    const supabase = await getSupabase();
    await supabase.from("courses").upsert(
      {
        slug,
        title,
        description: courseRecord.description,
        level: courseRecord.level,
        is_published: status === "published",
        thumbnail_url: courseRecord.image,
        updated_at: now,
      },
      { onConflict: "slug" }
    );
  } catch (err) {
    // Graceful offline fallback
  }

  // Revalidate all consumer pages
  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath("/pricing");
  revalidatePath("/course-outline");
  revalidatePath("/lms/dashboard");
  revalidatePath("/lms/courses");
  revalidatePath("/admin/courses");

  return { success: true, data: { id, slug, course: courseRecord } };
}

const CENTRAL_CURRICULUM_PATH = path.join(process.cwd(), "src", "config", "central-curriculum.json");

function readCentralCurriculumStore(): Record<string, { modules: any[] }> {
  try {
    if (fs.existsSync(CENTRAL_CURRICULUM_PATH)) {
      const data = fs.readFileSync(CENTRAL_CURRICULUM_PATH, "utf-8");
      return JSON.parse(data || "{}");
    }
  } catch {}
  return {};
}

function writeCentralCurriculumStore(curriculum: any) {
  try {
    fs.writeFileSync(CENTRAL_CURRICULUM_PATH, JSON.stringify(curriculum, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to central curriculum store:", err);
  }
}

/**
 * Deletes a course from central-courses, cascaded modules and lessons in central-curriculum,
 * and removes all related database records safely without leaving orphaned records.
 */
export async function deleteCentralCourseAction(courseId: string): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const normId = courseId.trim().toLowerCase();

  // 1. Delete from central-courses store
  const coursesStore = readCentralCoursesStore();
  const updatedCourses = coursesStore.filter(
    (c) => c.id.toLowerCase() !== normId && c.slug.toLowerCase() !== normId
  );
  writeCentralCoursesStore(updatedCourses);

  // 2. Cascade delete from central-curriculum store (remove all modules, lessons, notes, videos)
  const curriculumStore = readCentralCurriculumStore();
  let foundCurriculumKey: string | null = null;
  for (const k of Object.keys(curriculumStore)) {
    if (k.toLowerCase() === normId) {
      foundCurriculumKey = k;
      break;
    }
  }
  if (foundCurriculumKey) {
    delete curriculumStore[foundCurriculumKey];
    writeCentralCurriculumStore(curriculumStore);
  }

  // 3. Cascade delete from Supabase (modules, lessons, enrollments, course)
  try {
    const supabase = await getSupabase();
    const { data: dbCourse } = await supabase
      .from("courses")
      .select("id")
      .or(`id.eq.${courseId},slug.eq.${courseId}`)
      .maybeSingle();

    if (dbCourse?.id) {
      const { data: mods } = await supabase.from("modules").select("id").eq("course_id", dbCourse.id);
      if (mods && mods.length > 0) {
        const modIds = mods.map((m: any) => m.id);
        await supabase.from("lessons").delete().in("module_id", modIds);
      }
      await supabase.from("modules").delete().eq("course_id", dbCourse.id);
      await supabase.from("course_enrollments").delete().eq("course_id", dbCourse.id);
      await supabase.from("courses").delete().eq("id", dbCourse.id);
    }
  } catch (err) {
    // Non-blocking fallback
  }

  // 4. Revalidate all consumers
  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath("/pricing");
  revalidatePath("/course-outline");
  revalidatePath("/lms/dashboard");
  revalidatePath("/lms/courses");
  revalidatePath("/admin/courses");

  return { success: true };
}

/**
 * Loads modules and lessons hierarchy belonging strictly to a specific course.
 */
export async function getCourseCurriculumAction(
  courseId: string
): Promise<ActionResponse<{ modules: any[] }>> {
  try {
    const normId = courseId.trim().toLowerCase();
    const curriculumStore = readCentralCurriculumStore();

    for (const [k, val] of Object.entries(curriculumStore)) {
      if (k.toLowerCase() === normId) {
        return { success: true, data: { modules: val.modules || [] } };
      }
    }

    // Fallback: check Supabase
    try {
      const supabase = await getSupabase();
      const { data: dbCourse } = await supabase
        .from("courses")
        .select("id")
        .or(`id.eq.${courseId},slug.eq.${courseId}`)
        .maybeSingle();

      if (dbCourse?.id) {
        const { data: modules } = await supabase
          .from("modules")
          .select("id, title, description, order_index")
          .eq("course_id", dbCourse.id)
          .order("order_index", { ascending: true });

        if (modules && modules.length > 0) {
          const modIds = modules.map((m: any) => m.id);
          const { data: lessons } = await supabase
            .from("lessons")
            .select("id, module_id, title, order_index, video_url, video_source, notes, practice_content")
            .in("module_id", modIds)
            .order("order_index", { ascending: true });

          const fullModules = modules.map((m: any) => ({
            ...m,
            lessons: (lessons || []).filter((l: any) => l.module_id === m.id),
          }));

          return { success: true, data: { modules: fullModules } };
        }
      }
    } catch {}

    return { success: true, data: { modules: [] } };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load curriculum." };
  }
}

/**
 * Adds a new module belonging specifically to the selected course.
 */
export async function addCourseModuleAction(
  courseId: string,
  title: string,
  description?: string,
  duration?: string
): Promise<ActionResponse<{ module: any }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const cleanTitle = title.trim();
  if (!cleanTitle) {
    return { success: false, error: "Module Title is required." };
  }

  const curriculumStore = readCentralCurriculumStore();
  const normId = courseId.trim().toLowerCase();

  let courseKey = Object.keys(curriculumStore).find((k) => k.toLowerCase() === normId);
  if (!courseKey) {
    courseKey = courseId;
    curriculumStore[courseKey] = { modules: [] };
  }

  const existingModules = curriculumStore[courseKey].modules || [];
  const nextOrder = existingModules.length + 1;
  const newModuleId = `mod_${Date.now()}`;

  const newModule = {
    id: newModuleId,
    title: cleanTitle,
    duration: duration?.trim() || `Week ${nextOrder}`,
    description: description?.trim() || "",
    order_index: nextOrder,
    lessons: [],
  };

  existingModules.push(newModule);
  curriculumStore[courseKey].modules = existingModules;
  writeCentralCurriculumStore(curriculumStore);

  // Non-blocking sync to Supabase if UUID exists
  try {
    const supabase = await getSupabase();
    const { data: dbCourse } = await supabase
      .from("courses")
      .select("id")
      .or(`id.eq.${courseId},slug.eq.${courseId}`)
      .maybeSingle();

    if (dbCourse?.id) {
      await supabase.from("modules").insert({
        course_id: dbCourse.id,
        title: cleanTitle,
        description: description?.trim() || "",
        order_index: nextOrder,
      });
    }
  } catch {}

  revalidatePath("/admin/courses");
  revalidatePath("/course-outline");
  revalidatePath("/lms/learn");

  return { success: true, data: { module: newModule } };
}

/**
 * Updates a module's title, description, and duration.
 */
export async function updateCourseModuleAction(
  courseId: string,
  moduleId: string,
  title: string,
  description?: string,
  duration?: string
): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const cleanTitle = title.trim();
  if (!cleanTitle) {
    return { success: false, error: "Module Title is required." };
  }

  const curriculumStore = readCentralCurriculumStore();
  const normId = courseId.trim().toLowerCase();
  const courseKey = Object.keys(curriculumStore).find((k) => k.toLowerCase() === normId);

  if (courseKey && curriculumStore[courseKey]?.modules) {
    const mod = curriculumStore[courseKey].modules.find((m: any) => m.id === moduleId);
    if (mod) {
      mod.title = cleanTitle;
      if (description !== undefined) mod.description = description.trim();
      if (duration !== undefined) mod.duration = duration.trim();
      writeCentralCurriculumStore(curriculumStore);
    }
  }

  try {
    const supabase = await getSupabase();
    await supabase.from("modules").update({
      title: cleanTitle,
      description: description?.trim() || "",
      updated_at: new Date().toISOString(),
    }).eq("id", moduleId);
  } catch {}

  revalidatePath("/admin/courses");
  revalidatePath("/course-outline");
  revalidatePath("/lms/learn");

  return { success: true };
}

/**
 * Reorders modules within a course.
 */
export async function reorderCourseModulesAction(
  courseId: string,
  orderedModuleIds: string[]
): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }
  const curriculumStore = readCentralCurriculumStore();
  const normId = courseId.trim().toLowerCase();
  const courseKey = Object.keys(curriculumStore).find((k) => k.toLowerCase() === normId);
  if (courseKey && curriculumStore[courseKey]?.modules) {
    const modulesMap = new Map(curriculumStore[courseKey].modules.map((m: any) => [m.id, m]));
    const reordered: any[] = [];
    orderedModuleIds.forEach((id, idx) => {
      const mod = modulesMap.get(id);
      if (mod) {
        (mod as any).order_index = idx + 1;
        reordered.push(mod);
      }
    });
    curriculumStore[courseKey].modules.forEach((m: any) => {
      if (!orderedModuleIds.includes(m.id)) reordered.push(m);
    });
    curriculumStore[courseKey].modules = reordered;
    writeCentralCurriculumStore(curriculumStore);
  }
  revalidatePath("/admin/courses");
  revalidatePath("/course-outline");
  return { success: true };
}

/**
 * Deletes a module and all associated lessons belonging to that module.
 */
export async function deleteCourseModuleAction(
  courseId: string,
  moduleId: string
): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const curriculumStore = readCentralCurriculumStore();
  const normId = courseId.trim().toLowerCase();
  const courseKey = Object.keys(curriculumStore).find((k) => k.toLowerCase() === normId);

  if (courseKey && curriculumStore[courseKey]?.modules) {
    curriculumStore[courseKey].modules = curriculumStore[courseKey].modules.filter(
      (m: any) => m.id !== moduleId
    );
    writeCentralCurriculumStore(curriculumStore);
  }

  try {
    const supabase = await getSupabase();
    await supabase.from("lessons").delete().eq("module_id", moduleId);
    await supabase.from("modules").delete().eq("id", moduleId);
  } catch {}

  revalidatePath("/admin/courses");
  revalidatePath("/course-outline");
  revalidatePath("/lms/learn");

  return { success: true };
}

/**
 * Saves a lesson (content, video URL, lecture notes, practice directives, assignments) under a specific module.
 */
export async function saveCourseLessonAction(
  courseId: string,
  moduleId: string,
  lessonData: {
    id?: string;
    title: string;
    duration?: string;
    video_url?: string;
    video_source?: "youtube" | "upload" | "drive" | "hosted" | "other";
    notes?: string;
    notes_image?: string;
    notes_pages?: string[];
    notes_materials?: Array<{
      id: string;
      url: string;
      name: string;
      type: "image" | "pdf" | "video" | "document" | "url";
      size?: number;
    }>;
    practice?: string;
    practice_image?: string;
    reading_title?: string;
    reading_content?: string;
    reading_materials?: Array<{
      id: string;
      url: string;
      name: string;
      type: "image" | "pdf" | "video" | "document" | "url";
      size?: number;
    }>;
    assignment_title?: string;
    assignment_instructions?: string;
    due_week?: string;
    link_button_text?: string;
    link_button_url?: string;
    link_button_description?: string;
    link_button_enabled?: boolean;
  }
): Promise<ActionResponse<{ lesson: any }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const cleanTitle = lessonData.title?.trim();
  if (!cleanTitle) {
    return { success: false, error: "Lesson Title is required." };
  }

  const curriculumStore = readCentralCurriculumStore();
  const normId = courseId.trim().toLowerCase();
  let courseKey = Object.keys(curriculumStore).find((k) => k.toLowerCase() === normId);
  if (!courseKey) {
    courseKey = courseId;
    curriculumStore[courseKey] = { modules: [] };
  }

  let mod = curriculumStore[courseKey].modules?.find((m: any) => m.id === moduleId);
  if (!mod) {
    const newMod = {
      id: moduleId || `mod_${Date.now()}`,
      title: "Module 1",
      duration: "Module 1",
      description: "",
      order_index: (curriculumStore[courseKey].modules?.length || 0) + 1,
      lessons: [],
    };
    curriculumStore[courseKey].modules = curriculumStore[courseKey].modules || [];
    curriculumStore[courseKey].modules.push(newMod);
    mod = newMod;
  }

  mod.lessons = mod.lessons || [];
  const lessonId = lessonData.id || `les_${Date.now()}`;
  const existingIdx = mod.lessons.findIndex((l: any) => l.id === lessonId);

  // Preserve and construct materials list
  const existingLesson = existingIdx !== -1 ? mod.lessons[existingIdx] : null;
  const resolvedNotesMaterials =
    lessonData.notes_materials ||
    existingLesson?.notes_materials ||
    (lessonData.notes_image ? [{ id: "mat_1", url: lessonData.notes_image, name: "Lecture Document", type: "image" }] : []);

  const resolvedReadingMaterials =
    lessonData.reading_materials || existingLesson?.reading_materials || [];

  const rawLinkUrl = lessonData.link_button_url !== undefined ? lessonData.link_button_url.trim() : (existingLesson?.link_button_url || existingLesson?.link_button?.url || "");
  const rawLinkText = lessonData.link_button_text !== undefined ? lessonData.link_button_text.trim() : (existingLesson?.link_button_text || existingLesson?.link_button?.text || "Open Learning Resource");
  const rawLinkDesc = lessonData.link_button_description !== undefined ? lessonData.link_button_description.trim() : (existingLesson?.link_button_description || existingLesson?.link_button?.description || "");
  const rawLinkEnabled = lessonData.link_button_enabled !== undefined ? lessonData.link_button_enabled : (existingLesson?.link_button_enabled ?? existingLesson?.link_button?.enabled ?? false);

  const lessonRecord = {
    id: lessonId,
    title: cleanTitle,
    duration: lessonData.duration?.trim() || "45 mins",
    order_index: existingIdx !== -1 ? mod.lessons[existingIdx].order_index : mod.lessons.length + 1,
    video_url: lessonData.video_url?.trim() || "",
    video_source: lessonData.video_source || "youtube",
    notes: lessonData.notes ?? "",
    notes_image: lessonData.notes_image?.trim() || (lessonData.notes_pages?.[0] || resolvedNotesMaterials[0]?.url || ""),
    notes_pages: lessonData.notes_pages || (lessonData.notes_image ? [lessonData.notes_image] : existingLesson?.notes_pages || []),
    notes_materials: resolvedNotesMaterials,
    practice: lessonData.practice ?? "",
    practice_image: lessonData.practice_image?.trim() || "",
    reading_title: lessonData.reading_title?.trim() || existingLesson?.reading_title || "",
    reading_content: lessonData.reading_content ?? existingLesson?.reading_content ?? "",
    reading_materials: resolvedReadingMaterials,
    assignment_title: lessonData.assignment_title?.trim() || "",
    assignment_instructions: lessonData.assignment_instructions?.trim() || "",
    due_week: lessonData.due_week?.trim() || "",
    link_button_text: rawLinkText,
    link_button_url: rawLinkUrl,
    link_button_description: rawLinkDesc,
    link_button_enabled: rawLinkEnabled,
    link_button: rawLinkUrl ? {
      text: rawLinkText || "Open Learning Resource",
      url: rawLinkUrl,
      description: rawLinkDesc,
      enabled: rawLinkEnabled,
    } : (existingLesson?.link_button || null),
  };

  if (existingIdx !== -1) {
    mod.lessons[existingIdx] = lessonRecord;
  } else {
    mod.lessons.push(lessonRecord);
  }

  writeCentralCurriculumStore(curriculumStore);

  // Sync link to central-lesson-links.json if present
  if (lessonRecord.link_button && lessonRecord.link_button.url) {
    try {
      const linksStorePath = path.join(process.cwd(), "src", "config", "central-lesson-links.json");
      let linksStore: any = {};
      if (fs.existsSync(linksStorePath)) {
        linksStore = JSON.parse(fs.readFileSync(linksStorePath, "utf-8"));
      }
      const storeKey = `${courseId}_${moduleId}_${lessonId}`;
      linksStore[storeKey] = {
        courseId,
        moduleId,
        lessonId,
        enabled: lessonRecord.link_button.enabled,
        text: lessonRecord.link_button.text,
        url: lessonRecord.link_button.url,
        description: lessonRecord.link_button.description,
        updatedAt: new Date().toISOString(),
      };
      linksStore[lessonId] = linksStore[storeKey];
      fs.writeFileSync(linksStorePath, JSON.stringify(linksStore, null, 2), "utf-8");
    } catch (linkErr) {
      console.error("Failed to sync to central-lesson-links.json:", linkErr);
    }
  }

  // Sync to Supabase
  try {
    const supabase = await getSupabase();
    if (lessonData.id) {
      await supabase.from("lessons").update({
        title: cleanTitle,
        video_url: lessonRecord.video_url || null,
        video_source: lessonRecord.video_source,
        notes: lessonRecord.notes,
        practice_content: lessonRecord.practice,
        updated_at: new Date().toISOString(),
      }).eq("id", lessonData.id);
    } else {
      await supabase.from("lessons").insert({
        module_id: mod.id,
        title: cleanTitle,
        order_index: lessonRecord.order_index,
        video_url: lessonRecord.video_url || null,
        video_source: lessonRecord.video_source,
        notes: lessonRecord.notes,
        practice_content: lessonRecord.practice,
      });
    }
  } catch {}

  // Dispatch course notification scoped strictly to enrolled students of this course
  try {
    const notifsPath = path.join(process.cwd(), "src", "config", "central-notifications.json");
    let allNotifs: any[] = [];
    if (fs.existsSync(notifsPath)) {
      try {
        allNotifs = JSON.parse(fs.readFileSync(notifsPath, "utf-8") || "[]");
      } catch {}
    }
    const resolvedCourseTitle = courseKey || courseId;
    allNotifs.unshift({
      id: `notif_${Date.now()}`,
      courseId: courseId,
      courseTitle: resolvedCourseTitle,
      type: lessonRecord.video_url ? "video_added" : "lesson_added",
      title: lessonRecord.video_url ? `New Video Added to ${resolvedCourseTitle}` : `New Lesson Added to ${resolvedCourseTitle}`,
      message: `Module "${mod.title}": "${lessonRecord.title}" is now available in your curriculum.`,
      timestamp: new Date().toISOString(),
      read: false,
    });
    fs.writeFileSync(notifsPath, JSON.stringify(allNotifs, null, 2), "utf-8");
  } catch {}

  revalidatePath("/admin/courses");
  revalidatePath("/course-outline");
  revalidatePath("/lms/learn");
  revalidatePath("/lms/courses");

  return { success: true, data: { lesson: lessonRecord } };
}

/**
 * Reorders lessons within a module.
 */
export async function reorderCourseLessonsAction(
  courseId: string,
  moduleId: string,
  orderedLessonIds: string[]
): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }
  const curriculumStore = readCentralCurriculumStore();
  const normId = courseId.trim().toLowerCase();
  const courseKey = Object.keys(curriculumStore).find((k) => k.toLowerCase() === normId);
  if (courseKey && curriculumStore[courseKey]?.modules) {
    const mod = curriculumStore[courseKey].modules.find((m: any) => m.id === moduleId);
    if (mod && Array.isArray(mod.lessons)) {
      const lessonsMap = new Map(mod.lessons.map((l: any) => [l.id, l]));
      const reordered: any[] = [];
      orderedLessonIds.forEach((id, idx) => {
        const les = lessonsMap.get(id);
        if (les) {
          (les as any).order_index = idx + 1;
          reordered.push(les);
        }
      });
      mod.lessons.forEach((l: any) => {
        if (!orderedLessonIds.includes(l.id)) reordered.push(l);
      });
      mod.lessons = reordered;
      writeCentralCurriculumStore(curriculumStore);
    }
  }
  revalidatePath("/admin/courses");
  revalidatePath("/course-outline");
  return { success: true };
}

/**
 * Deletes a lesson from a module.
 */
export async function deleteCourseLessonAction(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const curriculumStore = readCentralCurriculumStore();
  const normId = courseId.trim().toLowerCase();
  const courseKey = Object.keys(curriculumStore).find((k) => k.toLowerCase() === normId);

  if (courseKey && curriculumStore[courseKey]?.modules) {
    const mod = curriculumStore[courseKey].modules.find((m: any) => m.id === moduleId);
    if (mod && mod.lessons) {
      mod.lessons = mod.lessons.filter((l: any) => l.id !== lessonId);
      writeCentralCurriculumStore(curriculumStore);
    }
  }

  try {
    const supabase = await getSupabase();
    await supabase.from("lessons").delete().eq("id", lessonId);
  } catch {}

  revalidatePath("/admin/courses");
  revalidatePath("/lms/learn");

  return { success: true };
}

