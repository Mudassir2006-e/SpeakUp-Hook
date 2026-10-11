"use server";

import fs from "fs";
import path from "path";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { validateName, validateEmail, validatePhone } from "@/lib/validation";

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

const BOOKINGS_STORE_PATH = path.join(process.cwd(), "src", "config", "central-bookings.json");

function readBookingsStore(): any[] {
  try {
    if (fs.existsSync(BOOKINGS_STORE_PATH)) {
      const content = fs.readFileSync(BOOKINGS_STORE_PATH, "utf-8");
      return JSON.parse(content || "[]");
    }
  } catch (err) {
    console.error("Error reading bookings store:", err);
  }
  return [];
}

function writeBookingsStore(bookings: any[]) {
  try {
    fs.writeFileSync(BOOKINGS_STORE_PATH, JSON.stringify(bookings, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing bookings store:", err);
  }
}

/**
 * Submits a new advisory booking request.
 * Enforces server-side validation and creates a record with 'pending' status.
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

  const id = `book_${Date.now()}`;
  const now = new Date().toISOString();

  const bookingRecord = {
    id,
    full_name: payload.fullName.trim(),
    email: payload.email.trim().toLowerCase(),
    country_code: payload.countryCode || "+92",
    phone: payload.phone.trim(),
    network: payload.network?.trim() || null,
    professional_status: payload.status?.trim() || "professional",
    message: payload.message?.trim() || null,
    status: "pending",
    created_at: now,
  };

  // 2. Persist locally to durable store
  const bookings = readBookingsStore();
  bookings.unshift(bookingRecord);
  writeBookingsStore(bookings);

  // 3. Attempt write to Supabase public.booking_requests
  try {
    const supabase: any = await createClient();
    await supabase.from("booking_requests").insert({
      full_name: bookingRecord.full_name,
      email: bookingRecord.email,
      country_code: bookingRecord.country_code,
      phone: bookingRecord.phone,
      network: bookingRecord.network,
      professional_status: bookingRecord.professional_status,
      message: bookingRecord.message,
      status: "pending",
    });
  } catch (err) {
    // Graceful fallback to durable JSON store if table is still migrating
    console.warn("Supabase booking_requests insert notice:", err);
  }

  return { success: true, data: { bookingId: id } };
}
