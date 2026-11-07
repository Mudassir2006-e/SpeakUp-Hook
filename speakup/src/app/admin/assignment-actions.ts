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
  AssignmentFilter,
  PracticeType,
  AssignmentStatus,
} from "@/types/assignment";
import { gradeAssignmentSubmission } from "@/lib/ai/assignmentChecker";
import { createAdminClient } from "@/lib/supabase/server";

import { verifyAdminCaller as verifyAdminMfaCaller } from "@/lib/auth/adminVerification";

async function verifyAdminCaller(): Promise<{ adminId: string; adminEmail: string } | { error: string }> {
  return verifyAdminMfaCaller();
}

const ASSIGNMENTS_FILE = path.join(process.cwd(), "src", "config", "central-assignments.json");
const SUBMISSIONS_FILE = path.join(process.cwd(), "src", "config", "central-submissions.json");
const COURSES_FILE = path.join(process.cwd(), "src", "config", "central-courses.json");
const CURRICULUM_FILE = path.join(process.cwd(), "src", "config", "central-curriculum.json");
const ASSIGNMENT_SETTINGS_FILE = path.join(process.cwd(), "src", "config", "assignment-settings.json");

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

export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==========================================
// 1. ASSIGNMENT MANAGEMENT (ADMIN)
// ==========================================

export async function getAssignmentsListAction(
  filter?: { courseId?: string; moduleId?: string; lessonId?: string; practiceType?: PracticeType }
): Promise<ActionResponse<Assignment[]>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    let assignments: Assignment[] = [];

    // 1. Authoritative check: retrieve assignments from Supabase public.assignments first
    try {
      const adminClient = createAdminClient();
      let query = (adminClient as any).from("assignments").select("*");
      if (filter?.courseId) query = query.eq("course_id", filter.courseId);
      if (filter?.moduleId) query = query.eq("module_id", filter.moduleId);
      if (filter?.lessonId) query = query.eq("lesson_id", filter.lessonId);
      if (filter?.practiceType) query = query.eq("practice_type", filter.practiceType);

      const { data: dbRows, error: dbErr } = await query;
      if (!dbErr && Array.isArray(dbRows) && dbRows.length > 0) {
        assignments = dbRows.map((row: any) => ({
          id: row.id,
          courseId: row.course_id,
          moduleId: row.module_id,
          lessonId: row.lesson_id,
          practiceType: row.practice_type,
          title: row.title,
          contextText: row.context_text || undefined,
          instructions: row.instructions,
          questionTask: row.question_task || undefined,
          writingRequirements: row.writing_requirements || undefined,
          exampleReference: row.example_reference || undefined,
          referenceFileUrl: row.reference_file_url || undefined,
          maxMarks: row.max_marks,
          rubric: row.rubric,
          timeGuidance: row.time_guidance || undefined,
          wordCountGuidance: row.word_count_guidance || undefined,
          language: row.language,
          courseLevel: row.course_level,
          resubmissionAllowed: row.resubmission_allowed,
          isLocked: row.is_locked,
          isActive: row.is_active,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }
    } catch (e) {
      console.warn("DB assignments list query notice in getAssignmentsListAction:", e);
    }

    if (assignments.length === 0) {
      let fileAssignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);
      if (filter?.courseId) {
        fileAssignments = fileAssignments.filter((a) => a.courseId === filter.courseId);
      }
      if (filter?.moduleId) {
        fileAssignments = fileAssignments.filter((a) => a.moduleId === filter.moduleId);
      }
      if (filter?.lessonId) {
        fileAssignments = fileAssignments.filter((a) => a.lessonId === filter.lessonId);
      }
      if (filter?.practiceType) {
        fileAssignments = fileAssignments.filter((a) => a.practiceType === filter.practiceType);
      }
      assignments = fileAssignments;
    }

    return { success: true, data: assignments };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load assignments.",
    };
  }
}

export async function getAssignmentByIdAction(id: string): Promise<ActionResponse<Assignment | null>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    // 1. Authoritative check: retrieve assignment from Supabase public.assignments first
    try {
      const adminClient = createAdminClient();
      const { data: dbAsgn, error: dbErr } = await (adminClient as any)
        .from("assignments")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!dbErr && dbAsgn) {
        const foundAssignment: Assignment = {
          id: dbAsgn.id,
          courseId: dbAsgn.course_id,
          moduleId: dbAsgn.module_id,
          lessonId: dbAsgn.lesson_id,
          practiceType: dbAsgn.practice_type,
          title: dbAsgn.title,
          contextText: dbAsgn.context_text || undefined,
          instructions: dbAsgn.instructions,
          questionTask: dbAsgn.question_task || undefined,
          writingRequirements: dbAsgn.writing_requirements || undefined,
          exampleReference: dbAsgn.example_reference || undefined,
          referenceFileUrl: dbAsgn.reference_file_url || undefined,
          maxMarks: dbAsgn.max_marks,
          rubric: dbAsgn.rubric,
          timeGuidance: dbAsgn.time_guidance || undefined,
          wordCountGuidance: dbAsgn.word_count_guidance || undefined,
          language: dbAsgn.language,
          courseLevel: dbAsgn.course_level,
          resubmissionAllowed: dbAsgn.resubmission_allowed,
          isLocked: dbAsgn.is_locked,
          isActive: dbAsgn.is_active,
          createdAt: dbAsgn.created_at,
          updatedAt: dbAsgn.updated_at,
        };
        return { success: true, data: foundAssignment };
      }
    } catch (e) {
      console.warn("DB assignment lookup notice in getAssignmentByIdAction:", e);
    }

    const assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);
    const found = assignments.find((a) => a.id === id) || null;
    return { success: true, data: found };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to find assignment.",
    };
  }
}

export async function saveAssignmentAction(
  data: Partial<Assignment> & {
    courseId: string;
    moduleId: string;
    lessonId: string;
    practiceType: PracticeType;
    title: string;
    instructions: string;
    maxMarks: number;
    rubric: string;
  }
): Promise<ActionResponse<Assignment>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);
    const courses = readJsonFile<any[]>(COURSES_FILE, []);

    const matchedCourse = courses.find((c) => c.id === data.courseId || c.slug === data.courseId);
    const language = (matchedCourse?.title || "").toLowerCase().includes("german") || data.courseId === "A1G" ? "German" : "English";
    const level = matchedCourse?.level || "A1";

    const now = new Date().toISOString();
    let savedRecord: Assignment;

    const existingIndex = assignments.findIndex(
      (a) =>
        a.id === data.id ||
        (a.courseId === data.courseId &&
          a.moduleId === data.moduleId &&
          a.lessonId === data.lessonId &&
          a.practiceType === data.practiceType)
    );

    if (existingIndex >= 0) {
      savedRecord = {
        ...assignments[existingIndex],
        ...data,
        language: data.language || language,
        courseLevel: data.courseLevel || level,
        updatedAt: now,
      };
      assignments[existingIndex] = savedRecord;
    } else {
      const generatedId =
        data.id ||
        `asgn_${data.courseId.toLowerCase().replace(/[^a-z0-9]/g, "")}_${data.moduleId}_${data.lessonId}_${data.practiceType}`;

      savedRecord = {
        id: generatedId,
        courseId: data.courseId,
        moduleId: data.moduleId,
        lessonId: data.lessonId,
        practiceType: data.practiceType,
        title: data.title,
        contextText: data.contextText || "",
        instructions: data.instructions,
        questionTask: data.questionTask || "",
        writingRequirements: data.writingRequirements || "",
        exampleReference: data.exampleReference || "",
        referenceFileUrl: data.referenceFileUrl || "",
        maxMarks: Number(data.maxMarks) || 20,
        rubric: data.rubric || "Task completion, grammar accuracy, spelling, and structural cohesion.",
        timeGuidance: data.timeGuidance || "25–35 minutes",
        wordCountGuidance: data.wordCountGuidance || "80–120 words",
        language: data.language || language,
        courseLevel: data.courseLevel || level,
        resubmissionAllowed: data.resubmissionAllowed ?? true,
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      assignments.push(savedRecord);
    }

    // Safe JSON write for offline / development environments
    try {
      writeJsonFile(ASSIGNMENTS_FILE, assignments);
    } catch (fsErr) {
      console.warn("Local assignments write skipped in serverless environment:", fsErr);
    }

    // Authoritative Supabase Table sync
    try {
      const adminClient = createAdminClient();
      await (adminClient as any).from("assignments").upsert({
        id: savedRecord.id,
        course_id: savedRecord.courseId,
        module_id: savedRecord.moduleId,
        lesson_id: savedRecord.lessonId,
        practice_type: savedRecord.practiceType,
        title: savedRecord.title,
        context_text: savedRecord.contextText || null,
        instructions: savedRecord.instructions,
        question_task: savedRecord.questionTask || null,
        writing_requirements: savedRecord.writingRequirements || null,
        example_reference: savedRecord.exampleReference || null,
        reference_file_url: savedRecord.referenceFileUrl || null,
        max_marks: savedRecord.maxMarks,
        rubric: savedRecord.rubric,
        time_guidance: savedRecord.timeGuidance || null,
        word_count_guidance: savedRecord.wordCountGuidance || null,
        language: savedRecord.language || "German",
        course_level: savedRecord.courseLevel || "A1",
        resubmission_allowed: savedRecord.resubmissionAllowed,
        is_locked: savedRecord.isLocked || false,
        is_active: savedRecord.isActive,
        updated_at: savedRecord.updatedAt,
      });
    } catch (dbErr) {
      console.warn("DB assignment upsert notice:", dbErr);
    }

    safeRevalidatePath("/admin/assignments");
    safeRevalidatePath("/admin/courses");
    safeRevalidatePath("/lms/learn");

    return {
      success: true,
      data: savedRecord,
      message: "Assignment saved successfully.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save assignment.",
    };
  }
}

export async function deleteAssignmentAction(id: string): Promise<ActionResponse> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    let assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);
    assignments = assignments.filter((a) => a.id !== id);
    try {
      writeJsonFile(ASSIGNMENTS_FILE, assignments);
    } catch (fsErr) {
      console.warn("Local assignments delete sync skipped in serverless environment:", fsErr);
    }

    try {
      const adminClient = createAdminClient();
      await (adminClient as any).from("assignments").delete().eq("id", id);
    } catch {}

    safeRevalidatePath("/admin/assignments");
    safeRevalidatePath("/lms/learn");

    return { success: true, message: "Assignment deleted successfully." };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete assignment.",
    };
  }
}

/**
 * Toggle Assignment Lock Status (Phase 10)
 * Server-enforced lock that prevents student submissions when locked.
 * Historical submissions, grades, and feedback remain completely preserved.
 */
export async function toggleAssignmentLockAction(
  id: string,
  locked: boolean
): Promise<ActionResponse<Assignment>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);
    const idx = assignments.findIndex((a) => a.id === id);
    if (idx === -1) {
      return { success: false, error: "Assignment not found." };
    }

    const updated = {
      ...assignments[idx],
      isLocked: locked,
      updatedAt: new Date().toISOString(),
    };
    assignments[idx] = updated;
    try {
      writeJsonFile(ASSIGNMENTS_FILE, assignments);
    } catch (fsErr) {
      console.warn("Local assignments lock sync skipped in serverless environment:", fsErr);
    }

    try {
      const adminClient = createAdminClient();
      await (adminClient as any).from("assignments").update({ is_locked: locked }).eq("id", id);
    } catch {}

    safeRevalidatePath("/admin/assignments");
    safeRevalidatePath("/lms/learn");

    return {
      success: true,
      data: updated,
      message: locked
        ? "Assignment successfully locked. Submissions are now closed."
        : "Assignment successfully unlocked. Submissions are now open.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle assignment lock state.",
    };
  }
}

// ==========================================
// 2. STUDENT ASSIGNMENT CHECKER (ADMIN)
// ==========================================

export interface EnrichedSubmissionItem extends AssignmentSubmission {
  courseTitle: string;
  courseLevel: string;
  moduleTitle: string;
  lessonTitle: string;
  assignmentTitle: string;
  maxMarks: number;
}

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

export async function getAdminSubmissionsListAction(
  filter?: AssignmentFilter
): Promise<ActionResponse<EnrichedSubmissionItem[]>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    // 1. Fetch from Supabase assignment_submissions table
    let dbSubmissions: AssignmentSubmission[] = [];
    try {
      const adminClient = createAdminClient();
      const { data: dbData, error } = await (adminClient as any)
        .from("assignment_submissions")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (!error && Array.isArray(dbData)) {
        dbSubmissions = await Promise.all(
          dbData.map(async (row: any) => {
            const refreshedPages = await refreshSubmissionPageUrls(row.pages || []);
            return {
              id: row.id,
              assignmentId: row.assignment_id,
              courseId: row.course_id,
              moduleId: row.module_id,
              lessonId: row.lesson_id,
              practiceType: row.practice_type,
              studentId: row.student_id,
              studentEmail: row.student_email,
              studentName: row.student_name,
              studentNumber: row.student_number || undefined,
              studentTextAnswer: row.student_text_answer || undefined,
              attemptNumber: row.attempt_number,
              status: row.status,
              pages: refreshedPages,
              aiEvaluation: row.ai_evaluation || undefined,
              aiScore: row.ai_score,
              aiFeedback: row.ai_feedback,
              finalScore: row.final_score,
              finalFeedback: row.final_feedback,
              adminReviewedAt: row.admin_reviewed_at,
              adminReviewedBy: row.admin_reviewed_by,
              history: row.history || [],
              submittedAt: row.submitted_at,
              updatedAt: row.updated_at,
            };
          })
        );
      }
    } catch (dbErr) {
      console.warn("DB submissions fetch notice in admin:", dbErr);
    }

    const localSubmissions = readJsonFile<AssignmentSubmission[]>(SUBMISSIONS_FILE, []);

    // Combine db and local submissions, avoiding duplicates by id (DB takes precedence)
    const submissionsMap = new Map<string, AssignmentSubmission>();
    for (const sub of localSubmissions) {
      submissionsMap.set(sub.id, sub);
    }
    for (const sub of dbSubmissions) {
      submissionsMap.set(sub.id, sub);
    }
    const submissions = Array.from(submissionsMap.values());

    const assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);
    const courses = readJsonFile<any[]>(COURSES_FILE, []);
    const curriculum = readJsonFile<Record<string, { modules: any[] }>>(CURRICULUM_FILE, {});

    const enrichedList: EnrichedSubmissionItem[] = [];

    for (const sub of submissions) {
      const assignment = assignments.find((a) => a.id === sub.assignmentId);
      const course = courses.find((c) => c.id === sub.courseId || c.slug === sub.courseId);

      // Resolve module and lesson titles
      let moduleTitle = sub.moduleId;
      let lessonTitle = sub.lessonId;

      const courseCurr = curriculum[sub.courseId] || (course?.id ? curriculum[course.id] : null);
      if (courseCurr?.modules) {
        const foundMod = courseCurr.modules.find((m: any) => m.id === sub.moduleId);
        if (foundMod) {
          moduleTitle = foundMod.title;
          const foundLes = foundMod.lessons?.find((l: any) => l.id === sub.lessonId);
          if (foundLes) lessonTitle = foundLes.title;
        }
      }

      enrichedList.push({
        ...sub,
        courseTitle: course?.title || sub.courseId,
        courseLevel: assignment?.courseLevel || course?.level || "A1",
        moduleTitle,
        lessonTitle,
        assignmentTitle: assignment?.title || "Language Assignment",
        maxMarks: assignment?.maxMarks || sub.aiEvaluation?.maxScore || 20,
      });
    }

    // Apply Filters
    let filtered = enrichedList;

    if (filter?.studentQuery) {
      const q = filter.studentQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.studentName.toLowerCase().includes(q) ||
          item.studentEmail.toLowerCase().includes(q) ||
          (item.studentNumber && item.studentNumber.toLowerCase().includes(q))
      );
    }

    if (filter?.courseId && filter.courseId !== "all") {
      filtered = filtered.filter((item) => item.courseId === filter.courseId);
    }

    if (filter?.practiceType && filter.practiceType !== "all") {
      filtered = filtered.filter((item) => item.practiceType === filter.practiceType);
    }

    if (filter?.status && filter.status !== "all") {
      filtered = filtered.filter((item) => item.status === filter.status);
    }

    if (filter?.dateFrom) {
      const from = new Date(filter.dateFrom).getTime();
      filtered = filtered.filter((item) => new Date(item.submittedAt).getTime() >= from);
    }

    if (filter?.dateTo) {
      const to = new Date(filter.dateTo).getTime();
      filtered = filtered.filter((item) => new Date(item.submittedAt).getTime() <= to);
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    return { success: true, data: filtered };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load submissions.",
    };
  }
}

export async function getSubmissionByIdAction(
  id: string
): Promise<ActionResponse<{ submission: EnrichedSubmissionItem; assignment: Assignment }>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    let sub: AssignmentSubmission | null = null;

    // 1. Authoritative check: retrieve submission from Supabase database
    try {
      const adminClient = createAdminClient();
      const { data: dbSub, error: dbErr } = await (adminClient as any)
        .from("assignment_submissions")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!dbErr && dbSub) {
        const refreshedPages = await refreshSubmissionPageUrls(dbSub.pages || []);
        sub = {
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
          pages: refreshedPages,
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
      console.warn("DB submission lookup notice in getSubmissionByIdAction:", e);
    }

    // 2. Secondary fallback: check local submissions file
    if (!sub) {
      const submissions = readJsonFile<AssignmentSubmission[]>(SUBMISSIONS_FILE, []);
      const localSub = submissions.find((s) => s.id === id);
      if (localSub) {
        const refreshedPages = await refreshSubmissionPageUrls(localSub.pages || []);
        sub = { ...localSub, pages: refreshedPages };
      }
    }

    if (!sub) return { success: false, error: "Submission not found." };

    const assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);
    const courses = readJsonFile<any[]>(COURSES_FILE, []);
    const curriculum = readJsonFile<Record<string, { modules: any[] }>>(CURRICULUM_FILE, {});

    const assignment = assignments.find((a) => a.id === sub!.assignmentId);
    if (!assignment) return { success: false, error: "Associated assignment not found." };

    const course = courses.find((c) => c.id === sub!.courseId || c.slug === sub!.courseId);
    let moduleTitle = sub.moduleId;
    let lessonTitle = sub.lessonId;

    const courseCurr = curriculum[sub.courseId] || (course?.id ? curriculum[course.id] : null);
    if (courseCurr?.modules) {
      const foundMod = courseCurr.modules.find((m: any) => m.id === sub!.moduleId);
      if (foundMod) {
        moduleTitle = foundMod.title;
        const foundLes = foundMod.lessons?.find((l: any) => l.id === sub!.lessonId);
        if (foundLes) lessonTitle = foundLes.title;
      }
    }

    const enriched: EnrichedSubmissionItem = {
      ...sub,
      courseTitle: course?.title || sub.courseId,
      courseLevel: assignment.courseLevel || "A1",
      moduleTitle,
      lessonTitle,
      assignmentTitle: assignment.title,
      maxMarks: assignment.maxMarks,
    };

    return { success: true, data: { submission: enriched, assignment } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch submission.",
    };
  }
}

/**
 * Updates the final teacher/admin grade and feedback.
 * Keeps AI score/feedback completely intact as a separate record.
 * Authoritative: verifies admin credentials and updates Supabase database.
 */
export async function gradeSubmissionAction(input: {
  submissionId: string;
  finalScore: number;
  finalFeedback: string;
  status: AssignmentStatus;
  adminName?: string;
}): Promise<ActionResponse<AssignmentSubmission>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    let existing: AssignmentSubmission | null = null;
    const adminClient = createAdminClient();

    // 1. Authoritative check: retrieve submission from Supabase database
    try {
      const { data: dbSub, error: dbErr } = await (adminClient as any)
        .from("assignment_submissions")
        .select("*")
        .eq("id", input.submissionId)
        .maybeSingle();

      if (!dbErr && dbSub) {
        existing = {
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
    } catch (dbReadErr) {
      console.warn("DB submission lookup notice in gradeSubmissionAction:", dbReadErr);
    }

    // 2. Secondary fallback: check local submissions file
    const submissions = readJsonFile<AssignmentSubmission[]>(SUBMISSIONS_FILE, []);
    const localIdx = submissions.findIndex((s) => s.id === input.submissionId);

    if (!existing && localIdx >= 0) {
      existing = submissions[localIdx];
    }

    if (!existing) {
      return { success: false, error: "Submission not found." };
    }

    const now = new Date().toISOString();
    const reviewerName = input.adminName?.trim() || "Teacher Reviewer";

    const updated: AssignmentSubmission = {
      ...existing,
      finalScore: input.finalScore,
      finalFeedback: input.finalFeedback,
      status: input.status,
      adminReviewedAt: now,
      adminReviewedBy: reviewerName,
      updatedAt: now,
    };

    let dbUpdated = false;
    try {
      const { error: dbUpdateErr } = await (adminClient as any)
        .from("assignment_submissions")
        .update({
          final_score: input.finalScore,
          final_feedback: input.finalFeedback,
          status: input.status,
          admin_reviewed_at: now,
          admin_reviewed_by: reviewerName,
          updated_at: now,
        })
        .eq("id", input.submissionId);

      if (dbUpdateErr) {
        console.error("Database grade update error:", dbUpdateErr.message);
      } else {
        dbUpdated = true;
      }
    } catch (dbErr) {
      console.warn("Database grade update exception:", dbErr);
    }

    // Synchronize to local submissions file
    try {
      if (localIdx >= 0) {
        submissions[localIdx] = updated;
      } else {
        submissions.push(updated);
      }
      writeJsonFile(SUBMISSIONS_FILE, submissions);
    } catch (fsErr) {
      console.warn("Local submissions write skipped in serverless environment:", fsErr);
    }

    if (!dbUpdated && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to persist grade evaluation to the database. Please try again.",
      };
    }

    safeRevalidatePath("/admin/assignments");
    safeRevalidatePath("/lms/learn");

    return {
      success: true,
      data: updated,
      message: "Final evaluation successfully saved.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save final grade.",
    };
  }
}

/**
 * Explicit AI Recheck Action.
 * Does NOT re-run automatically when opening an assignment (prevents excessive API costs).
 * Only executes when the admin explicitly triggers it.
 */
export async function recheckSubmissionWithAiAction(
  submissionId: string
): Promise<ActionResponse<AssignmentSubmission>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const adminClient = createAdminClient();
    let submission: AssignmentSubmission | null = null;

    // 1. Authoritative check: retrieve submission from Supabase database
    try {
      const { data: dbSub, error: dbErr } = await (adminClient as any)
        .from("assignment_submissions")
        .select("*")
        .eq("id", submissionId)
        .maybeSingle();

      if (!dbErr && dbSub) {
        const refreshedPages = await refreshSubmissionPageUrls(dbSub.pages || []);
        submission = {
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
          pages: refreshedPages,
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
      console.warn("DB submission lookup notice in recheckSubmissionWithAiAction:", e);
    }

    // Secondary fallback: check local submissions file (for development/offline)
    const submissions = readJsonFile<AssignmentSubmission[]>(SUBMISSIONS_FILE, []);
    const localIdx = submissions.findIndex((s) => s.id === submissionId);
    if (!submission && localIdx >= 0) {
      const localSub = submissions[localIdx];
      const refreshedPages = await refreshSubmissionPageUrls(localSub.pages || []);
      submission = { ...localSub, pages: refreshedPages };
    }

    if (!submission) {
      return { success: false, error: "Submission not found." };
    }

    // 2. Authoritative check: retrieve assignment from Supabase database
    let assignment: Assignment | null = null;
    try {
      const { data: dbAsgn, error: dbAsgnErr } = await (adminClient as any)
        .from("assignments")
        .select("*")
        .eq("id", submission.assignmentId)
        .maybeSingle();

      if (!dbAsgnErr && dbAsgn) {
        assignment = {
          id: dbAsgn.id,
          courseId: dbAsgn.course_id,
          moduleId: dbAsgn.module_id,
          lessonId: dbAsgn.lesson_id,
          practiceType: dbAsgn.practice_type,
          title: dbAsgn.title,
          contextText: dbAsgn.context_text || undefined,
          instructions: dbAsgn.instructions,
          questionTask: dbAsgn.question_task || undefined,
          writingRequirements: dbAsgn.writing_requirements || undefined,
          exampleReference: dbAsgn.example_reference || undefined,
          referenceFileUrl: dbAsgn.reference_file_url || undefined,
          maxMarks: dbAsgn.max_marks,
          rubric: dbAsgn.rubric,
          timeGuidance: dbAsgn.time_guidance || undefined,
          wordCountGuidance: dbAsgn.word_count_guidance || undefined,
          language: dbAsgn.language,
          courseLevel: dbAsgn.course_level,
          resubmissionAllowed: dbAsgn.resubmission_allowed,
          isLocked: dbAsgn.is_locked,
          isActive: dbAsgn.is_active,
          createdAt: dbAsgn.created_at,
          updatedAt: dbAsgn.updated_at,
        };
      }
    } catch (e) {
      console.warn("DB assignment lookup notice in recheckSubmissionWithAiAction:", e);
    }

    if (!assignment) {
      const assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);
      assignment = assignments.find((a) => a.id === submission!.assignmentId) || null;
    }

    if (!assignment) {
      return { success: false, error: "Associated assignment not found." };
    }

    const courses = readJsonFile<any[]>(COURSES_FILE, []);
    const course = courses.find((c) => c.id === submission!.courseId || c.slug === submission!.courseId);

    // Run Holistic AI Evaluation across written answer and/or uploaded pages
    const aiResult = await gradeAssignmentSubmission({
      assignment,
      pages: submission.pages,
      studentName: submission.studentName,
      studentTextAnswer: submission.studentTextAnswer,
      courseTitle: course?.title,
      lessonTitle: submission.lessonId,
    });

    if (!aiResult) {
      return {
        success: false,
        error: "AI evaluation is not configured. Please configure Gemini or OpenAI API credentials in environment settings before running AI re-check.",
      };
    }

    const now = new Date().toISOString();

    // Differentiate provider error / quota exhaustion
    if (aiResult.evaluationStatus === "provider_error") {
      const errorMsg = aiResult.providerError || "AI evaluation provider error or quota limit reached. Manual review required.";

      // Record provider failure state into submission so it is surfaced accurately
      try {
        await (adminClient as any)
          .from("assignment_submissions")
          .update({
            ai_evaluation: aiResult,
            updated_at: now,
          })
          .eq("id", submissionId);
      } catch (dbErr) {
        console.warn("Database error update notice:", dbErr);
      }

      return {
        success: false,
        error: `AI Provider Error: ${errorMsg}`,
      };
    }

    if (aiResult.evaluationStatus === "invalid_input") {
      return {
        success: false,
        error: "Cannot evaluate submission: No student text or uploaded image pages were provided.",
      };
    }

    const updatedStatus: AssignmentStatus = aiResult.needsReview ? "Needs Review" : "Checked";

    const updatedSubmission: AssignmentSubmission = {
      ...submission,
      aiEvaluation: aiResult,
      aiScore: aiResult.needsReview ? null : aiResult.score,
      aiFeedback: aiResult.feedback,
      // If no admin final grade has been set yet, set suggested grade
      finalScore:
        submission.finalScore !== null && submission.finalScore !== undefined
          ? submission.finalScore
          : aiResult.needsReview
          ? null
          : aiResult.score,
      finalFeedback:
        submission.finalFeedback !== null && submission.finalFeedback !== undefined
          ? submission.finalFeedback
          : aiResult.feedback,
      status:
        submission.finalScore !== null && submission.finalScore !== undefined
          ? submission.status
          : updatedStatus,
      updatedAt: now,
    };

    let dbUpdated = false;
    try {
      const { error: dbUpdateErr } = await (adminClient as any)
        .from("assignment_submissions")
        .update({
          ai_evaluation: aiResult,
          ai_score: aiResult.needsReview ? null : aiResult.score,
          ai_feedback: aiResult.feedback,
          final_score: updatedSubmission.finalScore ?? null,
          final_feedback: updatedSubmission.finalFeedback ?? null,
          status: updatedSubmission.status,
          updated_at: now,
        })
        .eq("id", submissionId);

      if (dbUpdateErr) {
        console.error("Database recheck update error:", dbUpdateErr.message);
      } else {
        dbUpdated = true;
      }
    } catch (dbErr) {
      console.warn("Database recheck update exception:", dbErr);
    }

    // Guarded local submissions file sync
    try {
      if (localIdx >= 0) {
        submissions[localIdx] = updatedSubmission;
      } else {
        submissions.push(updatedSubmission);
      }
      writeJsonFile(SUBMISSIONS_FILE, submissions);
    } catch (fsErr) {
      console.warn("Local submissions write skipped in serverless environment:", fsErr);
    }

    if (!dbUpdated && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
      return {
        success: false,
        error: "Failed to persist AI re-evaluation results to the database. Please try again.",
      };
    }

    safeRevalidatePath("/admin/assignments");
    safeRevalidatePath("/lms/learn");

    return {
      success: true,
      data: updatedSubmission,
      message: "AI evaluation re-run successfully completed.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to re-check submission.",
    };
  }
}

// ==========================================
// 4. ASSIGNMENT ACCESS CONTROL (ADMIN)
// ==========================================

export interface AssignmentSettings {
  assignmentsEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

export async function getAssignmentAccessSettingAction(): Promise<ActionResponse<AssignmentSettings>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const fallback: AssignmentSettings = {
      assignmentsEnabled: true,
      updatedAt: new Date().toISOString(),
      updatedBy: "admin",
    };
    const settings = readJsonFile<AssignmentSettings>(ASSIGNMENT_SETTINGS_FILE, fallback);
    return { success: true, data: settings };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load assignment access settings.",
    };
  }
}

export async function setAssignmentAccessSettingAction(
  enabled: boolean
): Promise<ActionResponse<AssignmentSettings>> {
  const authCheck = await verifyAdminCaller();
  if ("error" in authCheck) {
    return { success: false, error: authCheck.error };
  }

  try {
    const updated: AssignmentSettings = {
      assignmentsEnabled: Boolean(enabled),
      updatedAt: new Date().toISOString(),
      updatedBy: authCheck.adminEmail || "admin",
    };

    writeJsonFile(ASSIGNMENT_SETTINGS_FILE, updated);
    safeRevalidatePath("/admin/assignments");
    safeRevalidatePath("/lms/learn");

    return {
      success: true,
      data: updated,
      message: `Student assignment access ${enabled ? "enabled" : "disabled"} successfully.`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update assignment access setting.",
    };
  }
}

