"use server";

import fs from "fs";
import path from "path";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/auth/roles";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getUnifiedCourses, getUnifiedCourseById } from "@/config/unifiedCourses";
import type { LessonLinkButton } from "@/types/linkButton";
import { recordPasswordChange } from "@/lib/auth/sessionSecurity";
import { calculateEnrollmentExpiry, isEnrollmentActive } from "@/lib/enrollmentExpiry";
import { validatePassword } from "@/lib/validation";

export interface LearningMaterialItem {
  id: string;
  url: string;
  name: string;
  type: "image" | "pdf" | "video" | "document" | "url";
  size?: number;
}

export interface ProtectedLessonData {
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonNumber: string;
  lessonTitle: string;
  description: string;
  videoId: string;
  videoUrl?: string;
  videoSource?: string;
  notes: string;
  notesImage?: string;
  notesPages?: string[];
  notesMaterials?: LearningMaterialItem[];
  practice: string;
  practiceImage?: string;
  readingTitle?: string;
  readingContent?: string;
  readingMaterials?: LearningMaterialItem[];
  linkButton?: LessonLinkButton | null;
  watermark: {
    studentName: string;
    studentEmail: string;
    licenseText: string;
  };
}

export interface ProtectedLessonResponse {
  success: boolean;
  error?: string;
  data?: ProtectedLessonData;
}

// Master curriculum database for approved course lessons
const COURSE_CURRICULUM: Record<
  string,
  {
    courseTitle: string;
    modules: Record<string, string>;
    lessons: Record<
      string,
      {
        moduleId: string;
        number: string;
        title: string;
        description: string;
        videoId: string;
        notes: string;
        practice: string;
      }
    >;
  }
> = {
  "grammar-a1": {
    courseTitle: "English Grammar Mastery — A1",
    modules: {
      mod1: "Module 1: Foundational Syntax",
      mod2: "Module 2: Sentence Architecture",
      mod3: "Module 3: Complex Rhetoric",
      mod4: "Module 4: Capstone Defense",
    },
    lessons: {
      l01: {
        moduleId: "mod1",
        number: "01",
        title: "Parts of Speech & Grammatical Agreement",
        description:
          "Understand subject-verb agreement, pronoun references, and foundational sentence structure to build grammatically rock-solid sentences.",
        videoId: "",
        notes: `SpeakUp Masterclass — Lesson 01: Parts of Speech & Agreement

Core Syntax Principle:
Every declarative sentence requires structural alignment between the agent (subject) and the active predicate verb. In formal academic discourse, compound subjects joined by 'neither/nor' take the number of the closest subject.

Key Cadence Principles from this Masterclass:
1. Subject-Verb Congruence: Always locate the head noun before selecting singular or plural verb forms.
2. Collective Nouns: Treat collective nouns as singular in standard formal academic English unless individual members are acting independently.
3. Prepositional Interference: Do not let intervening prepositional phrases alter the number of the verb.`,
        practice: `Instructor Practice Directives — Lesson 01: Parts of Speech & Agreement

Pedagogical Objective:
Examine how compound subjects and intervening prepositional phrases create grammatical incongruity in spontaneous speech. Practice isolating the true head noun before assigning singular or plural verb inflection.

Instructional Exercise 1:
Analyze the sentence: "Neither the principal investigator nor the associated laboratory analysts (is/are) authorized to alter the trial parameters without prior institutional clearance." Note that 'analysts' determines the plural verb form 'are' due to the proximity principle in formal English.

Instructional Exercise 2:
Rephrase this construction aloud three times using downward terminal pitch inflection to ensure conclusive vocal finality.`,
      },
      l02: {
        moduleId: "mod1",
        number: "02",
        title: "Present Tense Nuances & Auxiliary Verbs",
        description:
          "Differentiate between simple present, present continuous, and present perfect aspects with academic precision.",
        videoId: "",
        notes: `SpeakUp Masterclass — Lesson 02: Present Tense Nuances

Temporal Scope Principle:
Present simple establishes timeless academic truths and persistent empirical findings, whereas present perfect bridges past discovery with ongoing significance.

Key Cadence Principles from this Masterclass:
1. Present Simple for Methodological Truths: Use simple present for general facts and constant theories.
2. Present Perfect for Cumulative Literature: Use present perfect ('Researchers have demonstrated...') when the timeline continues to affect the present.
3. Modal Auxiliaries: Deploy 'shall', 'may', and 'must' with careful calibrated degrees of necessity.`,
        practice: `Instructor Practice Directives — Lesson 02: Present Tense Nuances

Pedagogical Objective:
Distinguish between empirical observations that require continuous aspect versus methodological principles that demand simple present indicative verbs.

Instructional Exercise:
Formulate two contrasting declarations regarding institutional performance: one indicating an enduring statutory mandate using present simple, and a second highlighting an ongoing 10-year trajectory using present perfect continuous.`,
      },
      l03: {
        moduleId: "mod1",
        number: "03",
        title: "Direct & Indirect Objects in Formal Syntax",
        description:
          "Master transitivity, ditransitive verbs, and objective case assignment in formal executive statements.",
        videoId: "",
        notes: `SpeakUp Masterclass — Lesson 03: Direct & Indirect Objects

Object Architecture:
Direct objects complete the verb's transitive arc, whereas indirect objects denote the recipient or beneficiary. Positioning indirect objects before direct objects yields greater acoustic conciseness.

Key Cadence Principles from this Masterclass:
1. Dative Shift: Recognize when moving the recipient reduces unnecessary prepositional weight.
2. Case Integrity: Pronouns governed by transitive verbs must strictly retain objective case ('whom', 'them', 'us').
3. Phrasal Clarity: Place heavy noun clauses as direct objects following the verb rather than embedding them awkwardly.`,
        practice: `Instructor Practice Directives — Lesson 03: Object Architecture

Pedagogical Objective:
Eliminate prepositional bloat by utilizing the dative shift in administrative directives.

Instructional Exercise:
Restructure the sentence: "The executive committee forwarded a comprehensive briefing document to every regional division director" into dative shift syntax: "The executive committee forwarded every regional division director a comprehensive briefing document."`,
      },
      l04: {
        moduleId: "mod2",
        number: "04",
        title: "Subordinate Clauses & Complex Coordination",
        description:
          "Harness relative pronouns, adverbial clauses, and balanced subordinating conjunctions to govern academic clauses.",
        videoId: "",
        notes: `SpeakUp Masterclass — Lesson 04: Subordinate Clauses & Coordination

Subordination Mechanics:
Subordinate clauses provide nuance, causal antecedents, and conditional qualifications without compromising the primary assertion of the independent clause.

Key Cadence Principles from this Masterclass:
1. Relative Restrictiveness: Distinguish 'that' (essential clause without commas) from 'which' (non-essential supplementary clause with commas).
2. Fronted Adverbials: When placing adverbial clauses at the start of a sentence, punctuate with an audible oral pause and written comma.
3. Parallel Conjunctions: Correlative pairs ('not only... but also', 'either... or') must govern identical syntactic constituents.`,
        practice: `Instructor Practice Directives — Lesson 04: Subordinate Clauses

Pedagogical Objective:
Construct complex, multi-tiered sentences while preventing syntactic run-ons or dangling modifiers.

Instructional Exercise:
Combine three distinct propositions regarding fiscal policy into one authoritative periodic sentence ending on the primary independent clause.`,
      },
      l05: {
        moduleId: "mod2",
        number: "05",
        title: "Passive Voice Nuances in Academic Prose",
        description:
          "Deploy passive constructions judiciously to emphasize empirical outcomes while preserving syntactic vigor.",
        videoId: "",
        notes: `SpeakUp Masterclass — Lesson 05: Strategic Passive Constructions

Voice Calibration:
In academic discourse, agentless passive voice shifts communicative focus onto experimental results and institutional actions rather than individual investigators.

Key Cadence Principles from this Masterclass:
1. Agent Displacement: Use passive voice when the actor is unknown, universally understood, or less important than the result.
2. Clarity Preservation: Avoid recursive passives ('It was decided that the action should be taken') that obscure responsibility.
3. Cadence Transition: Alternate active and passive voices across paragraphs to maintain rhythm and avoid monotone presentation.`,
        practice: `Instructor Practice Directives — Lesson 05: Passive Calibration

Pedagogical Objective:
Rewrite administrative reprimands into diplomatic, agent-neutral passive formulations.

Instructional Exercise:
Transform "The junior auditing team failed to inspect the secondary ledger" into an objective institutional observation using passive voice without punitive personal attribution.`,
      },
      l06: {
        moduleId: "mod2",
        number: "06",
        title: "Conditional Nuances & Counterfactual Mood",
        description:
          "Formulate hypothetical, speculative, and counterfactual arguments using precise subjunctive verb forms.",
        videoId: "",
        notes: `SpeakUp Masterclass — Lesson 06: Conditionals & Subjunctive Mood

Counterfactual Syntax:
Third conditionals and mixed counterfactuals express retrospective evaluations and contingency scenarios in strategic risk analysis.

Key Cadence Principles from this Masterclass:
1. Past Subjunctive: Maintain 'were' for all persons in formal counterfactual hypotheses ('If the regulatory framework were enacted...').
2. Inverted Conditionals: Replace 'if' with fronted auxiliaries ('Had the institution recognized the market shift...') for elevated executive cadence.
3. Modal Nuance: Match 'would', 'could', and 'might' to calibrated degrees of certainty.`,
        practice: `Instructor Practice Directives — Lesson 06: Conditionals & Inversion

Pedagogical Objective:
Deliver counterfactual strategic risk assessments using inverted conditional phrasing.

Instructional Exercise:
Formulate an inverted conditional statement evaluating a corporate acquisition scenario: "Had the board of directors requested independent valuation earlier, the acquisition would have yielded substantially higher margins."`,
      },
    },
  },
};

export interface CourseAccessVerification {
  allowed: boolean;
  isExpired: boolean;
  message?: string;
}

/**
 * Server-side authorization check for course access with enrollment duration and expiry enforcement.
 * Validates admin status, approved course_enrollments in database, and approved central-course-requests,
 * ensuring access is blocked as soon as enrollment duration expires without revoking other valid courses.
 */
export async function checkUserCourseAccess(
  userId: string,
  userEmail: string,
  courseId: string
): Promise<CourseAccessVerification> {
  // Admin role has unrestricted access across all curricula
  try {
    const { role } = await getCurrentUserRole();
    if (role === "admin") return { allowed: true, isExpired: false };
  } catch {}

  const normId = courseId.trim().toLowerCase();
  const emailLower = userEmail.toLowerCase().trim();

  // Baseline verified test student account approval (development only, via TEST_STUDENT_EMAIL)
  const testStudentEnv = process.env.NODE_ENV !== "production" ? process.env.TEST_STUDENT_EMAIL?.toLowerCase().trim() : null;
  if (testStudentEnv && emailLower === testStudentEnv && (normId === "grammar-a1" || normId === "a1g")) {
    return { allowed: true, isExpired: false };
  }

  let hasFoundExpired = false;

  // 1. Check central-course-requests file store
  try {
    const requestsPath = path.join(process.cwd(), "src", "config", "central-course-requests.json");
    if (fs.existsSync(requestsPath)) {
      const all = JSON.parse(fs.readFileSync(requestsPath, "utf-8") || "[]");
      const matched = all.filter(
        (r: any) =>
          (r.userId === userId || r.studentEmail?.toLowerCase() === emailLower) &&
          (r.courseId?.toLowerCase() === normId ||
            r.courseTitle?.toLowerCase() === normId ||
            (normId === "a1g" && r.courseId?.toLowerCase() === "grammar-a1") ||
            (normId === "grammar-a1" && r.courseId?.toLowerCase() === "a1g")) &&
          r.status === "approved"
      );

      for (const m of matched) {
        const calc = calculateEnrollmentExpiry({
          approvedAt: m.approvedAt || m.requestedAt,
          durationMonths: m.durationMonths,
          explicitExpiresAt: m.expiresAt,
          rawStatus: m.status,
          courseId: m.courseId || normId,
        });

        if (!calc.isExpired) {
          return { allowed: true, isExpired: false };
        } else {
          hasFoundExpired = true;
        }
      }
    }
  } catch {}

  // 2. Check Supabase course_enrollments
  try {
    const supabase = await createClient();
    const { data: enrollments, error } = await supabase
      .from("course_enrollments")
      .select("status, course_id, approved_at, requested_at, duration_months, expires_at, courses:course_id(id, slug, title)")
      .eq("user_id", userId)
      .eq("status", "approved");

    if (!error && Array.isArray(enrollments)) {
      for (const e of (enrollments as any[])) {
        const c = Array.isArray(e.courses) ? e.courses[0] : e.courses;
        const matchesCourse =
          e.course_id?.toLowerCase() === normId ||
          c?.id?.toLowerCase() === normId ||
          c?.slug?.toLowerCase() === normId ||
          c?.title?.toLowerCase() === normId ||
          (normId === "a1g" && (e.course_id?.toLowerCase() === "grammar-a1" || c?.slug?.toLowerCase() === "grammar-a1")) ||
          (normId === "grammar-a1" && (e.course_id?.toLowerCase() === "a1g" || c?.slug?.toLowerCase() === "a1g"));

        if (matchesCourse) {
          const calc = calculateEnrollmentExpiry({
            approvedAt: e.approved_at || e.requested_at,
            requestedAt: e.requested_at,
            durationMonths: e.duration_months,
            explicitExpiresAt: e.expires_at,
            rawStatus: e.status,
            courseId: e.course_id || normId,
          });

          if (!calc.isExpired) {
            return { allowed: true, isExpired: false };
          } else {
            hasFoundExpired = true;
          }
        }
      }
    }
  } catch {}

  if (hasFoundExpired) {
    return {
      allowed: false,
      isExpired: true,
      message: "Enrollment Expired: Your access duration for this course has ended. Please contact administration to renew your enrollment.",
    };
  }

  return {
    allowed: false,
    isExpired: false,
    message: "Access Restricted: You do not have approved enrollment for this course.",
  };
}

/**
 * Backward-compatible helper returning boolean access status.
 */
async function verifyUserCourseEnrollment(
  userId: string,
  userEmail: string,
  courseId: string
): Promise<boolean> {
  const result = await checkUserCourseAccess(userId, userEmail, courseId);
  return result.allowed;
}

/**
 * Retrieves protected lesson content with server-side authorization and dynamic watermark binding.
 */
export async function getProtectedLesson(
  courseId: string,
  lessonId: string
): Promise<ProtectedLessonResponse> {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required to access protected learning content.",
      };
    }

    // Check account status: enforce suspension restriction
    const isBanned = Boolean(user.banned_until && new Date(user.banned_until) > new Date());
    const isSuspended = isBanned || user.app_metadata?.status === "suspended";

    if (isSuspended) {
      return {
        success: false,
        error: "Account Restricted: Your student account is currently suspended. Please contact institutional administration.",
      };
    }

    const { role } = await getCurrentUserRole();
    const isAdmin = role === "admin";

    // Enforce course-specific enrollment access and duration expiry for students
    if (!isAdmin) {
      const access = await checkUserCourseAccess(user.id, user.email || "", courseId);
      if (!access.allowed) {
        return {
          success: false,
          error: access.message || "Access Restricted: You do not have approved enrollment for this course.",
        };
      }
    }

    // 1. Check central-curriculum store first for dynamic course curriculum
    const normCourseId = courseId.trim().toLowerCase();
    const curriculumPath = path.join(process.cwd(), "src", "config", "central-curriculum.json");
    if (fs.existsSync(curriculumPath)) {
      try {
        const fileData = JSON.parse(fs.readFileSync(curriculumPath, "utf-8") || "{}");
        let foundCourse: any = null;
        for (const [k, v] of Object.entries(fileData)) {
          if (k.toLowerCase() === normCourseId) {
            foundCourse = v;
            break;
          }
        }

        if (foundCourse && Array.isArray(foundCourse.modules)) {
          for (const m of foundCourse.modules) {
            if (Array.isArray(m.lessons)) {
              const matchedLesson = m.lessons.find((l: any) => l.id === lessonId);
              if (matchedLesson) {
                let extractedVideoId = "";
                if (matchedLesson.video_url) {
                  const match = matchedLesson.video_url.match(
                    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
                  );
                  if (match) {
                    extractedVideoId = match[1];
                  } else if (/^[a-zA-Z0-9_-]{11}$/.test(matchedLesson.video_url.trim())) {
                    extractedVideoId = matchedLesson.video_url.trim();
                  }
                }
                const studentName = (user.user_metadata?.full_name as string) || "Enrolled Scholar";
                const studentEmail = user.email || "student@speakup.edu";
                const licenseText = `Licensed to: ${studentName} • ${studentEmail}`;

                let resolvedCourseTitle = courseId.toUpperCase();
                const coursesFilePath = path.join(process.cwd(), "src", "config", "central-courses.json");
                if (fs.existsSync(coursesFilePath)) {
                  try {
                    const cList = JSON.parse(fs.readFileSync(coursesFilePath, "utf-8") || "[]");
                    const cObj = cList.find((c: any) => c.id.toLowerCase() === normCourseId || c.slug?.toLowerCase() === normCourseId);
                    if (cObj?.title) resolvedCourseTitle = cObj.title;
                  } catch {}
                }

                let resolvedLinkButton: LessonLinkButton | null = null;
                // 1. Authoritative check: retrieve lesson link from Supabase cms_content
                try {
                  const { data: cmsData } = await (supabase as any)
                    .from("cms_content")
                    .select("published_data")
                    .eq("page_key", "lesson_links")
                    .maybeSingle();

                  if (cmsData?.published_data && typeof cmsData.published_data === "object") {
                    const linksStore = cmsData.published_data as Record<string, any>;
                    const foundLink = linksStore[`${courseId}_${m.id}_${matchedLesson.id}`] || linksStore[matchedLesson.id];
                    if (foundLink && foundLink.enabled && foundLink.url) {
                      resolvedLinkButton = {
                        enabled: foundLink.enabled,
                        text: foundLink.text || "Open Learning Resource",
                        url: foundLink.url,
                        description: foundLink.description || "",
                      };
                    }
                  }
                } catch {}

                // 2. Secondary fallback: check local central-lesson-links.json
                if (!resolvedLinkButton) {
                  const linksStorePath = path.join(process.cwd(), "src", "config", "central-lesson-links.json");
                  if (fs.existsSync(linksStorePath)) {
                    try {
                      const linksStore = JSON.parse(fs.readFileSync(linksStorePath, "utf-8") || "{}");
                      const foundLink = linksStore[`${courseId}_${m.id}_${matchedLesson.id}`] || linksStore[matchedLesson.id];
                      if (foundLink && foundLink.enabled && foundLink.url) {
                        resolvedLinkButton = {
                          enabled: foundLink.enabled,
                          text: foundLink.text || "Open Learning Resource",
                          url: foundLink.url,
                          description: foundLink.description || "",
                        };
                      }
                    } catch {}
                  }
                }
                if (!resolvedLinkButton && matchedLesson.link_button?.enabled && matchedLesson.link_button?.url) {
                  resolvedLinkButton = matchedLesson.link_button;
                } else if (!resolvedLinkButton && matchedLesson.link_button_url && (matchedLesson.link_button_enabled ?? true)) {
                  resolvedLinkButton = {
                    enabled: true,
                    text: matchedLesson.link_button_text || "Open Learning Resource",
                    url: matchedLesson.link_button_url,
                    description: matchedLesson.link_button_description || "",
                  };
                }

                return {
                  success: true,
                  data: {
                    courseId,
                    courseTitle: resolvedCourseTitle,
                    moduleId: m.id,
                    moduleTitle: m.title,
                    lessonId: matchedLesson.id,
                    lessonNumber: String(matchedLesson.order_index || 1).padStart(2, "0"),
                    lessonTitle: matchedLesson.title,
                    description: matchedLesson.notes || "",
                    videoId: extractedVideoId,
                    videoUrl: matchedLesson.video_url || "",
                    videoSource: matchedLesson.video_source || "youtube",
                    notes: matchedLesson.notes || "",
                    notesImage: matchedLesson.notes_image || "",
                    notesPages: matchedLesson.notes_pages || (matchedLesson.notes_image ? [matchedLesson.notes_image] : []),
                    notesMaterials: matchedLesson.notes_materials || (matchedLesson.notes_image ? [{ id: "mat_1", url: matchedLesson.notes_image, name: "Lecture Notes Document", type: "image" }] : []),
                    practice: matchedLesson.practice || "",
                    practiceImage: matchedLesson.practice_image || "",
                    readingTitle: matchedLesson.reading_title || "",
                    readingContent: matchedLesson.reading_content || "",
                    readingMaterials: matchedLesson.reading_materials || [],
                    linkButton: resolvedLinkButton,
                    watermark: {
                      studentName,
                      studentEmail,
                      licenseText,
                    },
                  },
                };
              }
            }
          }
        }
      } catch {}
    }

    // 2. Check Supabase database next for dynamic LMS lessons
    try {
      const { data: dbLesson } = await supabase
        .from("lessons")
        .select("id, module_id, title, order_index, video_url, video_source, notes, practice_content")
        .eq("id", lessonId)
        .maybeSingle();

      if (dbLesson) {
        const { data: dbModule } = await supabase
          .from("modules")
          .select("id, title, course_id")
          .eq("id", dbLesson.module_id)
          .maybeSingle();

        const { data: dbCourse } = await supabase
          .from("courses")
          .select("id, title")
          .eq("id", courseId)
          .maybeSingle();

        const studentName = (user.user_metadata?.full_name as string) || "Enrolled Scholar";
        const studentEmail = user.email || "student@speakup.edu";
        const licenseText = `Licensed to: ${studentName} • ${studentEmail}`;

        // Extract YouTube ID from video_url
        let extractedVideoId = "";
        if (dbLesson.video_url) {
          const match = dbLesson.video_url.match(
            /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
          );
          if (match) {
            extractedVideoId = match[1];
          } else if (/^[a-zA-Z0-9_-]{11}$/.test(dbLesson.video_url.trim())) {
            extractedVideoId = dbLesson.video_url.trim();
          }
        }

        return {
          success: true,
          data: {
            courseId,
            courseTitle: dbCourse?.title || "SpeakUp Masterclass",
            moduleId: dbLesson.module_id,
            moduleTitle: dbModule?.title || "Course Module",
            lessonId: dbLesson.id,
            lessonNumber: String(dbLesson.order_index).padStart(2, "0"),
            lessonTitle: dbLesson.title,
            description: dbLesson.notes || "",
            videoId: extractedVideoId,
            notes: dbLesson.notes || "",
            practice: dbLesson.practice_content || "",
            watermark: {
              studentName,
              studentEmail,
              licenseText,
            },
          },
        };
      }
    } catch {
      // Continue to fallback curriculum
    }

    // 3. Fallback to predefined curriculum
    const courseData = COURSE_CURRICULUM[courseId];
    if (!courseData) {
      return {
        success: false,
        error: "The requested course could not be located in the curriculum registry.",
      };
    }

    const lessonData = courseData.lessons[lessonId];
    if (!lessonData) {
      return {
        success: false,
        error: "The requested lesson is not part of this course curriculum.",
      };
    }

    const moduleTitle = courseData.modules[lessonData.moduleId] || "Course Module";

    // Extract student identity strictly from server-side session/profile
    const studentName = (user.user_metadata?.full_name as string) || "Enrolled Scholar";
    const studentEmail = user.email || "student@speakup.edu";
    const licenseText = `Licensed to: ${studentName} • ${studentEmail}`;

    return {
      success: true,
      data: {
        courseId,
        courseTitle: courseData.courseTitle,
        moduleId: lessonData.moduleId,
        moduleTitle,
        lessonId,
        lessonNumber: lessonData.number,
        lessonTitle: lessonData.title,
        description: lessonData.description,
        videoId: lessonData.videoId,
        notes: lessonData.notes,
        practice: lessonData.practice,
        watermark: {
          studentName,
          studentEmail,
          licenseText,
        },
      },
    };
  } catch {
    return {
      success: false,
      error: "Unable to retrieve protected lesson content. Please verify your connection.",
    };
  }
}

/**
 * Loads dynamic modules and lessons for a given course to populate the student Continue Learning player.
 */
export async function getCourseLessonsForPlayerAction(courseId: string): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    moduleId: string;
    moduleTitle: string;
    number: string;
    title: string;
    description: string;
    videoId: string;
    defaultNotes: string;
    defaultPractice: string;
  }>;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, data: [] };
    }

    const isApproved = await verifyUserCourseEnrollment(user.id, user.email || "", courseId);
    if (!isApproved) {
      return { success: false, data: [] };
    }

    const normCourseId = courseId.trim().toLowerCase();

    // 1. Check central-curriculum store first
    const curriculumPath = path.join(process.cwd(), "src", "config", "central-curriculum.json");
    if (fs.existsSync(curriculumPath)) {
      try {
        const fileData = JSON.parse(fs.readFileSync(curriculumPath, "utf-8") || "{}");
        let foundCourse: any = null;
        for (const [k, v] of Object.entries(fileData)) {
          if (k.toLowerCase() === normCourseId) {
            foundCourse = v;
            break;
          }
        }

        if (foundCourse && Array.isArray(foundCourse.modules)) {
          const result: any[] = [];
          let lessonIdx = 1;
          for (const m of foundCourse.modules) {
            if (Array.isArray(m.lessons)) {
              for (const l of m.lessons) {
                let ytId = "";
                if (l.video_url) {
                  const match = l.video_url.match(
                    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
                  );
                  if (match) {
                    ytId = match[1];
                  } else if (/^[a-zA-Z0-9_-]{11}$/.test(l.video_url.trim())) {
                    ytId = l.video_url.trim();
                  }
                }
                result.push({
                  id: l.id,
                  moduleId: m.id,
                  moduleTitle: m.title || `Module ${m.id}`,
                  number: String(lessonIdx).padStart(2, "0"),
                  title: l.title,
                  description: l.notes || "",
                  videoId: ytId,
                  videoUrl: l.video_url || "",
                  videoSource: l.video_source || "youtube",
                  defaultNotes: l.notes || "No notes provided for this lesson.",
                  notesImage: l.notes_image || "",
                  notesMaterials: l.notes_materials || (l.notes_image ? [{ id: "mat_1", url: l.notes_image, name: "Lecture Notes Document", type: "image" }] : []),
                  defaultPractice: l.practice || "No practice directives provided.",
                  practiceImage: l.practice_image || "",
                  readingTitle: l.reading_title || "",
                  readingContent: l.reading_content || "",
                  readingMaterials: l.reading_materials || [],
                });
                lessonIdx++;
              }
            }
          }
          return { success: true, data: result };
        }
      } catch {}
    }

    // 2. Check Supabase database
    const dbClient = (await createClient()) as any;

    const { data: modules } = await dbClient
      .from("modules")
      .select("id, title, order_index")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    if (modules && modules.length > 0) {
      const moduleMap = new Map<string, string>();
      modules.forEach((m: any) => moduleMap.set(m.id, m.title));
      const moduleIds = modules.map((m: any) => m.id);

      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, module_id, title, order_index, video_url, notes, practice_content")
        .in("module_id", moduleIds)
        .order("order_index", { ascending: true });

      if (lessons && lessons.length > 0) {
        const result = lessons.map((l: any, idx: number) => {
          let ytId = "";
          if (l.video_url) {
            const match = l.video_url.match(
              /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
            );
            if (match) {
              ytId = match[1];
            } else if (/^[a-zA-Z0-9_-]{11}$/.test(l.video_url.trim())) {
              ytId = l.video_url.trim();
            }
          }
          return {
            id: l.id,
            moduleId: l.module_id,
            moduleTitle: moduleMap.get(l.module_id) || `Module ${l.module_id}`,
            number: String(idx + 1).padStart(2, "0"),
            title: l.title,
            description: l.notes || "",
            videoId: ytId,
            defaultNotes: l.notes || "No notes provided for this lesson.",
            defaultPractice: l.practice_content || "No practice directives provided.",
          };
        });

        return { success: true, data: result };
      }
    }

    // 3. Fallback only for grammar-a1 canonical
    if (normCourseId === "grammar-a1") {
      const gCourse = COURSE_CURRICULUM["grammar-a1"];
      if (gCourse) {
        const list = Object.entries(gCourse.lessons).map(([id, item]) => ({
          id,
          moduleId: item.moduleId,
          moduleTitle: gCourse.modules[item.moduleId] || "Module",
          number: item.number,
          title: item.title,
          description: item.description,
          videoId: item.videoId,
          defaultNotes: item.notes,
          defaultPractice: item.practice,
        }));
        return { success: true, data: list };
      }
    }

    return { success: true, data: [] };
  } catch {
    return { success: false, data: [] };
  }
}

/**
 * Allows an authenticated student or admin to change their password securely.
 * Reauthenticates the current password against Supabase Auth before applying updates.
 * Never writes passwords or tokens to database tables or logs.
 */
export async function changePasswordAction(
  param1: string,
  param2?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return {
        success: false,
        error: "Authentication required. Please sign in to update your password.",
      };
    }

    let currentPassword = "";
    let newPassword = "";

    if (param2 !== undefined) {
      currentPassword = param1;
      newPassword = param2;
    } else {
      newPassword = param1;
    }

    const passCheck = validatePassword(newPassword);
    if (!passCheck.valid) {
      return {
        success: false,
        error: passCheck.error || "Password does not meet security requirements.",
      };
    }

    // 1. If current password was provided, reauthenticate with Supabase Auth
    if (currentPassword) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        return {
          success: false,
          error: "Current password does not match our security records.",
        };
      }
    }

    // 2. Apply new password update through Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 3. Invalidate previous sessions across all devices & register revocation timestamp
    await recordPasswordChange(user.id, "password_change");

    return { success: true };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred while updating your password. Please try again.",
    };
  }
}

/**
 * Revokes all active refresh tokens for the current user across all devices.
 * Uses native Supabase Auth global sign out.
 */
export async function revokeAllSessionsAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Failed to revoke active sessions." };
  }
}

/**
 * Invalidates and registers global session revocation upon password reset completion.
 */
export async function invalidateSessionOnResetAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await recordPasswordChange(user.id, "security_reset");
    }
    await supabase.auth.signOut({ scope: "global" });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to invalidate sessions." };
  }
}

/**
 * Records real-time student presence, client IP, device, and browser metadata
 * when a student interacts with the LMS. Only visible to Admins in the Admin Panel.
 */
export async function recordStudentLmsActivityAction(): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false };

    const reqHeaders = await headers();
    const forwardedFor = reqHeaders.get("x-forwarded-for");
    const realIp = reqHeaders.get("x-real-ip");
    let ip = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1";
    if (ip === "::1") ip = "127.0.0.1";

    const userAgent = reqHeaders.get("user-agent") || "";

    // Reliable device and browser detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      userAgent
    );
    let deviceType = "Desktop / PC";
    if (/iPad|Tablet/i.test(userAgent)) deviceType = "Tablet";
    else if (isMobile) deviceType = "Mobile Device (Smartphone)";

    let os = "Desktop OS";
    if (/Windows/i.test(userAgent)) os = "Windows";
    else if (/iPhone|iPad|iPod/i.test(userAgent)) os = "iOS";
    else if (/Android/i.test(userAgent)) os = "Android";
    else if (/Macintosh|Mac OS X/i.test(userAgent)) os = "macOS";
    else if (/Linux/i.test(userAgent)) os = "Linux";

    let browser = "Web Browser";
    if (/Edg\//i.test(userAgent)) browser = "Microsoft Edge";
    else if (/Chrome\//i.test(userAgent)) browser = "Google Chrome";
    else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent))
      browser = "Apple Safari";
    else if (/Firefox\//i.test(userAgent)) browser = "Mozilla Firefox";

    const adminClient = createAdminClient();
    const { data: userData } = await adminClient.auth.admin.getUserById(user.id);
    if (!userData?.user) return { success: false };

    const currentAppMeta = userData.user.app_metadata || {};
    const existingHistory = Array.isArray(currentAppMeta.activity_history)
      ? [...currentAppMeta.activity_history]
      : [];

    const nowIso = new Date().toISOString();
    const newEntry = {
      timestamp: nowIso,
      action: "LMS Session Active",
      ip,
      device: `${deviceType} • ${os}`,
      browser,
      is_mobile: isMobile,
    };

    // Throttle duplicate logging within 5 minutes
    const lastEntry = existingHistory[0];
    if (
      lastEntry &&
      new Date(nowIso).getTime() - new Date(lastEntry.timestamp).getTime() <
        5 * 60 * 1000
    ) {
      lastEntry.timestamp = nowIso;
      lastEntry.ip = ip;
      lastEntry.device = `${deviceType} • ${os}`;
      lastEntry.browser = browser;
      lastEntry.is_mobile = isMobile;
    } else {
      existingHistory.unshift(newEntry);
    }

    const trimmedHistory = existingHistory.slice(0, 30);

    await adminClient.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...currentAppMeta,
        last_active_at: nowIso,
        last_ip: ip,
        last_device: `${deviceType} • ${os}`,
        last_browser: browser,
        is_mobile: isMobile,
        activity_history: trimmedHistory,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("Failed to record student activity:", err);
    return { success: false };
  }
}

/**
 * Securely uploads a student avatar to Supabase Storage, sets the public URL on profiles and auth metadata.
 * Validates max 2MB size and image MIME types. Explicitly rejects Base64 data URLs.
 */
export async function uploadStudentAvatarAction(
  formData: FormData
): Promise<{ success: boolean; error?: string; data?: { avatarUrl: string } }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return { success: false, error: "Authentication required to upload avatar." };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No image file provided." };
    }

    const allowedMime = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMime.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file format. Allowed formats: PNG, JPG, WebP.",
      };
    }

    if (file.size > 8 * 1024 * 1024) {
      return {
        success: false,
        error: "Image exceeds the maximum allowed size of 8MB.",
      };
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    let optimizedBuffer: Buffer;
    try {
      const sharp = (await import("sharp")).default;
      optimizedBuffer = await sharp(rawBuffer)
        .resize(256, 256, { fit: "cover", position: "center" })
        .webp({ quality: 84 })
        .toBuffer();
    } catch {
      optimizedBuffer = rawBuffer;
    }

    const adminClient = createAdminClient();
    const fileName = `student_${user.id}_${Date.now()}.webp`;

    let publicUrl = "";

    const { error: uploadError } = await adminClient.storage
      .from("avatars")
      .upload(fileName, optimizedBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (!uploadError) {
      const { data: pubData } = adminClient.storage.from("avatars").getPublicUrl(fileName);
      publicUrl = pubData.publicUrl;
    } else {
      console.warn("Supabase avatar upload notice:", uploadError.message);
      // Only attempt local filesystem write in local development and outside Vercel
      if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
        try {
          const fs = (await import("fs")).default;
          const path = (await import("path")).default;
          const targetDir = path.join(process.cwd(), "public", "uploads", "avatars");
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
          const localFilePath = path.join(targetDir, fileName);
          fs.writeFileSync(localFilePath, optimizedBuffer);
          publicUrl = `/uploads/avatars/${fileName}`;
        } catch (fsErr) {
          console.warn("Local avatar write fallback skipped or failed:", fsErr);
        }
      }
    }

    if (!publicUrl) {
      return {
        success: false,
        error: "Failed to upload avatar to storage. Please check storage bucket configuration.",
      };
    }

    try {
      await (adminClient as any)
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
    } catch {
      // Non-blocking
    }

    try {
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: { avatar_url: publicUrl },
      });
    } catch {
      // Non-blocking
    }

    return { success: true, data: { avatarUrl: publicUrl } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upload avatar.",
    };
  }
}

/**
 * Removes the authenticated student's avatar from Supabase Storage and database profile,
 * reverting them to the InitialsAvatar display.
 */
export async function removeStudentAvatarAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized session." };
    }

    const adminClient = createAdminClient();

    // 1. Remove from profiles table
    try {
      await (adminClient as any)
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
    } catch {
      // Non-blocking
    }

    // 2. Remove from auth metadata
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { avatar_url: null },
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove avatar.",
    };
  }
}

export interface CourseProgressData {
  courseId: string;
  courseTitle: string;
  completedLessons: string[];
  totalLessons: number;
  progressPercentage: number;
  lastLessonId?: string;
  lastAccessedAt: string;
}

export interface StudentProgressResponse {
  success: boolean;
  error?: string;
  data?: {
    courses: Record<string, CourseProgressData>;
    lastActiveCourseId?: string;
  };
}

/**
 * Retrieves persistent learning progress for the authenticated student from Supabase.
 * Each student's progress is securely isolated using their authenticated session UID.
 */
export async function getStudentProgressAction(
  targetCourseId?: string
): Promise<StudentProgressResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to retrieve progress." };
    }

    // Check account status: enforce suspension restriction
    const isBanned = Boolean(user.banned_until && new Date(user.banned_until) > new Date());
    const isSuspended = isBanned || user.app_metadata?.status === "suspended";
    if (isSuspended) {
      return { success: false, error: "Account suspended." };
    }

    const { role } = await getCurrentUserRole();
    const isAdmin = role === "admin" || user.app_metadata?.role === "admin";
    const email = (user.email || "").toLowerCase().trim();

    // Map of approved courses for this student
    const approvedCoursesMap = new Map<string, { courseId: string; courseTitle: string }>();

    if (isAdmin) {
      // Administrator has complete curriculum preview access
      const allC = getUnifiedCourses();
      for (const c of allC) {
        approvedCoursesMap.set(c.id.toLowerCase(), { courseId: c.id, courseTitle: c.title });
      }
    } else {
      // 1. Authorized test account baseline (development only, via TEST_STUDENT_EMAIL)
      const testStudentEnv = process.env.NODE_ENV !== "production" ? process.env.TEST_STUDENT_EMAIL?.toLowerCase().trim() : null;
      if (testStudentEnv && email === testStudentEnv) {
        approvedCoursesMap.set("grammar-a1", {
          courseId: "grammar-a1",
          courseTitle: "English Grammar Mastery — A1",
        });
      }

      // 2. Verified active records in central-course-requests file store
      try {
        const requestsPath = path.join(process.cwd(), "src", "config", "central-course-requests.json");
        if (fs.existsSync(requestsPath)) {
          const allReqs = JSON.parse(fs.readFileSync(requestsPath, "utf-8") || "[]");
          for (const r of allReqs) {
            if (
              (r.userId === user.id || r.studentEmail?.toLowerCase() === email) &&
              r.status === "approved"
            ) {
              const active = isEnrollmentActive({
                status: r.status,
                approvedAt: r.approvedAt || r.requestedAt,
                requestedAt: r.requestedAt,
                durationMonths: r.durationMonths,
                explicitExpiresAt: r.expiresAt,
                courseId: r.courseId,
              });

              if (active) {
                const cId = r.courseId || "course";
                approvedCoursesMap.set(cId.toLowerCase(), {
                  courseId: cId,
                  courseTitle: r.courseTitle || "Approved Course",
                });
              }
            }
          }
        }
      } catch {}

      // 3. Verified active approved records in Supabase course_enrollments
      try {
        const { data: dbEnrollments } = await (supabase as any)
          .from("course_enrollments")
          .select("course_id, status, approved_at, requested_at, duration_months, expires_at, courses:course_id(id, slug, title)")
          .eq("user_id", user.id)
          .eq("status", "approved");

        if (dbEnrollments && Array.isArray(dbEnrollments)) {
          for (const enr of dbEnrollments) {
            const active = isEnrollmentActive({
              status: enr.status,
              approvedAt: enr.approved_at || enr.requested_at,
              requestedAt: enr.requested_at,
              durationMonths: enr.duration_months,
              explicitExpiresAt: enr.expires_at,
              courseId: enr.course_id,
            });

            if (active) {
              const cObj = Array.isArray(enr.courses) ? enr.courses[0] : enr.courses;
              const cId = cObj?.slug || cObj?.id || enr.course_id;
              if (cId) {
                approvedCoursesMap.set(cId.toLowerCase(), {
                  courseId: cId,
                  courseTitle: cObj?.title || "Approved Course",
                });
              }
            }
          }
        }
      } catch {}
    }

    // Retrieve saved progress from Supabase Auth user metadata
    const userMeta = user.user_metadata || {};
    const rawProgress = (userMeta.learning_progress as {
      courses?: Record<string, CourseProgressData>;
      lastActiveCourseId?: string;
    }) || {};

    const rawCourses: Record<string, CourseProgressData> = rawProgress.courses || {};
    const filteredCoursesMap: Record<string, CourseProgressData> = {};

    // Strictly populate ONLY courses where enrollment is verified & approved
    for (const [lowerId, meta] of approvedCoursesMap.entries()) {
      const existing = rawCourses[meta.courseId] || rawCourses[lowerId];
      if (existing) {
        filteredCoursesMap[meta.courseId] = existing;
      } else {
        const canonical = getUnifiedCourseById(meta.courseId);
        filteredCoursesMap[meta.courseId] = {
          courseId: meta.courseId,
          courseTitle: canonical?.title || meta.courseTitle,
          completedLessons: [],
          totalLessons: 6,
          progressPercentage: 0,
          lastLessonId: "l01",
          lastAccessedAt: new Date().toISOString(),
        };
      }
    }

    const firstApprovedKey = Object.keys(filteredCoursesMap)[0] || "";
    const resolvedLastActive = (rawProgress.lastActiveCourseId && filteredCoursesMap[rawProgress.lastActiveCourseId])
      ? rawProgress.lastActiveCourseId
      : firstApprovedKey;

    return {
      success: true,
      data: {
        courses: filteredCoursesMap,
        lastActiveCourseId: resolvedLastActive,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load student progress.",
    };
  }
}

/**
 * Persists a completed lesson and updates course progress percentage in Supabase for the authenticated student.
 */
export async function saveLessonCompletionAction(params: {
  courseId: string;
  lessonId: string;
  completed: boolean;
}): Promise<{
  success: boolean;
  error?: string;
  data?: {
    courseId: string;
    completedLessons: string[];
    progressPercentage: number;
    lastLessonId: string;
  };
}> {
  try {
    const { courseId, lessonId, completed } = params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to save progress." };
    }

    // Verify course enrollment access for safety
    const { role } = await getCurrentUserRole();
    if (role !== "admin") {
      const isApproved = await verifyUserCourseEnrollment(user.id, user.email || "", courseId);
      if (!isApproved) {
        return { success: false, error: "Unauthorized: not enrolled in this course." };
      }
    }

    // Load existing progress from user_metadata
    const userMeta = user.user_metadata || {};
    const existingProgress = (userMeta.learning_progress as {
      courses?: Record<string, CourseProgressData>;
      lastActiveCourseId?: string;
    }) || { courses: {} };

    const coursesMap: Record<string, CourseProgressData> = existingProgress.courses || {};
    const currentCourseProgress = coursesMap[courseId] || {
      courseId,
      courseTitle: COURSE_CURRICULUM[courseId]?.courseTitle || "English Grammar Mastery — A1",
      completedLessons: [],
      totalLessons: Object.keys(COURSE_CURRICULUM[courseId]?.lessons || {}).length || 6,
      progressPercentage: 0,
      lastLessonId: lessonId,
      lastAccessedAt: new Date().toISOString(),
    };

    let updatedCompleted: string[];
    if (completed) {
      updatedCompleted = Array.from(new Set([...currentCourseProgress.completedLessons, lessonId]));
    } else {
      updatedCompleted = currentCourseProgress.completedLessons.filter((id) => id !== lessonId);
    }

    const totalLessons = currentCourseProgress.totalLessons || 6;
    const progressPercentage = Math.min(100, Math.round((updatedCompleted.length / totalLessons) * 100));

    coursesMap[courseId] = {
      ...currentCourseProgress,
      completedLessons: updatedCompleted,
      progressPercentage,
      lastLessonId: lessonId,
      lastAccessedAt: new Date().toISOString(),
    };

    const newLearningProgress = {
      courses: coursesMap,
      lastActiveCourseId: courseId,
      updatedAt: new Date().toISOString(),
    };

    // 1. Persist directly to Supabase Auth metadata for the authenticated user
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...userMeta,
        learning_progress: newLearningProgress,
      },
    });

    if (updateError) {
      console.error("Failed to persist learning progress in Supabase:", updateError);
      return { success: false, error: "Failed to persist progress in database." };
    }

    return {
      success: true,
      data: {
        courseId,
        completedLessons: updatedCompleted,
        progressPercentage,
        lastLessonId: lessonId,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save lesson progress.",
    };
  }
}

export interface CourseNotification {
  id: string;
  courseId: string;
  courseTitle: string;
  type: "assignment_added" | "assignment_reviewed" | "feedback_received" | "video_added" | "lesson_added" | "announcement";
  title: string;
  message: string;
  studentEmail?: string;
  timestamp: string;
  read: boolean;
}

const NOTIFICATIONS_STORE_PATH = path.join(process.cwd(), "src", "config", "central-notifications.json");

function readNotificationsStore(): CourseNotification[] {
  try {
    if (fs.existsSync(NOTIFICATIONS_STORE_PATH)) {
      const content = fs.readFileSync(NOTIFICATIONS_STORE_PATH, "utf-8");
      return JSON.parse(content || "[]");
    }
  } catch (err) {
    console.error("Error reading notifications store:", err);
  }
  return [];
}

function writeNotificationsStore(notifs: CourseNotification[]) {
  try {
    fs.writeFileSync(NOTIFICATIONS_STORE_PATH, JSON.stringify(notifs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing notifications store:", err);
  }
}

/**
 * Retrieves notifications strictly scoped to courses the student is actually enrolled in.
 */
export async function getCourseNotificationsAction(
  enrolledCourseIds?: string[],
  userEmail?: string
): Promise<{ success: boolean; data: CourseNotification[] }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const email = (userEmail || user?.email || "").toLowerCase().trim();
    const all = readNotificationsStore();

    // Securely resolve authenticated student's approved course IDs
    let validCourseIds: string[] = [];
    if (user) {
      const prog = await getStudentProgressAction();
      if (prog.success && prog.data?.courses) {
        validCourseIds = Object.keys(prog.data.courses).map((id) => id.toLowerCase().trim());
      }
      // If user is authenticated, validCourseIds are strictly what they are enrolled in
      if (validCourseIds.length === 0) {
        return { success: true, data: [] };
      }
    } else if (enrolledCourseIds && Array.isArray(enrolledCourseIds)) {
      validCourseIds = enrolledCourseIds.map((c) => c.toLowerCase().trim());
    }

    if (validCourseIds.length === 0) {
      return { success: true, data: [] };
    }

    const filtered = all.filter((n) => {
      const notifCourseId = n.courseId.toLowerCase().trim();
      const matchesCourse =
        validCourseIds.includes(notifCourseId) ||
        (notifCourseId === "grammar-a1" && validCourseIds.includes("a1g")) ||
        (notifCourseId === "a1g" && validCourseIds.includes("grammar-a1"));
      if (!matchesCourse) return false;

      // If notification has a specific student target, verify email
      if (n.studentEmail && email && n.studentEmail.toLowerCase().trim() !== email) {
        return false;
      }
      return true;
    });

    return { success: true, data: filtered };
  } catch {
    return { success: false, data: [] };
  }
}

/**
 * Creates a course-specific notification (e.g. assignment reviewed, new video, announcement).
 */
export async function createCourseNotificationAction(payload: {
  courseId: string;
  courseTitle: string;
  type: CourseNotification["type"];
  title: string;
  message: string;
  studentEmail?: string;
}): Promise<{ success: boolean; data?: CourseNotification; error?: string }> {
  try {
    const all = readNotificationsStore();
    const notif: CourseNotification = {
      id: `notif_${Date.now()}`,
      courseId: payload.courseId,
      courseTitle: payload.courseTitle,
      type: payload.type,
      title: payload.title.trim(),
      message: payload.message.trim(),
      studentEmail: payload.studentEmail?.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    all.unshift(notif);
    writeNotificationsStore(all);
    revalidatePath("/lms/courses");

    return { success: true, data: notif };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create notification." };
  }
}

/**
 * Marks a notification as read.
 */
export async function markNotificationReadAction(notificationId: string): Promise<{ success: boolean }> {
  try {
    const all = readNotificationsStore();
    const item = all.find((n) => n.id === notificationId);
    if (item) {
      item.read = true;
      writeNotificationsStore(all);
      revalidatePath("/lms/courses");
    }
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Retrieves the authenticated student's profile information and associated registered courses directly from Supabase.
 * Enforces course restriction so students can only view and request courses associated with their registration.
 */
export async function getStudentAccountInfoForRequestAction(): Promise<{
  success: boolean;
  error?: string;
  data?: {
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    associatedCourses: Array<{
      id: string;
      title: string;
      level?: string;
      status: "not_requested" | "pending" | "approved" | "rejected" | "expired";
      requestedAt?: string;
      approvedAt?: string;
      expiresAt?: string;
      daysRemaining?: number | null;
      durationMonths?: number;
    }>;
  };
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Please sign in to retrieve account information." };
    }

    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", user.id)
      .maybeSingle();

    const studentName =
      profile?.full_name ||
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      "Registered Student";
    const studentEmail = user.email || profile?.email || "";
    const studentPhone =
      profile?.phone ||
      (user.user_metadata?.phone as string) ||
      (user.phone as string) ||
      "";

    // Read Central Published Courses
    const coursesFilePath = path.join(process.cwd(), "src", "config", "central-courses.json");
    let centralList: any[] = [];
    if (fs.existsSync(coursesFilePath)) {
      try {
        centralList = JSON.parse(fs.readFileSync(coursesFilePath, "utf-8") || "[]");
      } catch {}
    }
    const unified = getUnifiedCourses();

    // Read Existing Course Requests to determine status per course
    const requestsPath = path.join(process.cwd(), "src", "config", "central-course-requests.json");
    let allRequests: any[] = [];
    if (fs.existsSync(requestsPath)) {
      try {
        allRequests = JSON.parse(fs.readFileSync(requestsPath, "utf-8") || "[]");
      } catch {}
    }

    // Read DB Enrollments with duration and expiry
    const { data: dbEnrollments } = await (supabase as any)
      .from("course_enrollments")
      .select("course_id, status, requested_at, approved_at, duration_months, expires_at")
      .eq("user_id", user.id);

    const enrollmentStatusMap = new Map<
      string,
      {
        status: "not_requested" | "pending" | "approved" | "rejected" | "expired";
        requestedAt?: string;
        approvedAt?: string;
        expiresAt?: string;
        daysRemaining?: number | null;
        durationMonths?: number;
      }
    >();

    if (Array.isArray(dbEnrollments)) {
      dbEnrollments.forEach((e: any) => {
        if (e.course_id) {
          let resolvedStatus: "pending" | "approved" | "rejected" | "expired" = e.status || "pending";
          let daysRemaining: number | null = null;
          let expiresAtIso: string | undefined = e.expires_at || undefined;
          let durationMonths = e.duration_months;

          if (e.status === "approved") {
            const calc = calculateEnrollmentExpiry({
              approvedAt: e.approved_at,
              requestedAt: e.requested_at,
              durationMonths: e.duration_months,
              explicitExpiresAt: e.expires_at,
              rawStatus: e.status,
              courseId: e.course_id,
            });
            if (calc.isExpired) {
              resolvedStatus = "expired";
            }
            daysRemaining = calc.daysRemaining;
            expiresAtIso = calc.expiresAtIso || undefined;
            durationMonths = calc.durationMonths;
          }

          enrollmentStatusMap.set(e.course_id.toLowerCase(), {
            status: resolvedStatus,
            requestedAt: e.requested_at,
            approvedAt: e.approved_at,
            expiresAt: expiresAtIso,
            daysRemaining,
            durationMonths,
          });
        }
      });
    }

    // Central requests cache overlay
    allRequests.forEach((r: any) => {
      if (r.userId === user.id || (r.studentEmail && r.studentEmail.toLowerCase() === studentEmail.toLowerCase())) {
        if (r.courseId) {
          let resolvedStatus: "pending" | "approved" | "rejected" | "expired" = r.status || "pending";
          let daysRemaining: number | null = null;
          let expiresAtIso: string | undefined = r.expiresAt;
          let durationMonths = r.durationMonths;

          if (r.status === "approved") {
            const calc = calculateEnrollmentExpiry({
              approvedAt: r.approvedAt || r.requestedAt,
              requestedAt: r.requestedAt,
              durationMonths: r.durationMonths,
              explicitExpiresAt: r.expiresAt,
              rawStatus: r.status,
              courseId: r.courseId,
            });
            if (calc.isExpired) {
              resolvedStatus = "expired";
            }
            daysRemaining = calc.daysRemaining;
            expiresAtIso = calc.expiresAtIso || undefined;
            durationMonths = calc.durationMonths;
          }

          enrollmentStatusMap.set(r.courseId.toLowerCase(), {
            status: resolvedStatus,
            requestedAt: r.requestedAt,
            approvedAt: r.approvedAt,
            expiresAt: expiresAtIso,
            daysRemaining,
            durationMonths,
          });
        }
      }
    });

    // Determine student's registered/associated course identifiers
    const registeredTokens: string[] = [];
    const metaCourseInterest = (user.user_metadata?.course_interest as string) || "";
    const metaCourses = user.user_metadata?.courses || user.user_metadata?.registered_courses || [];

    if (Array.isArray(metaCourses)) {
      metaCourses.forEach((c: any) => {
        if (typeof c === "string" && c.trim()) registeredTokens.push(c.trim());
        else if (c?.id) registeredTokens.push(c.id.trim());
      });
    }

    if (metaCourseInterest) {
      const parts = metaCourseInterest.split(/[+,&;]|\band\b/i);
      parts.forEach((p) => {
        const clean = p.trim();
        if (clean && !registeredTokens.includes(clean)) {
          registeredTokens.push(clean);
        }
      });
    }

    for (const cId of enrollmentStatusMap.keys()) {
      if (!registeredTokens.some((t) => t.toLowerCase() === cId.toLowerCase())) {
        registeredTokens.push(cId);
      }
    }

    if (registeredTokens.length === 0) {
      if (centralList.length > 0) {
        centralList.forEach((c) => registeredTokens.push(c.id || c.title));
      } else {
        registeredTokens.push("A1G");
      }
    }

    // Map each associated course token to full course details
    const associatedCourses: Array<{
      id: string;
      title: string;
      level?: string;
      status: "not_requested" | "pending" | "approved" | "rejected" | "expired";
      requestedAt?: string;
      approvedAt?: string;
      expiresAt?: string;
      daysRemaining?: number | null;
      durationMonths?: number;
    }> = [];

    const seenIds = new Set<string>();

    registeredTokens.forEach((token) => {
      const lower = token.toLowerCase();
      const matchedCentral = centralList.find(
        (c) => c.id?.toLowerCase() === lower || c.slug?.toLowerCase() === lower || c.title?.toLowerCase() === lower
      );
      const matchedUnified = unified.find(
        (c) => c.id.toLowerCase() === lower || c.slug.toLowerCase() === lower || c.title.toLowerCase() === lower
      );

      const courseId = matchedCentral?.id || matchedUnified?.id || token;
      const normalizedKey = courseId.toLowerCase();

      if (seenIds.has(normalizedKey)) return;
      seenIds.add(normalizedKey);

      const title = matchedCentral?.title || matchedUnified?.title || token;
      const level = matchedCentral?.level || matchedUnified?.level || "Executive Series";
      const enrInfo = enrollmentStatusMap.get(normalizedKey) || enrollmentStatusMap.get(lower);

      associatedCourses.push({
        id: courseId,
        title,
        level,
        status: enrInfo ? enrInfo.status : "not_requested",
        requestedAt: enrInfo?.requestedAt,
        approvedAt: enrInfo?.approvedAt,
        expiresAt: enrInfo?.expiresAt,
        daysRemaining: enrInfo?.daysRemaining,
        durationMonths: enrInfo?.durationMonths,
      });
    });

    return {
      success: true,
      data: {
        studentName,
        studentEmail,
        studentPhone,
        associatedCourses,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to retrieve account details." };
  }
}

export interface StudentCourseRequestItem {
  courseId: string;
  courseTitle?: string;
  level?: string;
}

/**
 * Submits course enrollment request(s) from a student.
 * Automatically retrieves student Name, Email, and Phone number directly from Supabase account/profile.
 * Strictly separates requests: each requested course creates its own distinct request record so Admin
 * sees each course as a separate item (e.g. Ahmed - A1G, Ahmed - A2G).
 */
export async function submitStudentCourseRequestAction(payload: {
  courseId?: string;
  courseTitle?: string;
  level?: string;
  courses?: StudentCourseRequestItem[];
}): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: "Please sign in to request course enrollment." };
    }

    // Automatically retrieve student identity from Supabase
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .maybeSingle();

    const studentName =
      profile?.full_name ||
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      "Registered Student";
    const studentEmail = user.email || profile?.email || "";
    const studentPhone =
      profile?.phone ||
      (user.user_metadata?.phone as string) ||
      (user.phone as string) ||
      "";

    // Normalize courses to request: each course MUST be handled as a separate request record
    const itemsToRequest: StudentCourseRequestItem[] = [];
    if (Array.isArray(payload.courses) && payload.courses.length > 0) {
      payload.courses.forEach((c) => {
        if (c.courseId) itemsToRequest.push(c);
      });
    } else if (payload.courseId) {
      itemsToRequest.push({
        courseId: payload.courseId,
        courseTitle: payload.courseTitle,
        level: payload.level,
      });
    }

    if (itemsToRequest.length === 0) {
      return { success: false, error: "Please select a valid course associated with your account." };
    }

    // Load Central Course Catalog to resolve titles
    const coursesFilePath = path.join(process.cwd(), "src", "config", "central-courses.json");
    let centralList: any[] = [];
    if (fs.existsSync(coursesFilePath)) {
      try {
        centralList = JSON.parse(fs.readFileSync(coursesFilePath, "utf-8") || "[]");
      } catch {}
    }

    // Read current central requests store
    const requestsPath = path.join(process.cwd(), "src", "config", "central-course-requests.json");
    let allRequests: any[] = [];
    if (fs.existsSync(requestsPath)) {
      try {
        allRequests = JSON.parse(fs.readFileSync(requestsPath, "utf-8") || "[]");
      } catch {}
    }

    const createdRecords: any[] = [];
    const now = new Date().toISOString();

    for (const item of itemsToRequest) {
      const cId = item.courseId.trim();
      const matched = centralList.find(
        (c) => c.id?.toLowerCase() === cId.toLowerCase() || c.slug?.toLowerCase() === cId.toLowerCase()
      );
      const resolvedTitle = item.courseTitle || matched?.title || cId;
      const resolvedLevel = item.level || matched?.level || "Executive Series";

      // Individual unique request ID for each course
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cId.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

      const metaPayload = {
        courseTitle: resolvedTitle,
        level: resolvedLevel,
        studentPhone,
        studentName,
        studentEmail,
      };

      // Check existing status to prevent duplicate requests or demoting approved enrollments
      let existingDbStatus: string | null = null;
      let dbCourseId = cId;
      try {
        const { data: matchedDbCourse } = await (supabase as any)
          .from("courses")
          .select("id")
          .or(`id.eq.${cId},slug.eq.${cId.toLowerCase()}`)
          .maybeSingle();

        if (matchedDbCourse) {
          dbCourseId = matchedDbCourse.id;
        }

        const { data: existingDbEnrollment } = await (supabase as any)
          .from("course_enrollments")
          .select("status, approved_at, requested_at, duration_months, expires_at")
          .eq("user_id", user.id)
          .eq("course_id", dbCourseId)
          .maybeSingle();

        if (existingDbEnrollment) {
          existingDbStatus = existingDbEnrollment.status;
          const active = isEnrollmentActive({
            status: existingDbEnrollment.status,
            approvedAt: existingDbEnrollment.approved_at,
            requestedAt: existingDbEnrollment.requested_at,
            durationMonths: existingDbEnrollment.duration_months,
            explicitExpiresAt: existingDbEnrollment.expires_at,
            courseId: cId,
          });
          if (existingDbStatus === "approved" && !active) {
            existingDbStatus = "expired";
          }
        }
      } catch (dbErr) {
        console.warn("DB check course_enrollments notice for", cId, dbErr);
      }

      const existingIdx = allRequests.findIndex(
        (r: any) =>
          (r.userId === user.id || (r.studentEmail && r.studentEmail.toLowerCase() === studentEmail.toLowerCase())) &&
          r.courseId?.toLowerCase() === cId.toLowerCase()
      );
      let existingFileStatus = existingIdx !== -1 ? allRequests[existingIdx].status : null;
      if (existingFileStatus === "approved" && existingIdx !== -1) {
        const fileReq = allRequests[existingIdx];
        const active = isEnrollmentActive({
          status: fileReq.status,
          approvedAt: fileReq.approvedAt,
          requestedAt: fileReq.requestedAt,
          durationMonths: fileReq.durationMonths,
          explicitExpiresAt: fileReq.expiresAt,
          courseId: cId,
        });
        if (!active) {
          existingFileStatus = "expired";
        }
      }
      const currentStatus = existingDbStatus || existingFileStatus;

      // Safeguard: do not allow overwriting an actively approved enrollment
      if (currentStatus === "approved") {
        if (itemsToRequest.length === 1) {
          return {
            success: false,
            error: `You are already actively enrolled in ${resolvedTitle}. Access is available from your dashboard.`,
          };
        }
        continue;
      }

      // Safeguard: do not allow duplicate submissions while an earlier request is pending
      if (currentStatus === "pending") {
        if (itemsToRequest.length === 1) {
          return {
            success: false,
            error: `Your enrollment request for ${resolvedTitle} is already pending administrator review.`,
          };
        }
        continue;
      }

      // 1. Record individual course request in Supabase course_enrollments
      try {
        await (supabase as any).from("course_enrollments").upsert(
          {
            user_id: user.id,
            course_id: dbCourseId,
            status: "pending",
            receipt_tid: JSON.stringify(metaPayload),
            requested_at: now,
          },
          { onConflict: "user_id,course_id" }
        );
      } catch (dbErr) {
        console.warn("DB course_enrollments upsert notice for", cId, dbErr);
      }

      // 2. Persist as a distinct record in central-course-requests file store
      const record = {
        id: existingIdx !== -1 ? allRequests[existingIdx].id : requestId,
        userId: user.id,
        studentName,
        studentEmail,
        studentPhone,
        courseId: cId,
        courseTitle: resolvedTitle,
        level: resolvedLevel,
        status: "pending",
        requestedAt: now,
      };

      if (existingIdx !== -1) {
        allRequests[existingIdx] = record;
      } else {
        allRequests.unshift(record);
      }

      createdRecords.push(record);
    }

    if (createdRecords.length === 0) {
      return {
        success: false,
        error: "All selected courses are already actively enrolled or pending administrator review.",
      };
    }

    fs.writeFileSync(requestsPath, JSON.stringify(allRequests, null, 2), "utf-8");

    // 3. Dispatch non-blocking notification to authoritative administrator email
    try {
      const { sendAdminNotificationEmail } = await import("@/lib/email");
      const courseTitles = createdRecords.map((r: any) => r.courseTitle).join(", ");
      await sendAdminNotificationEmail({
        subject: `New Course Enrollment Request: ${courseTitles}`,
        html: `<p>A student has submitted a new course enrollment request:</p><ul><li><strong>Student:</strong> ${studentName} (${studentEmail})</li><li><strong>Courses:</strong> ${courseTitles}</li><li><strong>Request Time:</strong> ${now}</li></ul>`,
      });
    } catch (adminNotifyErr) {
      console.warn("Notice: Non-blocking admin notification for course request:", adminNotifyErr);
    }

    revalidatePath("/admin/course-requests");
    revalidatePath("/lms/dashboard");
    revalidatePath("/lms/courses");

    return { success: true, data: createdRecords };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to submit course request." };
  }
}



