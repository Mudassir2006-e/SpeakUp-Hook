"use server";

import fs from "fs";
import path from "path";

function safeRevalidatePath(p: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { revalidatePath } = require("next/cache");
    if (typeof revalidatePath === "function") revalidatePath(p);
  } catch {}
}
import type {
  Assignment,
  AssignmentSubmission,
  SubmissionPage,
  PracticeType,
  AssignmentStatus,
} from "@/types/assignment";
import { optimizeAssignmentImage } from "@/lib/imageOptimization";
import { gradeAssignmentSubmission } from "@/lib/ai/assignmentChecker";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const ASSIGNMENTS_FILE = path.join(process.cwd(), "src", "config", "central-assignments.json");
const SUBMISSIONS_FILE = path.join(process.cwd(), "src", "config", "central-submissions.json");
const COURSES_FILE = path.join(process.cwd(), "src", "config", "central-courses.json");
const ASSIGNMENT_SETTINGS_FILE = path.join(process.cwd(), "src", "config", "assignment-settings.json");

function isAssignmentSystemEnabled(): boolean {
  try {
    const settings = readJsonFile<{ assignmentsEnabled?: boolean }>(ASSIGNMENT_SETTINGS_FILE, { assignmentsEnabled: true });
    return settings.assignmentsEnabled !== false;
  } catch {
    return true;
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
      return fallback;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

export interface StudentActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function getAssignmentAccessStatusAction(): Promise<{ enabled: boolean }> {
  return { enabled: isAssignmentSystemEnabled() };
}

/**
 * Fetches the optional assignment attached to a specific lesson & practice type (reading | writing).
 * Returns null if no assignment is attached (no empty assignment UI shown).
 */
export async function getLessonAssignmentAction(
  courseId: string,
  moduleId: string,
  lessonId: string,
  practiceType: PracticeType
): Promise<StudentActionResult<Assignment | null>> {
  try {
    if (!isAssignmentSystemEnabled()) {
      return { success: true, data: null, message: "Assignments are currently disabled by the instructor." };
    }

    const assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);

    // Exact match: Course -> Module -> Lesson -> Reading/Writing
    const found =
      assignments.find(
        (a) =>
          a.isActive &&
          a.courseId.toLowerCase() === courseId.toLowerCase() &&
          a.moduleId.toLowerCase() === moduleId.toLowerCase() &&
          a.lessonId.toLowerCase() === lessonId.toLowerCase() &&
          a.practiceType.toLowerCase() === practiceType.toLowerCase()
      ) || null;

    return { success: true, data: found };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load lesson assignment.",
    };
  }
}

/**
 * Fetches the student's submission for a given assignment, scoped strictly to the student and course.
 */
export async function getStudentAssignmentSubmissionAction(
  assignmentId: string,
  courseId: string
): Promise<StudentActionResult<AssignmentSubmission | null>> {
  try {
    let studentId = "";
    let studentEmail = "";

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        studentId = user.id;
        studentEmail = user.email || "";
      }
    } catch {}

    if (!studentId) {
      return { success: false, error: "Authentication required. Please sign in to view submissions." };
    }

    const submissions = readJsonFile<AssignmentSubmission[]>(SUBMISSIONS_FILE, []);

    const found =
      submissions.find(
        (s) =>
          s.assignmentId === assignmentId &&
          s.courseId.toLowerCase() === courseId.toLowerCase() &&
          (s.studentId === studentId || s.studentEmail.toLowerCase() === studentEmail.toLowerCase())
      ) || null;

    return { success: true, data: found };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load student submission.",
    };
  }
}

export const ASSIGNMENT_UPLOAD_CONFIG = {
  maxImagesPerSubmission: 6,
  maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB limit per image
  allowedMimes: ["image/jpeg", "image/jpg", "image/png"],
};

function isValidImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  // PNG: 89 50 4E 47
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  return isJpeg || isPng;
}

/**
 * Uploads one or multiple page images for an assignment.
 * Supports JPG, JPEG, PNG up to 5MB per file, max 6 images.
 * Validates magic bytes, uploads to private storage with signed URLs, and optimizes images.
 */
export async function uploadAssignmentPagesAction(
  formData: FormData
): Promise<StudentActionResult<SubmissionPage[]>> {
  try {
    if (!isAssignmentSystemEnabled()) {
      return { success: false, error: "Assignment submissions are currently disabled by the instructor." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Authentication required to upload assignment pages." };
    }

    const files = formData.getAll("files") as File[];
    if (!files || files.length === 0) {
      return { success: false, error: "No image files received." };
    }

    if (files.length > ASSIGNMENT_UPLOAD_CONFIG.maxImagesPerSubmission) {
      return {
        success: false,
        error: `You can upload at most ${ASSIGNMENT_UPLOAD_CONFIG.maxImagesPerSubmission} images per assignment submission.`,
      };
    }

    const results: SubmissionPage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!ASSIGNMENT_UPLOAD_CONFIG.allowedMimes.includes(file.type.toLowerCase())) {
        return {
          success: false,
          error: `File "${file.name}" has an unsupported format. Please upload JPG, JPEG, or PNG images.`,
        };
      }

      if (file.size > ASSIGNMENT_UPLOAD_CONFIG.maxFileSizeBytes) {
        return {
          success: false,
          error: `Image "${file.name}" exceeds the 5 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
        };
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      if (!isValidImageBuffer(buffer)) {
        return {
          success: false,
          error: `File "${file.name}" is corrupted or is not a valid image file.`,
        };
      }

      let storageUrl: string | null = null;
      try {
        const supabaseAdmin = createAdminClient();
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const cleanExt = file.name.toLowerCase().endsWith(".png") ? "png" : "jpg";
        const storagePath = `submissions/${user.id}/${timestamp}_${randomSuffix}.${cleanExt}`;

        const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
          .from("assignments")
          .upload(storagePath, buffer, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });

        if (!uploadErr && uploadData) {
          const { data: signedData } = await supabaseAdmin.storage
            .from("assignments")
            .createSignedUrl(storagePath, 3600 * 24);
          if (signedData?.signedUrl) {
            storageUrl = signedData.signedUrl;
          }
        }
      } catch (storageErr) {
        // Fallback to local storage if bucket is not yet provisioned in Supabase
        console.warn("Supabase bucket upload fallback to local storage:", storageErr);
      }

      const opt = await optimizeAssignmentImage(buffer, file.name);

      results.push({
        pageNumber: i + 1,
        originalUrl: storageUrl || opt.originalUrl,
        optimizedUrl: storageUrl || opt.optimizedUrl,
        fileSize: opt.fileSize,
        width: opt.width,
        height: opt.height,
        fileName: file.name,
        qualityWarning: opt.qualityWarning,
      });
    }

    return { success: true, data: results };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upload assignment page images.",
    };
  }
}

/**
 * Submits an assignment with written text response and/or uploaded images (up to 6 images).
 * If AI evaluation is unconfigured, marks status as 'Submitted' for instructor review without fake grades.
 */
export async function submitStudentAssignmentAction(input: {
  assignmentId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  practiceType: PracticeType;
  studentTextAnswer?: string;
  pages: SubmissionPage[];
  isResubmission?: boolean;
}): Promise<StudentActionResult<AssignmentSubmission>> {
  try {
    if (!isAssignmentSystemEnabled()) {
      return {
        success: false,
        error: "Assignment submissions are currently disabled by the instructor.",
      };
    }

    const hasText = Boolean(input.studentTextAnswer && input.studentTextAnswer.trim().length > 0);
    const hasPages = Boolean(input.pages && input.pages.length > 0);

    if (!hasText && !hasPages) {
      return { success: false, error: "Please enter your written answer or upload at least one image before submitting." };
    }

    if (input.pages && input.pages.length > ASSIGNMENT_UPLOAD_CONFIG.maxImagesPerSubmission) {
      return {
        success: false,
        error: `Submissions cannot exceed ${ASSIGNMENT_UPLOAD_CONFIG.maxImagesPerSubmission} images.`,
      };
    }

    let studentId = "";
    let studentEmail = "";
    let studentName = "";

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        studentId = user.id;
        studentEmail = user.email || "";
        studentName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Student";
      }
    } catch {}

    if (!studentId) {
      return {
        success: false,
        error: "Authentication required. Please sign in to submit assignments.",
      };
    }

    const assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);
    const assignment = assignments.find((a) => a.id === input.assignmentId);
    if (!assignment) {
      return { success: false, error: "Assignment not found." };
    }

    if (assignment.isLocked) {
      return {
        success: false,
        error: "This assignment is currently locked by the instructor and cannot accept new submissions.",
      };
    }

    const courses = readJsonFile<any[]>(COURSES_FILE, []);
    const course = courses.find((c) => c.id === input.courseId || c.slug === input.courseId);

    const submissions = readJsonFile<AssignmentSubmission[]>(SUBMISSIONS_FILE, []);
    const existingIndex = submissions.findIndex(
      (s) =>
        s.assignmentId === input.assignmentId &&
        s.courseId.toLowerCase() === input.courseId.toLowerCase() &&
        (s.studentId === studentId || s.studentEmail.toLowerCase() === studentEmail.toLowerCase())
    );

    // Prevent accidental duplicate submissions
    if (existingIndex >= 0 && !input.isResubmission) {
      return {
        success: true,
        data: submissions[existingIndex],
        message: "You have already submitted this assignment.",
      };
    }

    // If resubmission, check permission
    if (existingIndex >= 0 && input.isResubmission && !assignment.resubmissionAllowed) {
      return {
        success: false,
        error: "Resubmission is not permitted for this assignment.",
      };
    }

    const now = new Date().toISOString();
    let attemptNumber = 1;
    let history: any[] = [];

    if (existingIndex >= 0) {
      const prev = submissions[existingIndex];
      attemptNumber = (prev.attemptNumber || 1) + 1;
      history = [
        ...(prev.history || []),
        {
          attemptNumber: prev.attemptNumber || 1,
          submittedAt: prev.submittedAt,
          studentTextAnswer: prev.studentTextAnswer,
          pages: prev.pages,
          aiEvaluation: prev.aiEvaluation,
          aiScore: prev.aiScore,
          aiFeedback: prev.aiFeedback,
          finalScore: prev.finalScore,
          finalFeedback: prev.finalFeedback,
          status: prev.status,
        },
      ];
    }

    // Number pages cleanly in order
    const orderedPages: SubmissionPage[] = (input.pages || []).map((p, idx) => ({
      ...p,
      pageNumber: idx + 1,
    }));

    // AI Evaluation: returns real evaluation if API configured, or null if unconfigured
    const aiResult = await gradeAssignmentSubmission({
      assignment,
      pages: orderedPages,
      studentName,
      courseTitle: course?.title,
      lessonTitle: input.lessonId,
    });

    // If AI is not configured, set status to 'Submitted' (pending instructor review)
    // Never show fake scores or simulated evaluations!
    let calculatedStatus: AssignmentStatus = "Submitted";
    if (aiResult) {
      calculatedStatus = aiResult.needsReview ? "Needs Review" : "Checked";
    }

    const submissionRecord: AssignmentSubmission = {
      id: existingIndex >= 0 ? submissions[existingIndex].id : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      assignmentId: input.assignmentId,
      courseId: input.courseId,
      moduleId: input.moduleId,
      lessonId: input.lessonId,
      practiceType: input.practiceType,
      studentId,
      studentEmail,
      studentName,
      studentTextAnswer: input.studentTextAnswer?.trim() || "",
      attemptNumber,
      status: calculatedStatus,
      pages: orderedPages,
      aiEvaluation: aiResult || null,
      aiScore: aiResult ? (aiResult.needsReview ? null : aiResult.score) : null,
      aiFeedback: aiResult ? aiResult.feedback : null,
      finalScore: aiResult ? (aiResult.needsReview ? null : aiResult.score) : null,
      finalFeedback: aiResult ? aiResult.feedback : null,
      adminReviewedAt: null,
      adminReviewedBy: null,
      history,
      submittedAt: now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      submissions[existingIndex] = submissionRecord;
    } else {
      submissions.push(submissionRecord);
    }

    writeJsonFile(SUBMISSIONS_FILE, submissions);

    safeRevalidatePath("/lms/learn");
    safeRevalidatePath("/admin/assignments");

    return {
      success: true,
      data: submissionRecord,
      message: "Assignment submitted successfully.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit assignment.",
    };
  }
}
