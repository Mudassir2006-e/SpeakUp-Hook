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
  SubmissionAttempt,
} from "@/types/assignment";
import { optimizeAssignmentBuffer, optimizeAssignmentImage } from "@/lib/imageOptimization";
import { gradeAssignmentSubmission } from "@/lib/ai/assignmentChecker";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function refreshSubmissionPageUrls(pages: SubmissionPage[]): Promise<SubmissionPage[]> {
  if (!pages || pages.length === 0) return pages;
  try {
    const admin = createAdminClient();
    return await Promise.all(
      pages.map(async (page) => {
        const path =
          page.storagePath ||
          (page.originalUrl &&
          page.originalUrl.includes("submissions/") &&
          !page.originalUrl.startsWith("http") &&
          !page.originalUrl.startsWith("/")
            ? page.originalUrl
            : null);

        if (path) {
          try {
            const { data } = await admin.storage.from("assignments").createSignedUrl(path, 3600 * 24);
            if (data?.signedUrl) {
              return {
                ...page,
                originalUrl: data.signedUrl,
                optimizedUrl: data.signedUrl,
              };
            }
          } catch {}
        }
        return page;
      })
    );
  } catch {
    return pages;
  }
}

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

    // 1. Check Supabase database table first
    try {
      const adminClient = createAdminClient();
      const { data: dbSub, error: dbErr } = await (adminClient as any)
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("student_id", studentId)
        .maybeSingle();

      if (!dbErr && dbSub) {
        const refreshedPages = await refreshSubmissionPageUrls(dbSub.pages || []);
        const formatted: AssignmentSubmission = {
          id: dbSub.id,
          assignmentId: dbSub.assignment_id,
          courseId: dbSub.course_id,
          moduleId: dbSub.module_id,
          lessonId: dbSub.lesson_id,
          practiceType: dbSub.practice_type,
          studentId: dbSub.student_id,
          studentEmail: dbSub.student_email,
          studentName: dbSub.student_name,
          studentNumber: dbSub.student_number || undefined,
          studentTextAnswer: dbSub.student_text_answer || undefined,
          attemptNumber: dbSub.attempt_number,
          status: dbSub.status,
          pages: refreshedPages,
          aiEvaluation: dbSub.ai_evaluation || undefined,
          aiScore: dbSub.ai_score,
          aiFeedback: dbSub.ai_feedback,
          finalScore: dbSub.final_score,
          finalFeedback: dbSub.final_feedback,
          adminReviewedAt: dbSub.admin_reviewed_at,
          adminReviewedBy: dbSub.admin_reviewed_by,
          history: dbSub.history || [],
          submittedAt: dbSub.submitted_at,
          updatedAt: dbSub.updated_at,
        };
        return { success: true, data: formatted };
      }
    } catch (e) {
      console.warn("DB submission fetch fallback to local file:", e);
    }

    // 2. Fallback to local submissions file
    const submissions = readJsonFile<AssignmentSubmission[]>(SUBMISSIONS_FILE, []);

    const found =
      submissions.find(
        (s) =>
          s.assignmentId === assignmentId &&
          s.courseId.toLowerCase() === courseId.toLowerCase() &&
          (s.studentId === studentId || s.studentEmail.toLowerCase() === studentEmail.toLowerCase())
      ) || null;

    if (found) {
      const refreshedPages = await refreshSubmissionPageUrls(found.pages || []);
      return { success: true, data: { ...found, pages: refreshedPages } };
    }

    return { success: true, data: null };
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

      // In-memory Sharp image optimization (safe for serverless runtimes)
      const opt = await optimizeAssignmentBuffer(buffer);

      let storageUrl: string | null = null;
      let storagePathKey: string | null = null;

      try {
        const supabaseAdmin = createAdminClient();
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const storagePath = `submissions/${user.id}/${timestamp}_${randomSuffix}.jpg`;

        const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
          .from("assignments")
          .upload(storagePath, opt.optimizedBuffer, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (!uploadErr && uploadData) {
          storagePathKey = storagePath;
          const { data: signedData } = await supabaseAdmin.storage
            .from("assignments")
            .createSignedUrl(storagePath, 3600 * 24);
          if (signedData?.signedUrl) {
            storageUrl = signedData.signedUrl;
          }
        } else if (uploadErr) {
          console.warn("Supabase assignment upload error:", uploadErr.message);
        }
      } catch (storageErr) {
        console.warn("Supabase assignment upload exception:", storageErr);
      }

      let localResult: { originalUrl: string; optimizedUrl: string } | null = null;
      // Only execute disk-writing fallback if cloud upload failed and we are in non-production local development
      if (!storageUrl && process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
        localResult = await optimizeAssignmentImage(buffer, file.name);
      }

      // If cloud upload failed in a serverless/production environment, reject cleanly with user guidance
      if (!storageUrl && !localResult) {
        return {
          success: false,
          error: `Failed to upload "${file.name}" to cloud storage. Please ensure the assignments storage bucket is configured or try again later.`,
        };
      }

      results.push({
        pageNumber: i + 1,
        originalUrl: storageUrl || localResult?.originalUrl || "",
        optimizedUrl: storageUrl || localResult?.optimizedUrl || "",
        storagePath: storagePathKey || undefined,
        fileSize: opt.optimizedFileSize,
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

    // 1. Authoritative check: retrieve existing student submission from Supabase first
    let existingSubmission: AssignmentSubmission | null = null;
    let existingDbRecord: any = null;

    try {
      const adminClient = createAdminClient();
      const { data: dbSub, error: dbErr } = await (adminClient as any)
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", input.assignmentId)
        .eq("student_id", studentId)
        .maybeSingle();

      if (!dbErr && dbSub) {
        existingDbRecord = dbSub;
        existingSubmission = {
          id: dbSub.id,
          assignmentId: dbSub.assignment_id,
          courseId: dbSub.course_id,
          moduleId: dbSub.module_id,
          lessonId: dbSub.lesson_id,
          practiceType: dbSub.practice_type,
          studentId: dbSub.student_id,
          studentEmail: dbSub.student_email,
          studentName: dbSub.student_name,
          studentNumber: dbSub.student_number || undefined,
          studentTextAnswer: dbSub.student_text_answer || undefined,
          attemptNumber: dbSub.attempt_number || 1,
          status: dbSub.status,
          pages: dbSub.pages || [],
          aiEvaluation: dbSub.ai_evaluation || undefined,
          aiScore: dbSub.ai_score,
          aiFeedback: dbSub.ai_feedback,
          finalScore: dbSub.final_score,
          finalFeedback: dbSub.final_feedback,
          adminReviewedAt: dbSub.admin_reviewed_at,
          adminReviewedBy: dbSub.admin_reviewed_by,
          history: Array.isArray(dbSub.history) ? dbSub.history : [],
          submittedAt: dbSub.submitted_at,
          updatedAt: dbSub.updated_at,
        };
      }
    } catch (e) {
      console.warn("DB submission lookup notice in submitStudentAssignmentAction:", e);
    }

    // Secondary fallback: local submissions file (for development/offline)
    const submissions = readJsonFile<AssignmentSubmission[]>(SUBMISSIONS_FILE, []);
    const localIndex = submissions.findIndex(
      (s) =>
        s.assignmentId === input.assignmentId &&
        s.courseId.toLowerCase() === input.courseId.toLowerCase() &&
        (s.studentId === studentId || s.studentEmail.toLowerCase() === studentEmail.toLowerCase())
    );

    if (!existingSubmission && localIndex >= 0) {
      existingSubmission = submissions[localIndex];
    }

    // Prevent accidental duplicate submissions
    if (existingSubmission && !input.isResubmission) {
      const refreshedPages = await refreshSubmissionPageUrls(existingSubmission.pages || []);
      return {
        success: true,
        data: { ...existingSubmission, pages: refreshedPages },
        message: "You have already submitted this assignment.",
      };
    }

    // If resubmission, verify server-side authorization and rules
    if (existingSubmission && input.isResubmission) {
      if (!assignment.resubmissionAllowed) {
        return {
          success: false,
          error: "Resubmission is not permitted for this assignment.",
        };
      }
      if (existingSubmission.status === "Under Review") {
        return {
          success: false,
          error: "Your submission is currently under instructor review and cannot be updated at this time.",
        };
      }
    }

    const now = new Date().toISOString();
    let attemptNumber = 1;
    let history: SubmissionAttempt[] = [];

    if (existingSubmission) {
      const prev = existingSubmission;
      attemptNumber = (prev.attemptNumber || 1) + 1;
      const prevAttemptRecord: SubmissionAttempt = {
        attemptNumber: prev.attemptNumber || 1,
        submittedAt: prev.submittedAt,
        studentTextAnswer: prev.studentTextAnswer,
        pages: prev.pages,
        aiEvaluation: prev.aiEvaluation,
        aiScore: prev.aiScore,
        aiFeedback: prev.aiFeedback,
        finalScore: prev.finalScore,
        finalFeedback: prev.finalFeedback,
        adminReviewedAt: prev.adminReviewedAt,
        adminReviewedBy: prev.adminReviewedBy,
        status: prev.status,
      };
      history = [...(prev.history || []), prevAttemptRecord];
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

    const submissionId = existingSubmission?.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const submissionRecord: AssignmentSubmission = {
      id: submissionId,
      assignmentId: input.assignmentId,
      courseId: input.courseId,
      moduleId: input.moduleId,
      lessonId: input.lessonId,
      practiceType: input.practiceType,
      studentId,
      studentEmail,
      studentName,
      studentNumber: existingSubmission?.studentNumber || undefined,
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

    // 1. Durably persist submission to Supabase database
    let dbPersisted = false;
    try {
      const adminClient = createAdminClient();

      // Ensure parent assignment exists in public.assignments to satisfy foreign key constraint
      try {
        await (adminClient as any).from("assignments").upsert(
          {
            id: assignment.id,
            course_id: assignment.courseId,
            module_id: assignment.moduleId,
            lesson_id: assignment.lessonId,
            practice_type: assignment.practiceType,
            title: assignment.title,
            context_text: assignment.contextText || null,
            instructions: assignment.instructions,
            question_task: assignment.questionTask || null,
            writing_requirements: assignment.writingRequirements || null,
            example_reference: assignment.exampleReference || null,
            reference_file_url: assignment.referenceFileUrl || null,
            max_marks: assignment.maxMarks,
            rubric: assignment.rubric,
            time_guidance: assignment.timeGuidance || null,
            word_count_guidance: assignment.wordCountGuidance || null,
            language: assignment.language || "German",
            course_level: assignment.courseLevel || "A1",
            resubmission_allowed: assignment.resubmissionAllowed,
            is_locked: assignment.isLocked || false,
            is_active: assignment.isActive,
          },
          { onConflict: "id" }
        );
      } catch (asgnSyncErr) {
        console.warn("Assignment parent sync notice:", asgnSyncErr);
      }

      // Attempt database-level atomic submission via RPC
      let rpcSucceeded = false;
      try {
        const { data: rpcRes, error: rpcErr } = await (adminClient as any).rpc(
          "submit_student_assignment_atomic",
          {
            p_assignment_id: submissionRecord.assignmentId,
            p_student_id: submissionRecord.studentId,
            p_course_id: submissionRecord.courseId,
            p_module_id: submissionRecord.moduleId,
            p_lesson_id: submissionRecord.lessonId,
            p_practice_type: submissionRecord.practiceType,
            p_student_email: submissionRecord.studentEmail,
            p_student_name: submissionRecord.studentName,
            p_student_number: submissionRecord.studentNumber || null,
            p_student_text_answer: submissionRecord.studentTextAnswer || null,
            p_pages: submissionRecord.pages,
            p_status: submissionRecord.status,
            p_ai_evaluation: submissionRecord.aiEvaluation || null,
            p_ai_score: submissionRecord.aiScore ?? null,
            p_ai_feedback: submissionRecord.aiFeedback || null,
            p_is_resubmission: Boolean(input.isResubmission),
          }
        );

        if (!rpcErr && rpcRes?.success) {
          rpcSucceeded = true;
          dbPersisted = true;
          if (rpcRes.isDuplicate) {
            const refreshedPages = await refreshSubmissionPageUrls(rpcRes.data?.pages || []);
            return {
              success: true,
              data: { ...submissionRecord, ...rpcRes.data, pages: refreshedPages },
              message: rpcRes.message || "You have already submitted this assignment.",
            };
          }
          if (rpcRes.data) {
            submissionRecord.id = rpcRes.data.id || submissionRecord.id;
            submissionRecord.attemptNumber = rpcRes.data.attempt_number || submissionRecord.attemptNumber;
            submissionRecord.history = rpcRes.data.history || submissionRecord.history;
            submissionRecord.submittedAt = rpcRes.data.submitted_at || submissionRecord.submittedAt;
            submissionRecord.updatedAt = rpcRes.data.updated_at || submissionRecord.updatedAt;
          }
        } else if (rpcErr) {
          // If the error was a business-rule check from the atomic function (e.g., locked, under review, not permitted):
          if (
            rpcErr.message?.includes("under instructor review") ||
            rpcErr.message?.includes("Resubmission is not permitted") ||
            rpcErr.message?.includes("locked or inactive")
          ) {
            return {
              success: false,
              error: rpcErr.message,
            };
          }
          console.warn("RPC submit_student_assignment_atomic notice (fallback to direct upsert):", rpcErr.message);
        }
      } catch (rpcCallErr) {
        console.warn("RPC invocation notice:", rpcCallErr);
      }

      // Fallback to upsert if RPC function is not yet installed in database
      if (!rpcSucceeded) {
        const { error: dbErr } = await (adminClient as any).from("assignment_submissions").upsert(
          {
            id: submissionRecord.id,
            assignment_id: submissionRecord.assignmentId,
            student_id: submissionRecord.studentId,
            course_id: submissionRecord.courseId,
            module_id: submissionRecord.moduleId,
            lesson_id: submissionRecord.lessonId,
            practice_type: submissionRecord.practiceType,
            student_email: submissionRecord.studentEmail,
            student_name: submissionRecord.studentName,
            student_number: submissionRecord.studentNumber || null,
            student_text_answer: submissionRecord.studentTextAnswer || null,
            attempt_number: submissionRecord.attemptNumber,
            status: submissionRecord.status,
            pages: submissionRecord.pages,
            ai_evaluation: submissionRecord.aiEvaluation || null,
            ai_score: submissionRecord.aiScore ?? null,
            ai_feedback: submissionRecord.aiFeedback || null,
            final_score: submissionRecord.finalScore ?? null,
            final_feedback: submissionRecord.finalFeedback || null,
            admin_reviewed_at: submissionRecord.adminReviewedAt || null,
            admin_reviewed_by: submissionRecord.adminReviewedBy || null,
            history: submissionRecord.history || [],
            submitted_at: submissionRecord.submittedAt,
            updated_at: submissionRecord.updatedAt,
          },
          { onConflict: "student_id, assignment_id" }
        );

        if (dbErr) {
          console.error("Database submission upsert error:", dbErr.message);
        } else {
          dbPersisted = true;
        }
      }
    } catch (dbEx) {
      console.warn("Database submission exception:", dbEx);
    }

    // 2. Synchronize to local submissions file for development environments
    try {
      const idx = localIndex >= 0 ? localIndex : submissions.findIndex((s) => s.id === submissionRecord.id);
      if (idx >= 0) {
        submissions[idx] = submissionRecord;
      } else {
        submissions.push(submissionRecord);
      }
      writeJsonFile(SUBMISSIONS_FILE, submissions);
    } catch (fsErr) {
      console.warn("Local submissions write skipped in serverless environment:", fsErr);
    }

    // If both cloud DB and local file failed in production, reject cleanly
    if (!dbPersisted && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Unable to record your assignment submission in the database. Please try again later.",
      };
    }

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
