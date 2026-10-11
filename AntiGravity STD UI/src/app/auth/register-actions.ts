"use server";

import { createAdminClient } from "@/lib/supabase/server";

export interface PublicRegistrationPayload {
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  courseInterest?: string;
  receiptTid?: string;
}

/**
 * Server action to ensure newly registered public students receive active account status.
 * Sets public.profiles.status = 'active' and auth.users app_metadata.status = 'active'.
 * Strictly does NOT grant any automatic course enrollments.
 */
export async function setPublicRegistrationActiveAction(payload: PublicRegistrationPayload) {
  try {
    const adminClient = createAdminClient();
    const normalizedEmail = payload.email.trim().toLowerCase();

    // 1. Explicitly ensure profile status is 'active'
    await (adminClient as any).from("profiles").upsert(
      {
        id: payload.userId,
        email: normalizedEmail,
        full_name: payload.fullName,
        phone: payload.phone || null,
        role: "student",
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // 2. Set auth metadata status to 'active'
    try {
      const { data: userData } = await adminClient.auth.admin.getUserById(payload.userId);
      const currentMeta = userData?.user?.app_metadata || {};
      await adminClient.auth.admin.updateUserById(payload.userId, {
        app_metadata: {
          ...currentMeta,
          role: "student",
          status: "active",
        },
      });
    } catch (authErr) {
      console.warn("Notice: Auth app_metadata status update for public registration:", authErr);
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to initialize public registration active status:", err);
    return { success: false, error: "Failed to initialize student account status." };
  }
}

// Preserve backwards-compatibility alias
export const setPublicRegistrationPendingAction = setPublicRegistrationActiveAction;
