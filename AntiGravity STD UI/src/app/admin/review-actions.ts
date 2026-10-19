"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { verifyAdminCaller as verifyAdminMfaCaller } from "@/lib/auth/adminVerification";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface CentralReview {
  id: string;
  student_name: string;
  student_email: string;
  rating: number; // 1 to 5
  review_text: string;
  program: string;
  status: "pending" | "accepted" | "published" | "rejected";
  created_at: string;
  published_at?: string | null;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

const REVIEWS_STORE_PATH = path.join(process.cwd(), "src", "config", "central-reviews.json");

function readReviewsStore(): CentralReview[] {
  try {
    if (fs.existsSync(REVIEWS_STORE_PATH)) {
      const content = fs.readFileSync(REVIEWS_STORE_PATH, "utf-8");
      return JSON.parse(content || "[]");
    }
  } catch (err) {
    console.error("Error reading reviews store:", err);
  }
  return [];
}

function writeReviewsStore(reviews: CentralReview[]) {
  try {
    fs.writeFileSync(REVIEWS_STORE_PATH, JSON.stringify(reviews, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing reviews store:", err);
  }
}

async function verifyAdminCaller(): Promise<{ adminId: string } | { error: string }> {
  return verifyAdminMfaCaller();
}

/**
 * Submits a new authentic student review.
 * Always created with status 'pending' awaiting administrator moderation.
 */
export async function submitStudentReviewAction(payload: {
  student_name: string;
  student_email: string;
  rating: number;
  review_text: string;
  program?: string;
}): Promise<ActionResponse<{ reviewId: string }>> {
  const name = payload.student_name?.trim();
  const email = payload.student_email?.trim();
  const text = payload.review_text?.trim();

  if (!name) return { success: false, error: "Please provide your full name." };
  if (!email || !email.includes("@")) return { success: false, error: "Please provide a valid email address." };
  if (!text) return { success: false, error: "Please write your review before submitting." };

  const rating = Math.min(5, Math.max(1, Math.round(Number(payload.rating) || 5)));
  const id = `rev_${Date.now()}`;
  const now = new Date().toISOString();

  const newReview: CentralReview = {
    id,
    student_name: name,
    student_email: email,
    rating,
    review_text: text,
    program: payload.program?.trim() || "English Grammar Mastery — A1",
    status: "pending",
    created_at: now,
  };

  // 2. Persist locally to fallback store (Note: In serverless runtimes,
  // local filesystem writes are ephemeral; durable synchronization requires database write).
  let localPersisted = false;
  try {
    const reviews = readReviewsStore();
    reviews.unshift(newReview);
    writeReviewsStore(reviews);
    localPersisted = true;
  } catch (err: any) {
    console.error("[Review Store Notice] Local fallback write failed:", err?.message || err);
  }

  // 3. Attempt durable sync with Supabase
  let dbPersisted = false;
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }
    // Sync into cms_content
    const { error: cmsError } = await supabase.from("cms_content").upsert({
      page_key: "central_reviews",
      published_data: { reviews: readReviewsStore() },
      draft_data: { reviews: readReviewsStore() },
      updated_at: now,
    });
    if (cmsError) {
      console.error("[Review DB Error] cms_content sync failed:", {
        code: cmsError.code,
        message: cmsError.message,
      });
    }

    // Attempt direct insert into public.reviews table conforming to RLS
    const { error: reviewError } = await supabase.from("reviews").insert({
      student_name: newReview.student_name,
      student_email: newReview.student_email,
      rating: newReview.rating,
      review_text: newReview.review_text,
      program: newReview.program,
      status: "pending",
    });

    if (reviewError) {
      console.error("[Review DB Error] public.reviews insert failed:", {
        code: reviewError.code,
        message: reviewError.message,
      });
    } else {
      dbPersisted = true;
    }
  } catch (err: any) {
    console.error("[Review DB Exception] Unexpected sync error:", err?.message || err);
  }

  // 4. Fail-safe response handling
  if (!dbPersisted && !localPersisted) {
    return {
      success: false,
      error: "Unable to submit your review at this time. Please try again later.",
    };
  }

  if (!dbPersisted) {
    console.warn("[Review Sync Notice] Review recorded in local fallback, but database insert did not complete.");
  }

  revalidatePath("/admin/reviews");
  return { success: true, data: { reviewId: id } };
}

/**
 * Returns all reviews for Admin Panel moderation.
 * Includes student_email for authorized administrative verification.
 */
export async function getAdminReviewsAction(): Promise<ActionResponse<CentralReview[]>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error, data: [] };
  }

  try {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from("cms_content")
        .select("published_data")
        .eq("page_key", "central_reviews")
        .maybeSingle();

      if (!error && data?.published_data?.reviews && Array.isArray(data.published_data.reviews)) {
        return { success: true, data: data.published_data.reviews };
      }
    } catch (e) {
      console.warn("DB reviews fetch notice:", e);
    }

    const reviews = readReviewsStore();
    return { success: true, data: reviews };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load admin reviews.", data: [] };
  }
}

/**
 * Returns ONLY reviews that have been accepted AND published.
 * Consumed by the public website (/reviews and homepage).
 * Sanitizes student_email to protect reviewer privacy.
 */
export async function getPublicPublishedReviewsAction(): Promise<ActionResponse<CentralReview[]>> {
  try {
    let reviews: CentralReview[] = [];
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from("cms_content")
        .select("published_data")
        .eq("page_key", "central_reviews")
        .maybeSingle();

      if (!error && data?.published_data?.reviews && Array.isArray(data.published_data.reviews)) {
        reviews = data.published_data.reviews;
      }
    } catch (e) {
      console.warn("DB public reviews fetch notice:", e);
    }

    if (!reviews.length) {
      reviews = readReviewsStore();
    }

    const published = reviews
      .filter((r) => r.status === "published")
      .map((r) => ({
        ...r,
        student_email: "", // Omit student email from public response to protect reviewer privacy
      }));
    return { success: true, data: published };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load reviews.", data: [] };
  }
}

/**
 * Moderates a review: Accept, Publish, Unpublish, Reject, or Delete.
 */
export async function moderateReviewAction(
  reviewId: string,
  action: "accept" | "publish" | "unpublish" | "reject" | "delete"
): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  let reviews = (await getAdminReviewsAction()).data || readReviewsStore();
  const existingIdx = reviews.findIndex((r) => r.id === reviewId);

  if (existingIdx === -1) {
    return { success: false, error: "Review not found." };
  }

  const now = new Date().toISOString();

  if (action === "delete") {
    reviews = reviews.filter((r) => r.id !== reviewId);
  } else if (action === "accept") {
    reviews[existingIdx].status = "accepted";
  } else if (action === "publish") {
    reviews[existingIdx].status = "published";
    reviews[existingIdx].published_at = now;
  } else if (action === "unpublish") {
    reviews[existingIdx].status = "accepted";
  } else if (action === "reject") {
    reviews[existingIdx].status = "rejected";
  }

  writeReviewsStore(reviews);

  // Sync to Supabase
  let dbPersisted = false;
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }
    const { error: cmsError } = await supabase.from("cms_content").upsert({
      page_key: "central_reviews",
      published_data: { reviews },
      draft_data: { reviews },
      updated_at: now,
      updated_by: authCheck.adminId,
    }, { onConflict: "page_key" });

    if (!cmsError) {
      dbPersisted = true;
    } else {
      console.error("[Moderate Review DB Error] cms_content upsert failed:", {
        code: cmsError.code,
        message: cmsError.message,
      });
    }
  } catch (err: any) {
    console.error("[Moderate Review DB Exception] Unexpected sync error:", err?.message || err);
  }

  if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
    return {
      success: false,
      error: "Failed to persist review moderation to database. Please try again.",
    };
  }

  revalidatePath("/reviews");
  revalidatePath("/");
  revalidatePath("/admin/reviews");

  return { success: true };
}
