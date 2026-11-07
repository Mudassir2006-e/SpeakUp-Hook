"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { validateName, validateEmail, validatePhone } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export interface BookingSubmissionPayload {
  fullName: string;
  email: string;
  countryCode: string;
  phone: string;
  network?: string;
  status?: string;
  message?: string;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Submits a new advisory booking request.
 * Enforces server-side validation, duplicate submission guards,
 * and persists directly to Supabase public.booking_requests.
 * Fully decoupled from local filesystem writes for Vercel Serverless compatibility.
 */
export async function submitBookingRequestAction(
  payload: BookingSubmissionPayload
): Promise<ActionResponse<{ bookingId: string }>> {
  // 1. Validation
  const nameVal = validateName(payload.fullName, "Full name");
  if (!nameVal.valid) {
    return { success: false, error: nameVal.error };
  }

  const emailVal = validateEmail(payload.email);
  if (!emailVal.valid) {
    return { success: false, error: emailVal.error };
  }

  const phoneVal = validatePhone(payload.phone, payload.countryCode);
  if (!phoneVal.valid) {
    return { success: false, error: phoneVal.error };
  }

  const cleanName = payload.fullName.trim();
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanCountryCode = payload.countryCode?.trim() || "+92";
  const cleanPhone = payload.phone.trim();
  const cleanNetwork = payload.network?.trim() || null;
  const cleanStatus = payload.status?.trim() || "professional";
  const cleanMessage = payload.message?.trim() || null;
  const now = new Date().toISOString();

  // Resolve database client (prefer elevated admin client; fallback to standard server client)
  let dbClient: any;
  try {
    dbClient = createAdminClient();
  } catch {
    dbClient = await createClient();
  }

  // 2. Prevent duplicate submissions: check if a pending/contacted booking exists
  // for the same email or phone submitted within the last 15 minutes.
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: existingRecent, error: dupCheckError } = await dbClient
      .from("booking_requests")
      .select("id, created_at, status")
      .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
      .gte("created_at", fifteenMinutesAgo)
      .limit(1);

    if (!dupCheckError && existingRecent && existingRecent.length > 0) {
      // Reassure user that their request was received without creating duplicate records
      return {
        success: true,
        data: { bookingId: existingRecent[0].id },
      };
    }
  } catch (dupCheckErr) {
    console.warn("[Booking Duplicate Check Notice]:", dupCheckErr);
  }

  // 3. Durable write to Supabase public.booking_requests
  let createdBookingId = `book_${Date.now()}`;
  try {
    const { data: insData, error: dbError } = await dbClient
      .from("booking_requests")
      .insert({
        full_name: cleanName,
        email: cleanEmail,
        country_code: cleanCountryCode,
        phone: cleanPhone,
        network: cleanNetwork,
        professional_status: cleanStatus,
        message: cleanMessage,
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    if (dbError) {
      console.error("[Booking DB Error] Supabase insert failed:", {
        code: dbError.code,
        message: dbError.message,
      });
      return {
        success: false,
        error: "Unable to submit your booking request at this time. Please try again later.",
      };
    }

    if (insData?.id) {
      createdBookingId = insData.id;
    }
  } catch (err: any) {
    console.error("[Booking DB Exception] Unexpected error during insert:", err?.message || err);
    return {
      success: false,
      error: "Unable to submit your booking request at this time. Please try again later.",
    };
  }

  // 4. Notify administrator of new booking submission at authoritative login email
  try {
    const { sendAdminNotificationEmail } = await import("@/lib/email");
    await sendAdminNotificationEmail({
      subject: `New Advisory Session Booking: ${cleanName}`,
      html: `<p>A new advisory session booking request was submitted:</p><ul><li><strong>Name:</strong> ${cleanName}</li><li><strong>Email:</strong> ${cleanEmail}</li><li><strong>Phone:</strong> ${cleanCountryCode} ${cleanPhone}</li><li><strong>Status:</strong> ${cleanStatus}</li><li><strong>Submission Time:</strong> ${now}</li></ul>`,
    });
  } catch (adminNotifyErr) {
    console.warn("Notice: Non-blocking admin notification for booking request:", adminNotifyErr);
  }

  revalidatePath("/admin/bookings");

  return { success: true, data: { bookingId: createdBookingId } };
}
