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
  AssignmentFilter,
  PracticeType,
  AssignmentStatus,
} from "@/types/assignment";
import { gradeAssignmentSubmission } from "@/lib/ai/assignmentChecker";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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
  try {
    let assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);

    if (filter?.courseId) {
      assignments = assignments.filter((a) => a.courseId === filter.courseId);
    }
    if (filter?.moduleId) {
      assignments = assignments.filter((a) => a.moduleId === filter.moduleId);
    }
    if (filter?.lessonId) {
      assignments = assignments.filter((a) => a.lessonId === filter.lessonId);
    }
    if (filter?.practiceType) {
      assignments = assignments.filter((a) => a.practiceType === filter.practiceType);
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
  try {
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

    writeJsonFile(ASSIGNMENTS_FILE, assignments);

    // Optional Supabase Table sync attempt
    try {
      const adminClient = createAdminClient();
      await (adminClient as any).from("assignments").upsert({
        id: savedRecord.id,
        course_id: savedRecord.courseId,
        module_id: savedRecord.moduleId,
        lesson_id: savedRecord.lessonId,
        practice_type: savedRecord.practiceType,
        title: savedRecord.title,
        instructions: savedRecord.instructions,
        max_marks: savedRecord.maxMarks,
        rubric: savedRecord.rubric,
        is_active: savedRecord.isActive,
        updated_at: savedRecord.updatedAt,
      });
    } catch {
      // Non-blocking fallback
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
  try {
    let assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);
    assignments = assignments.filter((a) => a.id !== id);
    writeJsonFile(ASSIGNMENTS_FILE, assignments);

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
    writeJsonFile(ASSIGNMENTS_FILE, assignments);

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

export async function getAdminSubmissionsListAction(
  filter?: AssignmentFilter
): Promise<ActionResponse<EnrichedSubmissionItem[]>> {
  try {
    const submissions = readJsonFile<AssignmentSubmission[]>(SUBMISSIONS_FILE, []);
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
  try {
    const submissions = readJsonFile<AssignmentSubmission[]>(SUBMISSIONS_FILE, []);
    const assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);
    const courses = readJsonFile<any[]>(COURSES_FILE, []);
    const curriculum = readJsonFile<Record<string, { modules: any[] }>>(CURRICULUM_FILE, {});

    const sub = submissions.find((s) => s.id === id);
    if (!sub) return { success: false, error: "Submission not found." };

    const assignment = assignments.find((a) => a.id === sub.assignmentId);
    if (!assignment) return { success: false, error: "Associated assignment not found." };

    const course = courses.find((c) => c.id === sub.courseId || c.slug === sub.courseId);
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
 */
export async function gradeSubmissionAction(input: {
  submissionId: string;
  finalScore: number;
  finalFeedback: string;
  status: AssignmentStatus;
  adminName?: string;
}): Promise<ActionResponse<AssignmentSubmission>> {
  try {
    const submissions = readJsonFile<AssignmentSubmission[]>(SUBMISSIONS_FILE, []);
    const idx = submissions.findIndex((s) => s.id === input.submissionId);

    if (idx === -1) {
      return { success: false, error: "Submission not found." };
    }

    const existing = submissions[idx];
    const now = new Date().toISOString();

    const updated: AssignmentSubmission = {
      ...existing,
      finalScore: input.finalScore,
      finalFeedback: input.finalFeedback,
      status: input.status,
      adminReviewedAt: now,
      adminReviewedBy: input.adminName || "Teacher Reviewer",
      updatedAt: now,
    };

    submissions[idx] = updated;
    writeJsonFile(SUBMISSIONS_FILE, submissions);

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
  try {
    const submissions = readJsonFile<AssignmentSubmission[]>(SUBMISSIONS_FILE, []);
    const assignments = readJsonFile<Assignment[]>(ASSIGNMENTS_FILE, []);
    const courses = readJsonFile<any[]>(COURSES_FILE, []);

    const idx = submissions.findIndex((s) => s.id === submissionId);
    if (idx === -1) return { success: false, error: "Submission not found." };

    const submission = submissions[idx];
    const assignment = assignments.find((a) => a.id === submission.assignmentId);
    if (!assignment) return { success: false, error: "Assignment not found." };

    const course = courses.find((c) => c.id === submission.courseId || c.slug === submission.courseId);

    // Run Holistic AI Evaluation across all pages
    const aiResult = await gradeAssignmentSubmission({
      assignment,
      pages: submission.pages,
      studentName: submission.studentName,
      courseTitle: course?.title,
      lessonTitle: submission.lessonId,
    });

    if (!aiResult) {
      return {
        success: false,
        error: "AI evaluation is not enabled yet. Please configure Gemini or OpenAI API credentials in Settings before running AI re-check.",
      };
    }

    const now = new Date().toISOString();
    const updatedStatus: AssignmentStatus = aiResult.needsReview ? "Needs Review" : "Checked";

    const updatedSubmission: AssignmentSubmission = {
      ...submission,
      aiEvaluation: aiResult,
      aiScore: aiResult.needsReview ? null : aiResult.score,
      aiFeedback: aiResult.feedback,
      // If no admin final grade has been set yet, set suggested grade
      finalScore: submission.finalScore !== null ? submission.finalScore : aiResult.needsReview ? null : aiResult.score,
      finalFeedback: submission.finalFeedback !== null ? submission.finalFeedback : aiResult.feedback,
      status: submission.finalScore !== null ? submission.status : updatedStatus,
      updatedAt: now,
    };

    submissions[idx] = updatedSubmission;
    writeJsonFile(SUBMISSIONS_FILE, submissions);

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
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updated: AssignmentSettings = {
      assignmentsEnabled: Boolean(enabled),
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || "admin",
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

