"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyAdminCaller as verifyAdminMfaCaller } from "@/lib/auth/adminVerification";
import { revalidatePath } from "next/cache";

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface LogoSettingsData {
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
  updatedAt: string;
}

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
 * Retrieves custom light and dark logo URLs from Supabase.
 */
export async function getLogoSettingsAction(): Promise<ActionResponse<LogoSettingsData>> {
  try {
    const supabase = await getSupabase();
    const { data: record } = await supabase
      .from("cms_content")
      .select("published_data, draft_data, updated_at")
      .eq("page_key", "site_branding")
      .maybeSingle();

    const data = (record?.published_data as any) || (record?.draft_data as any) || {};

    return {
      success: true,
      data: {
        lightLogoUrl: data.light_logo_url || null,
        darkLogoUrl: data.dark_logo_url || null,
        updatedAt: record?.updated_at || new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to load logo settings.",
    };
  }
}

/**
 * Uploads a custom logo for light or dark mode to Supabase Storage,
 * and saves the reference to cms_content.
 */
export async function uploadLogoImageAction(
  formData: FormData,
  themeMode: "light" | "dark"
): Promise<ActionResponse<{ logoUrl: string }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No image file provided." };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: "Invalid file format. Allowed formats: PNG, JPG, WebP, or SVG.",
    };
  }

  if (file.size > 2 * 1024 * 1024) {
    return {
      success: false,
      error: "Logo file exceeds maximum 2MB size limit.",
    };
  }

  try {
    const adminClient = createAdminClient();
    const ext = file.type === "image/png"
      ? "png"
      : file.type === "image/svg+xml"
      ? "svg"
      : file.type === "image/webp"
      ? "webp"
      : "jpg";

    const fileName = `logo_${themeMode}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Logo upload error:", uploadError);
      return { success: false, error: "Failed to upload logo to storage." };
    }

    const { data: pubData } = adminClient.storage.from("avatars").getPublicUrl(fileName);
    const logoUrl = pubData.publicUrl;

    // Load current record
    const { data: existing } = await (adminClient as any)
      .from("cms_content")
      .select("id, published_data, draft_data, version")
      .eq("page_key", "site_branding")
      .maybeSingle();

    const currentData = (existing?.published_data as any) || (existing?.draft_data as any) || {};
    const updatedData = {
      ...currentData,
      [`${themeMode}_logo_url`]: logoUrl,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await (adminClient as any)
        .from("cms_content")
        .update({
          draft_data: updatedData,
          published_data: updatedData,
          version: (existing.version || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await (adminClient as any)
        .from("cms_content")
        .insert({
          page_key: "site_branding",
          draft_data: updatedData,
          published_data: updatedData,
          version: 1,
          updated_at: new Date().toISOString(),
        });
    }

    revalidatePath("/admin/edit");
    return { success: true, data: { logoUrl } };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to save logo configuration.",
    };
  }
}

/**
 * Removes custom logo for specified theme mode, reverting to default SpeakUpSymbol.
 */
export async function removeCustomLogoAction(
  themeMode: "light" | "dark"
): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const adminClient = createAdminClient();
    const { data: existing } = await (adminClient as any)
      .from("cms_content")
      .select("id, published_data, draft_data, version")
      .eq("page_key", "site_branding")
      .maybeSingle();

    if (existing?.id) {
      const currentData = (existing.published_data as any) || (existing.draft_data as any) || {};
      const updatedData = {
        ...currentData,
        [`${themeMode}_logo_url`]: null,
        updated_at: new Date().toISOString(),
      };

      await (adminClient as any)
        .from("cms_content")
        .update({
          draft_data: updatedData,
          published_data: updatedData,
          version: (existing.version || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }

    revalidatePath("/admin/edit");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to remove custom logo.",
    };
  }
}
