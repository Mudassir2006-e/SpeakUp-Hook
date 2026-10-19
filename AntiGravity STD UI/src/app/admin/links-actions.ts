"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyAdminCaller as verifyAdminMfaCaller } from "@/lib/auth/adminVerification";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface SocialLinksData {
  linkedin: string;
  instagram: string;
  facebook: string;
  facebookActive?: boolean;
  websiteDomain?: string;
  websiteDomainActive?: boolean;
  websiteDomainStatus?: "Not Configured" | "Pending Verification" | "Configured" | "Error";
  whatsappNumber?: string;
}

const PUBLISHED_STORE_PATH = path.join(process.cwd(), "cms-published-store.json");

function readPublishedStore(): Record<string, any> {
  try {
    if (fs.existsSync(PUBLISHED_STORE_PATH)) {
      const raw = fs.readFileSync(PUBLISHED_STORE_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // Non-blocking
  }
  return {};
}

function writePublishedStore(store: Record<string, any>) {
  try {
    fs.writeFileSync(PUBLISHED_STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // Non-blocking
  }
}

/**
 * Validates that the current user has verified administrator privileges.
 */
async function verifyAdminCaller(): Promise<{ adminId: string } | { error: string }> {
  return verifyAdminMfaCaller();
}

async function getSupabase(): Promise<any> {
  try {
    return createAdminClient() as any;
  } catch {
    return (await createClient()) as any;
  }
}

/**
 * Validates a web URL format.
 */
function isValidUrl(stringUrl: string): boolean {
  try {
    const parsed = new URL(stringUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Retrieves the draft and published social links configuration.
 */
export async function getSocialLinksAction(): Promise<
  ActionResponse<{
    draft: SocialLinksData;
    published: SocialLinksData;
    hasUnpublishedChanges: boolean;
  }>
> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const supabase = await getSupabase();
    const { data: record } = await supabase
      .from("cms_content")
      .select("draft_data, published_data")
      .eq("page_key", "social_links")
      .maybeSingle();

    const defaultLinks: SocialLinksData = {
      linkedin: "https://www.linkedin.com",
      instagram: "https://www.instagram.com",
      facebook: "",
      facebookActive: false,
      websiteDomain: "",
      websiteDomainActive: false,
      websiteDomainStatus: "Not Configured",
      whatsappNumber: "+92 300 0000000",
    };

    const draft: SocialLinksData = {
      linkedin: record?.draft_data?.linkedin ?? defaultLinks.linkedin,
      instagram: record?.draft_data?.instagram ?? defaultLinks.instagram,
      facebook: record?.draft_data?.facebook ?? defaultLinks.facebook,
      facebookActive: record?.draft_data?.facebookActive ?? (Boolean(record?.draft_data?.facebook)),
      websiteDomain: record?.draft_data?.websiteDomain ?? defaultLinks.websiteDomain,
      websiteDomainActive: record?.draft_data?.websiteDomainActive ?? (Boolean(record?.draft_data?.websiteDomain)),
      websiteDomainStatus: record?.draft_data?.websiteDomainStatus ?? (record?.draft_data?.websiteDomain ? "Pending Verification" : "Not Configured"),
      whatsappNumber: record?.draft_data?.whatsappNumber ?? defaultLinks.whatsappNumber,
    };

    const published: SocialLinksData = {
      linkedin: record?.published_data?.linkedin ?? defaultLinks.linkedin,
      instagram: record?.published_data?.instagram ?? defaultLinks.instagram,
      facebook: record?.published_data?.facebook ?? defaultLinks.facebook,
      facebookActive: record?.published_data?.facebookActive ?? (Boolean(record?.published_data?.facebook)),
      websiteDomain: record?.published_data?.websiteDomain ?? defaultLinks.websiteDomain,
      websiteDomainActive: record?.published_data?.websiteDomainActive ?? (Boolean(record?.published_data?.websiteDomain)),
      websiteDomainStatus: record?.published_data?.websiteDomainStatus ?? (record?.published_data?.websiteDomain ? "Pending Verification" : "Not Configured"),
      whatsappNumber: record?.published_data?.whatsappNumber ?? defaultLinks.whatsappNumber,
    };

    const hasUnpublishedChanges =
      draft.linkedin !== published.linkedin ||
      draft.instagram !== published.instagram ||
      draft.facebook !== published.facebook ||
      draft.facebookActive !== published.facebookActive ||
      draft.websiteDomain !== published.websiteDomain ||
      draft.websiteDomainActive !== published.websiteDomainActive ||
      draft.websiteDomainStatus !== published.websiteDomainStatus ||
      draft.whatsappNumber !== published.whatsappNumber;

    return {
      success: true,
      data: {
        draft,
        published,
        hasUnpublishedChanges,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to load social links.",
    };
  }
}

/**
 * Public action to retrieve the live published social links for public footer & pages.
 */
export async function getPublishedSocialLinksAction(): Promise<ActionResponse<SocialLinksData>> {
  try {
    const supabase = await getSupabase();
    const { data: record } = await supabase
      .from("cms_content")
      .select("published_data")
      .eq("page_key", "social_links")
      .maybeSingle();

    let published = record?.published_data as SocialLinksData | undefined;

    if (!published) {
      const localStore = readPublishedStore();
      published = localStore["social_links"];
    }

    const resolved: SocialLinksData = {
      linkedin: published?.linkedin?.trim() || "https://www.linkedin.com",
      instagram: published?.instagram?.trim() || "https://www.instagram.com",
      facebook: published?.facebook?.trim() || "",
      websiteDomain: published?.websiteDomain?.trim() || "",
      whatsappNumber: published?.whatsappNumber?.trim() || "+92 300 0000000",
    };

    return { success: true, data: resolved };
  } catch {
    return {
      success: true,
      data: {
        linkedin: "https://www.linkedin.com",
        instagram: "https://www.instagram.com",
        facebook: "",
        websiteDomain: "",
        whatsappNumber: "+92 300 0000000",
      },
    };
  }
}

/**
 * Saves current draft of social links without making them live on the public site.
 */
export async function saveDraftSocialLinksAction(
  data: SocialLinksData
): Promise<ActionResponse<SocialLinksData>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  // Validate format of non-empty URLs
  const websiteDomainTrimmed = (data.websiteDomain || "").trim();
  const websiteDomainActive = data.websiteDomainActive ?? Boolean(websiteDomainTrimmed);
  const websiteDomainStatus: "Not Configured" | "Pending Verification" | "Configured" | "Error" =
    !websiteDomainActive || !websiteDomainTrimmed
      ? "Not Configured"
      : data.websiteDomainStatus || "Pending Verification";

  const facebookTrimmed = (data.facebook || "").trim();
  const facebookActive = data.facebookActive ?? Boolean(facebookTrimmed);

  const trimmed: SocialLinksData = {
    linkedin: (data.linkedin || "").trim(),
    instagram: (data.instagram || "").trim(),
    facebook: facebookTrimmed,
    facebookActive,
    websiteDomain: websiteDomainTrimmed,
    websiteDomainActive,
    websiteDomainStatus,
    whatsappNumber: (data.whatsappNumber || "").trim() || "+92 300 0000000",
  };

  if (trimmed.linkedin && !isValidUrl(trimmed.linkedin)) {
    return { success: false, error: "Please provide a valid LinkedIn URL (e.g. https://www.linkedin.com/company/speakup)." };
  }
  if (trimmed.instagram && !isValidUrl(trimmed.instagram)) {
    return { success: false, error: "Please provide a valid Instagram URL (e.g. https://www.instagram.com/speakup)." };
  }
  if (trimmed.facebook && facebookActive && !isValidUrl(trimmed.facebook)) {
    return { success: false, error: "Please provide a valid Facebook URL (e.g. https://www.facebook.com/speakup)." };
  }
  if (trimmed.websiteDomain && websiteDomainActive && !isValidUrl(trimmed.websiteDomain)) {
    return { success: false, error: "Please provide a valid Website Domain URL (e.g. https://speakup.com)." };
  }

  try {
    const supabase = await getSupabase();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from("cms_content")
      .select("id, version, published_data")
      .eq("page_key", "social_links")
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("cms_content")
        .update({
          draft_data: trimmed,
          version: (existing.version || 1) + 1,
          updated_at: now,
          updated_by: authCheck.adminId,
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("cms_content")
        .insert({
          page_key: "social_links",
          draft_data: trimmed,
          published_data: {
            linkedin: "https://www.linkedin.com",
            instagram: "https://www.instagram.com",
            facebook: "",
            facebookActive: false,
            websiteDomain: "",
            websiteDomainActive: false,
            websiteDomainStatus: "Not Configured",
          },
          version: 1,
          updated_at: now,
          updated_by: authCheck.adminId,
        });
    }

    revalidatePath("/admin/links");
    return { success: true, data: trimmed };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to save draft links.",
    };
  }
}

/**
 * Publishes the social links to the public website after rigorous validation.
 */
export async function publishSocialLinksAction(
  data: SocialLinksData
): Promise<ActionResponse<SocialLinksData>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const websiteDomainTrimmed = (data.websiteDomain || "").trim();
  const websiteDomainActive = data.websiteDomainActive ?? Boolean(websiteDomainTrimmed);
  const websiteDomainStatus: "Not Configured" | "Pending Verification" | "Configured" | "Error" =
    !websiteDomainActive || !websiteDomainTrimmed
      ? "Not Configured"
      : data.websiteDomainStatus || "Pending Verification";

  const facebookTrimmed = (data.facebook || "").trim();
  const facebookActive = data.facebookActive ?? Boolean(facebookTrimmed);

  const trimmed: SocialLinksData = {
    linkedin: (data.linkedin || "").trim(),
    instagram: (data.instagram || "").trim(),
    facebook: facebookTrimmed,
    facebookActive,
    websiteDomain: websiteDomainTrimmed,
    websiteDomainActive,
    websiteDomainStatus,
    whatsappNumber: (data.whatsappNumber || "").trim() || "+92 300 0000000",
  };

  // Rigorous validation before publishing: do not accept malformed URLs
  if (!trimmed.linkedin || !isValidUrl(trimmed.linkedin)) {
    return { success: false, error: "A valid LinkedIn destination URL is required to publish." };
  }
  if (!trimmed.instagram || !isValidUrl(trimmed.instagram)) {
    return { success: false, error: "A valid Instagram destination URL is required to publish." };
  }
  if (facebookActive && trimmed.facebook && !isValidUrl(trimmed.facebook)) {
    return { success: false, error: "Facebook URL is malformed. Please enter a valid URL (starting with https://) or deactivate it." };
  }
  if (websiteDomainActive && trimmed.websiteDomain && !isValidUrl(trimmed.websiteDomain)) {
    return { success: false, error: "Website Domain URL is malformed. Please enter a valid URL (e.g. https://speakup.com) or deactivate it." };
  }

  try {
    const supabase = await getSupabase();
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from("cms_content")
      .select("id, version")
      .eq("page_key", "social_links")
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("cms_content")
        .update({
          draft_data: trimmed,
          published_data: trimmed,
          version: (existing.version || 1) + 1,
          updated_at: now,
          updated_by: authCheck.adminId,
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("cms_content")
        .insert({
          page_key: "social_links",
          draft_data: trimmed,
          published_data: trimmed,
          version: 1,
          updated_at: now,
          updated_by: authCheck.adminId,
        });
    }

    // Update local published store for instantaneous edge/fallback consumption
    const store = readPublishedStore();
    store["social_links"] = trimmed;
    writePublishedStore(store);

    // Revalidate public routes
    revalidatePath("/");
    revalidatePath("/courses");
    revalidatePath("/about");
    revalidatePath("/privacy");
    revalidatePath("/pricing");
    revalidatePath("/lms/events");
    revalidatePath("/admin/links");

    return { success: true, data: trimmed };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to publish social links.",
    };
  }
}
