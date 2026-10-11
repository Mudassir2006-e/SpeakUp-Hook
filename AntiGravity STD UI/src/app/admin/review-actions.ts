"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { getCurrentUserRole } from "@/lib/auth/roles";
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

  const reviews = readReviewsStore();
  reviews.unshift(newReview);
  writeReviewsStore(reviews);

  // Sync with Supabase if table exists
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }
    await supabase.from("cms_content").upsert({
      page_key: "central_reviews",
      published_data: { reviews },
      draft_data: { reviews },
      updated_at: now,
    });
  } catch {}

  revalidatePath("/admin/reviews");
  return { success: true, data: { reviewId: id } };
}

/**
 * Returns all reviews for Admin Panel moderation.
 */
export async function getAdminReviewsAction(): Promise<ActionResponse<CentralReview[]>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error, data: [] };
  }
  const reviews = readReviewsStore();
  return { success: true, data: reviews };
}

/**
 * Returns ONLY reviews that have been accepted AND published.
 * Consumed by the public website (/reviews and homepage).
 */
export async function getPublicPublishedReviewsAction(): Promise<ActionResponse<CentralReview[]>> {
  try {
    const reviews = readReviewsStore();
    const published = reviews.filter((r) => r.status === "published");
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

  let reviews = readReviewsStore();
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
  try {
    let supabase: any;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }
    await supabase.from("cms_content").upsert({
      page_key: "central_reviews",
      published_data: { reviews },
      draft_data: { reviews },
      updated_at: now,
    });
  } catch {}

  revalidatePath("/reviews");
  revalidatePath("/");
  revalidatePath("/admin/reviews");

  return { success: true };
}
