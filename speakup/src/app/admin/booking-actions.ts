"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyAdminCaller } from "@/lib/auth/adminVerification";
import { revalidatePath } from "next/cache";

export type BookingStatus =
  | "pending"
  | "contacted"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "archived";

export interface AdminBookingRecord {
  id: string;
  full_name: string;
  email: string;
  country_code: string;
  phone: string;
  network?: string | null;
  professional_status?: string | null;
  message?: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Retrieves all advisory booking requests from Supabase public.booking_requests.
 * Strictly requires verified administrator authentication and active MFA session.
 */
export async function getAdminBookingsAction(): Promise<ActionResponse<AdminBookingRecord[]>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const { data, error } = await supabase
      .from("booking_requests")
      .select("id, full_name, email, country_code, phone, network, professional_status, message, status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Admin Bookings Error]:", error);
      return { success: false, error: error.message || "Failed to load booking requests." };
    }

    const bookings: AdminBookingRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      full_name: row.full_name || "Applicant",
      email: row.email || "",
      country_code: row.country_code || "+92",
      phone: row.phone || "",
      network: row.network || null,
      professional_status: row.professional_status || "professional",
      message: row.message || null,
      status: (row.status as BookingStatus) || "pending",
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    }));

    return { success: true, data: bookings };
  } catch (err: any) {
    console.error("[Admin Bookings Exception]:", err);
    return { success: false, error: err?.message || "Unexpected error fetching booking requests." };
  }
}

/**
 * Updates the lifecycle status of an advisory booking request.
 * Strictly requires verified administrator authentication and active MFA session.
 */
export async function updateBookingStatusAction(
  bookingId: string,
  newStatus: BookingStatus,
  notes?: string
): Promise<ActionResponse<undefined>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  const validStatuses: BookingStatus[] = [
    "pending",
    "contacted",
    "scheduled",
    "completed",
    "cancelled",
    "archived",
  ];

  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: `Invalid status: ${newStatus}` };
  }

  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const updatePayload: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updatePayload.message = notes;
    }

    const { error } = await supabase
      .from("booking_requests")
      .update(updatePayload)
      .eq("id", bookingId);

    if (error) {
      console.error("[Update Booking Error]:", error);
      return { success: false, error: error.message || "Failed to update booking status." };
    }

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (err: any) {
    console.error("[Update Booking Exception]:", err);
    return { success: false, error: err?.message || "Failed to update booking status." };
  }
}

/**
 * Archives an advisory booking request (soft-archive).
 * Strictly preserves records; does NOT permanently delete booking data.
 * Requires verified administrator authentication and active MFA session.
 */
export async function archiveBookingAction(bookingId: string): Promise<ActionResponse<undefined>> {
  return updateBookingStatusAction(bookingId, "archived");
}
