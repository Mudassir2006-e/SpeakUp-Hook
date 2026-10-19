"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SpeakUpVideoPlayer, { VideoSourceType } from "@/components/SpeakUpVideoPlayer";
import LmsProfileDropdown from "@/components/LmsProfileDropdown";
import {
  getProtectedLesson,
  getCourseLessonsForPlayerAction,
  getStudentProgressAction,
  saveLessonCompletionAction,
} from "@/app/lms/actions";
import StudentAssignmentModal from "@/components/lms/StudentAssignmentModal";
import A4NotesViewer from "@/components/A4NotesViewer";
import type { Assignment, AssignmentSubmission } from "@/types/assignment";
import type { LessonLinkButton } from "@/types/linkButton";
import {
  getLessonAssignmentAction,
  getStudentAssignmentSubmissionAction,
} from "@/app/lms/assignment-actions";
import AdminPreviewBanner from "@/components/lms/AdminPreviewBanner";

type LearningTab = "videos" | "notes" | "assignment";

interface Lesson {
  id: string;
  moduleId: string;
  moduleTitle: string;
  number: string;
  title: string;
  description: string;
  videoId: string;
  videoUrl?: string;
  videoSource?: VideoSourceType;
  defaultNotes: string;
  notesImage?: string;
  defaultPractice: string;
  practiceImage?: string;
}

const LESSONS: Lesson[] = [
  // Module 1 (Completed)
  {
    id: "l01",
    moduleId: "mod1",
    moduleTitle: "Module 1: Foundational Syntax",
    number: "01",
    title: "Parts of Speech & Grammatical Agreement",
    description:
      "Understand subject-verb agreement, pronoun references, and foundational sentence structure to build grammatically rock-solid sentences.",
    videoId: "",
    defaultNotes: `SpeakUp Masterclass — Lesson 01: Parts of Speech & Agreement

Core Syntax Principle:
Every declarative sentence requires structural alignment between the agent (subject) and the active predicate verb. In formal academic discourse, compound subjects joined by 'neither/nor' take the number of the closest subject.

Key Cadence Principles from this Masterclass:
1. Subject-Verb Congruence: Always locate the head noun before selecting singular or plural verb forms.
2. Collective Nouns: Treat collective nouns as singular in standard formal academic English unless individual members are acting independently.
3. Prepositional Interference: Do not let intervening prepositional phrases alter the number of the verb.`,
    defaultPractice: `Instructor Practice Directives — Lesson 01: Parts of Speech & Agreement

Pedagogical Objective:
Examine how compound subjects and intervening prepositional phrases create grammatical incongruity in spontaneous speech. Practice isolating the true head noun before assigning singular or plural verb inflection.

Instructional Exercise 1:
Analyze the sentence: "Neither the principal investigator nor the associated laboratory analysts (is/are) authorized to alter the trial parameters without prior institutional clearance." Note that 'analysts' determines the plural verb form 'are' due to the proximity principle in formal English.

Instructional Exercise 2:
Rephrase this construction aloud three times using downward terminal pitch inflection to ensure conclusive vocal finality.`,
  },
  {
    id: "l02",
    moduleId: "mod1",
    moduleTitle: "Module 1: Foundational Syntax",
    number: "02",
    title: "Present Tense Nuances & Auxiliary Verbs",
    description:
      "Differentiate between simple present, present continuous, and present perfect aspects with academic precision.",
    videoId: "",
    defaultNotes: `SpeakUp Masterclass — Lesson 02: Present Tense Nuances

Temporal Scope Principle:
Present simple establishes timeless academic truths and persistent empirical findings, whereas present perfect bridges past discovery with ongoing significance.

Key Cadence Principles from this Masterclass:
1. Present Simple for Methodological Truths: Use simple present for general facts and constant theories.
2. Present Perfect for Cumulative Literature: Use present perfect ('Researchers have demonstrated...') when the timeline continues to affect the present.
3. Modal Auxiliaries: Deploy 'shall', 'may', and 'must' with careful calibrated degrees of necessity.`,
    defaultPractice: `Instructor Practice Directives — Lesson 02: Present Tense Nuances

Pedagogical Objective:
Distinguish between empirical observations that require continuous aspect versus methodological principles that demand simple present indicative verbs.

Instructional Exercise:
Formulate two contrasting declarations regarding institutional performance: one indicating an enduring statutory mandate using present simple, and a second highlighting an ongoing 10-year trajectory using present perfect continuous.`,
  },
  {
    id: "l03",
    moduleId: "mod1",
    moduleTitle: "Module 1: Foundational Syntax",
    number: "03",
    title: "Direct & Indirect Objects in Formal Syntax",
    description:
      "Master transitivity, ditransitive verbs, and objective case assignment in formal executive statements.",
    videoId: "",
    defaultNotes: `SpeakUp Masterclass — Lesson 03: Direct & Indirect Objects

Object Architecture:
Direct objects complete the verb's transitive arc, whereas indirect objects denote the recipient or beneficiary. Positioning indirect objects before direct objects yields greater acoustic conciseness.

Key Cadence Principles from this Masterclass:
1. Dative Shift: Recognize when moving the recipient reduces unnecessary prepositional weight.
2. Case Integrity: Pronouns governed by transitive verbs must strictly retain objective case ('whom', 'them', 'us').
3. Phrasal Clarity: Place heavy noun clauses as direct objects following the verb rather than embedding them awkwardly.`,
    defaultPractice: `Instructor Practice Directives — Lesson 03: Object Architecture

Pedagogical Objective:
Eliminate prepositional bloat by utilizing the dative shift in administrative directives.

Instructional Exercise:
Restructure the sentence: "The executive committee forwarded a comprehensive briefing document to every regional division director" into dative shift syntax: "The executive committee forwarded every regional division director a comprehensive briefing document."`,
  },

  // Module 2 (In Progress)
  {
    id: "l04",
    moduleId: "mod2",
    moduleTitle: "Module 2: Sentence Architecture",
    number: "04",
    title: "Subordinate Clauses & Complex Coordination",
    description:
      "Harness relative pronouns, adverbial clauses, and balanced subordinating conjunctions to govern academic clauses.",
    videoId: "",
    defaultNotes: `SpeakUp Masterclass — Lesson 04: Subordinate Clauses & Coordination

Subordination Mechanics:
Subordinate clauses provide nuance, causal antecedents, and conditional qualifications without compromising the primary assertion of the independent clause.

Key Cadence Principles from this Masterclass:
1. Relative Restrictiveness: Distinguish 'that' (essential clause without commas) from 'which' (non-essential supplementary clause with commas).
2. Fronted Adverbials: When placing adverbial clauses at the start of a sentence, punctuate with an audible oral pause and written comma.
3. Parallel Conjunctions: Correlative pairs ('not only... but also', 'either... or') must govern identical syntactic constituents.`,
    defaultPractice: `Instructor Practice Directives — Lesson 04: Subordinate Clauses

Pedagogical Objective:
Construct complex, multi-tiered sentences while preventing syntactic run-ons or dangling modifiers.

Instructional Exercise:
Combine three distinct propositions regarding fiscal policy into one authoritative periodic sentence ending on the primary independent clause.`,
  },
  {
    id: "l05",
    moduleId: "mod2",
    moduleTitle: "Module 2: Sentence Architecture",
    number: "05",
    title: "Passive Voice Nuances in Academic Prose",
    description:
      "Deploy passive constructions judiciously to emphasize empirical outcomes while preserving syntactic vigor.",
    videoId: "",
    defaultNotes: `SpeakUp Masterclass — Lesson 05: Strategic Passive Constructions

Voice Calibration:
In academic discourse, agentless passive voice shifts communicative focus onto experimental results and institutional actions rather than individual investigators.

Key Cadence Principles from this Masterclass:
1. Agent Displacement: Use passive voice when the actor is unknown, universally understood, or less important than the result.
2. Clarity Preservation: Avoid recursive passives ('It was decided that the action should be taken') that obscure responsibility.
3. Cadence Transition: Alternate active and passive voices across paragraphs to maintain rhythm and avoid monotone presentation.`,
    defaultPractice: `Instructor Practice Directives — Lesson 05: Passive Calibration

Pedagogical Objective:
Rewrite administrative reprimands into diplomatic, agent-neutral passive formulations.

Instructional Exercise:
Transform "The junior auditing team failed to inspect the secondary ledger" into an objective institutional observation using passive voice without punitive personal attribution.`,
  },
  {
    id: "l06",
    moduleId: "mod2",
    moduleTitle: "Module 2: Sentence Architecture",
    number: "06",
    title: "Conditional Nuances & Counterfactual Mood",
    description:
      "Formulate hypothetical, speculative, and counterfactual arguments using precise subjunctive verb forms.",
    videoId: "",
    defaultNotes: `SpeakUp Masterclass — Lesson 06: Conditionals & Subjunctive Mood

Counterfactual Syntax:
Third conditionals and mixed counterfactuals express retrospective evaluations and contingency scenarios in strategic risk analysis.

Key Cadence Principles from this Masterclass:
1. Past Subjunctive: Maintain 'were' for all persons in formal counterfactual hypotheses ('If the regulatory framework were enacted...').
2. Inverted Conditionals: Replace 'if' with fronted auxiliaries ('Had the institution recognized the market shift...') for elevated executive cadence.
3. Modal Nuance: Match 'would', 'could', and 'might' to calibrated degrees of certainty.`,
    defaultPractice: `Instructor Practice Directives — Lesson 06: Conditionals & Inversion

Pedagogical Objective:
Deliver counterfactual strategic risk assessments using inverted conditional phrasing.

Instructional Exercise:
Formulate an inverted conditional statement evaluating a corporate acquisition scenario: "Had the board of directors requested independent valuation earlier, the acquisition would have yielded substantially higher margins."`,
  },

  // Module 3 (Locked)
  {
    id: "l07",
    moduleId: "mod3",
    moduleTitle: "Module 3: Complex Rhetoric",
    number: "07",
    title: "Rhetorical Polarity & Emphatic Fronting",
    description:
      "Deploy negative inversions, cleft sentences, and thematic fronting to seize auditor attention.",
    videoId: "",
    defaultNotes: `SpeakUp Masterclass — Lesson 07: Rhetorical Polarity & Inversion

Emphatic Syntax:
Inverting auxiliary verbs after negative adverbials ('Seldom', 'Scarcely', 'Under no circumstances') establishes acute oratorical authority.`,
    defaultPractice: `Instructor Practice Directives — Lesson 07: Rhetorical Polarity

Pedagogical Objective:
Master negative fronting in formal keynote addresses.`,
  },
  {
    id: "l08",
    moduleId: "mod3",
    moduleTitle: "Module 3: Complex Rhetoric",
    number: "08",
    title: "Stylistic Inversion & Periodic Architecture",
    description:
      "Withhold the grammatical subject to build sustained narrative tension in high-stakes presentations.",
    videoId: "",
    defaultNotes: `SpeakUp Masterclass — Lesson 08: Periodic Architecture

Climactic Timing:
Delivering the main predicate at the exact terminal apex of the sentence commands institutional silence.`,
    defaultPractice: `Instructor Practice Directives — Lesson 08: Periodic Architecture

Pedagogical Objective:
Deliver two consecutive periodic arguments before an executive board.`,
  },

  // Module 4 (Locked)
  {
    id: "l09",
    moduleId: "mod4",
    moduleTitle: "Module 4: Capstone Defense",
    number: "09",
    title: "Executive Synthesis & Dialectical Defense",
    description:
      "Synthesize syntactic complexity, tonal cadence, and persuasive authority in oral capstone examination.",
    videoId: "",
    defaultNotes: `SpeakUp Masterclass — Lesson 09: Capstone Oral Defense

Oral Defense Protocol:
Deliver a continuous five-minute executive brief synthesizing all prior modules.`,
    defaultPractice: `Instructor Practice Directives — Lesson 09: Capstone Defense

Pedagogical Objective:
Synthesize all syntactic cadence markers in an uninterrupted 5-minute oral defense.`,
  },
];

function CoursePlayerContent() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("course") || "grammar-a1";

  const [lessonsList, setLessonsList] = useState<Lesson[]>(() => {
    return courseId === "grammar-a1" ? LESSONS : [];
  });
  const [courseTitle, setCourseTitle] = useState<string>("Course Learning Player");
  const [activeLessonId, setActiveLessonId] = useState(courseId === "grammar-a1" ? "l04" : "");
  const [activeTab, setActiveTab] = useState<LearningTab>("videos");
  const [copied, setCopied] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(true);

  // Authorization & Dynamic Watermark state
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [watermark, setWatermark] = useState<{
    studentName: string;
    studentEmail: string;
    licenseText: string;
  } | null>(null);

  // Passive Page Visibility Deterrence state
  const [isTabHidden, setIsTabHidden] = useState<boolean>(false);

  // Lesson completion state (persisted)
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(["l01", "l02", "l03"]);

  // Lecture notes state (strictly read-only for students with A4 viewer support)
  const [notesContent, setNotesContent] = useState<string>("");
  const [notesImage, setNotesImage] = useState<string>("");
  const [notesPages, setNotesPages] = useState<string[]>([]);
  const [practiceContent, setPracticeContent] = useState<string>("");

  // Authorized lesson video & sources
  const [authorizedVideoId, setAuthorizedVideoId] = useState<string>("");
  const [authorizedVideoUrl, setAuthorizedVideoUrl] = useState<string>("");
  const [authorizedVideoSource, setAuthorizedVideoSource] = useState<VideoSourceType>("youtube");

  // Collapsible modules state
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    mod1: true,
    mod2: true,
    mod3: false,
    mod4: false,
  });

  // Locked module notification toast
  const [lockedToast, setLockedToast] = useState<string | null>(null);
  const [certNotification, setCertNotification] = useState<string | null>(null);

  // Optional Assignment attached to Lesson
  const [attachedAssignment, setAttachedAssignment] = useState<Assignment | null>(null);
  const [assignmentSubmission, setAssignmentSubmission] = useState<AssignmentSubmission | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentsDisabledNotice, setAssignmentsDisabledNotice] = useState<string | null>(null);

  // Optional Configured Link Button attached to Lesson
  const [linkButton, setLinkButton] = useState<LessonLinkButton | null>(null);

  // Fetch dynamic lessons from Supabase / central-curriculum store
  useEffect(() => {
    let isMounted = true;
    async function loadDynamicCurriculum() {
      try {
        const res = await getCourseLessonsForPlayerAction(courseId);
        if (!isMounted) return;
        if (res.success && Array.isArray(res.data)) {
          if (res.data.length > 0) {
            setLessonsList(res.data);
            if (!res.data.some((l) => l.id === activeLessonId)) {
              setActiveLessonId(res.data[0].id);
            }
            const firstModId = res.data[0].moduleId;
            setExpandedModules((prev) => ({ ...prev, [firstModId]: true }));
          } else if (courseId !== "grammar-a1") {
            // Strict course isolation: new/other courses have no leaked A1 lessons
            setLessonsList([]);
            setActiveLessonId("");
          }
        }
      } catch (err) {
        console.error("Failed to load course lessons", err);
      }
    }
    loadDynamicCurriculum();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // Current active lesson object
  const currentLesson = lessonsList.find((l) => l.id === activeLessonId) || lessonsList[0] || (courseId === "grammar-a1" ? LESSONS[3] : undefined);

  // Query optional Assignment attached to current Course -> Module -> Lesson -> Reading / Writing
  useEffect(() => {
    let isMounted = true;
    async function loadLessonAssignment() {
      if (!currentLesson) return;
      try {
        // Check for attached writing assignment first, then reading
        let res = await getLessonAssignmentAction(courseId, currentLesson.moduleId, currentLesson.id, "writing");
        if (!res.data && res.message?.includes("disabled")) {
          if (isMounted) {
            setAssignmentsDisabledNotice(res.message);
            setAttachedAssignment(null);
            setAssignmentSubmission(null);
          }
          return;
        }
        if (!res.data) {
          res = await getLessonAssignmentAction(courseId, currentLesson.moduleId, currentLesson.id, "reading");
        }

        if (!isMounted) return;
        setAssignmentsDisabledNotice(null);

        if (res.success && res.data) {
          setAttachedAssignment(res.data);
          const subRes = await getStudentAssignmentSubmissionAction(res.data.id, courseId);
          if (isMounted) {
            setAssignmentSubmission(subRes.data || null);
          }
        } else {
          setAttachedAssignment(null);
          setAssignmentSubmission(null);
        }
      } catch {
        if (isMounted) {
          setAttachedAssignment(null);
          setAssignmentSubmission(null);
        }
      }
    }
    loadLessonAssignment();
    return () => {
      isMounted = false;
    };
  }, [courseId, activeLessonId, currentLesson?.moduleId, currentLesson?.id]);

  // Server-side authorization check and content load
  useEffect(() => {
    if (!activeLessonId) return;
    let isMounted = true;

    async function loadLessonAuthorization() {
      try {
        const response = await getProtectedLesson(courseId, activeLessonId);
        if (!isMounted) return;

        if (!response.success || !response.data) {
          setIsAuthorized(false);
          setAuthError(response.error || "Access Denied: You do not have approved enrollment for this course.");
          return;
        }

        setIsAuthorized(true);
        setAuthError(null);
        if (response.data.courseTitle) {
          setCourseTitle(response.data.courseTitle);
        }
        setWatermark(response.data.watermark);
        setAuthorizedVideoId(response.data.videoId || "");
        setAuthorizedVideoUrl(response.data.videoUrl || "");
        setAuthorizedVideoSource((response.data.videoSource as VideoSourceType) || "youtube");

        // Set authoritative lecture notes (read-only for students with A4 viewer)
        setNotesContent(response.data.notes || "");
        setNotesImage(response.data.notesImage || "");
        const loadedPages = (response.data as any).notesPages || (response.data.notesImage ? [response.data.notesImage] : []);
        setNotesPages(loadedPages);
        setPracticeContent(response.data.practice || currentLesson?.defaultPractice || "");

        // Set configured lesson link button (if enabled and valid)
        if (response.data.linkButton && response.data.linkButton.enabled && response.data.linkButton.url) {
          setLinkButton(response.data.linkButton);
        } else {
          setLinkButton(null);
        }
      } catch {
        if (isMounted) {
          setIsAuthorized(false);
          setAuthError("Failed to verify course access authorization.");
          setLinkButton(null);
        }
      }
    }

    loadLessonAuthorization();

    return () => {
      isMounted = false;
    };
  }, [courseId, activeLessonId]);

  // Page Visibility API handler
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Load persistent completed lessons from Supabase on mount (with fast localStorage cache)
  useEffect(() => {
    let isMounted = true;
    async function loadProgress() {
      // 1. Fast initial populate from localStorage cache
      const savedCompleted = localStorage.getItem("speakup_completed_lessons");
      if (savedCompleted) {
        try {
          const parsed = JSON.parse(savedCompleted);
          if (Array.isArray(parsed) && isMounted) {
            setCompletedLessonIds(parsed);
          }
        } catch (err) {
          console.error("Failed to parse local completed lessons", err);
        }
      }

      // 2. Fetch authenticated persistent progress from Supabase
      try {
        const res = await getStudentProgressAction(courseId);
        if (isMounted && res.success && res.data?.courses?.[courseId]) {
          const remoteCompleted = res.data.courses[courseId].completedLessons;
          if (Array.isArray(remoteCompleted)) {
            setCompletedLessonIds(remoteCompleted);
            localStorage.setItem("speakup_completed_lessons", JSON.stringify(remoteCompleted));
          }
        }
      } catch (err) {
        console.error("Failed to load student progress from Supabase:", err);
      }
    }

    loadProgress();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const toggleModule = (key: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isCurrentCompleted = completedLessonIds.includes(activeLessonId);

  const toggleLessonCompletion = async (lessonId: string) => {
    const isCurrentlyDone = completedLessonIds.includes(lessonId);
    const newStatus = !isCurrentlyDone;

    // Optimistically update UI
    setCompletedLessonIds((prev) => {
      let updated: string[];
      if (isCurrentlyDone) {
        updated = prev.filter((id) => id !== lessonId);
      } else {
        updated = [...prev, lessonId];
      }
      try {
        localStorage.setItem("speakup_completed_lessons", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Persist to Supabase asynchronously
    try {
      const res = await saveLessonCompletionAction({
        courseId,
        lessonId,
        completed: newStatus,
      });

      if (res.success && res.data) {
        setCompletedLessonIds(res.data.completedLessons);
        try {
          localStorage.setItem("speakup_completed_lessons", JSON.stringify(res.data.completedLessons));
        } catch {}
        window.dispatchEvent(new CustomEvent("speakup:progress-updated", { detail: res.data }));
      }
    } catch (err) {
      console.error("Failed to persist progress to Supabase:", err);
    }
  };

  const handleNextLesson = () => {
    const currentIndex = lessonsList.findIndex((l) => l.id === activeLessonId);
    if (currentIndex < lessonsList.length - 1) {
      const nextLesson = lessonsList[currentIndex + 1];
      if (courseId === "grammar-a1" && (nextLesson.moduleId === "mod3" || nextLesson.moduleId === "mod4")) {
        setLockedToast("Next module is locked until Module 2 is completed.");
        setTimeout(() => setLockedToast(null), 3000);
        return;
      }
      setActiveLessonId(nextLesson.id);
      setExpandedModules((prev) => ({ ...prev, [nextLesson.moduleId]: true }));
    }
  };

  const handlePrevLesson = () => {
    const currentIndex = lessonsList.findIndex((l) => l.id === activeLessonId);
    if (currentIndex > 0) {
      const prevLesson = lessonsList[currentIndex - 1];
      setActiveLessonId(prevLesson.id);
      setExpandedModules((prev) => ({ ...prev, [prevLesson.moduleId]: true }));
    }
  };

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(notesContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCertificateClick = () => {
    setCertNotification(
      `Your certificate is locked. Complete all modules in ${courseTitle} to unlock your verified credential.`
    );
    setTimeout(() => setCertNotification(null), 6000);
  };

  // Dynamically group modules
  const dynamicModuleMap = new Map<string, { id: string; title: string; lessons: Lesson[] }>();
  lessonsList.forEach((lesson) => {
    if (!dynamicModuleMap.has(lesson.moduleId)) {
      dynamicModuleMap.set(lesson.moduleId, {
        id: lesson.moduleId,
        title: lesson.moduleTitle || `Module ${lesson.moduleId}`,
        lessons: [],
      });
    }
    dynamicModuleMap.get(lesson.moduleId)!.lessons.push(lesson);
  });

  const modules = Array.from(dynamicModuleMap.values()).map((mod) => ({
    id: mod.id,
    title: mod.title,
    isLocked: courseId === "grammar-a1" && lessonsList === LESSONS && (mod.id === "mod3" || mod.id === "mod4"),
    lessons: mod.lessons,
  }));

  const totalLessons = lessonsList.length;
  const completedCount = completedLessonIds.length;
  const progressPercent = Math.min(100, Math.round((completedCount / (totalLessons || 1)) * 100));

  return (
    <div className="max-w-[1480px] mx-auto space-y-6 pt-2 pb-10">
      {/* Administrator Live Preview Notice */}
      <AdminPreviewBanner />

      {/* Top Header Section with Page Name on Left and Circular Profile Picture on Right */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 pt-2 border-b border-[var(--surface-border)]">
        <div className="space-y-1">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
            Learning Player
          </h1>
          <p className="font-serif text-base sm:text-lg text-[var(--text-muted)]">
            Active masterclass curriculum, lecture cadence notes, and interactive practice.
          </p>
        </div>

        {/* Top-Right Profile Display: Circular Profile Picture matching Dashboard */}
        <div className="shrink-0 self-start sm:self-center">
          <LmsProfileDropdown />
        </div>
      </section>

      {/* Access Denied View for Unauthorized Course Requests */}
      {isAuthorized === false && (
        <div className="max-w-2xl mx-auto my-12 bg-white dark:bg-[#141418] border border-[var(--surface-border)] rounded-2xl p-8 sm:p-10 text-center space-y-6 shadow-sm animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto border border-rose-500/20">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-[var(--text-main)] tracking-tight">
              Course Access Restricted
            </h2>
            <p className="font-serif text-sm text-[var(--text-muted)] leading-relaxed">
              {authError || "You do not have an approved enrollment for this course."}
            </p>
          </div>

          <div className="p-3 bg-[#f9f5ed] dark:bg-[var(--surface-low)] rounded-xl border border-[var(--surface-border)] text-[11px] font-display text-[var(--text-muted)] leading-relaxed">
            Approved course enrollments grant access only to authorized curriculum materials. Please contact SpeakUp administration or review your active enrolled courses.
          </div>

          <div className="pt-2">
            <Link
              href="/lms/courses"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1a1a1a] dark:bg-[#d4af37] text-white dark:text-[#1a1a1a] hover:bg-[#d4af37] hover:text-white transition-all font-display text-xs uppercase tracking-wider font-bold shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">school</span>
              <span>View Enrolled Courses</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Learning Viewport (Curriculum Sidebar + Central Stage) */}
      {isAuthorized !== false && (
        lessonsList.length === 0 || !currentLesson ? (
          <div className="rounded-2xl bg-white dark:bg-[#141418]/60 border border-[var(--surface-border)] p-12 text-center max-w-2xl mx-auto space-y-5 my-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#d4af37]/15 text-[#d4af37] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-3xl">auto_stories</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-2xl font-bold text-[var(--text-main)]">{courseTitle}</h3>
              <p className="font-serif text-[15px] text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                Curriculum for this course is being prepared by the instructor. Please check back shortly or explore your other enrolled courses.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/lms/courses"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">school</span>
                <span>View Enrolled Courses</span>
              </Link>
            </div>
          </div>
        ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ================= LEFT CURRICULUM SIDEBAR ================= */}
          <aside className="w-full lg:w-92 shrink-0 rounded-2xl bg-white dark:bg-[#141418]/60 border border-[var(--surface-border)] p-5 shadow-xs space-y-5">
            {/* Header & Progress */}
            <div className="pb-4 border-b border-[var(--surface-border)]/60 space-y-3">
              <h2 className="font-display text-xl font-bold text-[var(--text-main)] tracking-tight">
                {courseTitle}
              </h2>
              <div className="space-y-1.5">
                <div className="flex justify-between font-display text-xs text-[var(--text-muted)]">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">Course Progress</span>
                  <span className="font-bold text-[#d4af37]">
                    {progressPercent}% Complete ({completedCount}/{totalLessons})
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#f0eae0] dark:bg-[var(--surface-border)]/40 rounded-full overflow-hidden">
                  <div
                    className="bg-[#d4af37] h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Module List Accordion with Vertical Scrollbar */}
            <div className="max-h-[580px] overflow-y-auto custom-scroll pr-1 space-y-2.5 font-display text-xs">
              {modules.map((mod) => {
                const isExpanded = !!expandedModules[mod.id];
                const modCompletedCount = mod.lessons.filter((l) => completedLessonIds.includes(l.id)).length;
                const isModAllCompleted = modCompletedCount === mod.lessons.length && !mod.isLocked;
                const hasActiveLesson = mod.lessons.some((l) => l.id === activeLessonId);

                return (
                  <div
                    key={mod.id}
                    className={`rounded-xl transition-all overflow-hidden ${
                      mod.isLocked
                        ? "opacity-60 border border-[var(--surface-border)]/30 bg-[#f9f5ed]/40 dark:bg-[var(--surface-low)]/10"
                        : hasActiveLesson
                        ? "border border-[#d4af37]/60 bg-[#fdfaf3] dark:bg-[#16161b]"
                        : "border border-[var(--surface-border)]/40 bg-white dark:bg-[var(--surface-low)]/15"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className="w-full p-3 flex items-center justify-between cursor-pointer text-left select-none transition-colors hover:bg-[#f9f5ed]/60 dark:hover:bg-[var(--surface-low)]/40"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className={`material-symbols-outlined text-[18px] shrink-0 ${
                            mod.isLocked
                              ? "text-[var(--text-muted)]"
                              : isModAllCompleted
                              ? "text-emerald-500"
                              : hasActiveLesson
                              ? "text-[#d4af37]"
                              : "text-[var(--text-muted)]"
                          }`}
                          style={{ fontVariationSettings: isModAllCompleted ? "'FILL' 1" : undefined }}
                        >
                          {mod.isLocked ? "lock" : isModAllCompleted ? "check_circle" : hasActiveLesson ? "play_circle" : "folder"}
                        </span>
                        <span
                          className={`font-bold truncate ${
                            mod.isLocked
                              ? "text-[var(--text-muted)]"
                              : hasActiveLesson
                              ? "text-[#d4af37]"
                              : "text-[var(--text-main)]"
                          }`}
                        >
                          {mod.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {mod.isLocked ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-border)]/30 text-[var(--text-muted)] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">lock</span>
                            <span>Locked</span>
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isModAllCompleted
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : hasActiveLesson
                                ? "bg-[#d4af37] text-[#141416]"
                                : "bg-[var(--surface-border)]/40 text-[var(--text-muted)]"
                            }`}
                          >
                            {modCompletedCount}/{mod.lessons.length}
                          </span>
                        )}
                        <span className="material-symbols-outlined text-[18px] text-[var(--text-muted)]">
                          {isExpanded ? "expand_less" : "expand_more"}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-1.5 space-y-1">
                        {mod.lessons.map((lesson) => {
                          const isActive = lesson.id === activeLessonId;
                          const isDone = completedLessonIds.includes(lesson.id);

                          if (mod.isLocked) {
                            return (
                              <div
                                key={lesson.id}
                                onClick={() => {
                                  setLockedToast(`Module is locked. Complete preceding modules to unlock.`);
                                  setTimeout(() => setLockedToast(null), 3000);
                                }}
                                className="p-2.5 rounded-lg flex items-center justify-between text-[var(--text-muted)]/60 cursor-not-allowed select-none"
                                title="Locked lesson"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="material-symbols-outlined text-[16px] shrink-0 text-[var(--text-muted)]/50">
                                    lock
                                  </span>
                                  <span className="font-serif text-xs truncate">
                                    {lesson.number}. {lesson.title}
                                  </span>
                                </div>
                                <span className="text-[10px] uppercase font-serif italic text-[var(--text-muted)]/60">
                                  Locked
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={lesson.id}
                              onClick={() => setActiveLessonId(lesson.id)}
                              className={`p-2.5 rounded-lg flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                                isActive
                                  ? "bg-[#d4af37]/20 border-l-3 border-[#d4af37] text-[#141416] dark:text-[#d4af37] font-bold"
                                  : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[#f9f5ed] dark:hover:bg-[var(--surface-low)]/30"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`material-symbols-outlined text-[17px] shrink-0 ${
                                    isDone
                                      ? "text-emerald-500"
                                      : isActive
                                      ? "text-[#d4af37]"
                                      : "text-[var(--text-muted)]"
                                  }`}
                                  style={{ fontVariationSettings: isDone ? "'FILL' 1" : undefined }}
                                >
                                  {isDone ? "check_circle" : isActive ? "play_arrow" : "radio_button_unchecked"}
                                </span>
                                <span className="font-serif text-xs truncate">
                                  {lesson.number}. {lesson.title}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLessonCompletion(lesson.id);
                                }}
                                className="p-1 text-[var(--text-muted)] hover:text-[#d4af37] shrink-0 cursor-pointer"
                                title={isDone ? "Mark incomplete" : "Mark completed"}
                                aria-label={isDone ? "Mark incomplete" : "Mark completed"}
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  {isDone ? "done_all" : "check"}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Course Certificate (Locked) */}
              <div
                onClick={handleCertificateClick}
                className="rounded-xl border border-[var(--surface-border)]/40 bg-white dark:bg-[var(--surface-low)]/20 p-3 flex items-center justify-between cursor-pointer hover:border-[#d4af37]/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#d4af37]">workspace_premium</span>
                  <span className="font-semibold text-[var(--text-muted)]">Course Certificate</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#d4af37]">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  <span>Locked</span>
                </div>
              </div>
            </div>
          </aside>

          {/* ================= CENTRAL LEARNING STAGE ================= */}
          <main className="flex-1 min-w-0 space-y-6 w-full">
            {/* Print Protection Notice (Visible Only When Printing) */}
            <div className="lms-print-protection-notice">
              <h2 className="text-xl font-bold mb-2">SpeakUp Masterclass Academic Curriculum</h2>
              <p className="text-sm text-gray-700 mb-1">
                Protected Intellectual Property — Unauthorized copying, printing, or redistribution is strictly prohibited.
              </p>
              <p className="text-xs font-mono text-gray-500">
                {watermark?.licenseText || "SpeakUp Academic License"}
              </p>
            </div>

            {/* Protected Learning Content Area */}
            <div className={`lms-protected-content space-y-6 ${isTabHidden ? "filter blur-xs opacity-60 transition-all duration-200" : "transition-all duration-200"}`}>
              {/* Toast Notification for Locked Modules */}
              {lockedToast && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-display font-semibold flex items-center gap-2 animate-in fade-in">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>{lockedToast}</span>
                </div>
              )}

              {/* Lesson Headline: Module Subheading & Lesson Title on Left; Back to Enrolled Courses & Enroll on Right */}
              <section className="space-y-3 pb-4 border-b border-[var(--surface-border)]/50">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    {/* Module Subheading: strictly a subheading, single line without unnecessary wrapping */}
                    <div className="text-xs sm:text-sm font-display uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                      {currentLesson.moduleTitle} • Lesson {currentLesson.number}
                    </div>

                    {/* Main Lesson Heading */}
                    <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--text-main)] tracking-tight leading-snug">
                      {currentLesson.title}
                    </h2>
                  </div>

                  {/* Back to Enrolled Courses navigation */}
                  <div className="shrink-0 flex items-center self-start sm:self-center">
                    <Link
                      href="/lms/courses"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#141418] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-main)] hover:text-[#d4af37] font-display text-xs uppercase tracking-wider font-bold shadow-xs transition-all group cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px] transition-transform group-hover:-translate-x-0.5 text-[#d4af37]">
                        arrow_back
                      </span>
                      <span>Enrolled Courses</span>
                    </Link>
                  </div>
                </div>

                {/* Lesson Description */}
                <p className="font-serif text-[15px] sm:text-base text-[var(--text-muted)] leading-relaxed max-w-3xl pt-0.5">
                  {currentLesson.description}
                </p>

                {/* Clean Tab Pills: Video, Notes, Practice Materials & Configured Resource Link */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab("videos")}
                      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-display uppercase tracking-wider font-bold transition-all cursor-pointer ${
                        activeTab === "videos"
                          ? "bg-[#d4af37] text-[#141416] shadow-xs"
                          : "bg-white dark:bg-[#141418] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">play_circle</span>
                      <span>Video</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("notes")}
                      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-display uppercase tracking-wider font-bold transition-all cursor-pointer ${
                        activeTab === "notes"
                          ? "bg-[#d4af37] text-[#141416] shadow-xs"
                          : "bg-white dark:bg-[#141418] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">description</span>
                      <span>Notes</span>
                    </button>

                    {attachedAssignment && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("assignment")}
                        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-display uppercase tracking-wider font-bold transition-all cursor-pointer ${
                          activeTab === "assignment"
                            ? "bg-[#d4af37] text-[#141416] shadow-xs"
                            : "bg-white dark:bg-[#141418] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          {attachedAssignment.isLocked ? "lock" : "task_alt"}
                        </span>
                        <span>Assignment</span>
                        {assignmentSubmission && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              assignmentSubmission.status === "Checked"
                                ? "bg-emerald-500 text-white"
                                : "bg-amber-500 text-white"
                            }`}
                          >
                            {assignmentSubmission.status === "Checked"
                              ? `${assignmentSubmission.finalScore}/${attachedAssignment.maxMarks}`
                              : "Submitted"}
                          </span>
                        )}
                      </button>
                    )}

                    {assignmentsDisabledNotice && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-display uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25">
                        <span className="material-symbols-outlined text-[14px]">pause_circle</span>
                        <span>Assignments Paused by Instructor</span>
                      </span>
                    )}
                  </div>

                  {/* Configured Link Button (Visible ONLY when configured & enabled) */}
                  {linkButton && linkButton.enabled && linkButton.url && (
                    <div className="flex flex-wrap items-center gap-2.5">
                      {linkButton.description && (
                        <span className="hidden lg:inline-block text-xs text-[var(--text-muted)] font-serif italic max-w-xs truncate" title={linkButton.description}>
                          {linkButton.description}
                        </span>
                      )}
                      <a
                        href={linkButton.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-display uppercase tracking-wider font-bold bg-[#d4af37] text-[#141416] hover:bg-[#e4c665] transition-all cursor-pointer shadow-xs group"
                        title={linkButton.description || linkButton.text || "Open Learning Resource"}
                      >
                        <span className="material-symbols-outlined text-[17px] group-hover:translate-x-0.5 transition-transform">
                          open_in_new
                        </span>
                        <span>{linkButton.text?.trim() || "Open Learning Resource"}</span>
                      </a>
                    </div>
                  )}
                </div>
              </section>

              {/* ================= VIEW 1: VIDEO MASTERCLASS ================= */}
              {activeTab === "videos" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {authorizedVideoId || authorizedVideoUrl ? (
                    <SpeakUpVideoPlayer
                      videoId={authorizedVideoId}
                      videoUrl={authorizedVideoUrl}
                      videoSource={authorizedVideoSource}
                      title={`${currentLesson.number}. ${currentLesson.title}`}
                      poster="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80"
                      watermarkText={watermark?.licenseText}
                      onEnded={() => {
                        if (!isCurrentCompleted) {
                          toggleLessonCompletion(currentLesson.id);
                        }
                        if (autoplayNext) {
                          handleNextLesson();
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full aspect-video bg-[#0a0a0a] rounded-2xl flex flex-col items-center justify-center text-center p-8 space-y-3 text-white border border-[var(--surface-border)]">
                      <span className="material-symbols-outlined text-4xl text-[#d4af37]">videocam_off</span>
                      <h4 className="font-display text-base font-bold">No Video Assigned</h4>
                      <p className="font-serif text-xs text-white/60 max-w-sm">
                        This lesson is structured as a reading lecture and cadence exercise. Review the lecture notes and practice directives.
                      </p>
                    </div>
                  )}

                  {/* Progression Action Controls */}
                  <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141418]/50 border border-[var(--surface-border)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => toggleLessonCompletion(currentLesson.id)}
                        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                          isCurrentCompleted
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isCurrentCompleted ? "check_circle" : "check"}
                        </span>
                        <span>{isCurrentCompleted ? "Completed" : "Mark as Completed"}</span>
                      </button>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoplayNext}
                          onChange={(e) => setAutoplayNext(e.target.checked)}
                          className="w-4 h-4 text-[#d4af37] focus:ring-[#d4af37] rounded border-[var(--surface-border)] cursor-pointer"
                        />
                        <span className="font-display text-xs text-[var(--text-muted)] font-semibold">
                          Autoplay Next
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                      <button
                        type="button"
                        onClick={handlePrevLesson}
                        disabled={LESSONS.findIndex((l) => l.id === activeLessonId) === 0}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--surface-border)] bg-white dark:bg-[#141418] text-[var(--text-muted)] hover:text-[#d4af37] hover:border-[#d4af37] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        <span>Previous</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleNextLesson}
                        disabled={
                          LESSONS.findIndex((l) => l.id === activeLessonId) === LESSONS.length - 1 ||
                          activeLessonId === "l06"
                        }
                        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span>Next</span>
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* ================= VIEW 2: LECTURE NOTES (READ-ONLY FOR STUDENTS WITH EXPANDABLE IMAGES) ================= */}
              {activeTab === "notes" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="space-y-4">
                    {/* Notes Action Header: Title, Watermark Tag, Copy Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--surface-border)]/50">
                      <div>
                        <h3 className="font-display text-lg font-bold text-[var(--text-main)]">
                          Lecture {currentLesson.number} Notes
                        </h3>
                        <p className="font-serif text-xs text-[var(--text-muted)]">
                          Official study notes & cadence references provided by your instructor
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {watermark && (
                          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-low)] border border-[var(--surface-border)]/60 text-[11px] font-display text-[var(--text-muted)] select-none">
                            <span className="material-symbols-outlined text-[14px] text-[#d4af37]">verified_user</span>
                            <span className="truncate max-w-[240px]">{watermark.licenseText}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleCopyNotes}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider bg-white dark:bg-[#141418] hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] transition-all cursor-pointer shadow-xs"
                          title="Copy lecture notes to clipboard"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {copied ? "check" : "content_copy"}
                          </span>
                          <span>{copied ? "Copied!" : "Copy"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Dedicated Portrait A4-style Notes Viewer (Phase 9) */}
                    {notesPages.length > 0 && (
                      <div className="pt-2 pb-2">
                        <A4NotesViewer
                          pages={notesPages}
                          title={currentLesson?.title || "Lesson Notes"}
                          watermarkText={watermark?.licenseText}
                        />
                      </div>
                    )}

                    {/* Formatted Read-Only Lecture Notes Container */}
                    <div className="rounded-2xl bg-white dark:bg-[#141418]/50 border border-[var(--surface-border)] p-6 sm:p-9 shadow-xs space-y-6">
                      {notesContent ? (
                        <div className="font-serif text-[17px] sm:text-[18px] text-[var(--text-main)] leading-[1.85] whitespace-pre-line select-text">
                          {notesContent}
                        </div>
                      ) : (
                        <p className="text-[var(--text-muted)] italic text-sm">
                          No lecture notes published for this lesson.
                        </p>
                      )}

                      {/* Bottom Copy Button */}
                      {notesContent && (
                        <div className="pt-6 border-t border-[var(--surface-border)]/50 flex justify-end">
                          <button
                            type="button"
                            onClick={handleCopyNotes}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-display text-xs font-bold uppercase tracking-wider bg-white dark:bg-[#141418] hover:bg-[#d4af37] text-[var(--text-main)] hover:text-[#141416] border border-[var(--surface-border)] hover:border-[#d4af37] transition-all cursor-pointer shadow-xs"
                            title="Copy complete lecture notes"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {copied ? "check" : "content_copy"}
                            </span>
                            <span>{copied ? "Notes Copied!" : "Copy Notes"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Interactive Practice Material & Pedagogical Drills (Strictly Text Entry & Directives) */}
                    {practiceContent && (
                      <div className="rounded-2xl bg-white dark:bg-[#141418]/50 border border-[var(--surface-border)] p-6 sm:p-9 shadow-xs space-y-4">
                        <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--surface-border)]/50">
                          <span className="material-symbols-outlined text-[#d4af37] text-[22px]">
                            record_voice_over
                          </span>
                          <div>
                            <h4 className="font-display text-base font-bold text-[var(--text-main)]">
                              Interactive Practice Directives &amp; Drills
                            </h4>
                            <p className="font-serif text-xs text-[var(--text-muted)]">
                              Official articulation prompts, cadence exercises, and practice directives
                            </p>
                          </div>
                        </div>

                        <div className="font-serif text-[16px] sm:text-[17px] text-[var(--text-main)] leading-[1.85] whitespace-pre-line select-text">
                          {practiceContent}
                        </div>
                      </div>
                    )}

                    {/* Quick Access Assignment Banner below notes if attached */}
                    {attachedAssignment && (
                      <div className="pt-2 animate-in fade-in duration-200">
                        <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-[#d4af37]/15 via-[#d4af37]/8 to-transparent border border-[#d4af37]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-display uppercase tracking-widest font-extrabold px-2.5 py-0.5 rounded-md bg-[#d4af37] text-[#141416]">
                                {attachedAssignment.practiceType.toUpperCase()} ASSIGNMENT
                              </span>
                              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                Max Marks: {attachedAssignment.maxMarks}
                              </span>
                              {attachedAssignment.isLocked && (
                                <span className="text-[11px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">lock</span>
                                  <span>Locked</span>
                                </span>
                              )}
                              {assignmentSubmission ? (
                                <span
                                  className={`text-[11px] font-display font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                    assignmentSubmission.status === "Checked"
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                      : assignmentSubmission.status === "Needs Review"
                                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                  }`}
                                >
                                  {assignmentSubmission.status}
                                  {assignmentSubmission.finalScore !== null &&
                                    ` • Score: ${assignmentSubmission.finalScore}/${attachedAssignment.maxMarks}`}
                                </span>
                              ) : (
                                <span className="text-[11px] font-display font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30">
                                  Not Submitted
                                </span>
                              )}
                            </div>
                            <h3 className="font-display text-lg font-black text-[var(--text-main)]">
                              {attachedAssignment.title}
                            </h3>
                            <p className="font-serif text-xs text-[var(--text-muted)] line-clamp-2 max-w-2xl">
                              {attachedAssignment.instructions}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsAssignmentModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold bg-[#d4af37] text-[#141416] hover:bg-[#e4c665] transition-all cursor-pointer shadow-xs shrink-0"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {assignmentSubmission?.status === "Checked" ? "task_alt" : "assignment"}
                            </span>
                            <span>
                              {assignmentSubmission?.status === "Checked"
                                ? "View Evaluation & Result"
                                : assignmentSubmission
                                ? "View Submission"
                                : "Open Assignment"}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= VIEW 3: DEDICATED ASSIGNMENT VIEW ================= */}
              {activeTab === "assignment" && attachedAssignment && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="rounded-2xl bg-white dark:bg-[#141418]/50 border border-[var(--surface-border)] p-6 sm:p-9 shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--surface-border)]/50">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[10px] font-display uppercase tracking-widest font-extrabold px-2.5 py-0.5 rounded-md bg-[#d4af37] text-[#141416]">
                            {attachedAssignment.practiceType.toUpperCase()} ASSIGNMENT
                          </span>
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            Max Marks: {attachedAssignment.maxMarks}
                          </span>
                          {attachedAssignment.isLocked && (
                            <span className="text-[11px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">lock</span>
                              <span>Locked</span>
                            </span>
                          )}
                          {assignmentSubmission ? (
                            <span
                              className={`text-[11px] font-display font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                assignmentSubmission.status === "Checked"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : assignmentSubmission.status === "Needs Review"
                                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              }`}
                            >
                              {assignmentSubmission.status}
                              {assignmentSubmission.finalScore !== null &&
                                ` • Score: ${assignmentSubmission.finalScore}/${attachedAssignment.maxMarks}`}
                            </span>
                          ) : (
                            <span className="text-[11px] font-display font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30">
                              Not Submitted
                            </span>
                          )}
                        </div>
                        <h2 className="font-display text-2xl font-bold text-[var(--text-main)]">
                          {attachedAssignment.title}
                        </h2>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsAssignmentModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider font-bold bg-[#d4af37] text-[#141416] hover:bg-[#e4c665] transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-center"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {assignmentSubmission?.status === "Checked" ? "task_alt" : "assignment"}
                        </span>
                        <span>
                          {assignmentSubmission?.status === "Checked"
                            ? "View Evaluation & Marks"
                            : assignmentSubmission
                            ? "View Submission"
                            : "Submit Assignment"}
                        </span>
                      </button>
                    </div>

                    {attachedAssignment.isLocked && (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-serif flex items-start gap-3">
                        <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400 shrink-0">
                          lock
                        </span>
                        <div>
                          <strong className="font-display uppercase tracking-wider text-xs">
                            Assignment Submissions Locked:
                          </strong>
                          <p className="mt-0.5 text-[var(--text-muted)]">
                            This assignment has been locked by the instructor. New submissions or resubmissions are currently disabled. You can still view instructions and any prior evaluations.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 font-serif text-[16px] text-[var(--text-main)] leading-relaxed">
                      <div>
                        <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] mb-1">
                          Instructions
                        </h4>
                        <p>{attachedAssignment.instructions}</p>
                      </div>

                      {attachedAssignment.questionTask && (
                        <div>
                          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] mb-1">
                            Prompt &amp; Task
                          </h4>
                          <div className="p-4 rounded-xl bg-[var(--surface-low)] border border-[var(--surface-border)] whitespace-pre-line text-sm">
                            {attachedAssignment.questionTask}
                          </div>
                        </div>
                      )}

                      {attachedAssignment.writingRequirements && (
                        <div>
                          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#8a6d1b] dark:text-[#d4af37] mb-1">
                            Submission Guidelines
                          </h4>
                          <div className="whitespace-pre-line text-sm text-[var(--text-muted)]">
                            {attachedAssignment.writingRequirements}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
        )
      )}

      {/* Polished Academic Certificate Notification Modal */}
      {certNotification && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cert-popup-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setCertNotification(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#151518] text-[var(--text-main)] border border-[#d4af37]/35 rounded-2xl p-6 sm:p-7 shadow-[0_12px_40px_-8px_rgba(212,175,55,0.18),0_10px_24px_-4px_rgba(0,0,0,0.3)] relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-[var(--surface-border)]/60">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#d4af37]/25 to-[#d4af37]/10 border border-[#d4af37]/45 text-[#d4af37] flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
                </div>
                <div>
                  <h4 id="cert-popup-title" className="font-display text-base font-bold text-[var(--text-main)] leading-tight tracking-tight">
                    Certificate Notification
                  </h4>
                  <span className="font-display text-[10px] uppercase tracking-[0.14em] text-[#8a6d1b] dark:text-[#d4af37] font-bold">
                    SpeakUp Academic Credentials
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCertNotification(null)}
                aria-label="Close notification"
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-[var(--surface-low)] transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="bg-[#f9f5ed]/80 dark:bg-[var(--surface-low)]/70 border border-[var(--surface-border)] rounded-xl p-4.5 mb-5 shadow-inner">
              <p className="font-serif text-[13.5px] sm:text-[14px] text-[var(--text-main)] leading-relaxed">
                {certNotification}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCertNotification(null)}
                className="px-6 py-2.5 bg-[#d4af37] hover:bg-[#b08e2b] text-[#141416] font-display text-xs uppercase tracking-wider font-bold rounded-xl shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Assignment Modal */}
      {attachedAssignment && (
        <StudentAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          assignment={attachedAssignment}
          submission={assignmentSubmission}
          onSubmissionSuccess={(newSub) => {
            setAssignmentSubmission(newSub);
          }}
          courseTitle={courseTitle}
          lessonTitle={currentLesson?.title}
        />
      )}
    </div>
  );
}

export default function CoursePlayerPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-display text-xs uppercase tracking-wider text-[var(--text-muted)]">Loading Masterclass Curriculum...</div>}>
      <CoursePlayerContent />
    </Suspense>
  );
}
